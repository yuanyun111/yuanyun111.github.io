/* =========================================================
   缘云 · 个人主页 交互脚本
   原生 JS，无依赖
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;

  /* ---------- 1. 主题：本地偏好 → 系统偏好 → 默认深色 ---------- */
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('theme', t); } catch (e) { /* 隐私模式下忽略 */ }
  }

  var saved = null;
  try { saved = localStorage.getItem('theme'); } catch (e) {}

  if (saved === 'light' || saved === 'dark') {
    applyTheme(saved);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    applyTheme('light');
  } else {
    applyTheme('dark');
  }

  var themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  /* ---------- 2. 背景图探测 ----------
     CSS 里已写入 url("bg.jpg")，但只有文件真的存在时才启用蒙版与
     半透明调整，否则页面上会白铺一层灰。                        */
  (function detectBackground() {
    var probe = new Image();
    probe.onload = function () {
      if (probe.naturalWidth > 0) root.classList.add('has-bg');
    };
    probe.src = 'bg.jpg';
  })();

  /* ---------- 3. 滚动入场动画 ---------- */
  var reveals = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        // 同批元素错开出现，节奏更自然
        setTimeout(function () { entry.target.classList.add('in'); }, i * 70);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- 4. 滚动：导航态 / 回顶 / 阅读进度 ---------- */
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

  /* ---------- 5. 跟随鼠标的聚光（仅精确指针设备） ---------- */
  var spot = document.getElementById('spotlight');
  var finePointer = window.matchMedia &&
                    window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  if (spot && finePointer) {
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
  }

  /* ---------- 6. 导航高亮当前板块 ---------- */
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

  /* ---------- 7. 头像加载失败时的兜底（首字） ---------- */
  var avatar = document.getElementById('avatar');
  if (avatar) {
    var img = avatar.querySelector('img');
    if (img && img.complete && img.naturalWidth === 0) {
      img.remove();
      avatar.classList.add('fallback');
    }
  }
})();
