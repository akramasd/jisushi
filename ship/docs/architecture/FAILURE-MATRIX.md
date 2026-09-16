# Phase 0 Architecture — Failure Matrix Document

## Overview
This failure matrix documents all failure modes, system classification (Business Failure vs Infrastructure Failure), fallback behavior, degradation state, customer UX response, and recovery/reconciliation mechanisms across the Ji Sushi ordering platform.

---

## 1. Failure Modes & Degradation Matrix

| Failure Mode | Failure Type | System Behavior & Fallback Path | Customer UX Impact | Recovery / Reconciliation |
|---|---|---|---|---|
| **Invalid Cart / Form Input** (Empty cart, invalid phone, missing name) | Business | Request rejected immediately with 400 Bad Request. No datastore written. | Red error message in UI detailing required correction. | N/A (Client corrects input). |
| **Restaurant Closed / Ordering Paused** | Business | Evaluated before DB writes. Rejected with 409 Conflict. Emergency mode is **NOT** bypassed. | Clear banner explaining closing hours or pause reason with phone CTA. | N/A. |
| **Sold Out Item in Cart** | Business | Server re-prices order against catalog. Detects `is_available: false`. Rejects with 409. | Message stating item is sold out; prompts removal. | N/A. |
| **Supabase Unavailable During Menu Lookup** | Infrastructure | Catch DB error during menu lookup. Fall back to server-side `data/menu-fallback.json`. Price order. | Degraded checkout proceed. Customer notified upon success. | Order written to Sheet; reconciled into Supabase upon recovery. |
| **Supabase Unavailable During Order Insert** | Infrastructure | Catch DB insert error. Invoke `mirrorToSheet()`. | Success response with `degraded: true`. Asks customer to phone if urgency required. | Order stored in Google Sheet; reconciled to Supabase when online. |
| **Response Lost After DB Insert** (Client network drop) | Infrastructure / Network | Client retries with identical `idempotency_key`. DB matches key, returns existing order. | Instant confirmation returned without duplicating order. | Unique index on `idempotency_key` prevents duplicates. |
| **Google Sheet Mirror Webhook Timeout / Failure** | Infrastructure | In normal mode, Supabase write succeeds. Webhook error logged to `system_events`. | Order succeeds normally (`degraded: false`). Customer sees tracking token. | Supabase holds canonical record. Kitchen KDS receives order. |
| **Both Supabase and Google Sheet Down** | Infrastructure | DB insert fails AND `mirrorToSheet()` fails. Returns 500 Internal Error. | Clear error message: *"Bestillingen kunne ikke gemmes. Ring til os på 31 33 44 86."* | No durable order created. Customer contacts restaurant by phone. |
| **Concurrent Identical Checkout Requests** | Race Condition | Two requests race with same `idempotency_key`. Postgres 23505 constraint catches second insert. | Second request catches 23505 and fetches existing order. | Exactly one canonical order created in database. |
| **Apps Script Failure (HTTP 200 with `{ok: false}`)** | Integration | Next.js server inspects payload body `ok: false` and treats request as failed. | Triggers fallback error path appropriately. | Monitored in `system_events`. |

---

## 2. Business Failures vs Infrastructure Failures Rule

### Critical System Rule:
**Emergency mode (Google Sheet failover) MUST ONLY be invoked on genuine INFRASTRUCTURE FAILURES.**

- **Business Failures** (e.g. invalid phone, sold-out items, restaurant closed, paused ordering) represent invalid business transactions. They MUST return an explicit refusal to the user and MUST NOT fall back to Google Sheets or bypass validation rules.
- **Infrastructure Failures** (e.g. Supabase connection timeout, Postgres crash, DNS failure) trigger trusted server-side pricing via `data/menu-fallback.json` and emergency persistence to Google Sheets.
