# Walk2Eat Route PoC

File generato: `routes-poc.json`

Comando per aggiornarlo:
```bash
cd /root/.openclaw/workspace && \
node scripts/walk2eat_poc.js \
  --lat 46.0104 --lon 8.9606 \
  --radius 1200 --maxRoutes 3 \
  --output projects/OpenClaw_files/web_developing/website/test/pausaloop-v2/data/routes-poc.json
```

Formato output:
```json
{
  "generatedAt": "2026-03-16T04:03:55.655Z",
  "origin": { "lat": 46.0104, "lon": 8.9606 },
  "routes": [
    {
      "poi": {
        "id": 326282572,
        "name": "Pizzeria Centro",
        "amenity": "restaurant",
        "cuisine": "italian;pizza",
        "lat": 46.0123147,
        "lon": 8.9463548
      },
      "distance_m": 2277.2,
      "duration_min": 4.795,
      "geometry": { "type": "LineString", "coordinates": [...] }
    }
  ]
}
```

La UI può leggere `data/routes-poc.json` e visualizzare i percorsi reali (coordinata `geometry.coordinates`).
