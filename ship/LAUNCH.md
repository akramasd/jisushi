# Launch checklist — Ji Sushi

Everything that could be done for you is done. What remains needs your accounts,
your CVR number, and your thumb.

**Time needed: about 40 minutes.** All of it works from a phone.

---

## Do these before you tell anyone the site is live

### 1 · Set the environment variables (10 min)

Vercel → your project → Settings → Environment Variables. Add all of these,
then redeploy.

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API — never expose this one |
| `STAFF_PIN` | **5–8 digits** the kitchen will remember. Six is the sweet spot |
| `STAFF_SESSION_SECRET` | 32+ random characters |
| `CRON_SECRET` | 32+ random characters |
| `NEXT_PUBLIC_SITE_URL` | `https://www.jisushi.dk` |

No terminal for the random strings? Open any password generator, set length 40,
generate twice. Any random text works.

> `STAFF_PIN` and `STAFF_SESSION_SECRET` are not optional. Without them
> `/kitchen` **locks itself shut** rather than opening to the public. That is
> deliberate.

> Your CVR is already in the code: **32325971**, registered to
> **RESTAURANT ASIA ApS** trading as Ji Sushi, Lodsgade 10. Found in the public
> register and verified against three sources — but glance at the footer after
> deploying and confirm it is right, since it is your legal identification.

### 2 · Deploy (5 min)

Push to your main branch, or Vercel → Deployments → Redeploy.

**This one is not optional.** The database was locked down yesterday: customer
names and phone numbers used to be readable by anyone with the public key, and
that is now fixed. But the *old* code read orders with that same public key — so
if an old build is still running, **the kitchen screen will show nothing.** The
current build reads them server-side and works correctly.

Then confirm Vercel → Cron Jobs shows `/api/cron/purge` at 04:00. That is what
deletes orders after 30 days.

### 3 · Run the self-test (2 min)

On your phone: open **`/kitchen`**, log in with your PIN, tap **Systemtjek**,
tap **Kør tjek**.

It should say **"Alt virker"**. If anything is red, it tells you what to fix.

### 4 · The real test (10 min) — do not skip this one

This is the scenario the whole system is built around, and no script can do it.

1. Take your phone. **Turn WiFi off.** Use mobile data.
2. Open the site, add a few items, go to checkout.
3. Tap **Send bestilling** — and immediately switch on **airplane mode**.
4. Wait a few seconds. Turn airplane mode off. Tap again.
5. **Open `/kitchen`. You must see ONE order, not two.**
6. Tap **Bekræft**. Open the customer's status link — it should update.
7. Tap **Seddel** — a receipt-width ticket, black on white, one page.
8. Cancel the test order when you are done.

If step 5 shows two orders, stop and tell me. Everything else can wait; that one
cannot.

### 5 · Bookmark the staff entrance

There is **no link to `/kitchen` anywhere on the public site** — not in the
footer, not in the menu. That is deliberate: the link was never what protected
it, but putting the staff entrance in front of every visitor and every crawler
serves no one.

Staff reach it by typing the address once and adding it to the home screen:

```
https://www.jisushi.dk/kitchen
```

What actually protects it: the PIN, checked server-side with a shared attempt
counter, and middleware that fails closed if either secret is missing.

> **Use at least 6 digits.** Four is 10,000 combinations. The attempt limiting
> is now shared across servers rather than per-instance — the previous version
> was effectively no limit at all — but a longer PIN costs the kitchen two taps
> and multiplies the work of guessing by a hundred.

### 6 · Set up the kitchen iPad (5 min)

- Open `/kitchen`, log in.
- Tap **Lyd fra** so it reads **Lyd til**. Browsers block sound until someone
  taps the page — this tap is what actually arms the chime.
- Leave the tab open. The screen holds itself awake while it is on the pass.
- Show staff: **Bekræft** → **Klar** → **Afhentet**. **Afvis** to reject.
  **Seddel** to print. **Historik** to find an old order.

### 7 · Point an uptime monitor at the site (3 min)

Sign up for UptimeRobot's free tier on your phone. Add a monitor:

- URL: `https://www.jisushi.dk/api/health`
- Interval: 5 minutes
- Alert to: your phone

That endpoint checks the database is reachable and returns 503 if not. This is
how you learn the site is down *before* a customer tells you.

### 8 · Learn the two controls you will use weekly

`/kitchen` → **Menu**:

- **Udsolgt** — tap any dish to take it off the site instantly. Sold-out items
  are listed at the top so putting them back is one tap. This previously meant
  opening the Supabase dashboard, which in practice meant it happened once.
- **Priser** — tap a price to change it. Saved immediately.
- **Sæt på pause** — stop taking online orders without taking the site down.
  The menu, address and phone number stay up; the order button does not. Write
  your own message and the customer sees exactly that, before they build a cart
  rather than at checkout.

### 9 · Two minutes of housekeeping

- **"Vegetar forårsruller (5 stk.)" is currently marked sold out.** Intentional?
- Your old test order (#1963) is already marked completed, so the pass is clean.

---

## Strongly recommended, same day

### Confirm allergens on your bestsellers

`/kitchen/allergener` on your phone. All 101 dishes are pre-filled with a
suggestion read from the ingredients; you tap to correct, then **Bekræft**.

Unconfirmed dishes show *"spørg os"* on the site — honest, not broken — so you
**can** launch before finishing. But do your top ten tonight.

Check the fryer hardest: if tempura shares oil with anything else, that is
gluten across everything fried.

### Set the kitchen alert

Supabase → Table Editor → `settings` → row `main` → `webhook_url`.

The chime only sounds if the iPad tab is open. If it is off or the browser
crashed, an order arrives and nobody knows. Point this at anything that reaches
a phone — an SMS gateway, a Slack webhook, a Make scenario. Add any random
string as `webhook_secret` and the payload is signed.

---

## Within the first week

**Upgrade Supabase to Pro (~$25/month).** You are on the free plan, which has
**no automated backups** and pauses projects after a week of inactivity. For a
business taking real orders that is the wrong tier. This is the single biggest
remaining risk once you are live.

**Add error monitoring.** If checkout starts failing at 19:00 on a Friday,
nobody finds out until a customer phones. Vercel's function logs now record the
cause of every server error, but nothing alerts you. Sentry's free tier takes
about ten minutes.

---

## What is already done

- Ordering works end to end; 139 automated tests pass
- A dropped mobile connection cannot create a duplicate order — enforced by a
  database constraint, not just by code
- Prices are re-read server-side; a tampered request cannot change what you charge
- `/kitchen` is PIN-gated and fails closed
- Customer names and phone numbers are no longer publicly readable — verified by
  attacking the database with your own public key
- Orders auto-delete after 30 days (GDPR), with 30-day history and search
- Allergen data on all 101 dishes, shown to customers, with a filter
- Privacy policy live at `/privatlivspolitik`
- Facebook posts no longer track visitors before they consent
- The menu lists in your paper-menu order instead of at random
- Customers can follow their order at a private link

---

## If something goes wrong tomorrow

| Symptom | Fix |
|---|---|
| Kitchen screen empty but orders exist | Old build still deployed — redeploy |
| `/kitchen` shows a setup notice | `STAFF_PIN` or `STAFF_SESSION_SECRET` missing |
| Menu page empty | Run **Systemtjek**; it will say why |
| Two orders from one customer | Stop and tell me — this should be impossible |
| Anything else | `/kitchen` → **Systemtjek** → **Kør tjek** |

Every customer-facing failure falls back to the same thing: your phone number.
The error page, the 404, the closed message and the empty allergen filter all
show it. A restaurant that cannot take an online order can still take a call.
