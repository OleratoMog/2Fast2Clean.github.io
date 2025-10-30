// netlify/functions/create-payment.js
import crypto from "crypto";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const { id, amount, name, email, phone, item_name, return_url, cancel_url, notify_url } = JSON.parse(event.body || "{}");

  const merchant_id  = process.env.PAYFAST_MERCHANT_ID;
  const merchant_key = process.env.PAYFAST_MERCHANT_KEY;
  const passphrase   = process.env.PAYFAST_PASSPHRASE;

  // Build fields for PayFast
  const fields = {
    merchant_id,
    merchant_key,
    return_url,
    cancel_url,
    notify_url,
    m_payment_id: `BKG-${id}`,
    amount: Number(amount).toFixed(2),
    item_name: item_name || "Car Wash",
    name_first: name?.split(" ")[0] || "Customer",
    email_address: email || "",
    cell_number: phone || ""
  };

  // Create signature (sort keys, build query, append passphrase, md5)
  const query = Object.entries(fields)
    .filter(([,v]) => v !== undefined && v !== null)
    .map(([k,v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, "+")}`)
    .sort()
    .join("&");

  const sigString = passphrase ? `${query}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}` : query;
  const signature = crypto.createHash("md5").update(sigString).digest("hex");

  fields.signature = signature;

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      process_url: "https://www.payfast.co.za/eng/process",
      fields
    })
  };
};
