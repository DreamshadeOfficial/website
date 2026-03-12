# PausaLoop v2 (Next.js starter)

Prototype mobile-first per Lunch Break Walker / PausaLoop.

## Include
- Landing
- Onboarding leggero (3 scelte)
- Dashboard con proposta mock
- API route `/api/proposal`
- Componenti riutilizzabili (`TopNav`, `ProposalCards`)
- Codice commentabile/estendibile per sviluppo iterativo

## Avvio locale
```bash
cd test/pausaloop-v2-next
npm install
npm run dev
```
Apri http://localhost:3000

## Note architetturali
- Frontend: Next.js App Router + TS + Tailwind
- Logica proposta: `lib/scoring.ts`
- Dati mock: `lib/mockData.ts`
- API mock: `app/api/proposal/route.ts`

## Roadmap breve
1. Persistenza DB (Prisma + Postgres)
2. Auth reale
3. Routing/mappe/meteo API
4. Cronologia + saved in DB
