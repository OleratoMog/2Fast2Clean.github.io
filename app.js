// app.js

// Helper: log clearly so we know JS has loaded
console.log("app.js loaded");

// ✅ Create a booking on the backend
async function createBookingOnServer(booking) {
  console.log("Sending booking to backend:", booking);

  const res = await fetch(`${window.API_BASE_URL}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(booking)
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.error("Booking error:", data);
    throw new Error(data.error || "Error creating booking");
  }

  const data = await res.json();
  console.log("Booking created:", data);
  return data.booking; // { id, ... }
}

// ✅ Handler for Confirm & Pay button
async function onConfirmAndPayClick() {
  alert("Confirm & Pay clicked ✔ (JS is working)"); // debug – you can remove later

  const nameInput   = document.getElementById("name");
  const phoneInput  = document.getElementById("phone");
  const emailInput  = document.getElementById("email");
  const dayInput    = document.getElementById("day");
  const timeInput   = document.getElementById("time");
  const serviceSelect = document.getElementById("service");
  const msgEl       = document.getElementById("bookingMessage");

  if (!nameInput || !phoneInput || !dayInput || !timeInput || !serviceSelect) {
    alert("Booking form inputs not found on the page.");
    return;
  }

  const customer_name   = nameInput.value.trim();
  const customer_phone  = phoneInput.value.trim();
  const customer_email  = emailInput.value.trim();
  const day             = dayInput.value;
  const time            = timeInput.value;
  const service_code    = serviceSelect.value;
  const service_name    = serviceSelect.options[serviceSelect.selectedIndex].text;

  // Simple validation
  if (!customer_name || !customer_phone || !day || !time || !service_code) {
    alert("Please fill in all required fields (name, phone, date, time, service).");
    return;
  }

  // Map service → price in ZAR
  let priceR = 0;
  if (service_code === "express")  priceR = 80;
  if (service_code === "standard") priceR = 120;
  if (service_code === "premium")  priceR = 250;

  const booking = {
    customer_name,
    customer_phone,
    customer_email,
    service_code,
    service_name,
    amount_cents: priceR * 100, // R→cents
    day,
    time,
    payment_method: "card" // default – real choice happens on checkout
  };

  try {
    msgEl.textContent = "Creating booking…";
    msgEl.style.color = "#e5e7eb";

    const created = await createBookingOnServer(booking);

    // ✅ Redirect to checkout with bookingId
    window.location.href = `checkout.html?bookingId=${created.id}`;
  } catch (err) {
    console.error(err);
    msgEl.textContent = err.message;
    msgEl.style.color = "#f97373";
  }
}

// ✅ Attach click handler once DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded");

  const btn = document.getElementById("confirmPayBtn");
  if (!btn) {
    console.warn("Confirm & Pay button not found on this page.");
    return;
  }

  console.log("Wiring click handler to Confirm & Pay button");
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    onConfirmAndPayClick();
  });
});
