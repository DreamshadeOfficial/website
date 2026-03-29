# Walk2Eat v2 — Mobile-First Refactor

## Analisi architettura originale (pausaloop-v2)

### Stack
- **Frontend puro**: HTML + CSS + Vanilla JS, zero dipendenze build
- **Stato**: `localStorage` via `LBW.Store` (utente, preferenze, cronologia, preferiti)
- **Routing**: multi-page (index → login → dashboard → map/preferences/favorites/history/proposal/place)
- **Mappe**: Leaflet + OpenStreetMap tiles
- **Percorsi reali**: OpenRouteService API (foot-walking) con fallback sintetico
- **Geocoding**: ORS autocomplete API
- **Dati POI**: file statico `routes-poc-data.js` con ristoranti reali Lugano

### Componenti principali
| File | Ruolo |
|---|---|
| `app.js` | Core: Store, DB, proposte, percorsi ORS, favoriti, cronologia |
| `config.js` | API key ORS |
| `routes-poc-data.js` | POI + geometrie percorsi reali |
| `styles.css` | CSS desktop-first con media query breakpoint a 850px e 700px |
| `dashboard.html` | Dashboard principale con mappa preview |
| `map.html` | Mappa percorso fullscreen |
| `preferences.html` | Form impostazioni con geocoding |
| `favorites.html` | Lista preferiti (percorsi + ristoranti) |
| `history.html` | Cronologia pause |
| `proposal.html` | Dettaglio proposta con alternative |
| `place.html` | Scheda singolo ristorante |

### Problemi UX mobile identificati
1. **Navigazione desktop-centric**: hamburger menu top-right, link testuali piccoli
2. **Touch targets troppo piccoli**: bottoni < 44px, link ravvicinati
3. **Nessuna bottom nav**: utente deve scrollare su per navigare
4. **Card layout basico**: bordi sottili, poco contrasto visivo
5. **Form non ottimizzato**: select piccoli, nessun raggruppamento logico
6. **Nessun feedback tattile**: no active states, no transizioni
7. **CSS desktop-first**: breakpoints adattano al ribasso, non mobile-first

---

## Scelte progettuali del refactor

### 1. Bottom Navigation Bar (✅ Implementata)
- **5 tab**: Home (🏠), Mappa (🗺️), Preferiti (❤️), Cronologia (📋), Impostazioni (⚙️)
- Fixed bottom, backdrop-filter blur, `env(safe-area-inset-bottom)` per notch iPhone
- Icone emoji + label corto, min touch target 44×44px
- Active state verde (`--accent`)
- Sostituisce completamente il menu hamburger/top nav links

### 2. Mobile-First CSS (✅ Riscritto da zero)
- **Base**: layout a colonna singola, max-width 640px
- **Breakpoint up**: `@media (min-width: 480px)` per form grid 2 colonne
- Touch targets minimi 44px su tutti i bottoni/select/input
- `dvh` units per altezze viewport (supporto tastiera mobile)
- `viewport-fit=cover` + safe area insets per dispositivi con notch

### 3. Card Layout migliorato
- Border-radius 16px, padding 16px, bordi più visibili
- Card headers con icone
- `.card.interactive` con `transform: scale(0.98)` su `:active`
- Stat cards dedicate con valore grande + label piccola
- Spaziatura consistente 12px gap

### 4. Touch-Friendly Buttons
- Min-height 44px su tutti i bottoni
- Classi semantiche: `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-danger`, `btn-icon`
- `btn-block` per full-width
- Active state `scale(0.97)` per feedback tattile
- `-webkit-tap-highlight-color: transparent` globale

### 5. Navigazione top semplificata
- Solo brand (logo + nome) a sinistra
- Azione singola contestuale a destra (es. "← Home", saluto utente)
- Sticky con backdrop-filter blur

### 6. Preferences raggruppate per sezione
- 4 card separate: ⏱ Tempi, 🍽️ Cibo, 🚶 Camminata, 📍 Posizione
- Toggle switches più grandi con label accanto
- Select con arrow SVG custom
- Geocoding suggestions con min-height 44px per item

### 7. Favorites con Tab Bar
- Tab pills: Tutti / Percorsi / Ristoranti
- Empty state con icona + messaggio
- Card con azione rapida (rimuovi, dettagli, seleziona)

### 8. UX Polish
- **Page transitions**: `fadeSlideUp` animation su ogni pagina
- **Detail panel animato**: `max-height` transition su dashboard
- **Loading states**: spinner coerente verde
- **Empty states**: icona + messaggio per liste vuote
- **Meta tags PWA**: `theme-color`, `apple-mobile-web-app-capable`, favicon SVG

### 9. Cosa NON è cambiato (volutamente)
- **`app.js`** (logica core): intatto, zero modifiche — tutta la business logic, routing ORS, proposte, store funzionano identicamente
- **`config.js`**: intatto (API key)
- **`routes-poc-data.js`**: intatto (dati POI)
- **Assets branding**: copiati tal quali
- **Flusso utente**: identico (index → login → dashboard → navigate)

---

## File modificati

| File | Tipo modifica |
|---|---|
| `assets/css/styles.css` | 🔴 Riscritto completamente (mobile-first) |
| `index.html` | 🔴 Riscritto (hero mobile, feature cards) |
| `login.html` | 🔴 Riscritto (centered card, enter key) |
| `dashboard.html` | 🔴 Riscritto (stat cards, bottom nav, animated detail) |
| `map.html` | 🔴 Riscritto (layout mobile, bottom nav) |
| `preferences.html` | 🔴 Riscritto (4 sezioni card, bottom nav) |
| `favorites.html` | 🔴 Riscritto (tab bar, empty states, bottom nav) |
| `history.html` | 🔴 Riscritto (compact cards, bottom nav) |
| `proposal.html` | 🟡 Aggiornato (stat cards, bottom nav) |
| `place.html` | 🟡 Aggiornato (centered layout, bottom nav) |
| `assets/js/app.js` | ✅ Invariato |
| `assets/js/config.js` | ✅ Invariato |
| `assets/js/routes-poc-data.js` | ✅ Invariato |
| `REFACTOR.md` | 🆕 Questo file |

---

## URL live
**https://dreamshade.ch/test/walk2eat-v2/**
