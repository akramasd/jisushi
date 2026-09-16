# Phase 0 Audit — Website Audit Document

## Executive Summary
This document provides a comprehensive audit of the Ji Sushi public website (`/ship`), its underlying API, datastore integrations, resilience features, security posture, and backward compatibility with existing staff applications (Kitchen, Waiter, Owner KDS/apps).

The application is built on Next.js 16 (App Router), TypeScript, Tailwind CSS v4, and Supabase PostgreSQL as primary datastore, backed by Google Sheets as failover/mirror.

---

## 1. Public Pages Audit

| Page / Route | Purpose | Current State & Findings | Issues & Action Items |
|---|---|---|---|
| `/` | Home | Hero banner, quick navigation, promo banners, footer. | Styling needs UX refresh; CTAs are not prominent enough on mobile. |
| `/menu` & `/menukort` | Menu / Paper Scan | Display 98-item menu categorized with allergen badges and prices. | Static PDF viewer on `/menukort` works well; menu presentation can be visually enhanced. |
| `/takeaway` | Takeaway Ordering | Interactive cart, category filters, pickup time selector, client-side validation. | Ordering flow is clean. Relies on client state and posts to `/api/checkout`. |
| `/booking` | Table Reservation | Current page displays a static "Call us" CTA with unused client form state. | Missing true reservation intake system (`Bestil bord` CTA must support real digital requests). |
| `/kontakt` & `/om-os` & `/jobs` | Restaurant Info | Information, contact details, opening hours, job application info. | Content is clear; metadata and SEO structured data should be audited. |
| `/privatlivspolitik` & `/retningslinjer` | Legal & Policies | Privacy policy, terms, allergen disclosures. | Complete and up to date with EU Regulation 1169/2011 allergen guidelines. |
| `/ordre/[token]` | Customer Order Tracking | Live status lookup via unguessable 32-hex `public_token`. | Works cleanly for normal Supabase orders; degraded Sheet orders return `token: null`. |

---

## 2. Infrastructure & Fallback System Audit

### Supabase Integration
- **Primary datastore**: Stores `menu_items`, `orders`, `system_events`, `outbound_messages`, `loyalty_customers`, and `settings`.
- **Row Level Security (RLS)**: Anonymous role (`anon`) has `SELECT` access ONLY on `menu_items`. All order writes/reads bypass RLS via server routes using `SUPABASE_SERVICE_ROLE_KEY`.

### Google Sheets Failover & Apps Script (`fallback/Code.gs`)
- **Current Behavior**: `/api/checkout` attempts to write to Supabase. If Supabase insert fails, it calls `mirrorToSheet()`.
- **Apps Script Audit Findings**:
  - Webhook secret verification exists (`sharedSecret()`), but missing secret in request body is checked conditionally.
  - Returns `{ ok: false, error: ... }` on error with HTTP 200 (needs explicit error status handling).
  - Lack of explicit concurrency lock in Google Apps Script when appending rows.
  - Idempotency key stored in Column 10 (`Ordre-ID`), updates status if key matches existing row.

### Fallback Menu (`data/menu-fallback.json`)
- Contains full seed catalog (101 items including Super Tilbud combos).
- Currently `/api/checkout` only queries Supabase `menu_items` for pricing. If Supabase is down *before* insert (e.g. menu lookup fails), checkout returns HTTP 500 instead of falling back to server-side `menu-fallback.json`.

---

## 3. Backend Contracts & Staff App Compatibility

Existing staff applications (Kitchen KDS, Waiter, Owner app) depend on the Supabase `orders` table contract:
- `id` (UUID, PK)
- `order_no` (INT, IDENTITY)
- `customer_name` (TEXT)
- `customer_phone` (TEXT)
- `phone_digits` (TEXT, GENERATED)
- `items` (JSONB: array of `{ id, name, qty, price }`)
- `status` (TEXT: `'pending' | 'accepted' | 'ready' | 'completed' | 'cancelled'`)
- `total_price` (NUMERIC(10,2))
- `pickup_minutes` (INT)
- `idempotency_key` (TEXT, UNIQUE)
- `public_token` (TEXT, UNIQUE)
- `created_at`, `accepted_at`, `ready_at`, `completed_at`, `cancelled_at` (TIMESTAMPTZ)

**Contract Preservation Rule**: Field names, data types, and status values must remain strictly unchanged to avoid breaking existing staff apps.

---

## 4. 10-Pass Council Review Evaluation

1. **Customer UX**: Takeaway cart is smooth. Booking is phone-only. Degraded checkout gives clear message but lacks order status page tracking for Sheet-only orders.
2. **Reliability/SRE**: High test coverage (110 passing tests). Gap: Supabase menu lookup failure causes HTTP 500 instead of triggering fallback checkout.
3. **Distributed Systems**: Idempotency key protection exists on `/api/checkout`. Double taps are prevented.
4. **Database Integrity**: Strict status CHECK constraint, foreign keys, generated phone_digits column.
5. **Failover/Recovery**: Sheet mirror works when DB insert fails. Automatic reconciliation back into Supabase is required when Supabase restores.
6. **Security/Privacy**: Anonymous key restricted via RLS. Secrets kept out of client bundle.
7. **API Compatibility**: Staff apps rely on `orders` table schema; contracts preserved.
8. **QA/Chaos Testing**: Suite covers pricing, hours, phone formatting, transitions, rate limiting, resilience.
9. **Deployment/Rollback**: Next.js stateless serverless deployment. Zero-downtime deploy.
10. **Simplicity/Resource Cost**: Built with native Next.js + Supabase + Google Apps Script. No unnecessary Redis/Kafka complexity.
