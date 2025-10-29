// Theme toggle & year label
const $ = (q, el=document) => el.querySelector(q);
const $$ = (q, el=document) => [...el.querySelectorAll(q)];
const yearEl = $("#year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

const themeToggle = $("#themeToggle");
(function initTheme(){
  const saved = localStorage.getItem("theme") || "dark";
  if(saved === "light") document.documentElement.classList.add("light");
  if(themeToggle){
    themeToggle.addEventListener("click", (e)=>{
      e.preventDefault();
      document.documentElement.classList.toggle("light");
      localStorage.setItem("theme", document.documentElement.classList.contains("light") ? "light" : "dark");
    });
  }
})();

// --- Shared "services" config (mirrors what’s on Services page)
const SERVICES = [
  { id: 'express', name: 'Express Wash', price: 80, duration: 30, desc: 'Exterior rinse & dry' },
  { id: 'standard', name: 'Standard Wash', price: 120, duration: 45, desc: 'Exterior + vacuum' },
  { id: 'premium', name: 'Premium Detail', price: 250, duration: 90, desc: 'Full interior & exterior detail' },
];

// --- Booking page logic (client-side demo)
if (location.pathname.endsWith("booking.html")) {
  const svcGrid = $("#svcGrid");
  const dayInput = $("#dayInput");
  const slotsWrap = $("#slotsWrap");
  const noSlotsMsg = $("#noSlotsMsg");
  const nameEl = $("#name");
  const phoneEl = $("#phone");
  const emailEl = $("#email");
  const confirmBtn = $("#confirmBtn");
  const errEl = $("#err");
  const okEl = $("#ok");
  let selectedService = null;
  let selectedSlot = null;

  // Load preselected service from query ?svc=premium
  const params = new URLSearchParams(location.search);
  const svcParam = params.get("svc");

  // Render service cards
  function renderServices() {
    svcGrid.innerHTML = "";
    SERVICES.forEach(svc => {
      const a = document.createElement("article");
      a.className = "card price";
      a.innerHTML = `
        <h3>${svc.name}</h3>
        <p class="big">R ${svc.price}</p>
        <p>${svc.desc} • ${svc.duration} mins</p>
        <button class="btn ${selectedService?.id===svc.id ? 'primary' : ''}" data-svc="${svc.id}">
          ${selectedService?.id===svc.id ? 'Selected' : 'Select'}
        </button>
      `;
      svcGrid.appendChild(a);
    });
    $$("#svcGrid [data-svc]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        selectedService = SERVICES.find(s => s.id === btn.dataset.svc);
        renderServices();
      });
    });

    // Auto-select from query
    if (svcParam && !selectedService) {
      const pre = SERVICES.find(s => s.id === svcParam);
      if (pre) { selectedService = pre; renderServices(); }
    }
  }

  // Default date = today
  function isoDate(d){ return d.toISOString().slice(0,10); }
  const today = new Date();
  if (dayInput) {
    dayInput.value = isoDate(today);
    dayInput.min = isoDate(today);
  }

  // Generate slots 09:00–16:00 hourly, capacity=4 (demo)
  function getSlotsForDay(day) {
    const slots = [];
    for (let h=9; h<=16; h++){
      slots.push({ id: `${day}-${h.toString().padStart(2,'0')}:00`, time: `${h.toString().padStart(2,'0')}:00`, capacity: 4 });
    }
    // Reduce remaining based on existing bookings
    const all = loadBookings();
    const remaining = {};
    slots.forEach(s => remaining[s.id] = s.capacity);
    all.filter(b => b.day===day && (b.status==='PENDING' || b.status==='CONFIRMED'))
       .forEach(b => { remaining[b.slotId] = Math.max(0, (remaining[b.slotId] ?? 0) - 1); });
    return slots.map(s => ({...s, remaining: remaining[s.id] ?? s.capacity}));
  }

  function renderSlots() {
    const day = dayInput.value;
    const slots = getSlotsForDay(day);
    slotsWrap.innerHTML = "";
    selectedSlot = null;

    if (!slots.length) {
      noSlotsMsg.hidden = false;
      return;
    }
    noSlotsMsg.hidden = true;

    slots.forEach(s=>{
      const btn = document.createElement("button");
      btn.className = "slot-btn";
      btn.textContent = `${s.time} (${s.remaining} left)`;
      btn.disabled = s.remaining <= 0;
      btn.addEventListener("click", ()=>{
        selectedSlot = s;
        // mark selected
        $$(".slot-btn", slotsWrap).forEach(b => b.classList.remove("primary"));
        btn.classList.add("primary");
      });
      slotsWrap.appendChild(btn);
    });
  }

  function loadBookings(){
    try { return JSON.parse(localStorage.getItem("bookings") || "[]"); }
    catch { return []; }
  }
  function saveBookings(rows){
    localStorage.setItem("bookings", JSON.stringify(rows));
  }
  function nextId(){
    const all = loadBookings();
    return (all.reduce((m, r)=>Math.max(m, r.id), 0) || 0) + 1;
  }

  function validate(){
    errEl.hidden = true; okEl.hidden = true;
    if (!selectedService) return "Please select a service.";
    if (!selectedSlot) return "Please select a time slot.";
    const name = nameEl.value.trim();
    const phone = phoneEl.value.trim();
    if (!name) return "Please enter your full name.";
    if (!/^\+?\d{8,15}$/.test(phone)) return "Enter a valid phone number (e.g., +27…).";
    return null;
  }

  async function mockCharge(amountCents){
    // Simulate success
    await new Promise(r=>setTimeout(r, 700));
    return { ok: true, ref: 'MOCK-' + Math.random().toString(36).slice(2,8).toUpperCase() };
  }

  async function submit(){
    const v = validate();
    if (v){ errEl.textContent = v; errEl.hidden = false; return; }

    const day = dayInput.value;
    const id = nextId();
    const amount = selectedService.price;
    const res = await mockCharge(amount*100);

    const rows = loadBookings();
    rows.push({
      id,
      customer_name: nameEl.value.trim(),
      customer_phone: phoneEl.value.trim(),
      customer_email: emailEl.value.trim(),
      service: selectedService.name,
      service_id: selectedService.id,
      amount,
      day,
      time: selectedSlot.time,
      slotId: selectedSlot.id,
      status: res.ok ? 'CONFIRMED' : 'PENDING',
      payment_status: res.ok ? 'PAID' : 'UNPAID',
      created_at: new Date().toISOString()
    });
    saveBookings(rows);

    okEl.textContent = res.ok
      ? `Booking #${id} confirmed. (Payment mock OK)`
      : `Booking #${id} created, payment pending (mock).`;
    okEl.hidden = false;
    errEl.hidden = true;

    // soft reset selection
    selectedSlot = null;
    renderSlots();
  }

  renderServices();
  renderSlots();
  dayInput?.addEventListener("change", renderSlots);
  confirmBtn?.addEventListener("click", submit);
}

// --- Admin page logic (reads from localStorage)
if (location.pathname.endsWith("admin.html")) {
  const adminLoginBtn = $("#adminLogin");
  const adminEmail = $("#adminEmail");
  const adminPass = $("#adminPass");
  const adminErr = $("#adminErr");
  const dash = $("#dash");
  const tblBody = $("#bookingsTable tbody");

  function loadBookings(){
    try { return JSON.parse(localStorage.getItem("bookings") || "[]"); }
    catch { return []; }
  }
  function saveBookings(rows){
    localStorage.setItem("bookings", JSON.stringify(rows));
  }

  function renderTable(){
    const rows = loadBookings().sort((a,b)=> (a.day+a.time).localeCompare(b.day+b.time));
    tblBody.innerHTML = "";
    if (!rows.length){
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="8">No bookings yet.</td>`;
      tblBody.appendChild(tr);
      return;
    }
    rows.forEach(r=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.id}</td>
        <td>${r.customer_name}</td>
        <td>${r.customer_phone}</td>
        <td>${r.service}</td>
        <td>${r.day}</td>
        <td>${r.time}</td>
        <td>${r.status} • ${r.payment_status}</td>
        <td>
          <button class="btn small" data-act="confirm" data-id="${r.id}">Confirm</button>
          <button class="btn small" data-act="cancel" data-id="${r.id}">Cancel</button>
          <button class="btn small" data-act="complete" data-id="${r.id}">Complete</button>
        </td>
      `;
      tblBody.appendChild(tr);
    });

    // Actions
    $$("button[data-act]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = Number(btn.dataset.id);
        const act = btn.dataset.act;
        const rows = loadBookings();
        const row = rows.find(x=>x.id===id);
        if (!row) return;

        if (act==="confirm"){ row.status = "CONFIRMED"; row.payment_status ||= "PAID"; }
        if (act==="cancel"){ row.status = "CANCELLED"; }
        if (act==="complete"){ row.status = "COMPLETED"; }
        saveBookings(rows);
        renderTable();
      });
    });
  }

  adminLoginBtn?.addEventListener("click", ()=>{
    adminErr.hidden = true;
    const ok = (adminEmail.value.trim()==="admin@2fast.local" && adminPass.value==="admin123");
    if (!ok){
      adminErr.textContent = "Invalid credentials (hint: admin@2fast.local / admin123)";
      adminErr.hidden = false;
      return;
    }
    dash.hidden = false;
    renderTable();
  });
}
