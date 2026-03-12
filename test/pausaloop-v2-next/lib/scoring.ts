import { places } from './mockData';

export type Prefs = {
  breakMinutes: number;
  walkMinutes: number;
  budget: '$'|'$$'|'$$$';
  cuisine?: string;
  mood?: string;
  intensity: 'rilassata'|'media'|'dinamica';
};

export function generateProposal(prefs: Prefs) {
  const scored = places.map((p) => {
    let score = 0;
    if (!prefs.cuisine || prefs.cuisine === p.cuisine) score += 30;
    if (prefs.budget === p.priceBand) score += 20;
    score += Math.max(0, 30 - p.distanceKm * 12);
    score += p.rating * 5;
    if (prefs.mood === 'Oggi zero sbatti') score += Math.max(0, 15 - p.distanceKm * 8);
    return { ...p, score };
  }).sort((a,b)=>b.score-a.score);

  const main = scored[0];
  const alternatives = scored.slice(1,4);
  const walkKm = +(prefs.walkMinutes * (prefs.intensity==='dinamica'?0.09:prefs.intensity==='media'?0.075:0.06)).toFixed(1);

  return {
    walk: { minutes: prefs.walkMinutes, distanceKm: walkKm, type: `${prefs.intensity} • semi-anello` },
    main,
    alternatives,
    eatMinutes: Math.max(15, prefs.breakMinutes - prefs.walkMinutes - 5),
    createdAt: new Date().toISOString()
  };
}
