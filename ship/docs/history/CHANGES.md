# Ship pass 4 — proof, not assertion

Three passes of "this is fixed" without ever running a line of it. This pass
makes the software prove itself.

## 73 tests. Actually executed.

```
npm test    →  # tests 73   # pass 73   # fail 0
```

No `npm install` required. Node 22 strips TypeScript natively, so the suite runs
on the built-in test runner with a 30-line resolver for Next's `@/` alias. That
choice matters: a suite that only runs after a full install succeeds is a suite
nobody runs while triaging a broken tree.

**Every test maps to a bug that actually shipped in this project:**

| Suite | The failure it prevents returning |
|---|---|
| `pricing` (23) | UUID compared as a number — emptied every cart. Per-line clamp — 20 lines × 99 past a ceiling of 99. |
| `hours` (15) | A UTC serverless clock misjudging Danish opening times, across both DST boundaries. |
| `phone` (13) | "31 33 44 86" stored verbatim, searched as digits, matching nothing. |
| `transitions` (10) | A stale tab un-cancelling an order or skipping acceptance. |
| `resilience` (13) | A dropped response creating a second dinner. |

The suite is adversarial by default: negative quantities, `NaN`, `Infinity`,
prices as strings, `__proto__` as an id, duplicate lines, 12,000 idempotency
keys checked for collision, a connection that never answers.

### The tests found a bug in the tests

`Object.assign(fn, { get calls() {…} })` copies a getter's **value**, freezing
the counter at zero. Five retry assertions were passing vacuously. Caught,
fixed, and the reason is written into the file so it does not recur.

## Testability changed the production code

The money path moved out of the route handler into `lib/pricing.ts` and
`lib/phone.ts` as pure functions. Logic reachable only through a database and a
network is logic that will not be tested — and every bug this project shipped
lived in exactly that kind of logic. The routes now import the tested modules
rather than carrying their own copy.

Two hardenings fell out of writing the tests:
- `round2()` on every total. Sushi prices are whole kroner today, so float drift
  is invisible — until someone adds a 12,50 item and a receipt reads 137,49999999.
- A `NaN` or negative price from the database now fails loudly instead of
  charging nothing.

## Craft: the states nobody designs

The site already had a real identity — gold on sumi, the drawn fish mark, the
`ji-display` scale — and reduced motion, focus-visible and a skip link were
already in place. What was missing was everything that happens when things go
wrong:

- **`app/error.tsx`** — an error screen is direction, not a mood. It says what
  broke, offers a retry, and gives the one thing that always works for a
  restaurant: the phone number.
- **`app/global-error.tsx`** — replaces the root layout, so it uses zero tokens
  and zero fonts. A fallback that depends on the thing that failed is not a
  fallback.
- **`app/takeaway/loading.tsx`** — a skeleton shaped like the menu, so the page
  does not jump when it arrives. `aria-hidden` with one live-region label: a
  screen reader hears "loading", not eleven empty rows.
- **Kitchen ticket** — `@media print` reduces the KDS card to a 72mm
  receipt-width slip in black on white. A takeaway bag needs a physical ticket;
  printing the dark-mode screen gave three wasted pages.

## The swarm learned two things

Both checkers produced false positives against the improved code, and both were
fixed rather than worked around:

- **schema-guardian** attributed a second query's columns to the first table
  when both sat within its 800-character lookahead. Now bounded at the next
  `.from()`.
- **order-flow-integrity** reported the quantity clamp as missing once it moved
  into a pure module. Now follows the route's imports one level deep —
  otherwise the check argues against good structure.

A sixth agent, **test-runner**, joins the swarm, and `npm test` is now part of
the pre-deploy gate (skipped, not failed, on Node < 22).

## Still true

`npm run build` has still never run — no network here. That remains the last
gate. Everything else now has a green light you can reproduce:

```bash
npm run verify
```
