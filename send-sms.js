// netlify/functions/send-sms.js
import Twilio from "twilio";
export const handler = async (event) => {
  try{
    const { to, text } = JSON.parse(event.body || "{}");
    const sid = process.env.TWILIO_SID, token = process.env.TWILIO_TOKEN, from = process.env.TWILIO_FROM;
    if (!sid || !token || !from) return { statusCode: 200, body: "No Twilio configured." };
    const client = new Twilio(sid, token);
    await client.messages.create({ to, from, body: text || "Booking confirmed" });
    return { statusCode: 200, body: "OK" };
  }catch{ return { statusCode: 200, body: "OK" }; }
};
