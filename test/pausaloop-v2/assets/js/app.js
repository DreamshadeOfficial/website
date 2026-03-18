const DB = {
  cuisines: ['Italian', 'Asian', 'Burger', 'Healthy', 'Vegetarian', 'Sushi'],
  moods: ['Ho bisogno di aria', 'Voglio qualcosa di veloce', 'Voglio camminare di più', 'Oggi zero sbatti'],
  mealModes: ['Mangio fuori', 'Ho già la schiscetta'],
  restaurants: [
    { id: 1, name: 'Green Fork', cuisine: 'Healthy', price: '$$', rating: 4.6, reserveUrl: 'https://example.com/reserve/green-fork', preorderUrl: 'https://example.com/preorder/green-fork' },
    { id: 2, name: 'Pasta Nuova', cuisine: 'Italian', price: '$$', rating: 4.4, reserveUrl: 'https://example.com/reserve/pasta-nuova' },
    { id: 3, name: 'Zen Bento', cuisine: 'Asian', price: '$', rating: 4.2, preorderUrl: 'https://example.com/preorder/zen-bento' },
    { id: 4, name: 'Quick Salad', cuisine: 'Vegetarian', price: '$', rating: 4.1 },
    { id: 5, name: 'Burger Loop', cuisine: 'Burger', price: '$$', rating: 4.0 }
  ],
  schiscettaSpots: [
    { id: 's1', name: 'Panchina ombreggiata di zona', cuisine: 'Schiscetta spot', price: '-', rating: 4.7 },
    { id: 's2', name: 'Piazzetta tranquilla di quartiere', cuisine: 'Schiscetta spot', price: '-', rating: 4.3 },
    { id: 's3', name: 'Area verde vicino ufficio', cuisine: 'Schiscetta spot', price: '-', rating: 4.1 }
  ]
};

const ROUTES_POC = (typeof window !== 'undefined' && window.WALK2EAT_POC_ROUTES) ? window.WALK2EAT_POC_ROUTES : null;

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

function movePoint(lat, lng, metersNorth, metersEast){
  const dLat = metersNorth / 111320;
  const dLng = metersEast / (111320 * Math.cos(lat * Math.PI / 180));
  return { lat: lat + dLat, lng: lng + dLng };
}

function buildWalkingLoop(origin, destination, walkMinutes, intensity){
  const paceMpm = intensity === 'dinamica' ? 95 : intensity === 'media' ? 80 : 65;
  const totalMeters = Math.max(600, Math.round(walkMinutes * paceMpm));
  const sideMeters = Math.max(120, Math.round(totalMeters * 0.22));
  const forwardMeters = Math.max(180, Math.round(totalMeters * 0.28));

  const toDest = {
    n: (destination.lat - origin.lat) * 111320,
    e: (destination.lng - origin.lng) * (111320 * Math.cos(origin.lat * Math.PI / 180))
  };
  const len = Math.max(1, Math.hypot(toDest.n, toDest.e));
  const dir = { n: toDest.n / len, e: toDest.e / len };
  const perp = { n: -dir.e, e: dir.n };

  const wp1 = movePoint(origin.lat, origin.lng, dir.n * forwardMeters + perp.n * sideMeters, dir.e * forwardMeters + perp.e * sideMeters);
  const wp2 = movePoint(destination.lat, destination.lng, perp.n * (sideMeters * 0.6), perp.e * (sideMeters * 0.6));
  const wp3 = movePoint(origin.lat, origin.lng, dir.n * (forwardMeters * 0.6) - perp.n * sideMeters, dir.e * (forwardMeters * 0.6) - perp.e * sideMeters);

  return [
    { lat: origin.lat, lng: origin.lng },
    wp1,
    { lat: destination.lat, lng: destination.lng },
    wp2,
    wp3,
    { lat: origin.lat, lng: origin.lng }
  ];
}

function localizeTemplatesAround(origin, templates){
  const offsets = [
    { n: 280, e: 120 },
    { n: 120, e: 320 },
    { n: -180, e: 260 },
    { n: 240, e: -220 },
    { n: -260, e: -140 }
  ];
  return templates.map((t, i) => {
    const o = offsets[i % offsets.length];
    const p = movePoint(origin.lat, origin.lng, o.n, o.e);
    return { ...t, lat: p.lat, lng: p.lng };
  });
}

function routeIdFromProposal(proposal){
  const f = proposal?.food || {};
  const w = proposal?.walk || {};
  return `${String(f.id||f.name||'x')}-${String(w.minutes||0)}-${String(w.distanceKm||0)}`;
}

function formatCuisineTag(value){
  if(!value) return '';
  return value.split(/[;,]/).map(v => v.trim()).filter(Boolean).map(v => v.charAt(0).toUpperCase()+v.slice(1)).join(' / ');
}

function poiToPlace(poi = {}, distanceKm){
  const cuisine = formatCuisineTag(poi.cuisine || poi.tags?.cuisine);
  const addressParts = [];
  if (poi.tags?.['addr:street']) addressParts.push(poi.tags['addr:street']);
  if (poi.tags?.['addr:housenumber']) addressParts.push(poi.tags['addr:housenumber']);
  if (poi.tags?.['addr:city']) addressParts.push(poi.tags['addr:city']);
  return {
    id: `poi-${poi.id}`,
    name: poi.name || 'Spot pausa',
    cuisine: cuisine || poi.amenity || 'Food spot',
    price: poi.tags?.price || '$$',
    rating: poi.tags?.rating ? Number(poi.tags.rating) : undefined,
    reserveUrl: poi.tags?.website || null,
    website: poi.tags?.website || null,
    phone: poi.tags?.phone || null,
    address: addressParts.join(', '),
    lat: poi.lat,
    lng: poi.lon,
    distance: typeof distanceKm === 'number' ? distanceKm : undefined
  };
}

function buildGeoLoopFromCoordinates(geometry){
  if(!geometry?.coordinates?.length) return null;
  const forward = geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
  const back = forward.slice(0, -1).reverse();
  return [...forward, ...back];
}

function getNumericStore(key, fallback = 0){
  const val = Store.get(key, null);
  return typeof val === 'number' ? val : fallback;
}

function scheduleNextRealRoute(){
  if(!ROUTES_POC?.routes?.length) return false;
  const total = ROUTES_POC.routes.length;
  const idx = getNumericStore('lbw_poc_next', 0) % total;
  Store.set('lbw_poc_force', idx);
  Store.set('lbw_poc_next', (idx + 1) % total);
  return true;
}

function pickPocRoutes(prefs){
  if(!ROUTES_POC?.routes?.length) return null;
  const enriched = ROUTES_POC.routes.map((r) => {
    const poi = r.poi || {};
    return {
      raw: r,
      dist: haversine(prefs.location, { lat: poi.lat, lng: poi.lon })
    };
  }).sort((a,b)=>a.dist-b.dist);
  if(!enriched.length) return null;
  const forcedIdx = Store.get('lbw_poc_force', null);
  const mainIdx = (typeof forcedIdx === 'number' && enriched[forcedIdx]) ? forcedIdx : 0;
  if (typeof forcedIdx === 'number') Store.set('lbw_poc_force', null);
  return {
    main: enriched[mainIdx].raw,
    alternatives: enriched.filter((_,i)=>i!==mainIdx).slice(0,4).map(x=>x.raw)
  };
}

function buildProposalFromPoc(prefs){
  if (prefs.mealMode === 'Ho già la schiscetta') return null;
  const pick = pickPocRoutes(prefs);
  if(!pick) return null;
  const main = pick.main;
  const walkMinutes = Math.max(10, Math.round((main.duration_min || prefs.walkMinutes) * 2));
  const walkDistanceKm = +( ((main.distance_m || 0) * 2) / 1000 ).toFixed(2);
  const eatMinutes = Math.max(15, prefs.breakMinutes - walkMinutes - 5);
  const routeLine = buildGeoLoopFromCoordinates(main.geometry) || buildWalkingLoop(
    { lat: prefs.location.lat, lng: prefs.location.lng },
    { lat: main.poi.lat, lng: main.poi.lon },
    prefs.walkMinutes,
    prefs.intensity
  );

  const foodPlace = poiToPlace(main.poi, main.distance_m ? +(main.distance_m/1000).toFixed(2) : undefined);
  foodPlace.mealMode = prefs.mealMode;
  foodPlace.etaEatMin = eatMinutes;

  const alternatives = pick.alternatives.map((alt)=>{
    const place = poiToPlace(alt.poi, alt.distance_m ? +(alt.distance_m/1000).toFixed(2) : undefined);
    return place;
  });

  const fallbackDistanceKm = +( (prefs.walkMinutes * 80) / 1000 ).toFixed(2);

  return {
    createdAt: new Date().toISOString(),
    walk: { minutes: walkMinutes, distanceKm: walkDistanceKm || fallbackDistanceKm, type: 'reale • OSRM' },
    food: foodPlace,
    alternatives,
    route: routeLine,
    source: 'poc'
  };
}

function finalizeProposal(proposal){
  Store.set('lbw_today', proposal);
  addHistory(proposal);
  return proposal;
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
  const pocProposal = buildProposalFromPoc(p);
  if (pocProposal) return finalizeProposal(pocProposal);

  const now = new Date();
  const speed = p.intensity === 'dinamica' ? 5.5 : p.intensity === 'media' ? 4.7 : 4.0;
  const walkKm = +(speed*(p.walkMinutes/60)).toFixed(1);
  const eatMinutes = Math.max(15, p.breakMinutes - p.walkMinutes - 5);

  let pool = [];
  if (p.mealMode === 'Ho già la schiscetta') {
    pool = localizeTemplatesAround(p.location, DB.schiscettaSpots);
  } else {
    const filtered = DB.restaurants.filter(r => !p.cuisine || r.cuisine === p.cuisine);
    pool = localizeTemplatesAround(p.location, filtered.length ? filtered : DB.restaurants);
  }

  const candidates = pool
    .map(r => ({...r, distance: haversine(p.location, r)}))
    .sort((a,b)=> a.distance-b.distance || b.rating-a.rating);

  const pick = candidates[0];
  const alts = candidates.slice(1,4);

  const loop = buildWalkingLoop(
    { lat: p.location.lat, lng: p.location.lng },
    { lat: pick.lat, lng: pick.lng },
    p.walkMinutes,
    p.intensity
  );

  const proposal = {
    createdAt: now.toISOString(),
    walk: { minutes: p.walkMinutes, distanceKm: walkKm, type: `${p.intensity} • semi-anello` },
    food: { ...pick, etaEatMin: eatMinutes, mealMode: p.mealMode },
    alternatives: alts,
    route: loop,
    source: 'synthetic'
  };

  return finalizeProposal(proposal);
}

function getProposal(){
  const current = Store.get('lbw_today', null);
  if (current && ROUTES_POC?.routes?.length && current.source !== 'poc') {
    return buildProposal();
  }
  return current || buildProposal();
}

function saveCurrent(){
  const pr = getProposal();
  saveFavoritePlace(pr.food);
  saveFavoriteRoute(pr);
  const saved = Store.get('lbw_saved', []);
  saved.unshift({ when: new Date().toISOString(), proposal: pr });
  Store.set('lbw_saved', saved.slice(0,40));
}

function initNav(){
  const nav=document.querySelector('.nav');
  const links=document.querySelector('.nav-links');
  if(!nav||!links) return;

  const brand = nav.querySelector('.brand');
  if (brand) {
    brand.style.cursor = 'pointer';
    brand.onclick = () => { window.location.href = 'dashboard.html'; };
  }

  let btn=nav.querySelector('.nav-toggle');
  if(!btn){
    btn=document.createElement('button');
    btn.className='nav-toggle';
    btn.type='button';
    btn.textContent='☰ Menu';
    nav.insertBefore(btn, links);
  }
  btn.onclick=()=>links.classList.toggle('open');
}

// --- GPS reale (con timeout) ---
async function getGPSPosition(timeoutMs) {
  timeoutMs = timeoutMs || 5000;
  return new Promise(function(resolve) {
    if (!navigator.geolocation) { resolve(null); return; }
    var timer = setTimeout(function() { resolve(null); }, timeoutMs);
    navigator.geolocation.getCurrentPosition(
      function(pos) { clearTimeout(timer); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      function() { clearTimeout(timer); resolve(null); }
    );
  });
}

// 8 direzioni cardinali per le alternative
var WALK_DIRECTIONS = [0, 45, 90, 135, 180, 225, 270, 315];

function getNextWalkDir() {
  var idx = Store.get('lbw_walk_dir', Math.floor(Date.now() / 3600000) % 8);
  var next = (idx + 1) % 8;
  Store.set('lbw_walk_dir', next);
  return idx;
}

function peekWalkDir() {
  return Store.get('lbw_walk_dir', Math.floor(Date.now() / 3600000) % 8);
}

// --- Loop pedonale reale via ORS (andata + ritorno, nessun ristorante) ---
// Velocità pedonale ORS: ~4.5 km/h = 75 m/min. windingFactor: le strade sono ~30% più lunghe della retta.
// halfMeters = distanza crow-fly al punto di svolta, tale che ORS torni ~walkMinutes/2 per tratta.
async function buildWalkingLoopRealAsync(origin, walkMinutes, intensity, dirIdxOverride) {
  var walkSpeedMpm = 75; // m/min (~4.5 km/h, calibrato su ORS foot-walking)
  var windingFactor = 0.70; // il crow-fly è ~70% della distanza stradale reale
  var halfMeters = Math.round((walkMinutes / 2) * walkSpeedMpm * windingFactor);
  // Max plausibile: più stringente — percorso totale non deve eccedere 1.6x il teorico
  var maxTotalMeters = walkMinutes * walkSpeedMpm * 1.6;
  // Tolleranza durata: il percorso ORS deve stare entro ±60% del walkMinutes atteso
  var expectedTotalSec = walkMinutes * 60;
  var minDurSec = expectedTotalSec * 0.4;
  var maxDurSec = expectedTotalSec * 1.6;

  var startDirIdx = (typeof dirIdxOverride === 'number') ? dirIdxOverride : peekWalkDir();

  // Prova fino a 8 direzioni partendo da startDirIdx; scarta se ORS ritorna distanza/durata irrealistica
  for (var attempt = 0; attempt < 8; attempt++) {
    var dirIdx = (startDirIdx + attempt) % 8;
    var angleRad = (WALK_DIRECTIONS[dirIdx] * Math.PI) / 180;
    var turnaround = movePoint(origin.lat, origin.lng, halfMeters * Math.cos(angleRad), halfMeters * Math.sin(angleRad));
    try {
      // OpenRouteService foot-walking: profilo pedone reale, durate accurate
      var orsKey = (window.W2E_CONFIG && window.W2E_CONFIG.orsApiKey) || '';
      var orsBase = 'https://api.openrouteservice.org/v2/directions/foot-walking';
      var orsHeaders = { 'Authorization': orsKey, 'Content-Type': 'application/json' };
      var makeOrsBody = function(from, to) {
        return JSON.stringify({ coordinates: [[from.lng, from.lat], [to.lng, to.lat]], instructions: false });
      };
      var resps = await Promise.all([
        fetch(orsBase, { method: 'POST', headers: orsHeaders, body: makeOrsBody(origin, turnaround) }),
        fetch(orsBase, { method: 'POST', headers: orsHeaders, body: makeOrsBody(turnaround, origin) })
      ]);
      var datas = await Promise.all(resps.map(function(r) { return r.json(); }));
      var outSeg = datas[0].routes && datas[0].routes[0] && datas[0].routes[0].summary;
      var retSeg = datas[1].routes && datas[1].routes[0] && datas[1].routes[0].summary;
      if (!outSeg || !retSeg) { console.warn('ORS dir ' + dirIdx + ': nessun percorso', datas[0]); continue; }
      var totalMeters = outSeg.distance + retSeg.distance;
      var totalDurSec = outSeg.duration + retSeg.duration;
      if (totalMeters > maxTotalMeters) {
        console.warn('ORS dir ' + dirIdx + ': percorso troppo lungo (' + Math.round(totalMeters/1000) + ' km, max ' + Math.round(maxTotalMeters/1000) + ' km)');
        continue;
      }
      if (totalDurSec < minDurSec || totalDurSec > maxDurSec) {
        console.warn('ORS dir ' + dirIdx + ': durata anomala (' + Math.round(totalDurSec/60) + ' min, atteso ' + walkMinutes + ' min ±60%)');
        continue;
      }
      // Geometria: ORS restituisce encoded polyline in routes[0].geometry
      function decodePolyline(encoded) {
        var pts = [], idx = 0, lat = 0, lng = 0;
        while (idx < encoded.length) {
          var b, shift = 0, result = 0;
          do { b = encoded.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
          lat += (result & 1) ? ~(result >> 1) : (result >> 1);
          shift = 0; result = 0;
          do { b = encoded.charCodeAt(idx++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
          lng += (result & 1) ? ~(result >> 1) : (result >> 1);
          pts.push({ lat: lat / 1e5, lng: lng / 1e5 });
        }
        return pts;
      }
      var outPts = decodePolyline(datas[0].routes[0].geometry);
      var retPts = decodePolyline(datas[1].routes[0].geometry);
      var totalDist = +((totalMeters) / 1000).toFixed(2);
      var totalMin = Math.round((outSeg.duration + retSeg.duration) / 60);
      return {
        route: outPts.concat(retPts.slice(1)),
        turnaround: outPts[outPts.length - 1],
        distanceKm: totalDist,
        minutes: totalMin,
        dirIdx: dirIdx,
        source: 'osrm-loop'
      };
    } catch (e) {
      console.warn('OSRM dir ' + dirIdx + ' errore:', e.message);
    }
  }
  console.warn('OSRM: tutte le direzioni fallite, uso sintetico');
  return null;
}

// --- Proposal walk-only asincrona (nessun ristorante) ---
async function buildWalkOnlyProposalAsync(prefsOverride, forceNewDir) {
  var p = prefsOverride || getPrefs();
  // Usa GPS solo se l'utente ha scelto "Posizione attuale", altrimenti usa l'indirizzo salvato
  var origin;
  if (p.location && p.location.label === 'Posizione attuale') {
    var gpsPos = await getGPSPosition(5000);
    origin = gpsPos || { lat: p.location.lat, lng: p.location.lng };
  } else {
    origin = { lat: p.location.lat, lng: p.location.lng };
  }

  var dirIdx = forceNewDir ? getNextWalkDir() : peekWalkDir();
  var loopResult = await buildWalkingLoopRealAsync(origin, p.walkMinutes, p.intensity, dirIdx);

  if (loopResult) {
    var proposal = {
      createdAt: new Date().toISOString(),
      walk: { minutes: loopResult.minutes, distanceKm: loopResult.distanceKm, type: 'loop reale \u2022 OSRM' },
      food: { id: 'walk-only', name: 'Punto di svolta', cuisine: 'Passeggiata', lat: loopResult.turnaround.lat, lng: loopResult.turnaround.lng },
      alternatives: [],
      route: loopResult.route,
      source: 'osrm-loop',
      walkOnly: true
    };
    finalizeProposal(proposal);
    return proposal;
  }

  // Fallback sintetico se OSRM non risponde
  var speed = p.intensity === 'dinamica' ? 5.5 : p.intensity === 'media' ? 4.7 : 4.0;
  var walkKm = +(speed * (p.walkMinutes / 60)).toFixed(1);
  var angleRad2 = (WALK_DIRECTIONS[dirIdx % 8] * Math.PI) / 180;
  var halfM = (walkKm * 500) * 0.65;
  var fallbackTurn = movePoint(origin.lat, origin.lng, halfM * Math.cos(angleRad2), halfM * Math.sin(angleRad2));
  var fallbackLoop = buildWalkingLoop({ lat: origin.lat, lng: origin.lng }, fallbackTurn, p.walkMinutes, p.intensity);
  var fallbackProposal = {
    createdAt: new Date().toISOString(),
    walk: { minutes: p.walkMinutes, distanceKm: walkKm, type: 'loop sintetico' },
    food: { id: 'walk-only', name: 'Punto di svolta', cuisine: 'Passeggiata', lat: fallbackTurn.lat, lng: fallbackTurn.lng },
    alternatives: [],
    route: fallbackLoop,
    source: 'synthetic-loop',
    walkOnly: true
  };
  finalizeProposal(fallbackProposal);
  return fallbackProposal;
}

window.LBW = {
  DB, Store,
  getUser, setUser,
  getPrefs, setPrefs,
  getProposal, buildProposal,
  buildWalkOnlyProposalAsync,
  getGPSPosition,
  buildWalkingLoopRealAsync,
  saveCurrent,
  isFavoritePlace, isFavoriteRoute,
  saveFavoritePlace, saveFavoriteRoute,
  removeFavoritePlace, removeFavoriteRoute,
  toggleFavoritePlace, toggleFavoriteRoute,
  routeIdFromProposal,
  scheduleNextRealRoute,
  initNav
};

document.addEventListener('DOMContentLoaded', initNav);



