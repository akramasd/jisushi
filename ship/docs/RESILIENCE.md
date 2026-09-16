# Resilience — what to add, and what to skip

You asked for every free tier you could sign up for. Here is the honest list,
including the ones I would not bother with and why.

---

## First, the thing I would not build

**Do not run two databases and switch between them.**

It sounds like redundancy. It is the opposite. Two databases that disagree about
whether an order exists is worse than one being down: you get duplicate orders,
lost orders, or a kitchen working from stale data. Keeping them in sync is the
hardest problem in distributed systems, and you would be taking it on to avoid
$25 a month.

The failure modes multiply rather than divide. You would now have Supabase
failures, Firebase failures, *and* sync failures — and the sync bugs would be
the ones that bite during service, because that is when write volume is highest.

Worth naming what actually fails in a system like this. Not the database —
Supabase's uptime is very good. What fails is the kitchen iPad's wifi, a tab
being closed, a bad deploy, someone's phone. The Sheet mirror and the degraded
mode address those. A second database does not.

**Instead:** one database, one continuous mirror, one manual fallback, and the
phone. Four layers, each simple enough to reason about at 19:00 on a Friday.

---

## The architecture, decided

Two systems. The smallness is the point — every piece you keep is a piece
someone has to maintain, and an unmaintained piece is worse than no piece.

| Layer | Where | Job |
|---|---|---|
| Website | Vercel | Customer orders |
| Database | Supabase | The truth. No duplicate orders — enforced by a database constraint |
| Kitchen screen | Vercel, iPad in the restaurant | Kitchen works |
| **Spreadsheet** | **Google** | **Continuous copy · backup · emergency intake** |
| SMS | Android phone | Messages to customers and to you |
| Phone | — | When everything else fails |

**Self-hosting was considered and dropped.** A machine at home cannot serve a
kitchen 40 km away, and putting anything load-bearing on a home connection means
a power cut in one town takes ordering down in another. The spreadsheet gives
the same backup and the same offline fallback, with nothing to patch and nothing
to reboot.

### Four levels of failure

| Level | What happens | What the customer notices |
|---|---|---|
| **Normal** | Website → Supabase → kitchen screen | Nothing |
| **Database down** | Website → spreadsheet → kitchen reads the sheet | "Received — ring to confirm" |
| **Website down** | Emergency Google Form → same sheet + email | Orders via the form link |
| **Everything down** | Phone | Rings, as always |

The spreadsheet is written to on **every** order, not only during an outage. A
backup you only write to when things break is one nobody has tested, and the
outage is the worst possible moment to find out it does not work.

The kitchen screen detects level 2 by itself and shows the three steps.

## Sign up for these — worth the time

### 1. Supabase Pro — $25/month · **not free, do it anyway**

The single biggest gap. You are on the free plan: **no automated backups**, and
projects pause after a week of inactivity. For a business taking real orders
that is the wrong tier.

Everything else on this list is a workaround for problems this solves outright.

### 2. UptimeRobot — free, 50 monitors

Point it at `https://www.jisushi.dk/api/health` every 5 minutes, alert to your
phone. That endpoint checks the database is reachable and returns 503 if not.
This is how you learn the site is down before a customer tells you.

**10 minutes. Do it first.**

### 3. Sentry — free, 5k errors/month

Groups errors, tells you which are new, sends one alert instead of a hundred.
The system already logs to `system_events` and Vercel's logs — Sentry adds the
alert on top so you do not have to go looking.

### 4. Upstash Redis — free, 10k commands/day

The only genuine technical weakness left: rate limiting is in-memory, so the
window is per serverless instance rather than global. It stops one person
hammering the endpoint; it will not stop a distributed flood. Upstash makes it
global. `lib/rate-limit.ts` was written with the same interface, so it is a
small swap.

### 5. Cloudflare — free

Put your DNS here and you get a fallback page: if Vercel is down entirely,
Cloudflare can still serve "Ring til os på 31 33 44 86". Also caching and DDoS
protection you do not have to think about.

### 6. Resend — free, 3k emails/month

Email the customer their order confirmation, and yourself a nightly summary.
Right now the only receipt is a link they might lose.

---

## Skip these

**Firebase** — a second database is the problem described above, not a solution.
Its free tier is generous, but it solves nothing you have.

**PlanetScale / Neon / Turso** — same reasoning. Excellent products; wrong
answer to this question. Migrating *to* one is reasonable. Running one *beside*
Supabase is not.

**A second hosting provider** — Vercel's uptime is not your bottleneck, and
keeping two deployments in step is a job nobody will do after week three.

---

## In order, if you only do some

1. **UptimeRobot** — 10 min, tells you when you are down
2. **Sheet mirror** — 30 min, already built, gives you backup *and* fallback
3. **Supabase Pro** — $25, removes the backup problem entirely
4. **Sentry** — 15 min, tells you *why* you are down
5. Upstash, Cloudflare, Resend — when the first four are running

---

## What "fully capable" actually means here

Not that nothing ever breaks. That when something breaks:

- **you find out** (UptimeRobot, Sentry, the degraded banner)
- **the order is not lost** (Sheet mirror catches it)
- **the kitchen knows what to do** (three steps on the screen)
- **the customer is told the truth** (received, but ring to confirm — never a
  false confirmation)
- **you can recover** (the Sheet has everything, in order, by day)

A system that claims it never fails is lying. One that fails visibly, keeps the
order, and tells everyone what to do next is what you can actually run a
restaurant on.
