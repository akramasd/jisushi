# Handoff: verify the Ji Sushi takeaway system

**You are being asked to verify a system, not to improve it.**

Everything below has been written and statically checked in an environment with
**no network access** — so `npm install`, `next build`, and any connection to
Supabase or a live URL have **never run anywhere**. You have the network. That
gap is the entire reason you are here.

Work through the phases in order. Stop at the first blocking failure and report.
Do not skip ahead: each phase assumes the previous one passed.

---

## Ground rules — read before running anything

These exist because the most common way this task goes wrong is an agent
producing a green result that means nothing.

1. **Never weaken a test to make it pass.** Do not delete assertions, loosen a
   comparison, add `.skip`, or change an expected value. Every test in this repo
   corresponds to a bug that actually shipped. A failing test is information.
   If you believe an assertion is genuinely wrong, say so explicitly and
   separately in your report — do not silently change it.
2. **Paste real output.** Every claim in your report must be backed by terminal
   output you actually saw. Do not summarise from memory or predict what a
   command "would" print.
3. **Do not fix what you have not diagnosed.** If a test fails, find out why
   before changing anything. Several failures in this project's history were
   bugs in the *test*, not the code — and at least one was the code being right
   while the harness was wrong.
4. **If you get stuck, stop and report.** An honest "Phase 4 blocked, here is
   the error" is far more useful than a workaround that hides the problem.
5. **Do not run destructive commands against production data.** Phase 5 creates
   one real order and cancels it. Nothing else touches live data.

---

## What this system is

A Next.js 16 + Supabase takeaway ordering system for a sushi restaurant in
Frederikshavn, Denmark.

- **Public site** — menu, opening hours, booking info
- **`/takeaway`** — cart and checkout, pay at pickup
- **`/kitchen`** — PIN-gated kitchen display, order lifecycle, 30-day history
- **`/ordre/[token]`** — customer's own order-status page

The design case it is built around: **a customer on mobile data, fifteen minutes
away, on a connection that may drop between the request leaving and the response
arriving.** Most of the non-obvious code exists to make that case safe.

### Already verified (do not redo)

| Check | Status |
|---|---|
| 74 unit tests on pure modules | passing |
| 36 tests invoking the real route handlers | passing |
| Static audit: schema/code column drift, RLS scope, staff auth, money path | clear |
| TypeScript parse + scope check on every source file | clean |

### Not verified — your job

| Check | Why it was impossible |
|---|---|
| `npm install` / dependency resolution | no network |
| `npm run build` | no network, no `node_modules` |
| `tsc --noEmit` with real type definitions | no `node_modules` |
| Anything touching real Supabase | no network |
| Anything touching a running server | no network |

---

## Phase 0 — Environment

```bash
node --version    # must be >= 22.6 (the test suite needs native type stripping)
pnpm --version    # if missing: npm install -g pnpm
```

**Use `pnpm`, not `npm`, for install.** The repo has `pnpm-lock.yaml`. Running
`npm install` ignores it and resolves a different dependency tree than the one
intended.

If Node is older than 22.6, the test suites will not run. Report that rather
than rewriting the tests to suit an older runtime.

---

## Phase 1 — Tests (no credentials needed)

Run these first. They need no database, no server, and no environment variables.

```bash
pnpm test:all
```

**Expected output — these exact numbers:**

```
# tests 74
# suites 19
# pass 74
# fail 0

# tests 36
# suites 7
# pass 36
# fail 0
```

The first block is pure logic (pricing, phone normalisation, opening hours,
lifecycle transitions, network retry). The second imports the **actual route
handler files** and calls them with the Next response wrapper and the Supabase
driver stubbed.

> Note: these run before `pnpm install`, on purpose. Node strips TypeScript
> natively, so the suite works even when the dependency tree is broken.

**If a test fails:** report the full failure output verbatim. Do not modify the
test. See the failure table at the end.

Then:

```bash
pnpm audit:prepnest
```

**Expected:** roughly 14 `PASS` lines, `TESTS: 26 passing`, and the final line:

```
PREPNEST PRE-DEPLOY: static checks clear. Build verification still required.
```

---

## Phase 2 — Install and build ← **the main gap**

```bash
pnpm install
pnpm typecheck
pnpm build
```

This is the highest-value thing you can do. `next build` has never run in any
environment. Expect the possibility of real errors here.

`typescript.ignoreBuildErrors` has been deliberately turned **off** in
`next.config.mjs`, because it previously hid a query selecting a column that did
not exist. **Do not turn it back on.** If the build fails on a type error, that
error is the point.

**Report:** whether install succeeded, whether typecheck was clean, whether the
build completed, and the **first real error** if not — not the last line of
output, the first actual error.

Common things that would be genuinely new information:
- A dependency that does not resolve, or a peer-dependency conflict
- Next 16 API differences from what the code assumes
- A type error that the no-`node_modules` parse check could not see (it ran with
  `--noResolve`, so all cross-module types were unchecked)

---

## Phase 3 — Real database check

**Requires:** a `.env.local` with real Supabase credentials. Ask the user for
these if you do not have them; do not invent them.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STAFF_PIN=
STAFF_SESSION_SECRET=
CRON_SECRET=
NEXT_PUBLIC_SITE_URL=
```

Then:

```bash
pnpm preflight
```

This connects to the **real** Supabase project. It verifies every required
column exists, the menu is seeded and ordered, and the idempotency constraint is
real. Then it attempts, **using the public anon key exactly as an attacker
would**, to: read customer orders, insert an order, edit a menu price, and read
the webhook secret. All four must be refused.

**Expected final line:**

```
Database is ready. Next: node scripts/smoke.mjs <your-url>
```

**If it reports missing columns** (`phone_digits`, `idempotency_key`,
`public_token`, `sort_order`), the fix is: open Supabase → SQL Editor → paste
the entire contents of `schema.sql` → Run. It is idempotent and safe to re-run.
Then run `pnpm preflight` again.

**If it reports `ANON KEY CAN READ CUSTOMER RECORD(S)`** — stop. That means
customer names and phone numbers are publicly readable. Same fix (re-run
`schema.sql`), and re-verify before going further. Flag this prominently in your
report.

---

## Phase 4 — Local end-to-end

```bash
pnpm dev
```

In a second terminal:

```bash
pnpm smoke -- http://localhost:3000
```

This places a **real order** through the real checkout endpoint against the real
database, named `PREPNEST SMOKETEST`, and cancels it at the end.

It verifies, in order:
- the takeaway page renders an actual menu
- `/kitchen` is locked and the kitchen API refuses anonymous reads
- an order is created and priced **server-side**
- **a replay of the identical request returns the same order** ← the mobile-data case
- **four simultaneous retries produce exactly one order**
- the customer status page works and leaks no name or phone
- tampered requests (empty cart, bad phone, unknown item, negative quantity) are refused
- rate limiting engages
- kitchen lifecycle works; illegal transitions are refused; a concurrent
  double-tap has exactly one winner
- history search by phone number finds the order

**Expected final line:**

```
Takeaway system verified end to end against the live deployment.
```

**Two things to know:**
- If the restaurant is currently closed (Danish opening hours: 12:00–21:00,
  until 22:00 Fri/Sat), the ordering section **skips itself and says so**. This
  is correct behaviour, not a failure. To exercise the full path, either run it
  during opening hours or temporarily widen `HOURS` in `lib/opening-hours.ts`
  — and if you do that, **change it back and say so in your report**.
- If a kitchen webhook is configured in the `settings` table, it **will fire**.
  Warn the user before running against production.

---

## Phase 5 — Production (only if the user asks)

```bash
pnpm smoke -- https://www.jisushi.dk
```

Same test against the live deployment. It creates and cancels one real order.
If the run dies partway, tell the user to cancel the leftover order manually in
`/kitchen`.

---

## Failure decision tree

| Symptom | Almost certainly |
|---|---|
| Tests fail with `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` | Node < 22.6 |
| Tests fail with `Cannot find module '@/lib/...'` | run via `pnpm test:all`, not `node --test` directly — the resolver is loaded by an `--import` flag |
| Many handler tests fail with "0 orders" | rate limiter state bleeding between tests; check each test posts from a distinct IP |
| `preflight`: `column does not exist` | `schema.sql` has not been re-run |
| `preflight`: `ANON KEY CAN READ` | old permissive RLS still applied — re-run `schema.sql` |
| `preflight`: `idempotency_key is NOT unique` | re-run `schema.sql`; without it, dropped connections create duplicate orders |
| `smoke`: takeaway page "looks EMPTY" | menu not seeded, **or** the `MenuItem.id` type has been changed back to `number` (it must be `string` — the column is a UUID) |
| `smoke`: "REPLAY CREATED A SECOND ORDER" | the unique index on `idempotency_key` is missing — this is the most serious possible failure |
| `smoke`: `/kitchen` served the order screen | `middleware.ts` is not being applied — check it is at the project root, not inside `app/` |
| `smoke`: correct PIN refused | `STAFF_PIN` / `STAFF_SESSION_SECRET` in `.env.local` do not match the running deployment |
| `build` fails on a type error | genuine — report it, do not re-enable `ignoreBuildErrors` |

---

## Report back in this format

Fill this in and give it to the user. Paste real output; do not paraphrase.

```
PHASE 0 — Environment
  node:  <version>
  pnpm:  <version>

PHASE 1 — Tests
  pnpm test:all      → <paste the four # lines from each block>
  pnpm audit:prepnest → <paste the final line>
  Failures: <none | full verbatim output>

PHASE 2 — Build          ← the part that was never run before
  pnpm install    → <ok | first error>
  pnpm typecheck  → <clean | full error list>
  pnpm build      → <ok | FIRST real error, with file and line>

PHASE 3 — Database
  pnpm preflight  → <final line>
  Any FAIL lines: <verbatim>

PHASE 4 — End to end (local)
  pnpm smoke      → <pass/fail/skip counts and final line>
  Any FAIL lines: <verbatim>
  Was the restaurant open during the run? <yes/no>

PHASE 5 — Production
  <run | not run>

CHANGES I MADE
  <list every file you modified and why — or "none">

WHAT I COULD NOT VERIFY
  <be specific>

MY ASSESSMENT
  <is this safe to publish? what is the single biggest remaining risk?>
```

---

## Reference

- `README.md` — architecture and how the pieces fit
- `../LAUNCH.md` — the launch checklist
- `PUBLISHING.md` — the go-live runbook (there is a phone-only path in it too)
- `history/` — how the code got here: the original merge notes, the build
  verification, and the live database audit
- `.claude/PREPNEST-SWARM.md` — the static-audit agents and what each catches
- `schema.sql` — idempotent; safe to re-run, and **must** be re-run if the
  project was set up before this version

### Context worth having

The bugs these tests guard against are not hypothetical. All of them shipped in
this codebase:

- `menu_items.id` is a `UUID`, but the code typed it as `number` and did
  `Number(id)` → `NaN`. Every cart lookup silently failed; **no order could ever
  be placed**, with no error anywhere.
- The quantity clamp was applied per submitted line, so posting the same item
  twenty times at qty 99 passed a ceiling of 99 with 1,980 units.
- Phone numbers were stored as typed (`31 33 44 86`) and searched as digits
  (`31334486`) — history lookup by phone returned nothing for most customers.
- Status transitions read-then-wrote without a condition, so two staff tapping
  at once could both win.
- RLS policies were `USING (true)`, making every customer's name and phone
  readable by anyone with the public key.

That is why the ground rules at the top say what they say.
