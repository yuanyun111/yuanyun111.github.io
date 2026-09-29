/* =========================================================
   包景帆 · 个人主页 交互脚本
   原生 JS，无依赖
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 1. 主题：读取本地偏好 → 跟随系统 → 默认深色 ---------- */
  var root = document.documentElement;

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

  /* ---------- 2. 滚动入场动画 ---------- */
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
    // 兜底：不支持 IntersectionObserver 就全部直接显示
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- 3. 导航：滚动态 + 平滑锚点 ---------- */
  var nav = document.getElementById('nav');
  var toTop = document.getElementById('toTop');

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (nav) nav.classList.toggle('scrolled', y > 12);
    if (toTop) toTop.classList.toggle('show', y > 420);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- 4. 导航高亮当前板块 ---------- */
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

  /* ---------- 5. 头像加载失败时的兜底（首字母） ---------- */
  var avatar = document.getElementById('avatar');
  if (avatar) {
    var img = avatar.querySelector('img');
    if (img && img.complete && img.naturalWidth === 0) {
      img.remove();
      avatar.classList.add('fallback');
    }
  }
})();
