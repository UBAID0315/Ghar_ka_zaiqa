# Ghar Ka Zaiqa Lunch Box — Product Requirements & Progress

## Original Problem Statement
Make the existing Ghar Ka Zaiqa React food site fully responsive across every screen size (mobile,
tablet, desktop), adjusting items size according to the screen, fixing any layout issues, and making
the experience feel professional. Fix anything that needs fixing along the way.

## User Choices (gathered)
- WhatsApp delivery: free **Click-to-WhatsApp** deep link to **923035698404** (auto-fills message).
- Ordering: **cart** (dishes + quantities → total → checkout) **and** keep the simple booking form.
- **Admin dashboard with login** to manage order statuses.
- **Chef dashboard** with kitchen prep summary, sound alerts and order state machine.
- Elevate the existing green/gold/cream look.

## Architecture
- Frontend: React 19 (CRA + craco), React Router 7. Pages: `/` (Home + Layout + Cart), `/admin/login`,
  `/admin`, `/chef`.
- Backend: FastAPI + MongoDB (motor). JWT Bearer auth (token in localStorage `gkz_token`).
- Design ported from the uploaded Vite app into CRA, elevated with hero glow, animated stats
  count-up, floating cart button, sticky mobile CTA, refined shadows/buttons. Font: Hanken Grotesk.
- Local MongoDB used in this environment (`mongodb://localhost:27017`).

## Implemented (2026-06-25 → 2026-06-27)
- Public ordering API `POST /api/orders` (cart + booking types) saved to MongoDB.
- Cart system: add to cart from menu, qty controls, cart drawer, checkout form → creates order
  then opens prefilled WhatsApp message to owner.
- Booking form (#book) → creates booking order + opens WhatsApp.
- Admin: JWT login, protected dashboard with stats (total/new/today/revenue), order list, status
  filter, status update dropdown, delete, per-customer WhatsApp link, 20s polling.
- Chef Dashboard with batch prep summary, sound alerts, active/completed filters, status workflow.
- Admin/Chef seeded on startup: admin@gharkazaiqa.com / GharKaZaiqa@2026,
  chef@gharkazaiqa.com / ChefZaiqa2026.

### Responsive Overhaul (2026-06-27)
- Replaced fragmented breakpoints with a clean system: 360/480/640/880/991/1199/1280.
- Hero padding switched from fixed `13%` / `34%` to `clamp()` so the plate fits cleanly on all
  screens; `.plate-wrap` now has explicit `min-height` so the disc renders on tablet/mobile.
- Brand logo / nav-bar padding / footer padding all moved to `clamp()` (no more 210px footer
  padding on a 320px phone).
- Hero title/lead, strip items, weekly-plan card titles all fluid via `clamp()`.
- Tablet single-column hero kicks in below 991px (1024px desktops keep the 2-col hero).
- Mobile navigation collapses nav-pill + login button below 880px (burger drawer takes over).
- Admin & Chef dashboards: header stacks, tabs scroll horizontally, stats grid collapses (4→2→1),
  filters wrap, search/sort inputs full-width, users table horizontal-scrolls, menu form grid
  collapses to 1-column.
- Added missing styles for `chef-dashboard-controls` and `chef-filters` (previously unstyled).
- Cart drawer takes full viewport width on <=480px; cart items more compact.
- Auth modal padding tightened for small phones.
- Verified no horizontal scrollbar at 1920/1440/1280/1024/768/480/375/320 viewports.

## Backlog / Next Action Items
- P1: Replace stats in-memory counting with MongoDB aggregation as volume grows.
- P1: Global 401 handling on frontend to auto-logout on expired token.
- P2: Real photos for every weekly-plan dish; founder/kitchen story section; FAQ; coverage-area map.
- P2: Set explicit CORS origins if switching admin auth to cookies.
- P2: Email/SMS notification option (e.g., Twilio) in addition to WhatsApp.
- P2: Visual polish — dark-mode admin theme; brand wordmark in footer.
