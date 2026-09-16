# Publishing Ji Sushi

A go-live runbook. Follow it in order — each step verifies the one before, so a
failure tells you exactly where to look instead of leaving you guessing at a
broken site.

Budget about 45 minutes the first time.

---

## Before you start

You need:

- The Supabase project (URL, anon key, service-role key) — Supabase dashboard →
  Project Settings → API
- A hosting account (Vercel is assumed below; Netlify works the same way)
- The domain, if you're pointing one at it
- A phone, for the final real-world test

---

## Step 1 · Database

Supabase dashboard → SQL Editor → paste the whole of `schema.sql` → Run.

It is idempotent: safe to run again, and **you must run it again** if you set
this up before. Earlier versions of this schema left the anon key able to read
every customer's name and phone number.

Confirm it applied — Table Editor → `orders` → you should see `idempotency_key`,
`public_token`, `phone_digits`, `ready_estimate`. If they're missing, the script
didn't finish; scroll up in the SQL editor for the error.

## Step 2 · Secrets

Generate two, right now, in a terminal:

```bash
openssl rand -base64 32     # STAFF_SESSION_SECRET
openssl rand -base64 32     # CRON_SECRET
```

Pick a `STAFF_PIN` the kitchen will actually remember — 4 to 6 digits. It's rate
limited to 5 attempts per 10 minutes, so a short PIN is fine; a PIN taped to the
monitor is not.

Set all of these in Vercel → Project → Settings → Environment Variables:

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API (safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API — **never** expose |
| `STAFF_PIN` | you choose |
| `STAFF_SESSION_SECRET` | generated above |
| `CRON_SECRET` | generated above |
| `NEXT_PUBLIC_SITE_URL` | `https://www.jisushi.dk` |

Copy the same values into `.env.local` locally so the checks below can run.

> If `STAFF_PIN` or `STAFF_SESSION_SECRET` is missing, `/kitchen` **locks
> itself** rather than opening. That's deliberate — an unconfigured deployment
> should be visibly broken to staff, not invisibly public to everyone else.

## Step 3 · Check the database, for real

### If you only have a phone

Skip the terminal entirely. Once the site is deployed (Step 5) and you can log
into `/kitchen`, open **`/kitchen/selftest`** on your phone and tap **Kør tjek**.

It runs the same checks server-side and answers in plain Danish: whether the
database is migrated, whether the menu is ordered, whether duplicate orders are
prevented, and — the important one — **whether the public key can read your
customers' names and phone numbers.** It tries, using that key, exactly the way
an attacker would, and tells you what happened.

If it says schema.sql must be re-run: Supabase's SQL Editor works in a phone
browser. Paste the file, tap Run, tap Kør tjek again.

### If you have a computer

```bash
npm run preflight
```

This talks to your actual Supabase project. It verifies every required column
exists, the menu is seeded and ordered, the idempotency constraint is real, and
then — the important part — **it tries to attack you with your own anon key**:
reading orders, inserting orders, editing prices, reading your webhook secret.
All four must be refused.

Do not continue until it prints `Database is ready.`

Common failures:

- *`orders.phone_digits is MISSING`* → schema.sql wasn't re-run (Step 1)
- *`ANON KEY CAN READ CUSTOMER RECORD(S)`* → old permissive RLS still in place; re-run schema.sql
- *`idempotency_key is NOT unique`* → re-run schema.sql; without this, dropped connections create duplicate orders

## Step 4 · Build

```bash
pnpm install
pnpm verify      # 73 tests + static audit + typecheck
pnpm build
```

> **Use `pnpm`, not `npm`.** This repo has a `pnpm-lock.yaml`. Running
> `npm install` ignores it and resolves a different dependency tree than the one
> that was tested — which is how "works on my machine" starts. If you prefer npm,
> delete the pnpm lockfile first and commit the `package-lock.json` it generates,
> so everyone is building the same thing.


`npm run verify` must be green. If `npm run build` fails, the error is real —
type errors are no longer suppressed, on purpose.

## Step 5 · Deploy

Push to your main branch, or `vercel --prod`.

Add the retention cron — `vercel.json` already declares it, so it registers on
first deploy. Confirm in Vercel → Project → Cron Jobs that `/api/cron/purge`
appears, scheduled daily at 04:00. Without it, orders accumulate forever, which
is both a GDPR problem and a slower history search.

## Step 6 · Test the live site, for real

### From a phone

Open **`/kitchen/selftest`** and tap **Kør tjek**. Then do Step 7 below — the
real-world test with your own thumb, which is better than any script.

### From a computer

```bash
npm run smoke -- https://www.jisushi.dk
```

This places **an actual order** through your actual checkout, named
`PREPNEST SMOKETEST`, and cancels it at the end. It verifies:

- the takeaway page renders a real menu
- `/kitchen` is locked and the kitchen API refuses anonymous reads
- an order is created, priced by the server, and reaches the kitchen screen
- **a replay of the same request returns the same order** — the mobile-data case
- **four simultaneous retries produce exactly one order**
- the customer's status page works and leaks no name or phone
- tampered requests (empty cart, bad phone, unknown item, negative quantity) are refused
- rate limiting engages
- the kitchen lifecycle works, illegal transitions are refused, and a concurrent double-tap has exactly one winner
- history search by phone number finds the order

Two things to know before you run it against production:

1. It creates one real order and cancels it. If the run dies halfway, cancel it
   by hand in `/kitchen`.
2. If you've configured a kitchen webhook, **it will fire** — warn whoever gets
   those, or run with `--no-order`.

If the restaurant is closed when you run it, the ordering section skips itself
and says so. Run it during opening hours for full coverage.

## Step 7 · The test that matters most

Automation can't do this one. Take a phone, **turn WiFi off**, and use mobile
data:

1. Open the site, add items, place an order.
2. Halfway through tapping *Send bestilling*, switch on airplane mode.
3. Turn it off. Tap again.
4. **Check `/kitchen`. You should see one order, not two.**
5. Open the status link. Confirm it from the kitchen. Watch the customer's
   screen update.
6. Print a ticket from the kitchen card — check it comes out receipt-width, in
   black on white, one page.

This is the scenario the whole system is built around. Do it once before you
tell anyone the site is live.

## Step 8 · Set the kitchen up

- Open `/kitchen` on the kitchen iPad, log in with the PIN.
- Tap **Lyd fra** so it reads **Lyd til**. Browsers block audio until someone
  interacts with the page, so this tap is what actually arms the chime.
- Leave the tab open. The screen holds itself awake while it's on the pass.
- Show staff: **Bekræft** → **Klar** → **Afhentet**, **Afvis** for a rejection,
  **Seddel** to print, **Historik** to look up an old order.

### Strongly recommended: the out-of-band alert

The chime only fires if the tab is open. If the iPad is off or the browser
crashed, an order arrives and nobody knows.

In Supabase → Table Editor → `settings` → row `main`, set:

- `webhook_url` — an https endpoint that reaches a phone. An SMS gateway, a
  Slack incoming webhook, a Make or n8n scenario.
- `webhook_secret` — any random string; the payload is signed with it as
  `X-Prepnest-Signature: sha256=<hmac>` so the receiver can verify it's you.

The payload includes a ready-made one-line `text` field, so a plain SMS relay
needs no template of its own.

---

## After you publish

**Day one:** watch the first few real orders land on the kitchen screen. Confirm
one from the kitchen and check the customer's status page updates.

**Week one:** search the history for a real customer by phone number. Confirm it
finds them — this is the check that catches a bad `phone_digits` migration.

**Ongoing:** run `npm run verify` before every deploy. It's wired into
`npm run audit:prepnest`, which also runs the schema, RLS, auth and money-path
checks.

## If something breaks

| Symptom | Look here |
|---|---|
| Menu page empty | `menu_items` seeded? `npm run preflight` |
| Menu in the wrong order | `sort_order` not backfilled — re-run schema.sql |
| Can't add to cart | The UUID/number bug — confirm `MenuItem.id` is `string` |
| Checkout says "lukket" when open | `HOURS` in `lib/opening-hours.ts` |
| `/kitchen` redirects to a setup notice | `STAFF_PIN` / `STAFF_SESSION_SECRET` missing |
| Kitchen shows nothing but orders exist | Session expired — log in again |
| Phone search finds nothing | `phone_digits` column missing — re-run schema.sql |
| Duplicate orders | `idempotency_key` unique index missing — re-run schema.sql |

Everything customer-facing degrades to the same fallback: the phone number. The
error page, the 404, and the closed-hours message all show it, because a
restaurant that can't take an online order can still take a call.

## Deploying this for another restaurant

1. `lib/site.ts` — name, address, phone, email, socials
2. `lib/opening-hours.ts` — the `HOURS` table
3. `schema.sql` — replace the seed `INSERT`s with their menu
4. `app/globals.css` — the `@theme` block (colours are tokens, not hexes)
5. Fresh secrets, fresh Supabase project
6. Run Steps 3, 4 and 6 above — they're restaurant-agnostic
