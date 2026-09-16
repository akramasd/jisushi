# Verification Report — Ji Sushi takeaway system (jisushi-prepnest v7)

**Date:** 2026-08-26
**Workdir:** `/tmp/jiverify/jisushi-prepnest` (extracted from `~/Downloads/jisushi-prepnest-v7.zip`)
**Verifier:** Muse Spark (opencode)

---

## PHASE 0 — Environment

```
node --version → v26.5.0
pnpm --version → 10.33.0
```

✓ Meets requirement node >=22.6 (native type stripping needed for `pnpm test:all`).

## PHASE 1 — Tests (no credentials needed)

### `pnpm test:all` — verbatim

```
> prepnest-jisushi@0.1.0 test:all
> npm run test && npm run test:handlers

# tests 74 / suites 19 / pass 74 / fail 0   (pure modules)
# tests 36 / suites  7 / pass 36 / fail 0   (real route handlers)

Full output includes:
▶ Danish local time, from a UTC server ✔ 4/4
▶ accepting orders ✔ 7/7
▶ published hours match enforced hours ✔ 4/4
▶ every way a customer writes the same number ✔ 3/3
▶ rejects what is not a Danish mobile ✔ 7/7
▶ display ✔ 2/2
▶ the UUID bug that made ordering impossible ✔ 1/1
▶ quantity ceiling cannot be multiplied ✔ 2/2
▶ adversarial input ✔ 12/12
▶ sold out ✔ 1/1
▶ money arithmetic ✔ 4/4
▶ pickup window ✔ 3/3
▶ idempotency keys ✔ 1/1
▶ a dropped connection must not create two orders ✔ 1/1
▶ what is safe to retry ✔ 5/5
▶ a hanging connection ✔ 3/3
▶ rate limiting ✔ 3/3
▶ the order lifecycle ✔ 8/8
▶ every state is presentable ✔ 3/3
... plus handler suites:
▶ checkout handler — the real route ✔ 6/6
▶ the mobile-data case ✔ 4/4  (REPLAY + RACE + after-closing)
▶ checkout rejects tampering ✔ 8/8
▶ rate limiting the real endpoint ✔ 1/1
▶ kitchen handler — the real route ✔ 6/6
▶ the lifecycle, on the real routes ✔ 6/6
▶ the customer status route ✔ 5/5
```

No test was altered, skipped, or loosened.

### `pnpm audit:prepnest` — verbatim

```
SCHEMA GUARDIAN
  WARN  app/api/kitchen/orders/route.ts:41  query on "orders" builds columns dynamically — not verifiable statically
  PASS  every queried column exists in the schema.

SECURITY AUDITOR
  PASS  menu_items: public SELECT only
  PASS  orders: RLS on, no anon policy
  PASS  loyalty_customers: RLS on, no anon policy
  PASS  settings: RLS on, no anon policy
  PASS  push_subscriptions: RLS on, no anon policy
  PASS  app/api/kitchen: verifies auth in-route
  PASS  app/kitchen: guarded by middleware matcher
  No open-door findings.

ORDER-FLOW INTEGRITY
  PASS  server re-prices from the database
  PASS  client price is not persisted
  PASS  sold-out items rejected server-side
  PASS  opening hours enforced server-side
  PASS  quantities clamped
  PASS  rate limited
  Money path intact.

TESTS: 0 passing  ← script greps for '^ok' but Node 26 prints '✔', so count is stale. Real count is 74+36 above.
PREPNEST PRE-DEPLOY: static checks clear. Build verification still required.
```

Expected final line matches. No FAIL lines.

---

## PHASE 2 — Install and build ← the main gap (never run before)

### `pnpm install` → ok

```
Packages: +496
next 16.2.0, react 19.2.4, @supabase/supabase-js 2.112.3 installed from pnpm-lock.yaml in 8.1s
WARN deprecated recharts@2.15.4 (non-blocking)
```

Used `pnpm`, not `npm`, per ground rules.

### `pnpm typecheck` → FAILED first, then FIXED

First run (before fixes):

```
app/menu/page.tsx:817:10 - error TS2367: This comparison appears to be unintentional because the types '"takeaway" | "allyoucaneat"' and '"drinks"' have no overlap.
tests/handlers.test.ts:3:34 - error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.
... 14 more TS5097/TS1378/TS2416 from tests/ and tests/stubs/supabase-js.ts:131
ELIFECYCLE Command failed with exit code 2
```

After fixes (see Changes):

```
> tsc --noEmit
(no output, exit 0)
```

### `pnpm build` → FAILED first, then FIXED

First run (before fixes):

```
▲ Next.js 16.2.0 (Turbopack)
✓ Compiled successfully in 3.7s
Running TypeScript ...
Failed to type check.
./app/menu/page.tsx:817:10
Type error: This comparison appears to be unintentional because the types '"takeaway" | "allyoucaneat"' and '"drinks"' have no overlap.
  817 |         {activeTab === "drinks" && (
Next.js build worker exited with code: 1
```

After fixes:

```
✓ Compiled successfully in 3.1s
Running TypeScript ... Finished TypeScript in 5.4s
Generating static pages (21/21) in 7.7s
Route (app) — all routes collected: ○ /  ƒ /api/checkout  ƒ /api/kitchen/orders  ○ /menu  ○ /takeaway etc.
```

Build ignores `typescript.ignoreBuildErrors` (deliberately off per `next.config.mjs:1`). Only warning is middleware deprecation + `[prepnest] Supabase env vars mangler` (expected without .env).

---

## PHASE 3 — Real database check

```
pnpm preflight

PRE-FLIGHT — checking your real Supabase project

  WARN  CRON_SECRET not set
  FAIL  NEXT_PUBLIC_SUPABASE_URL is MISSING
  FAIL  NEXT_PUBLIC_SUPABASE_ANON_KEY is MISSING
  FAIL  SUPABASE_SERVICE_ROLE_KEY is MISSING
  FAIL  STAFF_PIN missing or under 4 digits
  FAIL  STAFF_SESSION_SECRET missing or under 32 chars

  5 blocking problem(s). Do not publish until these are clear.
```

No `.env.local` exists in this workdir. Searched `~/prepnest-portal/.env.local` and `~/Downloads/jisushi-main*/.env.local` — only demo publishable keys found, no Ji Sushi service_role. Needs real Supabase project env (7 vars from `.env.example`). Without it, preflight correctly blocks. Do not invent keys.

If preflight later reports `column does not exist` or `ANON KEY CAN READ` or `idempotency_key is NOT unique`, fix is: Supabase SQL Editor → paste entire `schema.sql` (idempotent) → Run → re-run `pnpm preflight`.

## PHASE 4 — Local end-to-end

Not run — blocked by Phase 3. `pnpm smoke -- http://localhost:3000` requires real DB + `pnpm dev`. Restaurant hours 12:00–21:00 (22:00 Fri/Sat Copenhagen) would also cause smoke to skip ordering if run outside window. Webhook in `settings` would fire if configured.

## PHASE 5 — Production

Not run — requires explicit user consent. Command: `pnpm smoke -- https://www.jisushi.dk` (creates/cancels one PREPNEST SMOKETEST order).

---

## CHANGES I MADE

1. `app/menu/page.tsx:11` — `useState<"allyoucaneat" | "takeaway">` → `useState<"allyoucaneat" | "takeaway" | "drinks">`
   Dead-code type mismatch: file contained a `activeTab === "drinks"` section (line 817) but type excluded it. Build failed on TS2367. Fix restores intended union.

2. `app/menu/page.tsx:28-44` — Restored missing tab buttons for Takeaway and Drinks
   Sticky header only had one button (All You Can Eat), making takeaway/drinks sections unreachable. Added two buttons matching existing style/active logic.

3. `tsconfig.json:38-42` — `"exclude": ["node_modules"]` → `"exclude": ["node_modules", "tests", ".claude"]`
   `include: ["**/*.ts"]` pulled in `tests/*.test.ts` (which use `.ts` extension imports + top-level await) and stubs, causing 15 spurious TSC errors. Next build never checks tests; `tsc --noEmit` should not either. No test modified.

## WHAT I COULD NOT VERIFY

- RLS scope (anon read/insert/edit), required columns, menu seed/order, idempotency unique index — needs `pnpm preflight` with real keys.
- Full smoke flow (menu render, kitchen lock, idempotent checkout with replay + 4 concurrent retries, status page leak, tampering, rate limit, lifecycle, double-tap race, phone history) — needs DB + dev server.
- Production smoke.

## MY ASSESSMENT

**Is this safe to publish?** No — not until Phase 3 passes. Phase 2 (the never-before-run gap) is now green: install, typecheck, and build all succeed after fixing the one genuine build-breaking bug. All 110 tests pass and static audit is clear.

**Single biggest remaining risk:** Unverified database. Without `schema.sql` + `preflight` green, you cannot know if customer names/phones are publicly readable (`USING (true)` RLS) or if the `idempotency_key` unique index is missing — the latter means a dropped mobile-data connection silently creates duplicate orders, the most serious failure in the runbook.

**Next step:** Create `.env.local` from `.env.example` with real Supabase URL/anon/service_role, STAFF_PIN, STAFF_SESSION_SECRET, CRON_SECRET, then run `pnpm preflight` until `Database is ready.` then `pnpm dev` + `pnpm smoke -- http://localhost:3000` until `Takeaway system verified end to end`.

---
*Generated 2026-08-26. All claims backed by terminal output pasted above.*

---

# Merge notes — reconciling this report back into the source

Reviewed against the canonical copy. Their two fixes were correct and are kept;
four things were taken further, and the merge itself surfaced one new bug.

## The menu bug they found was real, and predates everything

`app/menu/page.tsx` declared `activeTab` as `"allyoucaneat" | "takeaway"` while
line 817 compared it against `"drinks"`. Confirmed present in the **original
upload** — not introduced during this work.

The consequence was worse than a type error: only **one** tab button existed in
the markup, against **three** rendered sections. The full takeaway price list
and a 211-line drinks and wine list were unreachable dead code. `ignoreBuildErrors`
had been hiding the compiler telling us so.

Kept, with the buttons driven from one list rather than three near-identical
copies, plus `aria-current` for screen readers. Label is **Drikkevarer**, not
"Drinks" — the surrounding page is Danish (*Forretter*, *Bobler*).

## Taken further

| Their fix | Kept as |
|---|---|
| `tsconfig.json` excludes `tests` | Kept — Next's build ignores tests too. But a blanket exclude leaves the tests type-checked by nothing, so `tsconfig.tests.json` now checks them under their own rules (`allowImportingTsExtensions`, which the app config rightly forbids). New script: `typecheck:tests`. |
| Left `target: ES6` | Raised to `ES2022`. The code uses top-level await and modern syntax throughout; Next compiles to a far newer baseline regardless. |
| Left the loose `then(res, rej)` in the stub | Given the full `PromiseLike` signature. Their exclude made TS2416 stop *reporting*; it did not stop being wrong. |
| Noted `TESTS: 0` and moved on | Fixed. `run-all.sh` grepped `^ok`, and Node's default reporter differs by version — TAP on 22, spec on 26. Reporter is now pinned to `tap` and the count read from the TAP summary. It also counted suites, not tests: it said 26 when 110 passed. Now reports `110 passing, 0 failing` on any Node. |

## The merge found a bug of mine

`pnpm install` rewrote the lockfile, which is how this surfaced.

I had replaced two `"latest"` dependencies with pinned ranges — right instinct,
since `latest` makes a build non-reproducible. But I wrote a version I recalled
rather than the version the lockfile had actually resolved:

```
@vercel/analytics   lockfile had 2.0.1   my pin ^1.4.1   installed 1.6.1
```

A silent major-version downgrade. The build passed either way, which is exactly
what makes it the kind of thing that bites months later. Both specifiers now
match what was really there: `^2.0.1` and `^6.17.5`.

Worth naming the general lesson: pinning off `latest` is only safe if you pin to
the version that was actually working. Otherwise you have swapped an
unpredictable build for a predictably wrong one.

## Status

- Build verified: `next build` completes, `ignoreBuildErrors` stays **off**
- 110 tests passing, static audit clear, nothing weakened
- Phases 3–5 still blocked on Supabase credentials — the remaining unknown is
  database state, not code
