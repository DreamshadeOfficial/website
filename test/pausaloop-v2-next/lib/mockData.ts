export type Place = { id: string; name: string; cuisine: string; priceBand: '$'|'$$'|'$$$'; rating: number; distanceKm: number };

export const places: Place[] = [
  { id: 'p1', name: 'Green Fork', cuisine: 'Healthy', priceBand: '$$', rating: 4.6, distanceKm: 0.7 },
  { id: 'p2', name: 'Pasta Nuova', cuisine: 'Italian', priceBand: '$$', rating: 4.4, distanceKm: 0.8 },
  { id: 'p3', name: 'Zen Bento', cuisine: 'Asian', priceBand: '$', rating: 4.2, distanceKm: 1.1 },
  { id: 'p4', name: 'Quick Salad', cuisine: 'Vegetarian', priceBand: '$', rating: 4.1, distanceKm: 0.6 }
];
