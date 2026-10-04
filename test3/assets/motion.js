// Motion for the test3 demo.
// Level 1: slow breathing zoom, scroll parallax on the opening photo, sections fading in, living grain,
//          and an ambient layer (emblem + drifting lights) that keeps moving behind the whole page.
// Level 2: depth effect on the opening photo (WebGL): the picture shifts with the pointer, more where it is closer.
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

  /* ---------- switch between levels (demo only) ---------- */
  var labels = { off: 'Movimento: spento', one: 'Movimento: 1', two: 'Movimento: 1 + 2' };
  var order = depth ? ['two', 'one', 'off'] : ['one', 'off'];
  if (!depth && mode === 'two') mode = 'one';
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'motion-switch';
  document.body.appendChild(btn);

  function apply() {
    root.classList.toggle('motion', mode !== 'off');
    if (mode === 'two' && depth) depth.start(); else if (depth) depth.stop();
    btn.textContent = labels[mode];
    onScroll();
    try { sessionStorage.setItem('motion', mode); } catch (e) {}
  }
  btn.addEventListener('click', function () {
    mode = order[(order.indexOf(mode) + 1) % order.length];
    apply();
  });
  apply();
})();
