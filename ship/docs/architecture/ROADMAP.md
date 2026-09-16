# System Roadmap — Phases 1 to 14

This roadmap details the sequential execution plan for hardening and completing the Ji Sushi public website (`/ship`) while preserving backward compatibility with staff applications.

---

## Phase Execution Overview

### Phase 1 — Safety Foundation
- Establish CI & automated verification scripts.
- Freeze existing staff app API/data contracts (`orders`, status values, JSON structure).
- Ensure `npm test`, `npm run verify`, and `npm run check:scope` pass cleanly.

### Phase 2 — Google Sheets Hardening
- Audit and harden `fallback/Code.gs` and `lib/sheet-mirror.ts`.
- Implement fail-closed webhook secret verification, explicit JSON error responses, concurrency locks (`LockService`), and idempotency key deduplication in Sheets.

### Phase 3 — True Supabase-Outage Checkout
- Refactor `/api/checkout` to utilize trusted server-side `data/menu-fallback.json` whenever Supabase is unreachable during menu lookup or pricing.
- Strictly distinguish **Business Failures** (rejected without fallback) from **Infrastructure Failures** (triggering degraded fallback).

### Phase 4 — Idempotency & Duplicate Safety
- Ensure client checkout generates and preserves single idempotency key per order attempt.
- Harden retry logic and handle database race conditions (e.g. Postgres constraint 23505).

### Phase 5 — Reconciliation Service
- Implement deterministic, idempotent reconciliation route (`/api/cron/reconcile` / `lib/reconcile.ts`).
- Read emergency orders from Google Sheets and safely insert into Supabase upon recovery without duplicate creation.

### Phase 6 — Table Booking System
- Add prominent "Bestil bord" CTA on desktop and mobile header/hero.
- Implement digital reservation request flow with full validation (name, phone, email, date, time, guests) and `reservations` table storage.

### Phase 7 — Customer Order Tracking
- Audit `/ordre/[token]`. Handle unguessable tokens securely.
- Provide clear UI feedback for emergency degraded orders that lack a Supabase token.

### Phase 8 — Health & Observability
- Enhance `/api/health` to report status of website, Supabase, Google Sheet fallback, and reconciliation.
- Log infrastructure events to `system_events`.

### Phase 9 — Security Audit
- Review RLS, service-role usage, API rate limits, input sanitization, and secret protection.

### Phase 10 — Chaos Test Suite
- Write test suite exercising all 20 specified chaos scenarios (DB outage, double tap, lost response, corrupt price, malformed webhook).

### Phase 11 — SEO & Performance
- Add Schema.org JSON-LD structured data for Restaurant, Open Graph tags, canonical URLs, sitemap, robots.txt, and image optimizations.

### Phase 12 — Public Website Redesign & UX Polish
- Perform complete responsive visual design review across desktop, tablet, and mobile.
- Elevate branding with Japanese-inspired aesthetic, improved contrast, clear button hierarchy, and mobile touch targets.

### Phase 13 — 10-Pass Final Council Review
- Re-evaluate entire system against 10 perspectives: UX, SRE, Distributed Systems, DB Integrity, Failover, Security, API Compatibility, QA, Deployment, Simplicity.

### Phase 14 — Cleanup & Final Delivery
- Remove build artifacts, audit `.gitignore`, verify zero secrets, run final build & test verification.
