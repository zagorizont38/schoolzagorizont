/* Скрипт сайта «За горизонт». Подключается в конец <body>. Работает без библиотек. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var mm = window.matchMedia || function () { return { matches: false }; };
  var reduceMotion = mm('(prefers-reduced-motion: reduce)').matches;
  var isPreview = /(^|\s)preview(\s|$)/.test(root.className);

  /* Летающие семена на фоне */
  (function () {
    var box = doc.getElementById('seedsFixed');
    if (!box || reduceMotion) return;
    var html = '';
    for (var i = 0; i < 9; i++) {
      var w = 16 + Math.round(Math.random() * 16);
      html += '<span class="seed" style="width:' + w + 'px;height:' + Math.round(w * 1.7) + 'px;top:' + Math.round(Math.random() * 92) +
        '%;left:' + Math.round(Math.random() * 94) + '%;animation:drift ' + (13 + Math.random() * 12).toFixed(1) + 's ease-in-out ' +
        (Math.random() * 8).toFixed(1) + 's infinite"><svg viewBox="0 0 34 58"><use href="#dseed"/></svg></span>';
    }
    box.innerHTML = html;
  })();

  /* Ховеры только для мыши */
  (function () {
    var fine = mm('(hover: hover)').matches && mm('(pointer: fine)').matches;
    var touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    function set(can) {
      root.className = root.className.replace(/\b(can-hover|no-hover)\b/g, '').replace(/\s+/g, ' ').trim() + (can ? ' can-hover' : ' no-hover');
    }
    set(fine && !touch);
    window.addEventListener('mouseover', function first(e) {
      if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
      if (mm('(hover: hover)').matches && mm('(pointer: fine)').matches) set(true);
      window.removeEventListener('mouseover', first);
    }, { passive: true });
  })();

  /* Шапка и полоса прокрутки */
  var header = doc.getElementById('header');
  var bar = doc.getElementById('progressBar');
  function onScroll() {
    var y = window.pageYOffset;
    if (header) header.className = y > 12 ? 'scrolled' : '';
    if (bar) {
      var h = root.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    }
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Мобильное меню */
  var menu = doc.getElementById('mobileMenu');
  var openBtn = doc.getElementById('menuToggle');
  var closeBtn = doc.getElementById('mobileClose');
  function setMenu(open) {
    if (!menu) return;
    menu.className = open ? 'mobile-menu open' : 'mobile-menu';
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (openBtn) openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    doc.body.style.overflow = open ? 'hidden' : '';
    if (open && closeBtn) closeBtn.focus();
  }
  if (openBtn) openBtn.addEventListener('click', function () { setMenu(true); });
  if (closeBtn) closeBtn.addEventListener('click', function () { setMenu(false); });
  if (menu) {
    var closers = menu.querySelectorAll('[data-close]');
    for (var c = 0; c < closers.length; c++) closers[c].addEventListener('click', function () { setMenu(false); });
  }
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* Плавные якоря с учётом шапки */
  var headH = 78;
  function scrollToId(id, smooth) {
    var target = doc.getElementById(id);
    if (!target) return false;
    var y = target.getBoundingClientRect().top + window.pageYOffset - headH - 18;
    if (y < 0) y = 0;
    try { window.scrollTo({ top: y, behavior: smooth && !reduceMotion ? 'smooth' : 'auto' }); } catch (err) { window.scrollTo(0, y); }
    return true;
  }
  var anchors = doc.querySelectorAll('a[href^="#"]');
  for (var a = 0; a < anchors.length; a++) {
    anchors[a].addEventListener('click', function (e) {
      var id = this.getAttribute('href');
      if (!id || id === '#') return;
      if (scrollToId(id.slice(1), true)) {
        e.preventDefault();
        if (history.replaceState && !isPreview) history.replaceState(null, '', id);
        if (id === '#faq' || /^#q-/.test(id)) openFaq(id.slice(1));
      }
    });
  }

  /* Подсветка пункта меню */
  var navLinks = doc.querySelectorAll('.nav-links a');
  var sections = doc.querySelectorAll('section[id]');
  function highlight() {
    var pos = window.pageYOffset + headH + 60, current = '';
    for (var s = 0; s < sections.length; s++) if (sections[s].offsetTop <= pos) current = sections[s].id;
    for (var n = 0; n < navLinks.length; n++) {
      var on = navLinks[n].getAttribute('href') === '#' + current;
      navLinks[n].className = on ? 'active' : '';
      if (on) navLinks[n].setAttribute('aria-current', 'true'); else navLinks[n].removeAttribute('aria-current');
    }
  }
  window.addEventListener('scroll', highlight, { passive: true });
  highlight();

  /* Появление блоков */
  var revealEls = doc.querySelectorAll('.reveal');
  function showAll() { for (var i = 0; i < revealEls.length; i++) if (revealEls[i].className.indexOf(' in') < 0) revealEls[i].className += ' in'; }
  if ('IntersectionObserver' in window && !reduceMotion && !isPreview) {
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) { entries[i].target.className += ' in'; io.unobserve(entries[i].target); }
      }
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    for (var r = 0; r < revealEls.length; r++) io.observe(revealEls[r]);
    setTimeout(showAll, (window.self !== window.top) ? 2500 : 9000);
  } else {
    showAll();
  }

  /* Видео в первом экране: грузим после страницы, не мешаем первой отрисовке */
  (function () {
    var v = doc.getElementById('heroVideo');
    if (!v) return;
    var src = v.getAttribute('data-src');
    var saveData = navigator.connection && navigator.connection.saveData;
    if (!src || reduceMotion || saveData) return;
    function start() {
      v.src = src;
      v.muted = true;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    }
    if (doc.readyState === 'complete') setTimeout(start, 300);
    else window.addEventListener('load', function () { setTimeout(start, 300); });
  })();

  /* Частые вопросы: открыть по ссылке #q-... */
  function openFaq(id) {
    var el = doc.getElementById(id);
    if (el && el.tagName === 'DETAILS') el.open = true;
  }
  if (location.hash && /^#q-/.test(location.hash)) {
    openFaq(location.hash.slice(1));
    setTimeout(function () { scrollToId(location.hash.slice(1), false); }, 60);
  }

  /* Цели Яндекс Метрики: клик по телефону и мессенджерам */
  var mid = root.getAttribute('data-metrika');
  if (mid) {
    doc.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('a') : null;
      if (!t || typeof window.ym !== 'function') return;
      var href = t.getAttribute('href') || '';
      if (href.indexOf('tel:') === 0) window.ym(+mid, 'reachGoal', 'phone');
      else if (/max\.ru|vk\.com|t\.me/.test(href)) window.ym(+mid, 'reachGoal', 'messenger');
      else if (/2gis|yandex\.ru\/maps/.test(href)) window.ym(+mid, 'reachGoal', 'route');
    });
  }

  /* Лайтбокс для дипломов */
  (function () {
    var lb = doc.getElementById('awLb');
    var cards = doc.querySelectorAll('.aw');
    if (!lb || !cards.length) return;
    var img = doc.getElementById('awLbImg'), ttl = doc.getElementById('awLbTitle'), sub = doc.getElementById('awLbSub');
    var btnClose = doc.getElementById('awLbClose'), btnPrev = doc.getElementById('awLbPrev'), btnNext = doc.getElementById('awLbNext');
    var cur = 0, lastFocus = null, hideTimer = null;
    function fill(i) {
      if (i < 0) i = cards.length - 1;
      if (i >= cards.length) i = 0;
      cur = i;
      var card = cards[i], pic = card.getElementsByTagName('img')[0];
      img.setAttribute('src', card.getAttribute('data-full') || pic.getAttribute('src'));
      img.setAttribute('alt', pic.getAttribute('alt') || '');
      ttl.textContent = card.getAttribute('data-title') || '';
      sub.textContent = card.getAttribute('data-sub') || '';
    }
    function openLb(i) {
      lastFocus = doc.activeElement;
      fill(i);
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      lb.hidden = false;
      void lb.offsetWidth;
      lb.className = 'aw-lb open';
      doc.body.style.overflow = 'hidden';
      if (btnClose) btnClose.focus();
    }
    function close() {
      lb.className = 'aw-lb';
      doc.body.style.overflow = '';
      hideTimer = setTimeout(function () { lb.hidden = true; }, 320);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener('click', function () { openLb(parseInt(this.getAttribute('data-aw'), 10) || 0); });
    }
    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', function () { fill(cur - 1); });
    btnNext.addEventListener('click', function () { fill(cur + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.className === 'aw-lb-inner') close(); });
    doc.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') fill(cur - 1);
      else if (e.key === 'ArrowRight') fill(cur + 1);
    });
  })();

  /* Предпросмотр в админке: прокрутка к разделу по команде */
  if (isPreview) {
    window.addEventListener('message', function (e) {
      var d = e.data || {};
      if (d.type === 'zg-scroll' && d.id) scrollToId(d.id, true);
      if (d.type === 'zg-scrollY') window.scrollTo(0, d.y || 0);
    });
    window.addEventListener('scroll', function () {
      try { parent.postMessage({ type: 'zg-y', y: window.pageYOffset }, '*'); } catch (e) {}
    }, { passive: true });
  }
})();
