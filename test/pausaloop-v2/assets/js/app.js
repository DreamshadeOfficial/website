const DB = {
  cuisines: ['Italian', 'Asian', 'Burger', 'Healthy', 'Vegetarian', 'Sushi'],
  moods: ['Ho bisogno di aria', 'Voglio qualcosa di veloce', 'Voglio camminare di più', 'Oggi zero sbatti'],
  mealModes: ['Mangio fuori', 'Ho già la schiscetta'],
  restaurants: [
    { id: 1, name: 'Green Fork', cuisine: 'Healthy', price: '$$', rating: 4.6, lat: 46.004, lng: 8.951, reserveUrl: 'https://example.com/reserve/green-fork', preorderUrl: 'https://example.com/preorder/green-fork' },
    { id: 2, name: 'Pasta Nuova', cuisine: 'Italian', price: '$$', rating: 4.4, lat: 46.006, lng: 8.957, reserveUrl: 'https://example.com/reserve/pasta-nuova' },
    { id: 3, name: 'Zen Bento', cuisine: 'Asian', price: '$', rating: 4.2, lat: 46.000, lng: 8.954, preorderUrl: 'https://example.com/preorder/zen-bento' },
    { id: 4, name: 'Quick Salad', cuisine: 'Vegetarian', price: '$', rating: 4.1, lat: 46.002, lng: 8.959 },
    { id: 5, name: 'Burger Loop', cuisine: 'Burger', price: '$$', rating: 4.0, lat: 46.007, lng: 8.949 }
  ],
  schiscettaSpots: [
    { id: 's1', name: 'Parco Ciani (panchina vista lago)', cuisine: 'Schiscetta spot', price: '-', rating: 4.7, lat: 46.003, lng: 8.954 },
    { id: 's2', name: 'Piazzetta tranquilla centro', cuisine: 'Schiscetta spot', price: '-', rating: 4.3, lat: 46.005, lng: 8.952 },
    { id: 's3', name: 'Area verde uffici nord', cuisine: 'Schiscetta spot', price: '-', rating: 4.1, lat: 46.004, lng: 8.949 }
  ]
};

const Store = {
  get(key, fallback){ try{return JSON.parse(localStorage.getItem(key)) ?? fallback;}catch{return fallback;} },
  set(key,val){ localStorage.setItem(key, JSON.stringify(val)); }
};

function getUser(){ return Store.get('lbw_user', null); }
function setUser(user){ Store.set('lbw_user', user); }
function getPrefs(){
  return Store.get('lbw_prefs', {
    breakMinutes: 45,
    walkMinutes: 20,
    budget: '$$',
    cuisine: 'Italian',
    diet: 'none',
    intensity: 'rilassata',
    goal: 'staccare',
    mood: 'Oggi zero sbatti',
    mealMode: 'Mangio fuori',
    location: { label: 'Lugano Centro', lat: 46.0037, lng: 8.9511 }
  });
}
function setPrefs(p){ Store.set('lbw_prefs', p); }

function haversine(a,b){
  const toRad = d => d*Math.PI/180;
  const R=6371;
  const dLat=toRad(b.lat-a.lat), dLng=toRad(b.lng-a.lng);
  const s=Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(s));
}

function routeIdFromProposal(proposal){
  const f = proposal?.food || {};
  const w = proposal?.walk || {};
  return `${String(f.id||f.name||'x')}-${String(w.minutes||0)}-${String(w.distanceKm||0)}`;
}

function isFavoritePlace(place){
  const fav = Store.get('lbw_fav_places', []);
  return fav.some(x => String(x.id) === String(place.id));
}

function isFavoriteRoute(proposal){
  const id = routeIdFromProposal(proposal);
  const routes = Store.get('lbw_fav_routes', []);
  return routes.some(x => String(x.routeId) === id);
}

function saveFavoritePlace(place){
  const fav = Store.get('lbw_fav_places', []);
  if (!fav.find(x => String(x.id) === String(place.id))) {
    fav.unshift({ ...place, savedAt: new Date().toISOString() });
    Store.set('lbw_fav_places', fav.slice(0,100));
  }
}

function removeFavoritePlace(place){
  const fav = Store.get('lbw_fav_places', []);
  Store.set('lbw_fav_places', fav.filter(x => String(x.id) !== String(place.id)));
}

function toggleFavoritePlace(place){
  if (isFavoritePlace(place)) removeFavoritePlace(place); else saveFavoritePlace(place);
  return isFavoritePlace(place);
}

function saveFavoriteRoute(proposal){
  const routes = Store.get('lbw_fav_routes', []);
  const routeId = routeIdFromProposal(proposal);
  if (!routes.find(x => String(x.routeId) === routeId)) {
    routes.unshift({
      routeId,
      savedAt: new Date().toISOString(),
      walk: proposal.walk,
      route: proposal.route,
      destination: proposal.food?.name || 'Percorso pausa'
    });
    Store.set('lbw_fav_routes', routes.slice(0,100));
  }
}

function removeFavoriteRoute(proposal){
  const routes = Store.get('lbw_fav_routes', []);
  const routeId = routeIdFromProposal(proposal);
  Store.set('lbw_fav_routes', routes.filter(x => String(x.routeId) !== routeId));
}

function toggleFavoriteRoute(proposal){
  if (isFavoriteRoute(proposal)) removeFavoriteRoute(proposal); else saveFavoriteRoute(proposal);
  return isFavoriteRoute(proposal);
}

function addHistory(proposal){
  const hist = Store.get('lbw_history', []);
  hist.unshift(proposal);
  Store.set('lbw_history', hist.slice(0,60));
}

function buildProposal(){
  const p = getPrefs();
  const now = new Date();
  const speed = p.intensity === 'dinamica' ? 5.5 : p.intensity === 'media' ? 4.7 : 4.0;
  const walkKm = +(speed*(p.walkMinutes/60)).toFixed(1);
  const eatMinutes = Math.max(15, p.breakMinutes - p.walkMinutes - 5);

  let pool = [];
  if (p.mealMode === 'Ho già la schiscetta') {
    pool = DB.schiscettaSpots;
  } else {
    pool = DB.restaurants.filter(r => !p.cuisine || r.cuisine === p.cuisine);
    if (!pool.length) pool = DB.restaurants;
  }

  const candidates = pool
    .map(r => ({...r, distance: haversine(p.location, r)}))
    .sort((a,b)=> a.distance-b.distance || b.rating-a.rating);

  const pick = candidates[0];
  const alts = candidates.slice(1,4);

  const loop = [
    { lat: p.location.lat, lng: p.location.lng },
    { lat: p.location.lat + 0.0025, lng: p.location.lng + 0.002 },
    { lat: pick.lat, lng: pick.lng },
    { lat: p.location.lat + 0.0015, lng: p.location.lng - 0.0018 },
    { lat: p.location.lat, lng: p.location.lng }
  ];

  const proposal = {
    createdAt: now.toISOString(),
    walk: { minutes: p.walkMinutes, distanceKm: walkKm, type: `${p.intensity} • semi-anello` },
    food: { ...pick, etaEatMin: eatMinutes, mealMode: p.mealMode },
    alternatives: alts,
    route: loop
  };

  Store.set('lbw_today', proposal);
  addHistory(proposal);
  return proposal;
}

function getProposal(){ return Store.get('lbw_today', null) || buildProposal(); }

function saveCurrent(){
  const pr = getProposal();
  saveFavoritePlace(pr.food);
  saveFavoriteRoute(pr);
  const saved = Store.get('lbw_saved', []);
  saved.unshift({ when: new Date().toISOString(), proposal: pr });
  Store.set('lbw_saved', saved.slice(0,40));
}

window.LBW = {
  DB, Store,
  getUser, setUser,
  getPrefs, setPrefs,
  getProposal, buildProposal,
  saveCurrent,
  isFavoritePlace, isFavoriteRoute,
  saveFavoritePlace, saveFavoriteRoute,
  removeFavoritePlace, removeFavoriteRoute,
  toggleFavoritePlace, toggleFavoriteRoute,
  routeIdFromProposal
};