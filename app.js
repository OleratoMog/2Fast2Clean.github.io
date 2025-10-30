const $ = (q, el=document) => el.querySelector(q);
const $$ = (q, el=document) => [...el.querySelectorAll(q)];
const yearEl = $("#year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
const cfg = window.__APP_CONFIG__ || { MOCK_MODE: false };

// Theme toggle
const themeToggle = $("#themeToggle");
(function initTheme(){
  const saved = localStorage.getItem("theme") || "dark";
  if(saved === "light") document.documentElement.classList.add("light");
  themeToggle?.addEventListener("click", (e)=>{
    e.preventDefault();
    document.documentElement.classList.toggle("light");
    localStorage.setItem("theme", document.documentElement.classList.contains("light") ? "light" : "dark");
  });
})();

// Services
const SERVICES = [
  { id: 'express',  name: 'Express Wash',   price: 80,  duration: 30, desc: 'Exterior rinse & dry' },
  { id: 'standard', name: 'Standard Wash',  price: 120, duration: 45, desc: 'Exterior + vacuum' },
  { id: 'premium',  name: 'Premium Detail', price: 250, duration: 90, desc: 'Full interior & exterior detail' },
];

// Booking page
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

  const params = new URLSearchParams(location.search);
  const svcParam = params.get("svc");

  function renderServices() {
    svcGrid.innerHTML = "";
    SERVICES.forEach(svc => {
      const card = document.createElement("article");
      card.className = "card price lift";
      const selected = selectedService?.id===svc.id;
      card.innerHTML = `
        <h3>${svc.name}</h3>
        <p class="big">R ${svc.price}</p>
        <p>${svc.desc} • ${svc.duration} mins</p>
        <button class="btn ${selected ? 'primary' : 'gold'}" data-svc="${svc.id}">
          ${selected ? 'Selected' : 'Select'}
        </button>
      `;
      svcGrid.appendChild(card);
    });
    $$("#svcGrid [data-svc]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        selectedService = SERVICES.find(s => s.id === btn.dataset.svc);
        renderServices();
      });
    });
    if (svcParam && !selectedService) {
      const pre = SERVICES.find(s => s.id === svcParam);
      if (pre) { selectedService = pre; renderServices(); }
    }
  }

  function isoDate(d){ const tzOff = d.getTimezoneOffset(); const local = new Date(d - tzOff*60000); return local.toISOString().slice(0,10); }
  const today = new Date();
  dayInput.value = isoDate(today);
  dayInput.min = isoDate(today);

  function getSlotsForDay(day) {
    const slots = [];
    for (let h=9; h<=16; h++){
      const hh = h.toString().padStart(2,'0') + ":00";
      slots.push({ id: `${day}-${hh}`, time: hh, capacity: 4 });
    }
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

    if (!slots.length) { noSlotsMsg.hidden = false; return; }
    noSlotsMsg.hidden = true;

    slots.forEach(s=>{
      const btn = document.createElement("button");
      btn.className = "slot-btn";
      btn.textContent = `${s.time} (${s.remaining} left)`;
      btn.disabled = s.remaining <= 0;
      btn.addEventListener("click", ()=>{
        selectedSlot = s;
        $$(".slot-btn", slotsWrap).forEach(b => b.classList.remove("primary"));
        btn.classList.add("primary");
      });
      slotsWrap.appendChild(btn);
    });
  }

  function loadBookings(){ try { return JSON.parse(localStorage.getItem("bookings") || "[]"); } catch { return []; } }
  function saveBookings(rows){ localStorage.setItem("bookings", JSON.stringify(rows)); }
  function nextId(){ const all = loadBookings(); return (all.reduce((m, r)=>Math.max(m, r.id), 0) || 0) + 1; }

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

  async function submit(){
    const v = validate();
    if (v){ errEl.textContent = v; errEl.hidden = false; return; }

    const id = nextId();
    const amount = selectedService.price;
    const day = dayInput.value;

    const row = {
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
      status: 'PENDING',
      payment_status: 'UNPAID',
      created_at: new Date().toISOString()
    };

    // Save pending booking so Admin can see it
    const all = loadBookings(); all.push(row); saveBookings(all);

    // Ask serverless to create signed PayFast payload
    try{
      const resp = await fetch(`${cfg.API_BASE}/create-payment`, {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          id, amount, name: row.customer_name, email: row.customer_email,
          phone: row.customer_phone, item_name: row.service,
          return_url: cfg.PAYFAST.return_url, cancel_url: cfg.PAYFAST.cancel_url,
          notify_url: cfg.PAYFAST.notify_url
        })
      });
      if (!resp.ok) throw new Error("Payment init failed");
      const formData = await resp.json();

      // Redirect to PayFast with auto-submitted form
      const form = document.createElement("form");
      form.method = "POST";
      form.action = formData.process_url;
      for (const [k,v] of Object.entries(formData.fields)){
        const input = document.createElement("input");
        input.type = "hidden"; input.name = k; input.value = v;
        form.appendChild(input);
      }
      document.body.appendChild(form); form.submit();
    }catch(e){
      errEl.textContent = "Could not start payment. Please try again.";
      errEl.hidden = false;
    }
  }

  renderServices();
  renderSlots();
  dayInput?.addEventListener("change", renderSlots);
  confirmBtn?.addEventListener("click", submit);
}

// Admin page
if (location.pathname.endsWith("admin.html")) {
  const adminLoginBtn = $("#adminLogin");
  const adminEmail = $("#adminEmail");
  const adminPass = $("#adminPass");
  const adminErr = $("#adminErr");
  const dash = $("#dash");
  const tblBody = $("#bookingsTable tbody");

  function loadBookings(){ try { return JSON.parse(localStorage.getItem("bookings") || "[]"); } catch { return []; } }
  function saveBookings(rows){ localStorage.setItem("bookings", JSON.stringify(rows)); }

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
        <td class="row-actions">
          <button class="btn small" data-act="confirm" data-id="${r.id}">Confirm</button>
          <button class="btn small" data-act="cancel" data-id="${r.id}">Cancel</button>
          <button class="btn small" data-act="complete" data-id="${r.id}">Complete</button>
        </td>
      `;
      tblBody.appendChild(tr);
    });

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
