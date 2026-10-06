// Motion for the test3 demo.
// Level 1: slow breathing zoom, scroll parallax on the opening photo, sections fading in, living grain,
//          and an ambient layer (emblem + drifting lights) that keeps moving behind the whole page.
// Level 2: depth effect on the opening photo (WebGL): the picture shifts with the pointer, more where it is closer;
//          and the ambient layer becomes a WebGL canvas with one photo per zone (see "ambient" below).
// The small switch in the corner is only there to compare the levels; it is not part of the site.
(function () {
  var root = document.documentElement;
  var hero = document.querySelector('.hero');
  var media = document.querySelector('.hero-media');
  var img = document.querySelector('.hero-img');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 'off' | 'one' | 'two'
  var mode = reduce ? 'off' : 'two';
  try { mode = sessionStorage.getItem('motion') || mode; } catch (e) {}

  /* ---------- level 1: reveal on scroll ---------- */
  var targets = document.querySelectorAll('main section:not(.hero) .wrap > *:not(.sub), main .sub');
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px' }) : null;
  targets.forEach(function (t) { t.classList.add('reveal'); if (io) io.observe(t); else t.classList.add('in'); });

  /* ---------- the cover behind frosted glass: blur follows the nights left ---------- */
  (function () {
    var glass = document.getElementById('glass'), el = document.querySelector('[data-release]');
    if (!glass) return;
    var nights = null;
    if (el && el.dataset.release) nights = Math.ceil((new Date(el.dataset.release + 'T00:00:00') - new Date()) / 86400000);
    // no date yet: fully frosted; from 60 nights out it starts to clear; release day: clean glass
    var k = nights === null ? 1 : Math.max(0, Math.min(1, nights / 60));
    glass.style.setProperty('--frost', (k * 22).toFixed(1) + 'px');
    glass.style.setProperty('--frost-touch', (k * 9).toFixed(1) + 'px');
    // a hand on the glass: while the pointer rests on it (or a finger touches it) it clears a little
    glass.addEventListener('pointerenter', function () { glass.classList.add('touched'); });
    glass.addEventListener('pointerleave', function () { glass.classList.remove('touched'); });
    glass.addEventListener('touchstart', function () { glass.classList.add('touched'); setTimeout(function () { glass.classList.remove('touched'); }, 2500); }, { passive: true });
  })();

  /* ---------- level 1: parallax on the opening photo ---------- */
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = mode === 'off' ? 0 : Math.min(window.scrollY, hero.offsetHeight) * 0.3;
      media.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
      // ambient layer: fades in as the opening photo leaves, then follows the scroll of the whole page
      var max = document.documentElement.scrollHeight - window.innerHeight;
      root.style.setProperty('--amb', Math.min(1, window.scrollY / (hero.offsetHeight * 0.7)).toFixed(3));
      root.style.setProperty('--sp', (max > 0 ? window.scrollY / max : 0).toFixed(4));
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- level 2: depth on the opening photo ---------- */
  var depth = (function () {
    var canvas = document.createElement('canvas');
    canvas.className = 'hero-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) return null;
    media.appendChild(canvas);

    var vs = 'attribute vec2 p; varying vec2 v; void main(){ v = p * .5 + .5; v.y = 1. - v.y; gl_Position = vec4(p, 0., 1.); }';
    var fs = [
      'precision mediump float;',
      'varying vec2 v; uniform sampler2D img, dep;',
      'uniform vec2 scale, offset, shift; uniform float zoom;',
      'void main(){',
      '  vec2 c = vec2(.5);',
      '  vec2 q = c + (v - c) / zoom;',            // breathing zoom, inside the visible crop
      '  vec2 uv = offset + q * scale;',           // same crop as object-fit: cover
      '  float d = texture2D(dep, uv).r;',
      '  uv += shift * (d - .3);',                 // .3 = the plane of the hand stays almost still
      '  gl_FragColor = texture2D(img, uv);',
      '}'
    ].join('\n');
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {};
    ['img', 'dep', 'scale', 'offset', 'shift', 'zoom'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

    function texture(unit, image) {
      var t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    }

    var ready = false, running = false, visible = true;
    var aspect = 0.8;
    var cur = { x: 0, y: 0 }, ptr = { x: 0, y: 0 }, lastMove = 0;
    var coarse = window.matchMedia('(hover: none)').matches;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = media.clientWidth, h = media.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      // reproduce object-fit: cover with the same focal point as the <img>
      var pos = getComputedStyle(img).objectPosition.split(' ');
      var fx = parseFloat(pos[0]) / 100, fy = parseFloat(pos[1]) / 100;
      var ca = w / h, sx = 1, sy = 1;
      if (ca > aspect) sy = aspect / ca; else sx = ca / aspect;
      gl.uniform2f(U.scale, sx, sy);
      gl.uniform2f(U.offset, (1 - sx) * fx, (1 - sy) * fy);
    }

    function frame(t) {
      if (!running) return;
      requestAnimationFrame(frame);
      if (!visible) return;
      var s = t / 1000;
      // slow drift on its own; the pointer takes over while it moves
      var driftX = Math.sin(s * 0.31) * 0.8, driftY = Math.cos(s * 0.23) * 0.6;
      var usePtr = !coarse && (t - lastMove < 4000);
      var tx = usePtr ? ptr.x : driftX, ty = usePtr ? ptr.y : driftY;
      cur.x += (tx - cur.x) * 0.045; cur.y += (ty - cur.y) * 0.045;
      gl.uniform2f(U.shift, -cur.x * 0.06, -cur.y * 0.045);
      gl.uniform1f(U.zoom, 1.09 + Math.sin(s * 0.27) * 0.05);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = hero.getBoundingClientRect();
      ptr.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ptr.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      lastMove = performance.now();
    }, { passive: true });
    window.addEventListener('resize', function () { if (ready) resize(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(hero);

    function load(src) {
      return new Promise(function (ok, ko) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = ko; i.src = src; });
    }

    return {
      start: function () {
        if (running) return;
        var go = function () { running = true; root.classList.add('depth-on'); requestAnimationFrame(frame); };
        if (ready) return go();
        var photo = img.currentSrc || img.src;
        Promise.all([load(photo), load('assets/photos/hero-depth.jpg')]).then(function (r) {
          aspect = r[0].naturalWidth / r[0].naturalHeight;
          texture(0, r[0]); texture(1, r[1]);
          gl.uniform1i(U.img, 0); gl.uniform1i(U.dep, 1);
          ready = true; resize(); go();
        }).catch(function () {});
      },
      stop: function () { running = false; root.classList.remove('depth-on'); }
    };
  })();

  /* ---------- ambient background in WebGL: one photo per zone, never still ---------- */
  // rotation and zoom (time + scroll), liquid distortion, mirror shards, colour split and stretch on fast scroll,
  // pointer / phone tilt, random flashes, cross-fade between photos as the zones go by
  var ambient = (function () {
    var holder = document.querySelector('.ambient');
    if (!holder) return null;
    var canvas = document.createElement('canvas');
    canvas.className = 'amb-canvas';
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) return null;
    holder.insertBefore(canvas, holder.firstChild);

    // which photo sits behind which part of the page (id of the block where it takes over)
    var zones = [
      { id: 'music', src: 'assets/photos/bg-1.jpg' },
      { id: 'album', src: 'assets/photos/bg-2.jpg' },
      { id: 'tour', src: 'assets/photos/bg-3.jpg' },
      { id: 'band', src: 'assets/photos/bg-4.jpg' },
      { id: 'videos', src: 'assets/photos/bg-5.jpg' },
      { id: 'newsletter', src: 'assets/photos/bg-6.jpg' }
    ];

    var vs = 'attribute vec2 p; varying vec2 v; void main(){ v = p * .5 + .5; v.y = 1. - v.y; gl_Position = vec4(p, 0., 1.); }';
    var fs = [
      'precision highp float;',
      'varying vec2 v;',
      'uniform sampler2D A, B;',
      'uniform float mixAB, aspA, aspB, ca, t, sp, vel, flash, shardOn, liquidOn;',
      'uniform float kRotT, kRotS, kZoomT, kZoomS, kZoom0, kSplit, kHold;',
      'uniform vec2 ptr;',
      'vec2 hash2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }',
      'mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }',
      // p is in "square" space (x scaled by the canvas aspect); returns texture uv with cover fit and mirrored edges
      'vec2 fit(vec2 p, float asp){',
      '  vec2 q = p; q.x /= ca;',
      '  vec2 s = ca > asp ? vec2(1., asp / ca) : vec2(ca / asp, 1.);',
      '  q = q * s + .5;',
      '  return abs(mod(q - 1., 2.) - 1.);',
      '}',
      'vec3 pic(vec2 p){ return mix(texture2D(A, fit(p, aspA)).rgb, texture2D(B, fit(p, aspB)).rgb, mixAB); }',
      'void main(){',
      '  vec2 p = v - .5; p.x *= ca;',
      // mirror shards: voronoi cells, each one shifted, turned and zoomed on its own
      '  vec2 g = p * 2.4 + vec2(0., t * .02);',
      '  vec2 cell = floor(g), id = cell; float d1 = 9., d2 = 9.;',
      '  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {',
      '    vec2 c = cell + vec2(float(i), float(j));',
      '    vec2 h = hash2(c);',
      '    vec2 pt = c + .5 + .47 * sin(t * .35 + 6.2831 * h) + (h - .5) * .5;',
      '    float d = distance(g, pt);',
      '    if (d < d1) { d2 = d1; d1 = d; id = c; } else if (d < d2) { d2 = d; }',
      '  }',
      '  vec2 r = hash2(id + 7.) - .5;',
      '  float shard = (.45 + .35 * sin(t * .21) + vel * 1.4) * shardOn;',
      '  float edge = smoothstep(.07, .0, d2 - d1);',
      // whole picture: turns and breathes with time, turns and comes closer with scroll, follows the pointer
      '  float ang = (sp - .33) * .9 * kRotS + sin(t * .31) * .16 * kRotT + r.x * shard * .5;',
      '  float zoom = max(.35, 1.3 * kZoom0 + .3 * sin(t * .47) * kZoomT + sp * .35 * kZoomS + r.y * shard * .35);',
      '  vec2 q = rot(ang) * p / zoom;',
      '  q += ptr * .09 + r * shard * .13;',
      // liquid: the surface ripples, harder when scrolling fast
      '  float amp = (.014 + vel * .07) * liquidOn;',
      '  q += amp * vec2(sin(q.y * 9. + t * 1.1) + sin(q.y * 23. - t * 1.7) * .4, cos(q.x * 8. - t * .9) + cos(q.x * 19. + t * 1.3) * .4);',
      '  q.y *= 1. - vel * .35;',
      // colour split along the scroll direction and on flashes
      '  vec2 off = vec2(.0, .045) * (vel * 1.6 + flash * .6) + vec2(.003, .012) * kSplit;',   // multiple exposure along the scroll
      '  vec3 col = (pic(q) * 2. + pic(q + off) + pic(q - off) + (pic(q + 2. * off) + pic(q - 2. * off)) * .5) / 5.;',
      '  col += edge * shard * vec3(.25, .5, .58) * .55;',
      '  float lum = dot(col, vec3(.3, .59, .11));',
      '  col *= mix(1., 1. - .5 * kHold, smoothstep(.25, .9, lum));',   // bright photos are held back so the text stays readable
      '  col = col * (1. + flash * 2.2) + flash * vec3(.30, .44, .48);',   // added light, so the flash shows on dark photos too
      '  float vig = smoothstep(1.25, .25, length(p));',
      '  gl_FragColor = vec4(col * mix(.55, 1., vig), 1.);',
      '}'
    ].join('\n');
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return null; }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {};
    ['A', 'B', 'mixAB', 'aspA', 'aspB', 'ca', 't', 'sp', 'vel', 'flash', 'ptr', 'shardOn', 'liquidOn', 'kRotT', 'kRotS', 'kZoomT', 'kZoomS', 'kZoom0', 'kSplit', 'kHold'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    gl.uniform1i(U.A, 0); gl.uniform1i(U.B, 1);

    function makeTexture(image) {
      var tx = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
      return tx;
    }

    var ready = false, running = false, tops = [];
    var cur = { x: 0, y: 0 }, ptr = { x: 0, y: 0 };
    var lastY = window.scrollY, vel = 0, flash = 0, nextFlash = 4000;
    // every value is a multiplier of the built-in amount: 1 = as first designed, 0 = off.
    // These defaults are the ones chosen by the band with the tuning panel (last set 06.10.2026).
    var P = { intensity: 0.5, speed: 1, rotT: 0.5, rotS: 0.1, zoom0: 1, zoomT: 0.2, zoomS: 0.15, vel: 0.25, ptr: 0.25, flash: 0.05, flashEvery: 1, split: 0, fade: 1.65, hold: 0.8, shard: 0, liquid: 0, sharp: 1, lights: 2 };
    var clock = 0, lastNow = 0, sharpNow = 1, still = 0;   // still: 1 while the stasis zone holds the screen

    function resize() {
      // rendered small on purpose: it is a soft background, and it keeps phones cool
      var k = Math.min(window.devicePixelRatio || 1, 1.5) * 0.6 * Math.max(0.15, P.sharp);
      sharpNow = P.sharp;
      canvas.width = Math.max(2, Math.round(window.innerWidth * k));
      canvas.height = Math.max(2, Math.round(window.innerHeight * k));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(U.ca, canvas.width / canvas.height);
      tops = zones.map(function (z) {
        var el = document.getElementById(z.id);
        return el ? el.getBoundingClientRect().top + window.scrollY : 0;
      });
    }

    function frame(now) {
      if (!running) return;
      requestAnimationFrame(frame);
      if (P.sharp !== sharpNow) resize();
      var y = window.scrollY, vh = window.innerHeight;
      // stasis: between the start of the Music zone and the Album zone, the clock slows to a halt
      var inStasis = tops.length > 1 && (y + vh * 0.5) >= tops[0] && (y + vh * 0.5) < tops[1];
      still += ((inStasis ? 1 : 0) - still) * 0.04;
      root.classList.toggle('stasis', still > 0.85);
      clock += Math.min(100, now - (lastNow || now)) * P.speed * (1 - still); lastNow = now;
      // how fast the page is moving, smoothed; 1 = a hard flick
      var raw = Math.min(1, Math.abs(y - lastY) / 70);
      lastY = y;
      vel += (raw - vel) * (raw > vel ? 0.35 : 0.06);
      // flashes: every few seconds on their own, and when the scroll is violent
      if (now > nextFlash || (raw > 0.92 && flash < 0.2)) { flash = 1; nextFlash = now + (5000 + Math.random() * 7000) * Math.max(0.1, P.flashEvery); }
      flash *= 0.93;
      // which two photos, and how far between them
      var mid = y + vh * 0.5, i = 0;
      for (var k = 0; k < tops.length; k++) if (mid >= tops[k]) i = k;
      var j = Math.min(i + 1, zones.length - 1);
      var fade = Math.max(1, vh * 0.55 * P.fade), m = 0;
      if (j !== i) m = Math.max(0, Math.min(1, (mid - (tops[j] - fade)) / fade));
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, zones[i].tex);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, zones[j].tex);
      gl.uniform1f(U.aspA, zones[i].asp); gl.uniform1f(U.aspB, zones[j].asp);
      gl.uniform1f(U.mixAB, m * m * (3 - 2 * m));
      cur.x += (ptr.x - cur.x) * 0.06; cur.y += (ptr.y - cur.y) * 0.06;
      gl.uniform2f(U.ptr, -cur.x * P.ptr, -cur.y * P.ptr);
      var max = document.documentElement.scrollHeight - vh;
      gl.uniform1f(U.sp, max > 0 ? y / max : 0);
      gl.uniform1f(U.t, clock / 1000);
      gl.uniform1f(U.vel, Math.min(1.5, vel * P.vel));
      gl.uniform1f(U.flash, flash * P.flash);
      gl.uniform1f(U.shardOn, P.shard);
      gl.uniform1f(U.liquidOn, P.liquid);
      gl.uniform1f(U.kRotT, P.rotT); gl.uniform1f(U.kRotS, P.rotS);
      gl.uniform1f(U.kZoomT, P.zoomT); gl.uniform1f(U.kZoomS, P.zoomS); gl.uniform1f(U.kZoom0, P.zoom0);
      gl.uniform1f(U.kSplit, P.split); gl.uniform1f(U.kHold, Math.min(2, P.hold));
      root.style.setProperty('--amb-k', P.intensity);
      root.style.setProperty('--lights', P.lights);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      ptr.x = (e.clientX / window.innerWidth - 0.5) * 2;
      ptr.y = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
    // phones: tilt, where the browser gives it without asking
    window.addEventListener('deviceorientation', function (e) {
      if (e.gamma == null) return;
      ptr.x = Math.max(-1, Math.min(1, e.gamma / 30));
      ptr.y = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
    }, { passive: true });
    window.addEventListener('resize', function () { if (ready) resize(); });
    window.addEventListener('load', function () { if (ready) resize(); });

    function load(src) {
      return new Promise(function (ok, ko) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = ko; i.src = src; });
    }

    return {
      start: function () {
        if (running) return;
        var go = function () { running = true; root.classList.add('ambient-gl'); resize(); requestAnimationFrame(frame); };
        if (ready) return go();
        Promise.all(zones.map(function (z) { return load(z.src); })).then(function (imgs) {
          imgs.forEach(function (im, n) { zones[n].tex = makeTexture(im); zones[n].asp = im.naturalWidth / im.naturalHeight; });
          ready = true; go();
        }).catch(function () {});
      },
      stop: function () { running = false; root.classList.remove('ambient-gl'); },
      params: P
    };
  })();

  /* ---------- switch between levels (demo only) ---------- */
  var labels = { off: 'Movimento: spento', one: 'Movimento: 1', two: 'Movimento: 1 + 2' };
  var order = (depth || ambient) ? ['two', 'one', 'off'] : ['one', 'off'];
  if (!depth && !ambient && mode === 'two') mode = 'one';
  var panel = document.createElement('div');
  panel.className = 'motion-switch';
  document.body.appendChild(panel);
  function button() { var b = document.createElement('button'); b.type = 'button'; panel.appendChild(b); return b; }
  var btn = button();
  var tune = null, tuneBox = null;

  /* ---------- tuning panel (demo only): one slider per adjustable amount ---------- */
  if (ambient) (function () {
    var P = ambient.params, defaults = JSON.parse(JSON.stringify(P));
    var rows = [
      ['intensity', 'Intensità sfondo'], ['speed', 'Velocità generale'],
      ['rotT', 'Rotazione continua'], ['rotS', 'Rotazione con lo scroll'],
      ['zoom0', 'Grandezza foto'], ['zoomT', 'Zoom continuo'], ['zoomS', 'Zoom con lo scroll'],
      ['vel', 'Reazione alla velocità'], ['ptr', 'Reazione a mouse / inclinazione'],
      ['flash', 'Lampi: forza'], ['flashEvery', 'Lampi: pausa fra uno e l’altro'],
      ['split', 'Sdoppiamento a riposo'], ['fade', 'Dissolvenza fra le foto'],
      ['hold', 'Freno sulle zone chiare'], ['shard', 'Specchio (0 = spento)'], ['liquid', 'Liquido (0 = spento)'],
      ['sharp', 'Nitidezza'], ['lights', 'Luci vaganti']
    ];
    try { var saved = JSON.parse(localStorage.getItem('motion-params-6') || '{}'); rows.forEach(function (r) { if (typeof saved[r[0]] === 'number') P[r[0]] = saved[r[0]]; }); } catch (e) {}

    var open = button(); open.textContent = 'Regola'; tune = open;
    var box = document.createElement('div'); box.className = 'motion-panel'; box.hidden = true; tuneBox = box;
    var inputs = {};
    rows.forEach(function (r) {
      var label = document.createElement('label');
      var name = document.createElement('span'); name.textContent = r[1];
      var val = document.createElement('output');
      var input = document.createElement('input');
      input.type = 'range'; input.min = 0; input.max = 2; input.step = 0.05; input.value = P[r[0]];
      function show() { val.textContent = Math.round(P[r[0]] * 100) + '%'; }
      input.addEventListener('input', function () { P[r[0]] = parseFloat(input.value); show(); save(); });
      show();
      label.appendChild(name); label.appendChild(val); label.appendChild(input);
      box.appendChild(label);
      inputs[r[0]] = { input: input, show: show };
    });
    function text() { return rows.map(function (r) { return r[0] + '=' + P[r[0]]; }).join(' '); }
    function save() { try { localStorage.setItem('motion-params-6', JSON.stringify(P)); } catch (e) {} out.value = text(); }
    var out = document.createElement('textarea'); out.readOnly = true; out.rows = 3; out.setAttribute('aria-label', 'Valori attuali');
    var copy = document.createElement('button'); copy.type = 'button'; copy.textContent = 'Copia valori';
    copy.addEventListener('click', function () {
      out.select();
      var done = function () { copy.textContent = 'Copiato'; setTimeout(function () { copy.textContent = 'Copia valori'; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(out.value).then(done, function () { document.execCommand('copy'); done(); }); else { document.execCommand('copy'); done(); }
    });
    var reset = document.createElement('button'); reset.type = 'button'; reset.textContent = 'Azzera';
    reset.addEventListener('click', function () {
      rows.forEach(function (r) { P[r[0]] = defaults[r[0]]; inputs[r[0]].input.value = P[r[0]]; inputs[r[0]].show(); });
      save();
    });
    var foot = document.createElement('div'); foot.className = 'motion-panel-foot';
    foot.appendChild(copy); foot.appendChild(reset);
    box.appendChild(out); box.appendChild(foot);
    panel.insertBefore(box, panel.firstChild);
    out.value = text();
    open.addEventListener('click', function () { box.hidden = !box.hidden; open.textContent = box.hidden ? 'Regola' : 'Chiudi'; });
  })();

  function apply() {
    root.classList.toggle('motion', mode !== 'off');
    if (mode === 'two' && depth) depth.start(); else if (depth) depth.stop();
    if (mode === 'two' && ambient) ambient.start(); else if (ambient) ambient.stop();
    btn.textContent = labels[mode];
    if (tune) tune.hidden = !(ambient && mode === 'two');
    if (tuneBox && tune && tune.hidden) { tuneBox.hidden = true; tune.textContent = 'Regola'; }
    onScroll();
    try { sessionStorage.setItem('motion', mode); } catch (e) {}
  }
  btn.addEventListener('click', function () {
    mode = order[(order.indexOf(mode) + 1) % order.length];
    apply();
  });
  apply();
})();
