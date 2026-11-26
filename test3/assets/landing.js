// Shared by the three landing trials (landing-a/b/c.html): time left, audio preview, hidden newsletter.
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
      if (el.dataset.clock !== undefined) {
        el.innerHTML = '<span>' + two(d) + '<small>d</small></span><span>' + two(h) + '<small>h</small></span><span>' + two(m) + '<small>m</small></span><span>' + two(s % 60) + '<small>s</small></span>';
      } else {
        el.textContent = Math.ceil(ms / 86400000);
      }
    });
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- audio preview ---------- */
  document.querySelectorAll('.preview').forEach(function (box) {
    var a = box.querySelector('audio'), b = box.querySelector('.preview-play');
    if (!a) return;
    var bar = box.querySelector('.preview-bar i'), time = box.querySelector('.preview-time');
    function left() {
      var s = Math.max(0, Math.round((a.duration || 0) - a.currentTime));
      time.textContent = Math.floor(s / 60) + ':' + two(s % 60);
    }
    b.addEventListener('click', function () { if (a.paused) a.play(); else a.pause(); });
    a.addEventListener('play', function () { box.classList.add('playing'); root.classList.add('listening'); });
    a.addEventListener('pause', function () { box.classList.remove('playing'); root.classList.remove('listening'); });
    a.addEventListener('ended', function () { a.currentTime = 0; });
    a.addEventListener('timeupdate', function () { bar.style.width = (a.duration ? a.currentTime / a.duration * 100 : 0) + '%'; left(); });
    a.addEventListener('loadedmetadata', left);
    box.querySelector('.preview-bar').addEventListener('click', function (e) {
      if (!a.duration) return;
      var r = this.getBoundingClientRect();
      a.currentTime = (e.clientX - r.left) / r.width * a.duration;
    });
  });

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
