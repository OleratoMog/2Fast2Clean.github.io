// Real mode ON
window.__APP_CONFIG__ = {
  MOCK_MODE: false,
  API_BASE: "/.netlify/functions",
  PAYFAST: {
    // These URLs must match your deployed domain
    return_url: "https://2Fast2Clean.github.io/booking.html?paid=1",
    cancel_url: "https://2Fast2Clean.github.io/booking.html?cancelled=1",
    notify_url: "https://2Fast2Clean.github.io/.netlify/functions/payfast-itn"
  },
  NOTIFY: { emailTo: "2Fast2Clean@gmail.com" }
};
