# SMS gateway — Android phone as sender

Free. Uses a spare Android phone and your existing SIM. No Twilio, no per-message
cost, no account with a provider who can cut you off.

---

## What it sends

**To customers**, when their order actually changes:

| Status | Text |
|---|---|
| Bekræftet | "Vi har bekræftet din ordre #41 og forventer den klar kl. 19:40." |
| Klar | "Din ordre #41 er klar til afhentning i Lodsgade 10." |
| Annulleret | "Din ordre #41 er desværre annulleret. Ring til os." |

Deliberately **not** on "modtaget" — that arrives while the customer is still
looking at the confirmation screen. A message telling someone what they can
already see is how a restaurant teaches people to ignore its texts.

**To you**, when something breaks: checkout failing, the database unreachable,
messages failing to send. One text per hour per kind of problem — an alert that
fires forty times during one outage is an alert that gets muted.

---

## How it works

Nothing sends directly. Every message goes into a queue, and the phone pulls
from it:

```
order changes → queue → phone polls /api/sms/pending
                      → phone sends the SMS
                      → phone confirms via /api/sms/report
```

**Claim-then-confirm, not fire-and-forget.** The phone marks a message as taken,
sends it, then reports back. If the phone dies between taking and sending, the
message is released after five minutes and offered to the next poll. Delete-on-read
would lose it — at exactly the moment it matters.

Five failed attempts and a message is marked failed and shown in Systemtjek,
rather than retried forever into nothing.

Duplicates are impossible: each message carries a key like
`order:abc-123:ready`. The same status change cannot be texted twice, no matter
how many times the kitchen taps or the gateway retries.

---

## It launches switched off

The site works without any of this. Until you set `sms_enabled = true`, messages
are **recorded but not queued** — you get a log of what would have been sent,
and no backlog waiting to fire.

That last part is the whole design. Without it, connecting a phone three months
after launch would text hundreds of people *"din ordre er klar"* about meals
they ate in September. One message like that teaches a customer to ignore every
text you will ever send.

Two mechanisms make it safe:

| | |
|---|---|
| `settings.sms_enabled` | While false, messages are marked `skipped`, never `pending` |
| `expires_at` | Every message has a shelf life. Ready: 2 h. Confirmation: 45 min. Cancellation: 24 h. Owner alerts: 3 h. Past it, the gateway never picks it up — even if the flag were wrong |

Anything queued before you switch on is expired on the first poll. There is no
path by which a stale message reaches a customer.

**Systemtjek reports three states**, so "not set up yet" never looks like a fault:

- *Ikke slået til endnu* — with a count of what has been recorded
- *Telefonen hentede for N min siden* — working
- *Telefonen har ikke hentet i N min* — the phone is off, flat, or out of signal

## Switching it on, later

1. Set up the phone and the app (below).
2. Set `SMS_GATEWAY_SECRET` and `OWNER_PHONE` in Vercel. Redeploy.
3. Supabase → Table Editor → `settings` → row `main` → **`sms_enabled` = true**.
4. Wait up to a minute — the flag is cached, so it is not instant.
5. `/kitchen` → **Systemtjek** should show the phone polling.
6. Send yourself a test before any customer gets one:

```
POST /api/kitchen/sms-test   { "phone": "31334486" }
```

Nothing needs redeploying to turn it on or off. The switch is a database field.

## Setup (20 min)

### 1 · The phone

Any Android phone with a SIM that can send texts. A spare works. Keep it plugged
in at the restaurant — this is the one job it has.

### 2 · Install a gateway app

Search F-Droid or Play for an **SMS gateway** app that supports *webhook polling*
or a *custom HTTP API*. Good open-source option: **SMS Gateway for Android**
(capcom6). What matters is that it can:

- call a URL on a schedule
- send a `Authorization: Bearer <token>` header
- POST results back

### 3 · Generate a token

Any random string, 32+ characters. In Vercel → Environment Variables:

| Variable | Value |
|---|---|
| `SMS_GATEWAY_SECRET` | your random token |
| `OWNER_PHONE` | your mobile, e.g. `+4512345678` |

Redeploy.

### 4 · Point the app at your site

**Poll for messages** — every 30 seconds:

```
GET https://www.jisushi.dk/api/sms/pending
Authorization: Bearer <SMS_GATEWAY_SECRET>
```

Returns:

```json
{ "ok": true, "messages": [ { "id": "…", "to": "31334486", "text": "Ji Sushi: …" } ] }
```

**Report results** after sending:

```
POST https://www.jisushi.dk/api/sms/report
Authorization: Bearer <SMS_GATEWAY_SECRET>
Content-Type: application/json

{ "results": [ { "id": "…", "sent": true } ] }
```

For a failure, send `{ "id": "…", "sent": false, "error": "no signal" }` and it
will be retried.

### 5 · Test it

Place an order, tap **Bekræft** in the kitchen. A text should arrive within a
minute. If not, open **Systemtjek** — failed messages are listed there.

---

## Multiple feelers

An error reaches you through four independent paths, so no single failure
silences the alarm:

| Feeler | Works when |
|---|---|
| **Vercel logs** | always — written before anything else is attempted |
| **`system_events` table** | the database is up. Visible in Systemtjek, on a phone |
| **SMS to you** | the phone gateway is running |
| **Kitchen webhook** | used specifically when the database write failed |

Plus, if you set it up: **UptimeRobot** pinging `/api/health` every 5 minutes,
which catches the case where the whole site is down and none of the four can run.

The health endpoint now raises an alert itself as well, so you are told even
before an uptime monitor exists.

---

## Two-way spreadsheet sync

The Sheet is no longer write-only. If the kitchen changes a status **in the
spreadsheet** — which is what they do during an outage — it flows back:

```
sheet edit → pushStatusChanges() every minute → /api/sheet/sync
           → order updated → customer texted
```

Danish words are accepted, because that is what staff type: *Ny*, *I gang*,
*Klar*, *Afhentet*, *Annulleret*.

The same transition rules apply as on the kitchen screen. A spreadsheet is a
text box, and it must not be able to move an order somewhere the interface
forbids — no un-cancelling, no skipping straight to collected.

**To enable:** in Apps Script → Project Settings → add script property
`PREPNEST_SYNC_URL` = `https://www.jisushi.dk/api/sheet/sync`, then Triggers →
add trigger → function `pushStatusChanges`, time-driven, every minute.

---

## Limits, stated plainly

- A phone SIM sends roughly 30 texts/minute before the carrier throttles. At 45
  orders a day with two texts each, you are far below that.
- Danish carriers may treat high volume as spam. Watch it for the first week.
- The phone must stay on, charged, and with signal. It is a single point of
  failure for texts — but only for texts. Orders are unaffected if it dies, and
  the failure shows up in Systemtjek.
- SMS is not encrypted. The texts contain an order number and a pickup time,
  which is why they deliberately contain no address, no items, and no prices.
