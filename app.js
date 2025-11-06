/* ====== SHARED HELPERS ====== */

// Read a query parameter (?bookingId=1)
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// Load and save bookings in localStorage
function loadBookings() {
  try {
    return JSON.parse(localStorage.getItem("bookings") || "[]");
  } catch {
    return [];
  }
}

function saveBookings(list) {
  localStorage.setItem("bookings", JSON.stringify(list));
}

function nextBookingId() {
  const all = loadBookings();
  if (!all.length) return 1;
  return Math.max(...all.map(b => b.id || 0)) + 1;
}

/* ====== PAGE ROUTER ====== */

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;

  if (page === "booking") initBookingPage();
  if (page === "payment") initPaymentPage();
  if (page === "payment-success") initPaymentSuccessPage();
  if (page === "admin") initAdminPage();

  // footer year (optional)
  const ySpan = document.getElementById("yearSpan");
  if (ySpan) ySpan.textContent = new Date().getFullYear();
});

/* ====== BOOKING PAGE ====== */

function initBookingPage() {
  const nameEl   = document.getElementById("name");
  const emailEl  = document.getElementById("email");
  const phoneEl  = document.getElementById("phone");
  const svcEl    = document.getElementById("service");
  const dateEl   = document.getElementById("date");
  const timeEl   = document.getElementById("time");
  const saveBtn  = document.getElementById("saveBookingBtn");
  const payBtn   = document.getElementById("confirmPayBtn");
  const msgEl    = document.getElementById("bookingMessage");

  if (!nameEl || !svcEl || !saveBtn || !payBtn) {
    console.warn("Booking form elements not found – check IDs in booking.html");
    return;
  }

  // If user came from services page with ?svc=express etc.
  const svcParam = getQueryParam("svc");
  if (svcParam && svcEl.querySelector(`option[value="${svcParam}"]`)) {
    svcEl.value = svcParam;
  }

  function validate() {
    msgEl.textContent = "";
    msgEl.style.color = "#f9fafb";

    const name = nameEl.value.trim();
    const phone = phoneEl.value.trim();
    const svc = svcEl.value;
    const date = dateEl.value;
    const time = timeEl.value;

    if (!svc) return "Please select a service.";
    if (!date) return "Please choose a date.";
    if (!time) return "Please choose a time.";
    if (!name) return "Please enter your full name.";
    if (!/^\+?\d{9,15}$/.test(phone)) return "Please enter a valid phone number (+27…).";

    return null;
  }

  function getPriceRands(code) {
    if (code === "express") return 80;
    if (code === "standard") return 120;
    if (code === "premium") return 250;
    return 0;
  }

  function buildBooking(statusLabel) {
    const id          = nextBookingId();
    const name        = nameEl.value.trim();
    const email       = emailEl.value.trim();
    const phone       = phoneEl.value.trim();
    const serviceCode = svcEl.value;
    const serviceName = svcEl.options[svcEl.selectedIndex].text;
    const date        = dateEl.value;
    const time        = timeEl.value;
    const amountR     = getPriceRands(serviceCode);

    return {
      id,
      name,
      email,
      phone,
      serviceCode,
      serviceName,
      date,
      time,
      amount: amountR,
      status: statusLabel,          // "Saved" or "Pending payment"
      paymentMethod: "Not paid yet"
    };
  }

  // 🔹 Save Booking (for admin only, no payment yet)
  saveBtn.addEventListener("click", () => {
    const error = validate();
    if (error) {
      msgEl.style.color = "#ffb347";
      msgEl.textContent = error;
      return;
    }

    const booking = buildBooking("Saved");
    const all = loadBookings();
    all.push(booking);
    saveBookings(all);

    msgEl.style.color = "#00ff7f";
    msgEl.textContent = `Booking #${booking.id} saved for admin dashboard.`;

    console.log("Saved booking:", booking);
  });

  // 🔹 Confirm & Pay (save + redirect to payment page)
  payBtn.addEventListener("click", () => {
    const error = validate();
    if (error) {
      msgEl.style.color = "#ffb347";
      msgEl.textContent = error;
      return;
    }

    const booking = buildBooking("Pending payment");
    const all = loadBookings();
    all.push(booking);
    saveBookings(all);

    // Redirect to payment.html with bookingId
    window.location.href = `payment.html?bookingId=${booking.id}`;
  });
}

/* ====== PAYMENT PAGE (choose method) ====== */

function initPaymentPage() {
  const bookingIdParam = getQueryParam("bookingId");
  const bookingId = bookingIdParam ? parseInt(bookingIdParam, 10) : null;

  const payBookingIdEl = document.getElementById("payBookingId");
  const payNameEl      = document.getElementById("payName");
  const payServiceEl   = document.getElementById("payService");
  const payDateTimeEl  = document.getElementById("payDateTime");
  const payAmountEl    = document.getElementById("payAmount");
  const paymentMsgEl   = document.getElementById("paymentMessage");
  const payNowBtn      = document.getElementById("payNowBtn");
  const cardDetailsBox = document.getElementById("cardDetails");

  if (!bookingId) {
    if (paymentMsgEl) {
      paymentMsgEl.style.color = "#ffb347";
      paymentMsgEl.textContent = "Booking not found. Please start again.";
    }
    return;
  }

  const all = loadBookings();
  const booking = all.find(b => b.id === bookingId);

  if (!booking) {
    if (paymentMsgEl) {
      paymentMsgEl.style.color = "#ffb347";
      paymentMsgEl.textContent = "Booking not found. Please go back and try again.";
    }
    return;
  }

  // Fill the summary
  if (payBookingIdEl) payBookingIdEl.textContent = booking.id;
  if (payNameEl)      payNameEl.textContent = booking.name || "-";
  if (payServiceEl)   payServiceEl.textContent = booking.serviceName || "-";
  if (payDateTimeEl)  payDateTimeEl.textContent = `${booking.date} at ${booking.time}`;
  if (payAmountEl)    payAmountEl.textContent = `R${booking.amount}`;

  // Show/hide card fields when "Card" is selected
  function updateCardVisibility() {
    const selected = document.querySelector('input[name="payMethod"]:checked');
    if (!selected || selected.value !== "card") {
      if (cardDetailsBox) cardDetailsBox.style.display = "none";
    } else {
      if (cardDetailsBox) cardDetailsBox.style.display = "block";
    }
  }

  document.querySelectorAll('input[name="payMethod"]').forEach(r => {
    r.addEventListener("change", updateCardVisibility);
  });
  updateCardVisibility();

  if (!payNowBtn) return;

  payNowBtn.addEventListener("click", () => {
    if (!paymentMsgEl) return;

    const selected = document.querySelector('input[name="payMethod"]:checked');
    if (!selected) {
      paymentMsgEl.style.color = "#ffb347";
      paymentMsgEl.textContent = "Please select a payment method.";
      return;
    }

    const method = selected.value; // "pay_on_arrival" | "card" | "payfast" | "yoco"

    // If card selected, validate basic fields
    if (method === "card") {
      const cardName   = (document.getElementById("cardName")   || {}).value?.trim() || "";
      const cardNumber = (document.getElementById("cardNumber") || {}).value?.replace(/\s+/g, "") || "";
      const cardExpiry = (document.getElementById("cardExpiry") || {}).value?.trim() || "";
      const cardCvv    = (document.getElementById("cardCvv")    || {}).value?.trim() || "";

      if (!cardName || cardNumber.length < 12 || !cardExpiry || cardCvv.length < 3) {
        paymentMsgEl.style.color = "#ffb347";
        paymentMsgEl.textContent = "Please enter valid card details.";
        return;
      }
      // Still a mock – not sending any real card data anywhere.
    }

    paymentMsgEl.style.color = "#e5e7eb";
    paymentMsgEl.textContent = "Processing payment...";
    payNowBtn.disabled = true;

    setTimeout(() => {
      // Update booking status + payment info
      const all = loadBookings();
      const idx = all.findIndex(b => b.id === booking.id);
      if (idx !== -1) {
        let methodLabel;
        if (method === "pay_on_arrival") methodLabel = "Pay on arrival";
        else if (method === "card")      methodLabel = "Card (Visa/Mastercard)";
        else if (method === "payfast")   methodLabel = "PayFast";
        else if (method === "yoco")      methodLabel = "Yoco";
        else methodLabel = method;

        all[idx].paymentMethod = methodLabel;
        all[idx].status = (method === "pay_on_arrival")
          ? "CONFIRMED (Pay at wash)"
          : "PAID & CONFIRMED";
        all[idx].paid_at = new Date().toISOString();
        saveBookings(all);
      }

      // Redirect to success page
      window.location.href = `payment-success.html?bookingId=${booking.id}`;
    }, 900);
  });
}

/* ====== PAYMENT SUCCESS PAGE ====== */

function initPaymentSuccessPage() {
  const bookingIdParam = getQueryParam("bookingId");
  const bookingId = bookingIdParam ? parseInt(bookingIdParam, 10) : null;

  const msgEl = document.getElementById("successMessage");
  const bookingEl = document.getElementById("successBooking");

  if (!msgEl || !bookingEl) return;

  if (!bookingId) {
    msgEl.textContent = "Missing booking reference. Please start again.";
    return;
  }

  const all = loadBookings();
  const booking = all.find(b => b.id === bookingId);

  if (!booking) {
    msgEl.textContent = "We could not find this booking. Please contact support or try again.";
    return;
  }

  msgEl.innerHTML = `
    <div style="text-align:center; margin-bottom:16px;">
      <div style="
        display:inline-flex;
        align-items:center;
        justify-content:center;
        width:60px;
        height:60px;
        border-radius:50%;
        background:#16a34a;
        color:#fff;
        font-size:32px;
        margin-bottom:8px;
      ">✓</div>
      <h2>Payment successful!</h2>
    </div>
  `;

  bookingEl.innerHTML = `
    <p>Thank you, <strong>${booking.name || "customer"}</strong>.</p>
    <p>Your booking <strong>#${booking.id}</strong> for
      <strong>${booking.serviceName}</strong> on
      <strong>${booking.date}</strong> at <strong>${booking.time}</strong>
      is now <strong>${booking.status}</strong>.
    </p>
    <p>Payment method: <strong>${booking.paymentMethod || "Not paid yet"}</strong>.</p>
  `;
}

/* ====== ADMIN PAGE ====== */

function initAdminPage() {
  const emailEl      = document.getElementById("adminEmail");
  const passEl       = document.getElementById("adminPassword");
  const msgEl        = document.getElementById("adminMessage");
  const loginBtn     = document.getElementById("adminLoginBtn");
  const tableSection = document.getElementById("adminTableSection");
  const tbody        = document.getElementById("bookingsTableBody");

  if (!emailEl || !passEl || !loginBtn || !tableSection || !tbody) {
    console.warn("Admin elements not found – check IDs in admin.html");
    return;
  }

  const ADMIN_FLAG_KEY = "f2c_admin_logged_in";

  function renderBookings() {
    const rows = loadBookings();
    tbody.innerHTML = "";

    if (!rows.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td colspan="9" style="padding:8px;">
          No bookings saved yet. Once customers save bookings on the booking page,
          they will appear here.
        </td>
      `;
      tbody.appendChild(tr);
      return;
    }

    rows
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .forEach(b => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td style="padding:8px;">${b.id ?? "-"}</td>
          <td style="padding:8px;">${b.name ?? "-"}</td>
          <td style="padding:8px;">${b.email || "-"}</td>
          <td style="padding:8px;">${b.phone ?? "-"}</td>
          <td style="padding:8px;">${b.serviceName ?? "-"}</td>
          <td style="padding:8px;">${b.date ?? "-"}</td>
          <td style="padding:8px;">${b.time ?? "-"}</td>
          <td style="padding:8px;">${b.status ?? "Saved"}</td>
          <td style="padding:8px;">${b.paymentMethod || "Not paid yet"}</td>
        `;
        tbody.appendChild(tr);
      });
  }

  function showDashboard() {
    tableSection.style.display = "block";
    renderBookings();
    tableSection.scrollIntoView({ behavior: "smooth" });
  }

  loginBtn.addEventListener("click", () => {
    msgEl.textContent = "";
    const email = (emailEl.value || "").trim().toLowerCase();
    const pass  = passEl.value || "";

    if (email === "admin@2fast2clean.co.za" && pass === "admin123") {
      localStorage.setItem(ADMIN_FLAG_KEY, "true");
      msgEl.style.color = "#00ff7f";
      msgEl.textContent = "Login successful. Loading dashboard...";
      showDashboard();
    } else {
      localStorage.removeItem(ADMIN_FLAG_KEY);
      msgEl.style.color = "#ffb347";
      msgEl.textContent = "Invalid credentials. Use admin@2fast2clean.co.za / admin123.";
      tableSection.style.display = "none";
    }
  });

  // If admin already logged in earlier, auto-show dashboard
  if (localStorage.getItem(ADMIN_FLAG_KEY) === "true") {
    showDashboard();
  }
}
