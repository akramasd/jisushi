# Backup og nødsystem — opsætning

30 minutter. Alt kan gøres fra en telefon eller en browser.

Når du er færdig, har du:

- **En løbende kopi** af hver eneste ordre, skrevet i samme sekund som den oprettes
- **En backup**, som Supabase' gratis-plan ikke giver dig
- **Et nødsystem**, der tager imod ordrer, hvis hjemmesiden er nede
- **En besked til køkkenet**, når systemet kører i nødspor

---

## 1 · Opret regnearket (5 min)

1. Gå til [sheets.new](https://sheets.new) — nyt tomt regneark
2. Navngiv det **"Ji Sushi — Ordrer"**
3. Menu → **Udvidelser → Apps Script**
4. Slet alt i editoren, indsæt hele indholdet af `Code.gs`
5. Tryk **Gem**

## 2 · Sæt en hemmelighed (2 min)

I Apps Script: tandhjulet **Projektindstillinger** → **Scriptegenskaber** →
**Tilføj scriptegenskab**:

| Egenskab | Værdi |
|---|---|
| `PREPNEST_SECRET` | en tilfældig tekst, mindst 20 tegn |
| `KITCHEN_EMAIL` | den mail, køkkenet læser |

Gem den tilfældige tekst — du skal bruge den igen i trin 4.

## 3 · Udgiv som web-app (5 min)

1. Øverst til højre: **Udrul → Ny udrulning**
2. Tandhjulet ved "Vælg type" → **Webapp**
3. Udfør som: **Mig**
4. Hvem har adgang: **Alle** ← nødvendigt, ellers kan hjemmesiden ikke skrive
5. **Udrul** → godkend adgang (Google advarer, fordi scriptet er dit eget — vælg
   **Avanceret → Fortsæt**)
6. Kopiér **web-app-URL'en**

> "Alle" lyder utrygt, men URL'en er ikke til at gætte, og scriptet afviser alt
> uden den rigtige `PREPNEST_SECRET`.

## 4 · Forbind hjemmesiden (3 min)

Vercel → Settings → Environment Variables:

| Variabel | Værdi |
|---|---|
| `SHEET_WEBHOOK_URL` | web-app-URL'en fra trin 3 |
| `SHEET_WEBHOOK_SECRET` | samme tekst som `PREPNEST_SECRET` |

Udrul igen. Fra nu af lander hver ordre begge steder.

## 5 · Opret fanerne (1 min)

Tilbage i Apps Script: vælg funktionen **`setup`** i rullelisten, tryk **Kør**.

Tre faner oprettes:

| Fane | Til hvad |
|---|---|
| **Alle ordrer** | Rådata, alt siden start. Rør den ikke i hånden. |
| **I dag** | Kun dagens ordrer, nyeste øverst. |
| **Køkken** | Stor skrift, farvekodet, til skærm eller print. |

Farverne: **rød** = ny, **gul** = i gang, **grøn** = klar, **grå** = afhentet.
Ventende ordrer ligger altid øverst.

## 6 · Nødformularen (10 min)

Hvis hjemmesiden er helt nede, skal kunderne stadig kunne bestille.

1. Regnearket → **Værktøjer → Opret en formular**
2. Titel: **"Bestil takeaway — Ji Sushi"**
3. Felter, præcis disse navne:

| Spørgsmål | Type | Påkrævet |
|---|---|---|
| Navn | Kort svar | ja |
| Telefon | Kort svar | ja |
| Bestilling | Langt svar | ja |
| Afhentning | Multiple choice: 15 / 30 / 45 / 60 min | ja |
| Cirka pris | Kort svar | nej |

4. Apps Script → ur-ikonet **Udløsere** → **Tilføj udløser**:
   funktion `onFormSubmit`, hændelseskilde **Fra regneark**, type
   **Ved indsendelse af formular**
5. Kopiér formularens link. **Gem det et sted, I kan finde det uden hjemmesiden**
   — skriv det på en seddel ved kassen.

Nødordrer lander i samme ark, markeret **NØDFORMULAR**, og der sendes en mail
til `KITCHEN_EMAIL`.

---

## Sådan virker de fire niveauer

| Niveau | Hvad der sker | Hvad kunden mærker |
|---|---|---|
| **Normal** | Hjemmeside → database → køkkenskærm | Intet særligt |
| **Database nede** | Hjemmeside → regneark → køkkenet læser arket | "Vi har modtaget din bestilling, ring gerne og få den bekræftet" |
| **Hjemmeside nede** | Nødformular → regneark + mail | Bestiller via formularlinket |
| **Alt nede** | Telefon | Ringer — som altid |

Køkkenskærmen viser selv en besked, hvis niveau 2 er aktivt, med tre trin: åbn
arket, lav de røde, skriv "Afhentet". Beskeden forsvinder af sig selv.

---

## Prøv det af, én gang

Gør det nu, ikke den aften I får brug for det.

1. Bestil noget på hjemmesiden. Se ordren dukke op i **Køkken**-fanen.
2. Send en test gennem nødformularen. Tjek at den lander med **NØDFORMULAR**
   og at mailen kommer.
3. Vis køkkenet, hvor arket ligger, og hvad rød betyder.

Et nødsystem, ingen har prøvet, er ikke et nødsystem.

---

## Grænser, sagt lige ud

- Apps Script må køre 90 minutter i døgnet og sende 100 mails. Langt over, hvad
  en restaurant bruger — men det er en grænse, ikke uendeligt.
- Regnearket bliver tungt over ca. 50.000 rækker. Ved 45 ordrer om dagen er det
  omkring tre år. Opret et nyt ark, når det sker.
- Arket er **ikke** krypteret ud over Googles egen sikring. Det indeholder navne
  og telefonnumre — del det kun med personalet, og slet gamle ark, når de er
  overflødige.
