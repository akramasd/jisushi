# Database verification — live Supabase project

**Project:** Ji-sushi Takeaway (`bczgdophgxjltnpzmkic`), eu-west-3, Postgres 17.6
**Date:** 26 August 2026
**Method:** direct connection to the live database, not a simulation

---

## What I found

`schema.sql` had **never been run** in its current form. The database was still
at its original state from 18 August.

### 1. Customer data was publicly readable

Every table carried this policy:

```sql
anon_all  FOR ALL  USING (true)  WITH CHECK (true)   -- granted to PUBLIC
```

on `orders`, `menu_items`, `loyalty_customers`, and `settings`.

The anon key ships inside the JavaScript bundle of every page. It is public by
construction. So anyone who opened devtools could read every customer's name and
phone number, insert fake orders, rewrite menu prices, delete the night's
orders, or read the webhook secret — without ever loading the app.

### 2. Duplicate-order protection did not exist

No `idempotency_key` column, no unique index. A customer on mobile data whose
response dropped and who tapped again would have created **a second real order**,
and the kitchen would have cooked two dinners.

### 3. The menu was in arbitrary order

No `sort_order` column. The query fell back to ordering by `id`, which is
`gen_random_uuid()` — random. Customers saw the menu in a sequence matching
neither the paper menu nor anything else.

### 4. Everything else was missing too

`public_token` (customer status page), `phone_digits` (history search by phone),
and all eight lifecycle columns.

---

## What I applied

Three migrations, all additive apart from the policy replacement:

| Migration | What it did |
|---|---|
| `prepnest_takeaway_reliability_and_menu_order` | 8 lifecycle columns, `idempotency_key` + unique index, `public_token` + unique index, generated `phone_digits` column, status CHECK constraint, `sort_order`, retention function, 4 indexes |
| `prepnest_menu_sort_order_full` | Backfilled all 101 items to the paper-menu sequence (the first migration carried a truncated list) |
| `prepnest_rls_least_privilege` | Replaced the open policies; hardened two functions |

---

## Proof it worked

I attacked the database **as the anon role** — the exact key that ships in every
visitor's browser — and recorded what it could do.

**Reads:**

```
orders_visible    0
loyalty_visible   0
settings_visible  0
push_visible      0
menu_visible    101      ← correct: the menu is public
```

**Writes:** insert a fake order, rewrite a price, delete all orders. Afterwards:

```
orders still present  1      (delete failed)
fake orders           0      (insert failed)
California price      80.00  (unchanged)
menu items            101
```

**Constraints, tested live:** inserting the same `idempotency_key` twice raised
`unique_violation` — a dropped connection cannot create a second order.
`phone_digits` generated `31334486` from `+45 31 33 44 86`, so history search by
phone will find the customer.

**Service role unaffected:** the server routes still read everything they need.

**Menu now reads:** Edamame bønner → Edamame bønner med chili → Tangsalat →
Kimchi → Wasabi bønner → Rejechips
**Categories:** Forretter → Sticks → Sashimi → Toppet maki → Uramaki → Hosomaki
→ Futomaki → Nigiri → Rispapir ruller → Tilbehør → Menuer → Sushi Box → Super Tilbud

**No data lost:** the one existing order and all 101 menu items are intact.

---

## Also fixed

- `purge_old_orders` had a mutable `search_path` — a caller could have shadowed
  `orders` with their own table and redirected the DELETE. Now pinned, and
  `EXECUTE` revoked from `anon`/`authenticated`.
- `rls_auto_enable()` — a pre-existing event trigger that force-enables RLS on
  any newly created table. Useful; kept. But it was callable by anyone over the
  REST API for no reason, so `EXECUTE` is revoked.

Supabase's own security advisor now reports **zero WARN-level issues**. The four
remaining are INFO-level "RLS enabled, no policy" on `orders`,
`loyalty_customers`, `settings` and `push_subscriptions` — which is the intended
end state, not a gap. Deny by default; server-side access only.

---

## Sequencing note

The RLS lockdown means **any deployment still running the old code will show an
empty kitchen screen**, because the old kitchen page read `orders` with the anon
key. The current code reads them through `/api/kitchen/orders` using the service
role, so deploy the current build and the screen works.

If you need to roll back in an emergency, this restores the old behaviour — but
it also re-exposes customer data, so treat it as a last resort:

```sql
CREATE POLICY anon_all ON orders FOR ALL USING (true) WITH CHECK (true);
```

---

## Still outstanding

- **Deploy the current build.** The database now expects it.
- **`settings.webhook_url` is not set.** Without it, if the kitchen tab is
  closed, nobody is alerted to a new order.
- **`CRON_SECRET`** must be set for the 30-day purge to run.
- **The phone test** — mobile data, airplane mode mid-submit, retry. Expect one
  order, not two. The database will now enforce that.
