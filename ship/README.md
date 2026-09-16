# Ji Sushi — PREPNEST deployment

The public site, the takeaway ordering flow, and the kitchen display for
Ji Sushi, Frederikshavn. Built on the PREPNEST template: restaurant identity
lives in `lib/site.ts`, so the same codebase deploys for another restaurant by
editing one file.

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase.

---

## Deploy

### 1. Database

Run `schema.sql` in the Supabase SQL editor. It is idempotent — safe to re-run
on an existing database. It creates the tables, seeds the 98-item menu plus the
three Super Tilbud combos, and applies the RLS policies.

**If you ran an earlier version of this schema, re-run it.** The RLS policies
changed from open to least-privilege, and the old ones exposed customer data.

### 2. Environment

Copy `.env.example` and fill in all six values. Two are new, and the kitchen
screen will not open without them:

```bash
STAFF_PIN=4839                              # what the kitchen types on the iPad
STAFF_SESSION_SECRET=$(openssl rand -base64 32)
```

If either is missing, `/kitchen` redirects to a setup notice rather than
opening. That is deliberate: an unconfigured deployment should be visibly
broken to staff, not invisibly public to everyone else.

### 3. Build

```bash
pnpm install
pnpm typecheck   # tsc --noEmit
pnpm build
```

> **Use `pnpm`, not `npm`.** This repo has a `pnpm-lock.yaml`. Running
> `npm install` ignores it and resolves a different dependency tree than the one
> that was tested — which is how "works on my machine" starts. If you prefer npm,
> delete the pnpm lockfile first and commit the `package-lock.json` it generates,
> so everyone is building the same thing.


`typescript.ignoreBuildErrors` used to be on in `next.config.mjs`. It is now
off, because it hid a query selecting a column that did not exist. A red build
is information.

### 4. Verify

```bash
npm run verify    # typecheck + tests + static audit
```

Or individually:

```bash
npm test                # 73 tests, no node_modules needed
npm run audit:prepnest  # schema, RLS, auth, money path
```

The suite runs on Node's built-in test runner with native type stripping, so it
works before `npm install` finishes and during triage when the tree is broken.
Every test maps to a bug that actually shipped here — a UUID compared as a
number, a per-line quantity clamp, a phone number stored one way and searched
another, a dropped response creating a second dinner.

Runs the PREPNEST swarm's static checks: schema-vs-code column drift, RLS
policy scope, staff-route auth, and the checkout invariants. Non-zero exit
blocks a deploy. See `.claude/PREPNEST-SWARM.md`.

---

## How it fits together

| Route | Who | Notes |
|---|---|---|
| `/` `/menu` `/menukort` `/om-os` … | Public | The site |
| `/takeaway` | Public | Cart, checkout, pay at pickup |
| `/api/checkout` | Public (rate limited) | Re-prices server-side, enforces hours |
| `/kitchen` | Staff | PIN-gated by `middleware.ts` |
| `/kitchen/login` | Staff | Exchanges PIN for a signed cookie |
| `/api/kitchen/orders` | Staff | Verifies session, uses service role |

**The anon key is public** — it ships in the browser bundle. So RLS grants anon
`SELECT` on `menu_items` and nothing else. Orders, loyalty records, settings and
push subscriptions have RLS on with no anon policy: denied by default, reachable
only through server routes holding the service-role key.

**Prices are never trusted from the client.** `/api/checkout` re-reads every
line from the database, rejects sold-out items, and refuses orders outside
opening hours. Opening hours are evaluated in `Europe/Copenhagen` via `Intl`,
because serverless functions run in UTC and a client clock can be changed.

**Displayed hours are generated** from the same table the checkout enforces
(`displayHours()` in `lib/opening-hours.ts`). Hand-written hours drift the first
time someone changes a closing time, and then the site promises what the system
refuses.

---

## Deploying this for another restaurant

1. Edit `lib/site.ts` — name, address, phone, email, socials, photos.
2. Edit the `HOURS` table in `lib/opening-hours.ts`.
3. Replace the seed `INSERT`s in `schema.sql` with that restaurant's menu.
4. Adjust the brand tokens in the `@theme` block of `app/globals.css`.
5. Set fresh env vars, including a new `STAFF_PIN` and `STAFF_SESSION_SECRET`.

Colours are named tokens (`text-gold`, `bg-sumi`), not hexes, so step 4 is one
file. Restaurant details are read from `lib/site.ts` everywhere, so step 1 does
not require hunting through components.

---

## Known limitations

- **Rate limiting is per-instance.** `lib/rate-limit.ts` is in-memory, so the
  window is per serverless instance rather than global. It stops one person
  hammering the endpoint; it will not stop a distributed flood. Back it with
  Upstash Redis if that becomes a real threat — the interface is the same shape.
- **The kitchen screen polls every 10s** rather than using Realtime. Realtime on
  `orders` would mean publishing a table of phone numbers; polling an
  authenticated route avoids building that door at all. The trade is up to ten
  seconds of latency on a new order, which the audible chime covers.
- **No online payment.** Takeaway is pay-at-pickup by design. Table booking is
  phone-only.

---

## Going live

See **[LAUNCH.md](./LAUNCH.md)** for the launch checklist, and
**[docs/PUBLISHING.md](./docs/PUBLISHING.md)** for the full runbook.

Two commands do the real verification, against real infrastructure:

```bash
npm run preflight                          # your actual Supabase project
npm run smoke -- https://www.jisushi.dk    # a real order, end to end
```

`preflight` tries to attack you with your own anon key — reading orders,
inserting orders, editing prices — and fails if any of it succeeds.
`smoke` places a real order, replays it to prove a dropped connection can't
double-order, walks it through the kitchen, and cancels it.


---

## Where everything is

| File | What it is |
|---|---|
| `LAUNCH.md` | The checklist for going live. Start here. |
| `docs/PUBLISHING.md` | Full deployment runbook, with a phone-only path |
| `docs/RESILIENCE.md` | The architecture, what fails, and what to add |
| `docs/ALLERGENS.md` | Allergen system, and what the kitchen must confirm |
| `docs/SMS-GATEWAY.md` | Android SMS gateway and the alert channels |
| `fallback/OPSAETNING.md` | Google Sheet backup and emergency ordering (Danish) |
| `docs/AI-HANDOFF.md` | Brief for another AI asked to verify this |
| `docs/history/` | How it got here — audits, verifications, what was fixed |

The system is two things: **Supabase** holds the truth, and a **Google Sheet**
holds a continuous copy that doubles as backup and emergency intake. Nothing
else is load-bearing.
