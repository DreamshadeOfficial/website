// Landing page (landing.html): time left, the newsletter behind Notify me.
(function () {
  var root = document.documentElement;

  /* ---------- time left until release (midnight, Swiss time) ---------- */
  // in the previews the page lives on the day of its phase (data-oggi), at the current time of day
  function now() {
    if (!root.dataset.oggi) return new Date();
    var d = new Date(), o = root.dataset.oggi.split('-');
    d.setFullYear(+o[0], +o[1] - 1, +o[2]);
    return d;
  }
  function release(el) { return new Date(el.dataset.release + 'T00:00:00+01:00'); }
  function two(n) { return String(n).padStart(2, '0'); }
  function tick() {
    document.querySelectorAll('[data-release]').forEach(function (el) {
      var ms = Math.max(0, release(el) - now());
      var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60;
      if (el.dataset.clock === 'line') {
        // one line: whole nights, then the hours, minutes and seconds until the next midnight
        el.innerHTML = '<b>' + d + '</b> nights · <b>' + h + '</b> hr · <b>' + two(m) + '</b> min · <b>' + two(s % 60) + '</b> sec';
      } else if (el.dataset.clock !== undefined) {
        el.innerHTML = '<span>' + two(d) + '<small>d</small></span><span>' + two(h) + '<small>h</small></span><span>' + two(m) + '<small>m</small></span><span>' + two(s % 60) + '<small>s</small></span>';
      } else {
        el.textContent = Math.ceil(ms / 86400000);
      }
    });
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- "Notify me" opens the newsletter field ---------- */
  document.querySelectorAll('[data-open]').forEach(function (b) {
    var box = document.getElementById(b.dataset.open);
    b.setAttribute('aria-expanded', 'false');
    b.addEventListener('click', function () {
      var open = box.hidden;
      box.hidden = !open;
      b.setAttribute('aria-expanded', open);
      root.classList.toggle('notify-open', open);
      if (open) { var i = box.querySelector('input'); if (i) i.focus(); }
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('[data-open][aria-expanded="true"]').forEach(function (b) { b.click(); });
  });
})();
