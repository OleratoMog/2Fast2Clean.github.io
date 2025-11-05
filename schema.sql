PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,      -- 'express', 'standard', 'premium'
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  duration_mins INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  service_code TEXT NOT NULL,
  service_name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  day TEXT NOT NULL,              -- YYYY-MM-DD
  time TEXT NOT NULL,             -- HH:MM
  payment_method TEXT NOT NULL,   -- 'pay_in_person' | 'card' | 'payfast' | 'yoco'
  status TEXT NOT NULL DEFAULT 'PENDING',         -- 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  payment_status TEXT NOT NULL DEFAULT 'UNPAID',  -- 'UNPAID' | 'PAID' | 'FAILED'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,         -- 'card' | 'payfast' | 'yoco' | 'cash'
  provider_ref TEXT,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL,           -- 'INITIATED' | 'SUCCESS' | 'FAILED'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
