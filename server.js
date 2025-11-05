import express from "express";
import cors from "cors";

const app = express();
const PORT = 3000;

// Allow your frontend (adjust port if needed)
app.use(cors({
  origin: "http://localhost:5500",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// In-memory "database"
let bookings = [];
let nextId = 1;

// Health check
app.get("/", (req, res) => {
  res.send("2Fast2Clean API is running");
});

// Create booking
app.post("/api/bookings", (req, res) => {
  console.log("Incoming booking:", req.body);

  const {
    customer_name,
    customer_phone,
    customer_email,
    service_code,
    service_name,
    amount_cents,
    day,
    time,
    payment_method
  } = req.body || {};

  // Simple validation
  if (!customer_name || !customer_phone || !service_code || !service_name || !day || !time) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const booking = {
    id: nextId++,
    customer_name,
    customer_phone,
    customer_email: customer_email || null,
    service_code,
    service_name,
    amount_cents,
    day,
    time,
    payment_method,
    status: "PENDING"
  };

  bookings.push(booking);

  // Respond with created booking
  res.status(201).json({ booking });
});

// Get booking by ID (for payment success screen, etc.)
app.get("/api/bookings/:id", (req, res) => {
  const id = Number(req.params.id);
  const booking = bookings.find(b => b.id === id);

  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  res.json({ booking });
});

// Simple payment endpoint (mock but real endpoint)
app.post("/api/pay", (req, res) => {
  const { booking_id, method, amount_cents, card_last4 } = req.body || {};

  if (!booking_id || !method) {
    return res.status(400).json({ error: "booking_id and method are required" });
  }

  const booking = bookings.find(b => b.id === Number(booking_id));
  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  // Mark as paid and confirmed
  booking.status = "CONFIRMED";
  booking.payment_status = "PAID";
  booking.payment_method = method;
  booking.card_last4 = card_last4 || null;

  console.log(`Payment OK for booking ${booking_id} via ${method}`);

  res.json({ ok: true, booking });
});

app.listen(PORT, () => {
  console.log(`2Fast2Clean API running on http://localhost:${PORT}`);
  console.log("CORS allowed from: http://localhost:5500");
});
