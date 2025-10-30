// netlify/functions/notify-email.js
export const handler = async (event) => {
  try {
    const payload = event.httpMethod === "POST" ? JSON.parse(event.body || "{}") : {};
    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.TO_EMAIL || "you@yourdomain.co.za";

    if (!apiKey) return { statusCode: 200, body: "No email provider configured." };

    // Minimal Resend API call
    const res = await fetch("https://api.resend.com/emails", {
      method:"POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type":"application/json" },
      body: JSON.stringify({
        from: "2Fast 2Clean <noreply@yourdomain.co.za>",
        to, subject: "New Booking",
        html: `<p>New booking:</p><pre>${JSON.stringify(payload, null, 2)}</pre>`
      })
    });

    if (!res.ok) throw new Error("Email send failed");
    return { statusCode: 200, body: "OK" };
  } catch (e) {
    return { statusCode: 200, body: "OK" }; // don't fail ITN
  }
};
