/* ============================
   AUTH & SECURITY (LOCALSTORAGE)
   ============================ */

const USERS_KEY = "f2c_users";
const CURRENT_USER_KEY = "f2c_current_user";

// ---- ADMIN CREDENTIALS (only you) ----
const ADMIN_EMAIL = "oleratomogaki@gmail.com";
const ADMIN_PASSWORD = "@MogakiOle050104";


/* ---- helpers to work with users ---- */
function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || "null");
  } catch {
    return null;
  }
}

function setCurrentUser(user) {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

function logoutUser() {
  // Clears the current user from localStorage
  setCurrentUser(null);
}

/* Simple (non-cryptographic) hash – demo only */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

/* Strong-ish password rules (front-end validation) */
function isStrongPassword(pw) {
  return (
    pw.length >= 8 &&
    /[a-z]/.test(pw) &&
    /[A-Z]/.test(pw) &&
    /\d/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}

/* ================
   VALIDATION HELPERS
   ================ */

function isValidName(name) {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  if (!/[A-Za-z]/.test(trimmed)) return false;
  return /^[A-Za-z\s'.-]+$/.test(trimmed);
}

function isValidEmail(email) {
  if (!email) return false;
  const trimmed = email.trim();
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(trimmed);
}

function isValidPhone(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/\s+/g, "");
  return /^(0\d{9}|(\+27)\d{9}|\d{8,12})$/.test(cleaned);
}

function isValidDateString(str) {
  if (!str) return false;
  const parts = str.split("-");
  if (parts.length !== 3) return false;

  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return false;

  const dt = new Date(str + "T00:00:00");
  return (
    dt.getFullYear() === y &&
    dt.getMonth() + 1 === m &&
    dt.getDate() === d
  );
}

function isTodayOrFuture(str) {
  if (!isValidDateString(str)) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const chosen = new Date(str + "T00:00:00");
  return chosen >= today;
}

/* ===================
   REGISTER & LOGIN
   =================== */

function registerUser(name, email, password) {
  const users = loadUsers();
  const trimmedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (!isValidName(trimmedName)) {
    throw new Error("Please enter a valid full name (letters and spaces only).");
  }
  if (!isValidEmail(normalizedEmail)) {
    throw new Error("Please enter a valid email address.");
  }

  // 🚫 Nobody can sign up using the admin email
  if (normalizedEmail === ADMIN_EMAIL) {
    throw new Error("This email is reserved for the site administrator.");
  }

  if (users.some(u => u.email === normalizedEmail)) {
    throw new Error("An account with this email already exists. Please log in.");
  }
  if (!isStrongPassword(password)) {
    throw new Error(
      "Password must be at least 8 characters and contain uppercase, lowercase, a number and a symbol."
    );
  }

  // normal users
  const role = "user";

  const user = {
    name: trimmedName,
    email: normalizedEmail,
    passwordHash: simpleHash(password),
    role
  };

  users.push(user);
  saveUsers(users);

  // Auto login after sign-up
  setCurrentUser({ name: user.name, email: user.email, role: user.role });

  return user;
}


function loginUser(email, password) {
  const users = loadUsers();
  const normalizedEmail = email.trim().toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    throw new Error("Please enter a valid email address.");
  }
  if (!password) {
    throw new Error("Please enter your password.");
  }

  // 🔐 Special case: ADMIN login (your credentials only)
  if (normalizedEmail === ADMIN_EMAIL) {
    if (password !== ADMIN_PASSWORD) {
      throw new Error("Invalid email or password.");
    }

    const adminUser = {
      name: "Site Admin",
      email: ADMIN_EMAIL,
      role: "admin"
    };

    // Optionally store admin in users array if not already present
    const existing = users.find(u => u.email === ADMIN_EMAIL);
    if (!existing) {
      users.push({
        name: "Site Admin",
        email: ADMIN_EMAIL,
        passwordHash: simpleHash(ADMIN_PASSWORD),
        role: "admin"
      });
      saveUsers(users);
    }

    setCurrentUser(adminUser);
    return adminUser;
  }

  // 🌍 Normal user login (from sign-up)
  const candidateHash = simpleHash(password);
  const user = users.find(u => u.email === normalizedEmail);

  if (!user || user.passwordHash !== candidateHash) {
    throw new Error("Invalid email or password.");
  }

  setCurrentUser({ name: user.name, email: user.email, role: user.role });
  return user;
}

/* ==========================
   PAGE ACCESS (AUTH GUARD)
   ========================== */
function enforceAuthGuard() {
  const page = document.body.dataset.page;
  const current = getCurrentUser();

  // When opened as local files (file://...), each page has its own storage.
  // That means we can't reliably share the "logged in" state between pages.
  // To let you browse while testing from your computer, we skip redirects here.
  if (window.location.protocol === "file:") {
    return true;
  }

  // Normal behaviour when the site is hosted on http(s):
  // Block all other pages if not logged in
  if (!current && page !== "home") {
    window.location.href = "index.html";
    return false;
  }

  // Admin page: must be admin
  if (page === "admin" && (!current || current.role !== "admin")) {
    window.location.href = "index.html";
    return false;
  }

  return true;
}


/* Show/hide ADMIN nav link based on role */
function setupNavVisibility() {
  const current = getCurrentUser();
  const adminLink = document.querySelector('a[href="admin.html"]');

  if (adminLink) {
    if (!current || current.role !== "admin") {
      adminLink.style.display = "none";
    } else {
      adminLink.style.display = "inline-block";
    }
  }
}

/* Show/hide LOGOUT link */
function setupLogoutLink() {
  const logoutLink = document.getElementById("logoutLink");
  if (!logoutLink) return;

  const current = getCurrentUser();

  // Show or hide the link based on login status
  if (!current) {
    logoutLink.style.display = "none";
  } else {
    logoutLink.style.display = "inline-block";
  }

  // Always bind a single click handler that logs out
  logoutLink.onclick = (e) => {
    e.preventDefault();
    logoutUser();                 // clears localStorage
    window.location.href = "index.html"; // go back to login view
  };
}


/* ======================
   HOME PAGE VIEW TOGGLING
   ====================== */

// When logged in: show hero + sections, hide login
function showMainContentAndHideLogin() {
  const loginBox     = document.getElementById("authBox");
  const main         = document.getElementById("mainContent");
  const homeSections = document.getElementById("homeSections");
  const contentWrap  = document.querySelector(".content");

  if (loginBox)     loginBox.style.display = "none";
  if (main)         main.style.display = "block";
  if (homeSections) homeSections.style.display = "block";

  // layout: hero + (space for login box) → side-by-side
  if (contentWrap)  contentWrap.style.justifyContent = "space-between";
}

// When logged out: only show login box, hide everything else
function showLoginOnly() {
  const loginBox     = document.getElementById("authBox");
  const main         = document.getElementById("mainContent");
  const homeSections = document.getElementById("homeSections");
  const contentWrap  = document.querySelector(".content");

  if (loginBox)     loginBox.style.display = "block";
  if (main)         main.style.display = "none";
  if (homeSections) homeSections.style.display = "none";

  // center the login box
  if (contentWrap)  contentWrap.style.justifyContent = "center";
}

/* =========================
   ATTACH LOGIN/SIGNUP (HOME)
   ========================= */

function initAuthBoxIfPresent() {
  const page = document.body.dataset.page;
  if (page !== "home") return; // only index.html has the login box

  const loginFields = document.getElementById("loginFields");
  const signupFields = document.getElementById("signupFields");
  const authTitle = document.getElementById("authTitle");
  const loginMsg = document.getElementById("loginMessage");

  if (!loginFields || !signupFields) return;

  const showSignupLink = document.getElementById("showSignupLink");
  const showLoginLink = document.getElementById("showLoginLink");
  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");

  function showLogin() {
    authTitle.textContent = "Login";
    loginFields.style.display = "block";
    signupFields.style.display = "none";
    loginMsg.textContent = "";
  }

  function showSignup() {
    authTitle.textContent = "Sign up";
    loginFields.style.display = "none";
    signupFields.style.display = "block";
    loginMsg.textContent = "";
  }

  if (showSignupLink) {
    showSignupLink.addEventListener("click", (e) => {
      e.preventDefault();
      showSignup();
    });
  }

  if (showLoginLink) {
    showLoginLink.addEventListener("click", (e) => {
      e.preventDefault();
      showLogin();
    });
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      loginMsg.textContent = "";

      const email = document.getElementById("loginEmail").value;
      const pw    = document.getElementById("loginPassword").value;

      if (!email || !pw) {
        loginMsg.style.color = "#ff7200";
        loginMsg.textContent = "Please enter email and password.";
        return;
      }

      try {
        loginUser(email, pw);
        loginMsg.style.color = "#00ff7f";
        loginMsg.textContent = "Login successful – loading site...";
        setupNavVisibility();
        setupLogoutLink();
        showMainContentAndHideLogin();
      } catch (err) {
        loginMsg.style.color = "#ff7200";
        loginMsg.textContent = err.message;
      }
    });
  }

  if (signupBtn) {
    signupBtn.addEventListener("click", (e) => {
      e.preventDefault();
      loginMsg.textContent = "";

      const name = document.getElementById("signupName").value;
      const email = document.getElementById("signupEmail").value;
      const pw1 = document.getElementById("signupPassword").value;
      const pw2 = document.getElementById("signupPassword2").value;

      if (!name || !email || !pw1 || !pw2) {
        loginMsg.style.color = "#ff7200";
        loginMsg.textContent = "Please fill in all sign-up fields.";
        return;
      }
      if (pw1 !== pw2) {
        loginMsg.style.color = "#ff7200";
        loginMsg.textContent = "Passwords do not match.";
        return;
      }

      try {
        registerUser(name, email, pw1);
        loginMsg.style.color = "#00ff7f";
        loginMsg.textContent = "Sign-up successful – you are now logged in.";
        setupNavVisibility();
        setupLogoutLink();
        showMainContentAndHideLogin();
      } catch (err) {
        loginMsg.style.color = "#ff7200";
        loginMsg.textContent = err.message;
      }
    });
  }

  // On page load: decide what to show
  const current = getCurrentUser();
  if (current) {
    // Already logged in → show hero + sections
    showMainContentAndHideLogin();
    loginMsg.style.color = "#00ff7f";
    loginMsg.textContent = `Welcome back, ${current.email}`;
  } else {
    // Not logged in → show only login box
    showLoginOnly();
  }
}

/* ================
   GLOBAL INIT #1
   ================ */


document.addEventListener("DOMContentLoaded", () => {
  const allowed = enforceAuthGuard();
  if (!allowed) return; // will redirect if not allowed

  setupNavVisibility();
  setupLogoutLink();
  initAuthBoxIfPresent();

  // 🔹 PAGE-SPECIFIC INIT
  const page = document.body.dataset.page;

  if (page === "booking")          initBookingPage();
  if (page === "payment")          initPaymentPage();
  if (page === "payment-success")  initPaymentSuccessPage();
  if (page === "admin")            initAdminPage();
});


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

    const customer_name  = nameEl.value.trim();
    const customer_phone = phoneEl.value.trim();
    const customer_email = emailEl.value.trim();
    const service_code   = svcEl.value;
    const day            = dateEl.value;
    const time           = timeEl.value;

    // Strong field validation
    if (!isValidName(customer_name)) {
      return "Please enter a valid full name (letters and spaces only).";
    }

    if (!isValidPhone(customer_phone)) {
      return "Please enter a valid phone number, e.g. 082… or +27…";
    }

    if (customer_email && !isValidEmail(customer_email)) {
      return "Please enter a valid email address, or leave it blank.";
    }

    if (!isValidDateString(day) || !isTodayOrFuture(day)) {
      return "Please choose a valid booking date (today or a future date).";
    }

    if (!time) {
      return "Please choose a booking time.";
    }

    if (!service_code) {
      return "Please select a wash package.";
    }

    return null; // means "no errors"
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
  const tableSection = document.getElementById("adminTableSection");
  const tbody        = document.getElementById("bookingsTableBody");
  const exportBtn    = document.getElementById("exportPdfBtn");

  if (!tableSection || !tbody) {
    console.warn("Admin table elements not found – check IDs in admin.html");
    return;
  }

  const current = getCurrentUser();
  // Extra safety: if somehow here without admin role, bounce to home
  if (!current || current.role !== "admin") {
    window.location.href = "index.html";
    return;
  }

  function renderBookings() {
    const rows = loadBookings();
    tbody.innerHTML = "";

    if (!rows.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td colspan="10" style="padding:8px;">
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
          <td style="padding:8px;">
            <button class="btnn small delete-booking" data-id="${b.id ?? ""}">
              Delete
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
  }

  function showDashboard() {
    tableSection.style.display = "block";
    renderBookings();
    tableSection.scrollIntoView({ behavior: "smooth" });
  }

  // Immediately show dashboard (no extra login on this page)
  showDashboard();

  // Export bookings as PDF (browser print → choose "Save as PDF")
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      window.print();
    });
  }

  // Delete booking
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest(".delete-booking");
    if (!btn) return;

    const id = parseInt(btn.dataset.id, 10);
    if (!id) return;

    if (!confirm("Delete this booking?")) return;

    let rows = loadBookings();
    rows = rows.filter(b => b.id !== id);
    saveBookings(rows);
    renderBookings();
  });
}

