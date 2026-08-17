# FixIt — Product Requirements Document

## Tagline
"Don't search for the service. Just tell us what's wrong."

## Original Problem Statement
FixIt is an on-demand, problem-first service marketplace connecting customers with nearby
professionals (plumbers, electricians, AC techs, appliance repair, cleaners, carpenters,
painters, pest control, etc.). Instead of "What service do you need?", it asks "What's wrong?".
Customers describe a problem (text/voice/photo), AI classifies it into a service category and
recommends professionals. Journey: Describe → Understand → Find → Compare → Book → Track →
Complete → Pay → Review. Three roles: Customer, Professional, Admin. Market: India, INR (₹).

## Architecture
- Frontend: Expo (React Native) + expo-router, teal/clean design system (`src/theme.ts`)
- Backend: FastAPI (`/app/backend`), modular: server.py, auth.py, ai_service.py, storage.py, seed_data.py, database.py
- DB: MongoDB (motor). Collections: users, professionals, categories, bookings, messages, reviews, notifications, uploads, settings
- Auth: JWT (email/password), roles customer/professional/admin, bcrypt hashing
- AI: Gemini 3 Flash via emergentintegrations for problem classification
- Storage: Emergent managed object storage for photos/videos

## User Personas
1. Customer — needs a household problem solved, doesn't know which trade to call.
2. Professional — tradesperson receiving/accepting jobs, updating status, earning.
3. Admin — verifies pros, manages users/bookings, sets commission, views analytics.

## Core Requirements (static)
- Problem-first home ("What's wrong?"), AI classification with non-diagnostic wording + disclaimer.
- Ranked professional matching (availability, distance, rating, jobs, response time, ETA, verification).
- Full booking lifecycle with status timeline + notifications.
- In-app chat per booking (phone numbers hidden).
- Estimated vs final price; professional revises quote; customer approves at payment.
- Commission configurable by admin; payouts computed.
- Reviews recompute pro rating; admin verification workflow.
- Emergency mode (fastest arrival, additional-charges notice).
- Secrets in env only; no hardcoded credentials.

## Implemented (2026-06 — Phase 1–3 MVP)
- [x] JWT auth: register (customer/professional), login, /me, profile update; admin seeded.
- [x] 11 service categories + 8 verified demo professionals seeded.
- [x] AI problem classification (Gemini 3 Flash) with follow-up questions + disclaimer.
- [x] Customer Home: text input, photo/video upload (object storage), quick categories, emergency.
- [x] Professional matching with ranking + emergency ETA prioritization.
- [x] Professional detail (skills, reviews, pricing) + Book Now.
- [x] Booking flow (date/time/urgency/instructions/media) + estimated price.
- [x] Booking tracker: 8-step timeline, contact pro, cancel, pay (cash live / card+UPI gateway pending), review.
- [x] In-app chat (polling), notifications feed.
- [x] Professional dashboard: availability toggle, metrics, accept/decline, advance status, set final price; jobs list; profile editor.
- [x] Admin dashboard (mobile): overview stats, commission editor, verify/reject/suspend pros, suspend/reactivate users.
- [x] Testing: backend 33/34 pytest pass; frontend flows verified.

## Backlog (prioritized)
### P0 (next)
- Mobile number + OTP login (integration pending).
- Real map + live location tracking for pro en-route (maps integration layer pending).
### P1
- Payments: live UPI/Card/Wallet gateway (Razorpay/Stripe) — currently cash only, others labeled pending.
- Voice problem input (record → transcribe → classify) — currently "coming soon".
- Saved addresses & favourite professionals.
- Disputes/complaints ticket system; review moderation queue in admin.
### P2
- My Home (appliances + maintenance reminders).
- Professional payout ledger + subscriptions / featured listings.
- Multi-city / multi-currency / i18n; responsive web admin dashboard.
- Advanced analytics (popular services, active users, cancellation trends charts).

## Test Credentials
- Admin: admin@fixit.com / Admin@12345
- Customer: cust1@test.com / pass123
- (Demo professionals have no login; register a professional and verify via admin to test pro app.)

## Next Tasks
1. Add Mobile OTP auth (Phase 1 completion).
2. Integrate maps + location tracking (Phase 2).
3. Integrate a live payment gateway (Phase 3 completion).
