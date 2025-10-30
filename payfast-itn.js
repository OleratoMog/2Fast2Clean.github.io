// netlify/functions/payfast-itn.js
// Basic ITN verification: checks signature and posts back to PayFast for validate.
// NOTE: You should also IP-allowlist PayFast IP ranges if possible.

import crypto from "crypto";

async function verifyWithPayfast(bodyString){
  // PayFast requires posting back the exact body to validate
  const res = await fetch("https://www.payfast.co.za/eng/query/validate", {
    method: "POST",
    headers: {"Content-Type":"application/x-www-form-urlencoded"},
    body: bodyString
  });
  const txt = await res.text();
  return /VALID/.test(txt);
}

function sign(fields, passphrase){
  const pairs = Object.entries(fields)
    .filter(([k])=>k!=="signature")
    .map(([k,v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, "+")}`)
    .sort()
    .join("&");
  const str = passphrase ? `${pairs}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}` : pairs;
  return crypto.createHash("md5").update(str).digest("hex");
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 200, body: "OK" };

  const passphrase = process.env.PAYFAST_PASSPHRASE;
  const bodyString = event.body || "";
  const params = new URLSearchParams(bodyString);
  const fields = {};
  for (const [k,v] of params.entries()) fields[k]=v;

  // Local signature check
  const expectedSig = sign(fields, passphrase);
  const sigOk = (fields.signature || "").toLowerCase() === expectedSig.toLowerCase();

  // Remote validation
  let remoteOk = false;
  try { remoteOk = await verifyWithPayfast(bodyString); } catch {}

  // Minimal result
  const ok = sigOk && remoteOk;

  // Email the payload (Resend)
  try{
    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.TO_EMAIL || "2Fast2Clean@gmail.com";
    if (apiKey){
      await fetch("https://api.resend.com/emails", {
        method:"POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type":"application/json" },
        body: JSON.stringify({
          from: "2Fast 2Clean <noreply@yourdomain.co.za>",
          to,
          subject: ok ? "PayFast ITN: VERIFIED" : "PayFast ITN: FAILED VERIFICATION",
          html: `<pre>${JSON.stringify(fields, null, 2)}</pre>`
        })
      });
    }
  }catch{}

  // You could also write to a DB here and map m_payment_id → booking in localStorage/DB.
  return { statusCode: 200, body: "OK" };
};
