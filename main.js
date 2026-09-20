/* ==========================================================================
   First Anniversary — main.js
   Sections: helpers · hearts/sparks · reveal · counters · photo fallback ·
             lightbox · music player · surprise
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var rand = function (a, b) { return a + Math.random() * (b - a); };

  /* ------------------------------------------------------------------ */
  /* Smooth scroll buttons                                               */
  /* ------------------------------------------------------------------ */
  $$('[data-scroll]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = $(btn.getAttribute('data-scroll'));
      if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });

  /* ------------------------------------------------------------------ */
  /* Floating hearts + gold sparks (paused when off-screen)              */
  /* ------------------------------------------------------------------ */
  $$('[data-hearts]').forEach(function (box) {
    var n = parseInt(box.getAttribute('data-hearts'), 10) || 10;
    if (window.innerWidth < 600) n = Math.ceil(n * 0.65);
    for (var i = 0; i < n; i++) {
      var s = document.createElement('span');
      s.textContent = '\u2665';
      s.style.cssText =
        '--x:' + rand(2, 96).toFixed(1) + '%;' +
        '--s:' + rand(11, 30).toFixed(0) + 'px;' +
        '--d:' + rand(10, 19).toFixed(1) + 's;' +
        '--delay:-' + rand(0, 18).toFixed(1) + 's;' +
        '--sway:' + rand(-70, 70).toFixed(0) + 'px;';
      box.appendChild(s);
    }
  });
  $$('[data-sparks]').forEach(function (box) {
    var n = parseInt(box.getAttribute('data-sparks'), 10) || 20;
    if (window.innerWidth < 600) n = Math.ceil(n * 0.6);
    for (var i = 0; i < n; i++) {
      var s = document.createElement('span');
      s.style.cssText =
        '--x:' + rand(0, 98).toFixed(1) + '%;' +
        '--y:' + rand(0, 96).toFixed(1) + '%;' +
        '--s:' + rand(5, 12).toFixed(0) + 'px;' +
        '--d:' + rand(3, 7).toFixed(1) + 's;' +
        '--delay:-' + rand(0, 7).toFixed(1) + 's;';
      box.appendChild(s);
    }
  });
  if ('IntersectionObserver' in window) {
    var pauseIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        $$('.hearts, .sparks', e.target).forEach(function (el) { el.classList.toggle('is-paused', !e.isIntersecting); });
      });
    }, { threshold: 0 });
    $$('.hero, .final').forEach(function (el) { pauseIO.observe(el); });
  }

  /* ------------------------------------------------------------------ */
  /* Scroll reveal                                                       */
  /* ------------------------------------------------------------------ */
  $$('.g-item').forEach(function (el, i) { el.style.setProperty('--stagger', (i * 0.12).toFixed(2) + 's'); });
  $$('.stat').forEach(function (el, i) { el.style.setProperty('--n', i); });

  var revealTargets = $$('[data-reveal], .tl-item, .g-item, .stats, .final');
  var statsEl = $('.stats');

  function onReveal(el) {
    el.classList.add('in');
    if (el === statsEl) runCounters();
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { onReveal(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    revealTargets.forEach(function (el) { io.observe(el); });
  } else {
    revealTargets.forEach(onReveal);
  }

  /* ------------------------------------------------------------------ */
  /* Counters (1 Beautiful Year · 12 Amazing Months)                      */
  /* ------------------------------------------------------------------ */
  function runCounters() {
    $$('[data-count]').forEach(function (el, idx) {
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      if (reduceMotion) { el.textContent = target; return; }
      var dur = 1700, delay = idx * 180 + 200, start = null;
      function tick(ts) {
        if (start === null) start = ts;
        var t = Math.min(Math.max((ts - start) / dur, 0), 1);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * eased);
        if (t < 1) requestAnimationFrame(tick);
      }
      setTimeout(function () { requestAnimationFrame(tick); }, delay);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Placeholder if a photo file is missing                              */
  /* ------------------------------------------------------------------ */
  $$('img').forEach(function (img) {
    var box = img.closest('.ph, .g-item');
    if (!box) return;
    var mark = function () { box.classList.add('is-empty'); };
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) mark();
    img.addEventListener('error', mark);
  });

  /* ------------------------------------------------------------------ */
  /* Lightbox (click · swipe · arrows · keyboard)                         */
  /* ------------------------------------------------------------------ */
  (function lightbox() {
    var items = $$('.g-item');
    var lb = $('#lightbox'), img = $('#lbImg'), stage = $('#lbStage');
    var btnClose = $('#lbClose'), btnPrev = $('#lbPrev'), btnNext = $('#lbNext');
    if (!items.length || !lb) return;

    var idx = 0, lastFocus = null, closeTimer = null;
    var drag = { active: false, x: 0, y: 0, dx: 0, dy: 0, onImage: false };

    function srcAt(i) { return items[i].querySelector('img').currentSrc || items[i].querySelector('img').src; }

    function show(dir) {
      img.style.transition = 'none';
      img.style.opacity = '0';
      img.style.transform = 'translateX(' + (dir * 46) + 'px) scale(.97)';
      img.src = srcAt(idx);
      void img.offsetWidth; // reflow so the transition restarts
      img.style.transition = 'transform .5s cubic-bezier(.2,.7,.2,1), opacity .5s ease';
      img.style.opacity = '1';
      img.style.transform = 'none';
    }
    function open(i) {
      clearTimeout(closeTimer);
      lastFocus = document.activeElement;
      idx = i;
      lb.hidden = false;
      show(0);
      requestAnimationFrame(function () { lb.classList.add('open'); });
      document.body.classList.add('no-scroll');
      btnClose.focus({ preventScroll: true });
    }
    function close() {
      lb.classList.remove('open');
      document.body.classList.remove('no-scroll');
      closeTimer = setTimeout(function () { lb.hidden = true; img.removeAttribute('src'); }, 360);
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }
    function go(dir) {
      idx = (idx + dir + items.length) % items.length;
      show(dir);
    }

    items.forEach(function (it, i) { it.addEventListener('click', function () { open(i); }); });
    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', function () { go(-1); });
    btnNext.addEventListener('click', function () { go(1); });

    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    });

    // swipe / drag
    stage.addEventListener('pointerdown', function (e) {
      drag.active = true; drag.x = e.clientX; drag.y = e.clientY; drag.dx = 0; drag.dy = 0; drag.onImage = (e.target === img);
      img.style.transition = 'none';
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    });
    stage.addEventListener('pointermove', function (e) {
      if (!drag.active) return;
      drag.dx = e.clientX - drag.x; drag.dy = e.clientY - drag.y;
      if (Math.abs(drag.dx) > Math.abs(drag.dy)) {
        img.style.transform = 'translateX(' + drag.dx + 'px)';
        img.style.opacity = String(1 - Math.min(Math.abs(drag.dx) / 500, .5));
      } else {
        img.style.transform = 'translateY(' + drag.dy + 'px)';
        img.style.opacity = String(1 - Math.min(Math.abs(drag.dy) / 400, .6));
      }
    });
    function endDrag(e) {
      if (!drag.active) return;
      drag.active = false;
      var ax = Math.abs(drag.dx), ay = Math.abs(drag.dy);
      if (ax < 6 && ay < 6) {                       // a tap
        if (!drag.onImage) close();                 // tap on the dark area closes
        img.style.transition = 'transform .3s ease, opacity .3s ease';
        img.style.transform = 'none'; img.style.opacity = '1';
        return;
      }
      if (ax > ay && ax > 55) { go(drag.dx < 0 ? 1 : -1); return; }
      if (ay > ax && ay > 90) { close(); return; }
      img.style.transition = 'transform .35s cubic-bezier(.2,.7,.2,1), opacity .35s ease';
      img.style.transform = 'none'; img.style.opacity = '1';
    }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
  })();

  /* ------------------------------------------------------------------ */
  /* Music player (never autoplays)                                       */
  /* ------------------------------------------------------------------ */
  (function player() {
    var audio = $('#audio'), box = $('#player');
    if (!audio || !box) return;
    var btnPlay = $('#btnPlay'), btnPause = $('#btnPause');
    var seek = $('#seek'), tCur = $('#tCur'), tDur = $('#tDur'), viz = $('#viz');
    var seeking = false, raf = 0, bars = [];

    // Single-file build: the song is embedded as base64 and turned into a playable blob.
    if (window.__EMBEDDED_AUDIO) {
      var emb = window.__EMBEDDED_AUDIO, triedFallback = false;
      try {
        var bin = atob(emb.b64), len = bin.length, arr = new Uint8Array(len);
        for (var i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
        audio.src = URL.createObjectURL(new Blob([arr], { type: emb.type }));
      } catch (err) {
        audio.src = 'data:' + emb.type + ';base64,' + emb.b64;
      }
      audio.addEventListener('error', function () {
        if (triedFallback) return;
        triedFallback = true;
        audio.src = 'data:' + emb.type + ';base64,' + emb.b64;
      });
    }
    audio.autoplay = false;
    audio.pause();

    function fmt(s) {
      if (!isFinite(s) || s < 0) s = 0;
      var m = Math.floor(s / 60), r = Math.floor(s % 60);
      return m + ':' + (r < 10 ? '0' : '') + r;
    }
    function paint() {
      var d = audio.duration, c = audio.currentTime;
      var pct = d && isFinite(d) ? (c / d) * 100 : 0;
      if (!seeking) seek.value = String(Math.round(pct * 10));
      seek.style.setProperty('--p', pct.toFixed(2) + '%');
      tCur.textContent = fmt(c);
    }
    function setDuration() { if (isFinite(audio.duration)) tDur.textContent = fmt(audio.duration); }

    // visualisation bars
    var count = window.innerWidth < 420 ? 26 : 34;
    for (var b = 0; b < count; b++) { var el = document.createElement('i'); viz.appendChild(el); bars.push(el); }
    function drawViz(now) {
      for (var i = 0; i < bars.length; i++) {
        var v = .16 + .84 * Math.abs(Math.sin(now / 340 + i * .55) * Math.cos(now / 690 + i * .31 + Math.sin(now / 2100) * 2));
        bars[i].style.transform = 'scaleY(' + v.toFixed(3) + ')';
      }
      raf = requestAnimationFrame(drawViz);
    }
    function vizOn() { cancelAnimationFrame(raf); if (reduceMotion) { bars.forEach(function (b) { b.style.transform = 'scaleY(.5)'; }); return; } raf = requestAnimationFrame(drawViz); }
    function vizOff() { cancelAnimationFrame(raf); bars.forEach(function (b, i) { b.style.transform = 'scaleY(' + (.12 + (i % 5) * .03) + ')'; }); }
    vizOff();

    btnPlay.addEventListener('click', function () {
      var p = audio.play();
      if (p && p.catch) p.catch(function () {});
    });
    btnPause.addEventListener('click', function () { audio.pause(); });

    audio.addEventListener('play',  function () { box.classList.add('is-playing');    vizOn(); });
    audio.addEventListener('pause', function () { box.classList.remove('is-playing'); vizOff(); });
    audio.addEventListener('ended', function () { box.classList.remove('is-playing'); vizOff(); audio.currentTime = 0; paint(); });
    audio.addEventListener('timeupdate', paint);
    audio.addEventListener('loadedmetadata', function () { setDuration(); paint(); });
    audio.addEventListener('durationchange', setDuration);
    if (audio.readyState >= 1) setDuration();

    seek.addEventListener('pointerdown', function () { seeking = true; });
    seek.addEventListener('input', function () {
      var d = audio.duration;
      if (d && isFinite(d)) {
        var pct = seek.value / 10;
        seek.style.setProperty('--p', pct + '%');
        tCur.textContent = fmt(d * pct / 100);
        if (!seeking) audio.currentTime = d * pct / 100;
      }
    });
    function endSeek() {
      if (!seeking) return;
      seeking = false;
      var d = audio.duration;
      if (d && isFinite(d)) audio.currentTime = d * (seek.value / 1000);
    }
    seek.addEventListener('pointerup', endSeek);
    seek.addEventListener('change', endSeek);
    seek.addEventListener('pointercancel', endSeek);

    // stop drawing when the page is hidden
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (!audio.paused) vizOn();
    });
  })();

  /* ------------------------------------------------------------------ */
  /* Surprise reveal + confetti hearts                                    */
  /* ------------------------------------------------------------------ */
  (function surprise() {
    var openBtn = $('#openSurprise'), overlay = $('#surprise'), closeBtn = $('#surpriseClose'), canvas = $('#confetti');
    if (!openBtn || !overlay || !canvas) return;
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, dpr = 1, parts = [], raf = 0, spawnUntil = 0, lastFocus = null, hideTimer = null;
    var COLORS = ['#f4a3b9', '#e07a9a', '#ffffff', '#ecdcb4', '#c9a15a', '#fbd0dc', '#d4577b'];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.width = Math.floor(window.innerWidth * dpr);
      H = canvas.height = Math.floor(window.innerHeight * dpr);
    }
    function add(x, y, vx, vy) {
      parts.push({
        x: x, y: y, vx: vx, vy: vy,
        s: rand(7, 17) * dpr,
        rot: rand(0, 6.28), vr: rand(-.12, .12),
        color: COLORS[(Math.random() * COLORS.length) | 0],
        heart: Math.random() < .58,
        life: 0, max: rand(220, 360)
      });
    }
    function burst(n) {
      var i, a, sp;
      for (i = 0; i < n; i++) {                       // from both bottom corners, upward
        a = rand(-1.25, -.55) ; sp = rand(9, 19) * dpr;
        add(0, H, Math.cos(a) * sp, Math.sin(a) * sp);
        a = rand(-2.6, -1.9);  sp = rand(9, 19) * dpr;
        add(W, H, Math.cos(a) * sp, Math.sin(a) * sp);
      }
    }
    function heart(c, s) {
      c.beginPath();
      c.moveTo(0, s * .32);
      c.bezierCurveTo(-s, -s * .45, -s * .5, -s, 0, -s * .42);
      c.bezierCurveTo(s * .5, -s, s, -s * .45, 0, s * .32);
      c.closePath();
      c.fill();
    }
    function frame(ts) {
      ctx.clearRect(0, 0, W, H);
      if (ts < spawnUntil && parts.length < 240) {     // gentle rain from the top
        var k = reduceMotion ? 0 : 2;
        for (var i = 0; i < k; i++) add(rand(0, W), -20 * dpr, rand(-1.2, 1.2) * dpr, rand(1.5, 3.5) * dpr);
      }
      for (var j = parts.length - 1; j >= 0; j--) {
        var p = parts[j];
        p.vy += .22 * dpr; p.vx *= .992; p.vy *= .992;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life++;
        if (p.y > H + 40 * dpr || p.life > p.max) { parts.splice(j, 1); continue; }
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, Math.min(1, (p.max - p.life) / 50));
        ctx.fillStyle = p.color;
        if (p.heart) heart(ctx, p.s); else ctx.fillRect(-p.s * .5, -p.s * .28, p.s, p.s * .56);
        ctx.restore();
      }
      if (parts.length || ts < spawnUntil) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    }
    function startConfetti() {
      resize();
      parts = [];
      cancelAnimationFrame(raf);
      burst(reduceMotion ? 6 : (window.innerWidth < 600 ? 26 : 44));
      spawnUntil = performance.now() + 4200;
      // second burst as the message appears
      setTimeout(function () { if (!overlay.hidden) burst(reduceMotion ? 0 : 22); }, 1500);
      raf = requestAnimationFrame(frame);
    }

    function open() {
      clearTimeout(hideTimer);
      lastFocus = document.activeElement;
      overlay.hidden = false;
      void overlay.offsetWidth;
      overlay.classList.add('open');
      document.body.classList.add('no-scroll');
      startConfetti();
      closeBtn.focus({ preventScroll: true });
    }
    function close() {
      overlay.classList.remove('open');
      document.body.classList.remove('no-scroll');
      cancelAnimationFrame(raf);
      parts = [];
      ctx.clearRect(0, 0, W, H);
      hideTimer = setTimeout(function () { overlay.hidden = true; }, 900);
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }

    openBtn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !overlay.hidden) close(); });
    window.addEventListener('resize', function () { if (!overlay.hidden) resize(); });
  })();

})();
