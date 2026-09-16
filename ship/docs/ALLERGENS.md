# Allergens — what was built, and what you must do

**Legal basis:** EU Regulation 1169/2011, Annex II. Food sold at a distance must
carry allergen information that reaches the customer *before* they buy. A
takeaway website is distance selling. This is not optional for a Danish
restaurant.

---

## The rule the whole system is built on

> An unchecked dish and a dish with no allergens must never look the same to
> someone with an allergy.

So every dish starts as **unconfirmed**, and the website says
*"Allergener ikke bekræftet endnu — spørg os"* rather than showing an empty list.
Only after a human in your kitchen presses **Bekræft** does a dish display a
declaration.

Over-declaring costs a sale. Under-declaring puts someone in hospital. Every
default here leans the safe way.

---

## What is done

**All 101 dishes have a first-pass suggestion**, read from their ingredient
text and already loaded into your live database:

| Allergen | Dishes |
|---|---|
| Fisk | 55 |
| Gluten | 33 |
| Krebsdyr | 33 |
| Æg | 28 |
| Sesam | 13 |
| Soja | 13 |
| Mælk | 3 |
| Sennep | 2 |
| Sulfitter | 1 |

Where the rules are deliberately cautious:

- **Surimi** → fish *and* gluten *and* egg. It looks like crab; it is white fish
  bound with wheat starch. This is the classic under-declaration.
- **Soy sauce, teriyaki, ponzu, miso** → soy *and* gluten. Ordinary soy sauce
  contains wheat. If you use a gluten-free tamari, remove it during review.
- **"Wasabi"** → mustard. Danish wasabi is normally horseradish with mustard.
- **Kimchi** → fish, because it is usually made with fish sauce.
- **Tangsalat** → sesame and soy, the standard marinade.

**Composite dishes inherit their components.** "40 Box" lists *"8 uramaki:
California"* without repeating that California contains sesame. Deriving from
the box's own text alone would have missed it. Component names are resolved and
their allergens unioned in — which is how the 40–80 Boxes gained sesame, and the
Alaska-containing boxes gained milk from the cream cheese.

**Two dishes cannot be derived at all.** Box 90 and Box 100 are
*"sammensættes af sushikok"*. They carry a note telling the reviewer exactly
that, and they will never auto-clear.

**A content bug was fixed on the way.** "Spicy Laks" carried California's
description — surimi instead of salmon. Wrong ingredients produce wrong
allergens, so that mattered here more than anywhere.

---

## What only you can do

Open **`/kitchen/allergener`** on any phone. It lists every dish with its
suggestion pre-filled. Tap to correct, then **Bekræft**. A counter shows
progress.

Check these hardest — they carry allergens without saying so in the name:

- **Frituren.** If tempura and anything else share oil, that is gluten across
  everything fried.
- **Saucer and marinader.** Spicy mayo, teriyaki, goma, the "spicy sauce" in
  several rolls.
- **Sushi ris.** Some kitchens season with a vinegar blend containing soy.
- **Your actual suppliers.** Surimi, tobiko and mayonnaise recipes differ
  between brands. The label on the box beats any rule in this file.

Until a dish is confirmed it shows "spørg os", so an unreviewed menu is
**honest**, not broken. You can publish before finishing — but confirm the
popular dishes first.

---

## What the customer sees

- Every dish shows its declaration, or "not confirmed — ask us".
- A **filter**: "hide dishes containing…", listing only allergens that actually
  occur on your menu, with counts.
- Unconfirmed dishes are **hidden** when someone filters. Showing an unchecked
  dish to someone avoiding shellfish is the precise failure this prevents.
- A cross-contamination notice: one kitchen, shared equipment, no guarantee of
  freedom from traces, ring us for a serious allergy.
- If a filter leaves nothing, they get your phone number rather than an empty
  page.

---

## Covered by tests

29 tests in `tests/allergens.test.ts`, including the safety properties:

- an unreviewed item reports "ask", even with an empty allergen list
- an unreviewed item is hidden when a customer filters
- invalid codes are discarded rather than rendered
- surimi resolves to fish *and* gluten

The database also enforces it: a `CHECK` constraint permits only the 14 codes,
so a typo cannot become a silently ignored entry that reads as "cleared".
