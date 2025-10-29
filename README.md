# 2Fast 2Clean — Static Demo Website

This repo contains a static, client-side demo of the 2Fast 2Clean online booking concept.

## Pages
- `index.html` — Home/marketing
- `services.html` — Packages & info
- `booking.html` — Client-side booking demo (stores bookings in localStorage)
- `admin.html` — Mock admin dashboard (view/update local bookings)

## How to run locally
- Just open `index.html` in your browser.
- Or run a simple static server:
  - Python: `python3 -m http.server 8000` then open http://localhost:8000/

## GitHub Pages
1. Push this folder as your repo.
2. In GitHub → **Settings → Pages**:
   - Source: **Deploy from a branch**
   - Branch: `main` / folder `/root`
3. Save. Your site will be published at the URL shown.

## Demo credentials
- Admin: `admin@2fast.local` / `admin123` (client-side only)

> Note: This demo does not include a real backend or payments. It simulates slots, “charges,” and notifications.
