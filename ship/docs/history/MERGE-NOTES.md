# Hvad der er lagt ind

Designsystemet og takeaway-systemet er sat ind i **jeres** repo. Jeres sider,
tekster og billeder er beholdt — der er ikke slettet indhold.

## Design

Farverne er aflæst fra brand-arket og lagt ind som Tailwind v4-tokens i
`app/globals.css` (`@theme`). Jeres 566 hårdkodede farveværdier er mappet over:

| Før | Efter | Rolle |
|---|---|---|
| `#ff8c00` | `#C1AB7F` gold | accent |
| `#000000` | `#0E0F11` sumi | bund |
| `#323232` | `#313A40` slate | paneler |
| `#d9d9d9` | `#C9C9CA` | sekundær tekst |

**Guldreglen (målt, ikke skønnet):** guld er 8,58:1 på mørk bund — fint som
tekst. På creme er det 1,81:1 — dér må det **kun** være ornament. Alle
tekstfarver er tjekket mod WCAG AA.

Typografi i tre niveauer: **Cormorant Garamond** (overskrifter),
**EB Garamond** (brødtekst), **Inter** (tal, telefon, mikrotekst).
**Shippori Mincho** er kun til kanji — de latinske serifer har ingen
CJK-glyffer, så uden den ville 食べ放題 stå som tomme kasser.

`components/brand/` rummer seigaiha-mønsteret, bølge-dividers, de to lockups
og crest'en. `components/fish-mark.tsx` er logoet tegnet om til SVG direkte
fra det originale PNG — stregbredde, halespidser, ryggens top og øjet er målt.

## Takeaway-systemet

| Rute | Hvad |
|---|---|
| `/takeaway` | **Ny:** live bestilling — kurv, checkout, betal ved afhentning |
| `/menukort` | **Ny:** alle 18 menukort-billeder (flyttet hertil fra den gamle `/takeaway`) |
| `/kitchen` | **Ny:** køkkenskærm — nye ordrer, minuttæller, "Færdig" |
| `/api/checkout` | **Ny:** opretter ordren |

**Priser valideres server-side.** Klientens priser bruges aldrig — ellers kan
hvem som helst sende en sushibox til 1 kr. Udsolgte varer afvises, og der
tages ikke imod ordrer uden for åbningstid (`lib/opening-hours.ts`, regnet i
`Europe/Copenhagen`, fordi serveren kører i UTC).

## Før det kan gå live

1. Kør `schema.sql` i Supabase → menuen og de 3 Super Tilbud-menuer oprettes.
2. Sæt env-variablerne (se `.env.example`) i Vercel.
3. `npm install` (der er tilføjet `@supabase/supabase-js`).
4. Kør `npm run build` én gang lokalt — den er aldrig kørt i dette miljø.
5. `/kitchen` er **ikke** låst endnu. Sæt en adgangskode før den bruges i drift.
6. Vinlisten på `/vinmenu` er stadig jeres eksisterende indhold.
