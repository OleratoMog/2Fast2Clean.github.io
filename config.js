// Flip MOCK_MODE to false when you deploy Netlify functions (real PayFast redirect)
window.__APP_CONFIG__ = {
  MOCK_MODE: true, // true = simulate charges & notifications; false = real redirect to PayFast
  API_BASE: "/.netlify/functions", // Netlify functions base path
  PAYFAST: {
    merchant_id: "YOUR_MERCHANT_ID",
    merchant_key: "YOUR_MERCHANT_KEY",
    passphrase: "YOUR_SECURE_PASSPHRASE", // used only on server side; keep here blank in production
    return_url: "https://YOUR_DOMAIN/booking.html?paid=1",
    cancel_url: "https://YOUR_DOMAIN/booking.html?cancelled=1",
    notify_url: "https://YOUR_DOMAIN/.netlify/functions/notify-email" // ITN webhook
  },
  NOTIFY: {
    emailTo: "you@yourdomain.co.za"
  }
};
