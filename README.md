# 60 Seconds FM — Next.js migratie

Dit is de Next.js (App Router) + TypeScript versie van 60secondsfm, opgezet
volgens dezelfde structuur als earvin.nl en belastinginzicht.nl. Het origineel
was een vanilla HTML/CSS/JS-site met Supabase; deze versie behoudt dezelfde
look, routes en Supabase-integratie, maar dan als React/Next.js codebase.

## Status: fase 1 van de migratie

Wat er nu al staat en werkt:

- Project-scaffold (Next.js 14, App Router, TypeScript)
- `lib/supabase.ts` — Supabase client (poort van `getSupabaseClient()`)
- `lib/config.ts` — poort van `assets/js/config.js`, Supabase-sleutels via env vars
- `lib/countries.ts` — landen → vlag-emoji lookup (poort van `COUNTRY_TO_ISO`)
- `lib/profile.ts` — profiel/track/likes/notificaties-helpers (poort van de
  gedeelde functies in `assets/js/app.js`)
- `hooks/useAuth.tsx` — auth/sessie state als React context (poort van
  `getCurrentUserSafe`, `clearInvalidSessionSafe`, coins/likes/notificaties-sync)
- `components/SiteChrome.tsx` — de volledige header, desktop side-nav,
  mobiele bottom-nav, account-menu en coins-badge die op elke pagina
  terugkwamen (was in elke `.html`-pagina gekopieerd + `app.js`-logica)
- `app/globals.css` — gedeelde stijlen (root-variabelen, header/nav, knoppen)
  1-op-1 overgenomen uit `index.css`, `global.css` en `buttons.css`
- PWA-bestanden (`manifest.json`, `sw.js`) overgenomen en bijgewerkt naar de
  nieuwe (geen `.html`) routes
- Statische assets (`icons/`, logo, coin, achtergronden) verplaatst naar `public/`

**Opgeschoond:** `assets/css/index 2.css` en `index 3.css` (ongebruikte
backup-kopieën, ~13.700 regels dode CSS) zijn niet meegenomen. `auth.js`
(verwees naar een niet-bestaand `supabase.js`-bestand) is niet overgenomen —
die logica zit nu in `hooks/useAuth.tsx`. De ongebruikte icons
`Unfltrd-channel.png`, `burger.png` en `settings.png` zijn ook weggelaten.

## Status: fase 3 — community-kolom staat

**Fase 1 (scaffold/nav/auth), fase 2 (radiospeler) en fase 3 (community-kolom)
zijn nu klaar.**

Fase 3 toegevoegd:

- `components/radio/FeaturedArtists.tsx` — "Artist Spotlight"-carrousel: 1
  groot + 2 kleine kaarten, autorotatie elke 10s, dots/pijltjes-navigatie,
  swipe op mobiel, pauzeert bij hover (poort van `featured-artists.js`)
- `components/radio/NewsFeed.tsx` — "Community updates": doorlopend
  scrollende lijst van nieuwe leden, goedgekeurde tunes en dagelijkse
  supporters, ververst elke 60s (poort van `loadNewsFeed`/`advanceNewsFeed`
  in `index.js`)
- `components/radio/TopSupporters.tsx` — top-10 supporters op Seconds-saldo
  (poort van `loadTopSupporters` in `index.js`)
- `lib/community.ts` — de Supabase-queries voor alle drie, met types

Deze componenten laden hun data client-side (net als het origineel: de
secties waren ook daar leeg/`hidden` tot na een JS-fetch), dus in de
server-gerenderde HTML zie je ze pas verschijnen na hydratie in de browser.

## Status: fase 4 — login, registratie en account-bevestiging staan

Fase 4 toegevoegd:

- `app/login/page.tsx` — login + sign-up in één formulier (toggle), Google
  OAuth-knop, foutmeldingen uit de OAuth-redirect-URL, stuurt na inloggen door
  naar `/` of `/edit-profile?welcome=1` afhankelijk van of er al een
  artiestenprofiel is (poort van `login.html` + `login.js`)
- `app/join/page.tsx` — "Create Artist Profile"-formulier: naam, bio,
  nationaliteit, geboortedatum, social link, foto-upload, voorwaarden. Toont
  een melding als je nog niet bent ingelogd of al een profiel hebt, en stuurt
  door naar `/edit-profile?welcome=1` als er een leeg profiel-record bestaat
  (poort van `join.html` + `join.js`)
- `app/confirm/page.tsx` — verwerkt de e-mail-bevestigingslink
  (`token_hash`/`type`) en stuurt daarna door (poort van `confirm.html` +
  `confirm.js`)
- `lib/profile.ts` uitgebreid met `uploadArtistPhoto()` en
  `saveArtistProfile()` (gedeeld, ook nodig voor de latere edit-profile-pagina)
- `lib/countries.ts` uitgebreid met de landen-dropdownlijst
- `app/login/login.css` en `app/join/join.css` — verbatim overgenomen

**Bewuste aanpassing:** de oude `join.html` had een eigen mini-inlogformulier
in de header (`authBox`), los van de "echte" loginpagina. Nu iedere pagina
dezelfde gedeelde header/nav (`SiteChrome`) gebruikt, is die dubbele inlogflow
niet meer nodig — de "Login"-knop in de nav linkt overal naar `/login`.

## Status: fase 5 — Liked, Notifications en Statistics staan

Fase 5 toegevoegd:

- `app/liked/page.tsx` — playlist-overzicht van geliketet tunes (poort van
  `liked.html` + `liked.js`)
- `app/notifications/page.tsx` + `components/notifications/NotificationCard.tsx`
  — meldingen met live-updates (Supabase Realtime), groepering van
  herhaalde "like"-meldingen, swipe-to-delete op mobiel, markeren als
  gelezen bij bezoek (poort van `notifications.html` + `notifications.js`)
- `app/statistics/page.tsx` + `components/statistics/TrendChart.tsx` —
  artiestenstatistieken met canvas-trendgrafiek (streams/bezoeken/likes per
  dag), geschatte plays/dag, Seconds-saldo (poort van `statistics.html` +
  `statistics.js`)
- `lib/notifications.ts`, `lib/statistics.ts` — de bijbehorende
  Supabase-queries en dedupe/verrijkings-logica

Alle drie hergebruiken `useAuth()` voor gebruiker/profiel/tune in plaats van
die zelf opnieuw op te halen (dat deed elke losse `.html`-pagina origineel
nog wel) — een concrete opschoning die de React-architectuur oplevert.

## Status: fase 6 — Artist-pagina en Edit Profile staan

Fase 6 toegevoegd:

- `app/artist/page.tsx` + `components/artist/TrackPlayerCard.tsx` —
  artiestenpagina met profielfoto, meta-pills (vlag, rollen, stad, "member
  since", verjaardag), bio, social-link, en per tune een eigen preview-player
  (play/pause, voortgang, like, volume) die de hoofdradio pauzeert zodra je
  een preview start (poort van `artist.html` + `artist.js`)
- `app/edit-profile/page.tsx` — profiel bewerken: naam, bio met
  karakter-teller, geboortedatum, nationaliteit, stad met live autocomplete
  (open-meteo geocoding), meerdere muziekrollen (toevoegen/verwijderen),
  "show on profile"-toggles per veld, foto-upload met preview, social link,
  voorkeuren. Maakt automatisch een leeg profielrecord aan als er nog geen
  is (bijv. na e-mailbevestiging) (poort van `edit-profile.html` +
  `edit-profile.js`)
- `lib/artist.ts` — artiestprofiel/tracks ophalen, datumnotaties,
  profielbezoek-analytics
- `lib/profile.ts` uitgebreid met `ensureProfileRecord()`,
  `loadOrCreateProfile()` en `updateArtistProfile()`

**Bewuste aanpassing:** ook hier had `edit-profile.html` een eigen
mini-inlogformulier in de header; dat is vervangen door gewoon een link naar
`/login`, consistent met de rest van de site nu.

## Status: fase 7 — Submit-track staat

Fase 7 toegevoegd:

- `app/submit-track/page.tsx` + `components/submit-track/ClipTool.tsx` —
  tune indienen/bewerken: titel, bestand-upload, primair/secundair genre,
  max. 2 "feeling"-tags, AI-gebruik (radio + optionele toelichting), toggle
  voor volledige track op de artiestenpagina, de 60-seconden preview-clipper
  (slider + afspelen van het geselecteerde stuk), rechtenverklaring, en een
  statusbox die toont of de tune in review/live/afgekeurd is (poort van
  `submit-track.html` + `submit-track.js`)
- `lib/submit-track.ts` — genre/feeling-lijsten, bestand-upload,
  insert/update-logica voor de tune

Hergebruikt ook hier weer `useAuth()`'s `profile`/`track` in plaats van die
opnieuw op te halen.

## Status: fase 8 — Store staat

Fase 8 toegevoegd:

- `app/store/page.tsx` — Seconds-saldo, boosts-grid en coin-packs-grid.
  Alle koopknoppen staan (net als in het origineel) op "Coming soon" /
  "Checkout later" — er zit nog geen betaalflow achter, dit is een
  aankondigingspagina (poort van `store.html` + `store.js`)

Dit was de eenvoudigste van de resterende pagina's: vrijwel alle content is
statisch, alleen de login-gate en het saldo komen uit `useAuth()`.

## Status: fase 9 — Admin staat. Alle pagina's zijn gemigreerd.

Fase 9 toegevoegd:

- `app/admin/page.tsx` — admin-console: adminrechten-check via
  `profiles.is_admin`, lijst met pending tunes + goedkeuren, traffic/content/
  platform-metrics met tabs (poort van `admin.html` + `admin.js`)
- `lib/admin.ts` — adminrechten-check, tracks/metrics ophalen, goedkeuren

**Structuurwijziging:** de admin-pagina had in het origineel een compleet
eigen layout (`admin-rail` sidebar), zonder de normale header/nav. Omdat de
gedeelde `SiteChrome` in de root-layout stond, kon ik "m niet uitzetten voor
één route — dus zijn alle gewone pagina's verplaatst naar een route-group
`app/(site)/...` met hun eigen layout die `SiteChrome` toevoegt, en heeft
`app/admin` zijn eigen aparte layout zonder site-chrome. De URL's zijn
ongewijzigd (route-groups zitten niet in het pad).

**Alle 13 oorspronkelijke pagina's zijn nu gemigreerd:** radio, community-
kolom, login/join/confirm, liked/notifications/statistics,
artist/edit-profile, submit-track, store en admin.

## Status: fase 10 — persistente mini-player staat

De radiospeler blijft nu doorspelen als je van de hoofdpagina naar een andere
pagina navigeert.

**Architectuurwijziging (beter dan het origineel):** het origineel gebruikte
`radio-mini-player.js`, dat op elke pagina een geheel nieuw `<audio>`-element
aanmaakte en via `localStorage` (met een timer die elke 1,2s wegschreef) de
afspeelpositie "overdroeg" aan de volgende pagina — nodig omdat het een
traditionele multi-page site was zonder gedeelde state tussen paginaladingen.

In Next.js navigeren we client-side (geen volledige paginaherlading), dus is
de radiospeler-logica nu verplaatst naar `hooks/useRadioEngine.tsx`: een
React Context/Provider die eenmalig in de root-layout wordt aangemaakt. Het
`<audio>`-element leeft dáár, dus het wordt nooit ontkoppeld tijdens
navigatie — de muziek blijft simpelweg doorspelen, zonder localStorage-trucs
nodig te hebben.

- `hooks/useRadioEngine.tsx` — de volledige radiospeler-engine (voorheen in
  `RadioPlayer.tsx`), nu een gedeelde context
- `components/radio/RadioPlayer.tsx` — vereenvoudigd tot een presentatie-
  component die de context gebruikt (voor `/`)
- `components/radio/MiniPlayer.tsx` — het zwevende mini-spelertje (titel,
  artiest, like, play/pause, volume, tijd), zichtbaar op elke andere
  `(site)`-pagina zodra de radio speelt (poort van de UI uit
  `radio-mini-player.js`)
- Mini-player CSS toegevoegd aan `app/globals.css`

## Alle 13 pagina's + de persistente mini-player zijn nu gemigreerd.

## Wat nog optioneel is

- PWA service worker precache-lijst verder afstemmen op de Next.js build-output
- CSS verder de-dupliceren tussen `globals.css` en de per-pagina CSS-bestanden
  (nu bewust dubbel gehouden voor maximale visuele gelijkheid met het origineel)

## Lokaal draaien

```bash
npm install
cp .env.local.example .env.local   # vul evt. je eigen Supabase-project in
npm run dev
```

## Supabase

De site gebruikt dezelfde Supabase-tabellen als voorheen (`profiles`,
`tracks`, `track_likes`, `user_notifications`, `site_visit_events`, ...).
De publishable/anon key is niet geheim en mag in de client staan — dat was
in de oude `config.js` ook al zo. Voor Vercel: zet
`NEXT_PUBLIC_SUPABASE_URL` en `NEXT_PUBLIC_SUPABASE_ANON_KEY` als
environment variables.
