/* =========================================================
   缘云 · 个人主页 交互脚本
   原生 JS，无依赖
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia &&
                     window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. 主题：本地偏好 → 系统偏好 → 默认深色 ---------- */
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('theme', t); } catch (e) { /* 隐私模式下忽略 */ }
  }

  var saved = null;
  try { saved = localStorage.getItem('theme'); } catch (e) {}

  // 无历史偏好时默认浅色 —— 与明亮的底图更协调。右上角可随时切深色。
  if (saved === 'light' || saved === 'dark') {
    applyTheme(saved);
  } else {
    applyTheme('light');
  }

  var themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  /* ---------- 2. 滚动入场动画 ---------- */
  var reveals = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        setTimeout(function () { entry.target.classList.add('in'); }, i * 70);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- 3. 滚动：导航态 / 回顶 / 阅读进度 ---------- */
  var nav = document.getElementById('nav');
  var toTop = document.getElementById('toTop');
  var bar = document.getElementById('progress');

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;

    if (nav) nav.classList.toggle('scrolled', y > 12);
    if (toTop) toTop.classList.toggle('show', y > 420);

    if (bar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (y / max) * 100 : 0;
      bar.style.width = Math.min(100, Math.max(0, pct)) + '%';
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- 4. 鼠标聚光（无背景图时启用） ---------- */
  (function spotlight() {
    var spot = document.getElementById('spotlight');
    if (!spot) return;
    if (!window.matchMedia ||
        !window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;

    var mx = 0, my = 0, queued = false;

    window.addEventListener('mousemove', function (e) {
      mx = e.clientX;
      my = e.clientY;
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        spot.style.setProperty('--mx', mx + 'px');
        spot.style.setProperty('--my', my + 'px');
        spot.classList.add('on');
        queued = false;
      });
    }, { passive: true });

    document.addEventListener('mouseleave', function () {
      spot.classList.remove('on');
    });
  })();

  /* ---------- 5. 导航高亮当前板块 ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
  var sections = links
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = '#' + entry.target.id;
        links.forEach(function (a) {
          var on = a.getAttribute('href') === id;
          a.style.color = on ? 'var(--text)' : '';
          a.style.background = on ? 'var(--accent-soft)' : '';
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- 6. 头像加载失败时的兜底（首字） ---------- */
  var avatar = document.getElementById('avatar');
  if (avatar) {
    var img = avatar.querySelector('img');
    if (img && img.complete && img.naturalWidth === 0) {
      img.remove();
      avatar.classList.add('fallback');
    }
  }

  /* =========================================================
     7. 动态背景
     视差位移（滚动 + 鼠标）· 呼吸缩放（CSS 动画）· 光尘粒子

     两个注意点：
     - 位移与缩放分层，各自用 transform，互不干扰
     - 粒子用预渲染的辉光贴图 drawImage，避免每帧新建渐变
     ========================================================= */
  function initBackgroundFX() {
    if (reduceMotion) return;

    var photo  = document.getElementById('bgPhoto');
    var canvas = document.getElementById('motes');

    /* ---- 目标值 vs 当前值，用缓动追平，动作才顺滑 ---- */
    var tgt = { scroll: window.scrollY || 0, mx: 0, my: 0 };
    var cur = { scroll: tgt.scroll, mx: 0, my: 0 };

    window.addEventListener('scroll', function () {
      tgt.scroll = window.scrollY || window.pageYOffset;
    }, { passive: true });

    window.addEventListener('mousemove', function (e) {
      tgt.mx = (e.clientX / window.innerWidth  - 0.5) * 2;   // -1 … 1
      tgt.my = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    /* ---- 光尘 ---- */
    var ctx = null, W = 0, H = 0, parts = [], sprite = null;

    var mouse = { x: -9999, y: -9999 };
    window.addEventListener('mousemove', function (e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }, { passive: true });
    document.addEventListener('mouseleave', function () {
      mouse.x = -9999; mouse.y = -9999;
    });

    // 预渲染一团辉光，之后每帧只做 drawImage
    function makeSprite() {
      var S = 64;
      var c = document.createElement('canvas');
      c.width = c.height = S;
      var g = c.getContext('2d');
      var grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      grd.addColorStop(0,    'rgba(255,250,222,1)');
      grd.addColorStop(0.22, 'rgba(255,240,180,.70)');
      grd.addColorStop(0.55, 'rgba(255,228,140,.20)');
      grd.addColorStop(1,    'rgba(255,220,110,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, S, S);
      return c;
    }

    function seed() {
      parts = [];
      var n = Math.round(Math.min(56, Math.max(22, W / 28)));
      for (var i = 0; i < n; i++) {
        parts.push({
          x:  Math.random() * W,
          y:  Math.random() * H,
          r:  0.8 + Math.random() * 1.9,          // 半径
          vy: -(0.10 + Math.random() * 0.34),     // 上浮
          vx: (Math.random() - 0.5) * 0.14,
          a:  0.22 + Math.random() * 0.48,        // 透明度
          ph: Math.random() * 6.2832,             // 摆动相位
          sp: 0.005 + Math.random() * 0.013
        });
      }
    }

    function resize() {
      if (!canvas) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth  || window.innerWidth;
      H = canvas.clientHeight || window.innerHeight;
      canvas.width  = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    if (canvas) {
      sprite = makeSprite();
      resize();
      window.addEventListener('resize', resize, { passive: true });
    }

    /* ---- 主循环 ---- */
    var raf = 0, last = 0;

    function frame(now) {
      var dt = last ? Math.min(2.5, (now - last) / 16.667) : 1;   // 归一到 60fps
      last = now;

      cur.scroll += (tgt.scroll - cur.scroll) * 0.10;
      cur.mx     += (tgt.mx     - cur.mx)     * 0.055;
      cur.my     += (tgt.my     - cur.my)     * 0.055;

      // 视差：背景比内容慢。位移有上限，避免露出边缘
      if (photo) {
        var cap = window.innerHeight * 0.16;
        var ty = Math.max(-cap, Math.min(cap, cur.scroll * 0.045));
        photo.style.transform =
          'translate3d(' + (cur.mx * 13).toFixed(2) + 'px,' +
                           (cur.my * 9 - ty).toFixed(2) + 'px,0)';
      }

      if (ctx) {
        ctx.clearRect(0, 0, W, H);

        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          p.ph += p.sp * dt;
          p.y  += p.vy * dt;
          p.x  += (p.vx + Math.sin(p.ph) * 0.20) * dt;

          // 鼠标排斥：120px 内推开
          var dx = p.x - mouse.x, dy = p.y - mouse.y;
          var d2 = dx * dx + dy * dy;
          if (d2 < 14400 && d2 > 0.01) {
            var d = Math.sqrt(d2);
            var f = (1 - d / 120) * 2.4 * dt;
            p.x += (dx / d) * f;
            p.y += (dy / d) * f;
          }

          // 出界回收
          if (p.y < -14) { p.y = H + 14; p.x = Math.random() * W; }
          if (p.x < -14) p.x = W + 14;
          else if (p.x > W + 14) p.x = -14;

          var s = p.r * 11;
          ctx.globalAlpha = p.a;
          ctx.drawImage(sprite, p.x - s / 2, p.y - s / 2, s, s);
        }
        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(frame);
    }

    function start() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
    function stop()  { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

    // 切到别的标签页时停掉，别空烧电
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    start();
  }

  /* ---------- 8. 背景图探测：存在才启用动态效果 ---------- */
  (function detectBackground() {
    var probe = new Image();
    probe.onload = function () {
      if (probe.naturalWidth > 0) {
        root.classList.add('has-bg');
        initBackgroundFX();
      }
    };
    probe.src = 'bg.jpg';
  })();
})();
