(function () {
  'use strict';

  const NAV_URL = '../data/nav.json', NOTICE_URL = '../data/notices.json', FRIENDS_URL = '../data/friends.json';
  const SETTINGS_KEY = 'site.settings';
  
  // 移除了所有 GitHub 及 EditMode 相关的默认项
  const DEFAULT_SETTINGS = {
    themeColor: 'orange', noticeBar: true, showFriends: true, enableMultiLinks: false,
    defaultCategory: '', openInNewTab: true
  };
  
  const THEME_COLORS = [
    { id: 'orange', name: '暖阳橘', dot: '#C07B57' }, { id: 'default', name: '海蓝', dot: '#3F729B' },
    { id: 'green', name: '护眼绿', dot: '#5C8D76' }, { id: 'purple', name: '极客紫', dot: '#7E6B8F' },
    { id: 'pink', name: '樱花粉', dot: '#B26A76' }, { id: 'indigo', name: '石墨蓝', dot: '#465E7B' },
    { id: 'cyan', name: '抹茶青', dot: '#3E8A7B' }, { id: 'gray', name: '晨雾灰', dot: '#595959' }
  ];
  
  const AUTO_COLORS = ['#4E7296', '#5F8468', '#9A7250', '#7A6E96', '#96697C', '#4F7A9B', '#6B6F7A'];

  let SETTINGS = loadSettings();

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw)) : Object.assign({}, DEFAULT_SETTINGS);
    } catch (e) { return Object.assign({}, DEFAULT_SETTINGS); }
  }

  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(SETTINGS)); }
    catch (e) { console.warn('配置保存失败，可能处于隐私模式'); }
  }

  let NAV_CATEGORIES = [], NOTICES = [], FRIENDS = [], TAGS = ['全部'];
  let navKeyword = '', noticeKeyword = '', noticeFilter = '全部', activeCategoryId = '', activeGroupId = 'all', lastFocused = null;
  let isAutoScrolling = false, autoScrollTimer = null, scrollSpyTimer = null;
  let IS_TOUCH = window.matchMedia('(hover: none)').matches;

  (function watchHoverCapability() {
    const mq = window.matchMedia('(hover: none)');
    const onChange = (e) => { IS_TOUCH = e.matches; hideTip(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  })();

  const navGroupsEl = document.getElementById('navGroups');
  const navEmptyEl = document.getElementById('navEmpty');
  const navSearchEl = document.getElementById('navSearch');
  const catNavEl = document.getElementById('catNav');
  const catFootEl = document.getElementById('catFoot');
  const catRandomEl = document.getElementById('catRandom');
  const groupNavEl = document.getElementById('groupNav');
  const navTipEl = document.getElementById('navTip');
  const friendsSectionEl = document.getElementById('friendsSection');
  const friendsGridEl = document.getElementById('friendsGrid');
  const noticeBar = document.getElementById('noticeBar');
  const barTag = document.getElementById('barTag');
  const barText = document.getElementById('barText');
  const barDots = document.getElementById('barDots');
  const noticeListEl = document.getElementById('noticeList');
  const noticeEmptyEl = document.getElementById('noticeEmpty');
  const noticeTabsEl = document.getElementById('noticeTabs');
  const noticeSearchEl = document.getElementById('noticeSearch');
  const searchEl = document.getElementById('search');
  const themeBtn = document.getElementById('themeBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const backTopBtn = document.getElementById('backTop');
  const modalMask = document.getElementById('modalMask');
  const modalTag = document.getElementById('modalTag');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalActions = document.getElementById('modalActions');
  const modalClose = document.getElementById('modalClose');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxOpen = document.getElementById('lightboxOpen');
  const lightboxZoom = document.getElementById('lightboxZoom');
  const settingsMask = document.getElementById('settingsMask');
  const settingsClose = document.getElementById('settingsClose');
  const themeColorsEl = document.getElementById('themeColors');
  const setFollowSystemEl = document.getElementById('setFollowSystem');
  const setNoticeBarEl = document.getElementById('setNoticeBar');
  const setShowFriendsEl = document.getElementById('setShowFriends');
  const setEnableMultiLinksEl = document.getElementById('setEnableMultiLinks');
  const setDefaultCategoryEl = document.getElementById('setDefaultCategory');
  const setOpenModeEl = document.getElementById('setOpenMode');
  const settingsResetEl = document.getElementById('settingsReset');
  const settingsExportEl = document.getElementById('settingsExport');
  const settingsImportEl = document.getElementById('settingsImport');
  const settingsFileEl = document.getElementById('settingsFile');
  const toastEl = document.getElementById('toast');

  const esc = (str) => String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function highlight(text, q) {
    const safe = esc(text);
    if (!q) return safe;
    const qq = esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return safe.replace(new RegExp('(' + qq + ')', 'gi'), '<mark>$1</mark>');
  }

  function openExternal(url) {
    if (!url || url === '#' || url === 'javascript:void(0)') return;
    window.open(url, '_blank', 'noopener');
  }

  function fetchWithTimeout(url, ms) {
    ms = ms || 10000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { signal: controller.signal }).then(
      res => { clearTimeout(timer); return res; },
      err => { clearTimeout(timer); throw err; }
    );
  }

  function guardImg(img) {
    if (!img) return;
    const fail = () => { img.style.display = 'none'; };
    if (img.complete && img.naturalWidth === 0 && img.src) { fail(); return; }
    img.addEventListener('error', fail, { once: true });
  }

  function guardImgs(root) {
    (root || document).querySelectorAll('img[data-fallback]').forEach(guardImg);
  }

  function updateNoticeBarH() {
    const h = (noticeBar.hidden || !SETTINGS.noticeBar) ? 0 : noticeBar.offsetHeight;
    document.documentElement.style.setProperty('--notice-bar-h', h + 'px');
  }

  function lockBodyScroll() {
    document.body.classList.add('modal-open');
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) document.body.style.paddingRight = scrollbarWidth + 'px';
  }

  function unlockBodyScroll() {
    document.body.classList.remove('modal-open');
    document.body.style.paddingRight = '';
  }

  let imgObserver = null;

  function initImgObserver() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('img[data-domain]').forEach(loadImageFromDomain);
      return;
    }
    imgObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.domain) { loadImageFromDomain(img); observer.unobserve(img); }
        }
      });
    }, { rootMargin: '200px 0px', threshold: 0.01 });
  }

  async function loadImageFromDomain(img) {
    const domain = img.dataset.domain;
    if (!domain) return;
    img.removeAttribute('data-domain');

    const cacheKey = 'icon_cache_' + domain;
    const rawCache = localStorage.getItem(cacheKey);
    const now = Date.now();
    const SUCCESS_TTL = 7 * 24 * 60 * 60 * 1000, FAILED_TTL = 24 * 60 * 60 * 1000;

    if (rawCache) {
      try {
        const cache = JSON.parse(rawCache);
        if (cache && cache.time) {
          const age = now - cache.time;
          if (cache.data === 'FAILED' && age < FAILED_TTL) { fallbackToLetter(img); return; }
          if (cache.data !== 'FAILED' && age < SUCCESS_TTL) { img.src = cache.data; return; }
        }
      } catch (e) { localStorage.removeItem(cacheKey); }
    }

    let timer;
    try {
      let signal;
      if (typeof AbortController !== 'undefined') {
        const controller = new AbortController();
        signal = controller.signal;
        timer = setTimeout(() => controller.abort(), 5000);
      }
      const res = await fetch('https://favicon.run/favicon?domain=' + encodeURIComponent(domain) + '&sz=128', { signal });
      if (timer) clearTimeout(timer);
      if (!res.ok) throw new Error('network error');
      const blob = await res.blob();
      const base64data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          if (!result || result.length < 200) { reject(new Error('invalid icon')); return; }
          resolve(result);
        };
        reader.readAsDataURL(blob);
      });
      try { localStorage.setItem(cacheKey, JSON.stringify({ data: base64data, time: Date.now() })); } catch (e) {}
      img.src = base64data;
    } catch (e) {
      if (timer) clearTimeout(timer);
      try { localStorage.setItem(cacheKey, JSON.stringify({ data: 'FAILED', time: Date.now() })); } catch (err) {}
      fallbackToLetter(img);
    }
  }

  function fallbackToLetter(img) {
    if (img.dataset.hasFallback === 'true') return;
    img.dataset.hasFallback = 'true';
    img.style.display = 'none';
    const parent = img.parentNode;
    if (parent) {
      parent.classList.remove('nav-ico-img');
      parent.style.background = img.dataset.color || '#4E7296';
      const span = document.createElement('span');
      span.textContent = img.dataset.letter || '链';
      parent.appendChild(span);
    }
  }

  function observeImages(root) {
    const imgs = (root || document).querySelectorAll('img[data-domain]');
    if (!imgObserver) imgs.forEach(loadImageFromDomain);
    else imgs.forEach(img => imgObserver.observe(img));
  }

  function makeQRCode(seed) {
    const SIZE = 25, finders = [[0, 0], [SIZE - 7, 0], [0, SIZE - 7]];
    const inFinder = (x, y) => finders.some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
    let s = seed >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    let path = '';
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      if (inFinder(x, y)) continue;
      if (rnd() > 0.55) path += 'M' + x + ' ' + y + 'h1v1h-1z';
    }
    let finderSvg = '';
    finders.forEach(([fx, fy]) => {
      finderSvg += '<rect x="' + fx + '" y="' + fy + '" width="7" height="7"/>';
      finderSvg += '<rect x="' + (fx + 1) + '" y="' + (fy + 1) + '" width="5" height="5" fill="#fff"/>';
      finderSvg += '<rect x="' + (fx + 2) + '" y="' + (fy + 2) + '" width="3" height="3"/>';
    });
    return '<svg viewBox="-1 -1 ' + (SIZE + 2) + ' ' + (SIZE + 2) + '" xmlns="http://www.w3.org/2000/svg" fill="#2B2B2B" shape-rendering="crispEdges"><path d="' + path + '"/>' + finderSvg + '</svg>';
  }

  let lbScale = 1, lbTx = 0, lbTy = 0, lbDragging = false, lbMoved = false;
  let lbStartX = 0, lbStartY = 0, lbStartTx = 0, lbStartTy = 0;
  let lbPinchDist = 0, lbPinchScale = 1, lbLastDragEnd = 0;

  function applyLightboxTransform() {
    if (!lightboxImg) return;
    lightboxImg.style.transform = 'translate(' + lbTx + 'px,' + lbTy + 'px) scale(' + lbScale + ')';
    if (lightboxZoom) lightboxZoom.textContent = Math.round(lbScale * 100) + '%';
    lightboxImg.style.cursor = lbScale > 1.01 ? (lbDragging ? 'grabbing' : 'grab') : 'zoom-in';
  }

  function resetLightboxTransform() {
    lbScale = 1; lbTx = 0; lbTy = 0;
    if (lightboxImg) lightboxImg.classList.remove('dragging');
    applyLightboxTransform();
  }

  function openLightbox(src, alt) {
    if (!src || !lightbox) return;
    lightboxImg.src = src;
    lightboxImg.alt = alt || '';
    if (lightboxOpen) lightboxOpen.href = src;
    resetLightboxTransform();
    lightbox.classList.add('show');
    lightbox.setAttribute('aria-hidden', 'false');
    lockBodyScroll();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('show');
    lightbox.setAttribute('aria-hidden', 'true');
    lightboxImg.removeAttribute('src');
    resetLightboxTransform();
    if (!modalMask.classList.contains('show')) unlockBodyScroll();
  }

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);

  if (lightbox) {
    lightbox.addEventListener('click', e => {
      if (Date.now() - lbLastDragEnd < 300) return;
      if (e.target === lightbox) closeLightbox();
    });
    lightbox.addEventListener('wheel', e => {
      if (!lightbox.classList.contains('show')) return;
      e.preventDefault();
      const rect = lightboxImg.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const oldScale = lbScale;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      lbScale = Math.min(5, Math.max(0.5, lbScale * factor));
      const ratio = lbScale / oldScale;
      lbTx = dx - (dx - lbTx) * ratio;
      lbTy = dy - (dy - lbTy) * ratio;
      applyLightboxTransform();
    }, { passive: false });

    if (lightboxImg) {
      lightboxImg.addEventListener('dblclick', e => {
        e.stopPropagation();
        if (lbScale > 1.01) { resetLightboxTransform(); return; }
        const rect = lightboxImg.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        lbScale = 2; lbTx = dx - dx * 2; lbTy = dy - dy * 2;
        applyLightboxTransform();
      });
      lightboxImg.addEventListener('mousedown', e => {
        if (e.button !== 0 || lbScale <= 1.01) return;
        lbDragging = true; lbMoved = false;
        lbStartX = e.clientX; lbStartY = e.clientY;
        lbStartTx = lbTx; lbStartTy = lbTy;
        lightboxImg.classList.add('dragging');
        applyLightboxTransform();
        e.preventDefault();
      });
      lightboxImg.addEventListener('touchstart', e => {
        if (e.touches.length === 1 && lbScale > 1.01) {
          lbDragging = true; lbMoved = false;
          lbStartX = e.touches[0].clientX; lbStartY = e.touches[0].clientY;
          lbStartTx = lbTx; lbStartTy = lbTy;
          lightboxImg.classList.add('dragging');
          applyLightboxTransform();
        } else if (e.touches.length === 2) {
          lbDragging = false;
          lightboxImg.classList.remove('dragging');
          const t1 = e.touches[0], t2 = e.touches[1];
          lbPinchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
          lbPinchScale = lbScale;
        }
      }, { passive: true });
      lightboxImg.addEventListener('touchmove', e => {
        if (lbDragging && e.touches.length === 1) {
          const dx = e.touches[0].clientX - lbStartX;
          const dy = e.touches[0].clientY - lbStartY;
          if (Math.abs(dx) + Math.abs(dy) > 3) lbMoved = true;
          lbTx = lbStartTx + dx; lbTy = lbStartTy + dy;
          applyLightboxTransform();
          e.preventDefault();
        } else if (e.touches.length === 2 && lbPinchDist > 0) {
          const t1 = e.touches[0], t2 = e.touches[1];
          const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
          lbScale = Math.min(5, Math.max(0.5, lbPinchScale * (dist / lbPinchDist)));
          applyLightboxTransform();
          e.preventDefault();
        }
      }, { passive: false });
      lightboxImg.addEventListener('touchend', e => {
        if (e.touches.length === 0) {
          if (lbMoved) lbLastDragEnd = Date.now();
          lbDragging = false;
          lightboxImg.classList.remove('dragging');
          applyLightboxTransform();
        }
        if (e.touches.length < 2) lbPinchDist = 0;
      });
    }

    if (lightboxZoom) lightboxZoom.addEventListener('click', e => { e.stopPropagation(); resetLightboxTransform(); });
  }

  window.addEventListener('mousemove', e => {
    if (!lbDragging) return;
    const dx = e.clientX - lbStartX, dy = e.clientY - lbStartY;
    if (Math.abs(dx) + Math.abs(dy) > 3) lbMoved = true;
    lbTx = lbStartTx + dx; lbTy = lbStartTy + dy;
    applyLightboxTransform();
  });

  window.addEventListener('mouseup', () => {
    if (!lbDragging) return;
    lbDragging = false;
    if (lbMoved) lbLastDragEnd = Date.now();
    if (lightboxImg) lightboxImg.classList.remove('dragging');
    applyLightboxTransform();
  });

  let tipCard = null, tipAutoHideTimer = null;

  function showTip(card, text) {
    clearTimeout(tipAutoHideTimer);
    tipCard = card;
    navTipEl.textContent = text;
    navTipEl.classList.add('show');
    positionTip(card);
    if (IS_TOUCH) tipAutoHideTimer = setTimeout(hideTip, 4000);
  }

  function positionTip(card) {
    const rect = card.getBoundingClientRect();
    const tipRect = navTipEl.getBoundingClientRect();
    const gap = 8, vw = window.innerWidth, vh = window.innerHeight;
    let top = rect.bottom + gap, left = rect.left;
    if (left + tipRect.width > vw - 12) left = vw - tipRect.width - 12;
    if (left < 12) left = 12;
    if (top + tipRect.height > vh - 12 && rect.top - gap - tipRect.height >= 12) top = rect.top - gap - tipRect.height;
    if (top + tipRect.height > vh - 12) top = vh - tipRect.height - 12;
    if (top < 12) top = 12;
    navTipEl.style.left = left + 'px';
    navTipEl.style.top = top + 'px';
  }

  function hideTip() {
    clearTimeout(tipAutoHideTimer);
    tipCard = null;
    navTipEl.classList.remove('show');
  }

  navTipEl.addEventListener('click', hideTip);

  function measureCardTruncation() {
    navGroupsEl.querySelectorAll('.nav-card').forEach(card => {
      const descEl = card.querySelector('.nav-desc');
      if (!descEl) return;
      card.dataset.truncated = descEl.scrollWidth > descEl.clientWidth + 1 ? 'true' : 'false';
    });
  }

  let fontsReadyBound = false;
  function bindFontsReadyMeasure() {
    if (fontsReadyBound) return;
    fontsReadyBound = true;
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measureCardTruncation).catch(() => {});
    }
  }

  let measureResizeTimer = null;
  window.addEventListener('resize', () => {
    hideTip();
    closeInlineDropdown();
    clearTimeout(measureResizeTimer);
    measureResizeTimer = setTimeout(() => { measureCardTruncation(); updateNoticeBarH(); }, 150);
  }, { passive: true });

  function bindNavTips() { hideTip(); measureCardTruncation(); }

  document.addEventListener('click', e => {
    if (!navTipEl.classList.contains('show')) return;
    if (e.target.closest('.nav-card') || e.target === navTipEl) return;
    hideTip();
  }, true);

  navGroupsEl.addEventListener('mouseover', e => {
    if (IS_TOUCH) return;
    const card = e.target.closest('.nav-card');
    if (!card || card.dataset.truncated !== 'true') return;
    const descEl = card.querySelector('.nav-desc');
    if (descEl) showTip(card, descEl.textContent.trim());
  });

  navGroupsEl.addEventListener('mouseout', e => {
    if (IS_TOUCH) return;
    if (!e.relatedTarget || !e.relatedTarget.closest('.nav-card')) hideTip();
  });

  navGroupsEl.addEventListener('focusin', e => {
    if (e.target.closest('.nav-card')) hideTip();
  });

  function getItemLinks(it) {
    const arr = [];
    if (it.url && it.url !== '#' && it.url !== 'javascript:void(0)') arr.push({ url: it.url });
    (it.links || []).forEach(l => { if (l && l.url && l.url !== '#') arr.push({ text: l.text || '', url: l.url }); });
    return arr;
  }

  let inlineDropdown = null, inlineDropdownAnchor = null;

  function positionInlineDropdown(card, dropdown) {
    const rect = card.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;

    dropdown.querySelectorAll('.inline-link-text').forEach(el => el.style.fontSize = '');
    dropdown.style.width = 'max-content';
    dropdown.style.left = '0px';
    dropdown.style.top = '0px';

    const naturalWidth = dropdown.offsetWidth;
    const maxWidth = vw - 24;
    let finalWidth = Math.max(rect.width, naturalWidth);
    if (finalWidth > maxWidth) {
      finalWidth = maxWidth;
      const scale = (maxWidth - 60) / (naturalWidth - 60);
      const finalScale = Math.max(0.75, scale);
      dropdown.querySelectorAll('.inline-link-text').forEach(el => el.style.fontSize = (13.5 * finalScale) + 'px');
    }

    const dRect = dropdown.getBoundingClientRect();
    const gap = 6;
    let left = rect.left + (rect.width - finalWidth) / 2;
    if (left + finalWidth > vw - 12) left = vw - finalWidth - 12;
    if (left < 12) left = 12;
    let top = rect.bottom + gap;
    if (top + dRect.height > vh - 12) {
      const upTop = rect.top - gap - dRect.height;
      top = upTop >= 12 ? upTop : Math.max(12, vh - dRect.height - 12);
    }
    dropdown.style.width = finalWidth + 'px';
    dropdown.style.left = left + 'px';
    dropdown.style.top = top + 'px';
  }

  function openInlineDropdown(card, item) {
    if (!card || !item) return;
    const links = getItemLinks(item);
    if (links.length < 2) return;
    closeInlineDropdown();

    const dropdown = document.createElement('div');
    dropdown.className = 'inline-links';
    dropdown.setAttribute('role', 'menu');
    dropdown.setAttribute('aria-label', item.name || '选择链接');

    links.forEach((l, i) => {
      const a = document.createElement('a');
      a.className = 'inline-link';
      a.href = l.url;
      if (SETTINGS.openInNewTab) { a.target = '_blank'; a.rel = 'noopener'; }
      const label = i === 0 ? (item.name || '主链接') : (l.text || '链接');
      let htmlStr = '<span class="inline-link-text"><span class="inline-link-inner">' + esc(label) + '</span></span>';
      if (i === 0) htmlStr += '<span class="inline-link-badge">主</span>';
      a.innerHTML = htmlStr;
      a.addEventListener('click', () => closeInlineDropdown());
      dropdown.appendChild(a);
    });

    document.body.appendChild(dropdown);
    inlineDropdown = dropdown;
    inlineDropdownAnchor = card;
    positionInlineDropdown(card, dropdown);
    void dropdown.offsetWidth;
    dropdown.classList.add('show');
    card.classList.add('dropdown-open');
  }

  function closeInlineDropdown() {
    if (!inlineDropdown) return;
    const el = inlineDropdown, anchor = inlineDropdownAnchor;
    inlineDropdown = null; inlineDropdownAnchor = null;
    el.classList.remove('show');
    if (anchor) anchor.classList.remove('dropdown-open');
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 160);
  }

  document.addEventListener('click', e => {
    if (!inlineDropdown) return;
    if (inlineDropdown.contains(e.target)) return;
    if (e.target.closest('.nav-card')) return;
    closeInlineDropdown();
  }, true);

  navGroupsEl.addEventListener('click', async e => {
    const multiCard = e.target.closest('.nav-card[data-multi="true"]');
    if (multiCard && !e.target.closest('.nav-info-btn')) {
      e.preventDefault(); e.stopPropagation();
      if (inlineDropdownAnchor === multiCard) { closeInlineDropdown(); return; }
      const cat = NAV_CATEGORIES.find(c => c.id === multiCard.dataset.cat);
      const group = cat && cat.groups && cat.groups.find(g => g.id === multiCard.dataset.group);
      const idx = parseInt(multiCard.dataset.idx, 10);
      if (group && group.items && group.items[idx]) openInlineDropdown(multiCard, group.items[idx]);
      return;
    }

    const disabledCard = e.target.closest('.nav-card[data-disabled="true"]');
    if (disabledCard) { e.preventDefault(); showToast('该站点暂未提供链接'); return; }

    const infoBtn = e.target.closest('.nav-info-btn');
    if (infoBtn) {
      e.preventDefault(); e.stopPropagation();
      const card = infoBtn.closest('.nav-card');
      const descEl = card.querySelector('.nav-desc');
      if (!descEl) return;
      if (tipCard === card) hideTip();
      else showTip(card, descEl.textContent.trim());
    }
  });

  navGroupsEl.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const multiCard = e.target.closest('.nav-card[data-multi="true"]');
    if (multiCard) {
      e.preventDefault();
      if (inlineDropdownAnchor === multiCard) { closeInlineDropdown(); return; }
      const cat = NAV_CATEGORIES.find(c => c.id === multiCard.dataset.cat);
      const group = cat && cat.groups && cat.groups.find(g => g.id === multiCard.dataset.group);
      const idx = parseInt(multiCard.dataset.idx, 10);
      if (group && group.items && group.items[idx]) openInlineDropdown(multiCard, group.items[idx]);
      return;
    }
    const card = e.target.closest('.nav-card[data-disabled="true"]');
    if (!card) return;
    e.preventDefault();
    showToast('该站点暂未提供链接');
  });

  function renderNavSkeleton() {
    let cards = '';
    for (let i = 0; i < 6; i++) cards += '<div class="skeleton skeleton-card"></div>';
    navGroupsEl.innerHTML = '<div class="nav-group"><div class="skeleton skeleton-group-title"></div><div class="nav-grid">' + cards + '</div></div>';
  }

  function renderNoticeSkeleton() {
    let items = '';
    for (let i = 0; i < 3; i++) items += '<li class="skeleton skeleton-notice"></li>';
    noticeListEl.innerHTML = items;
  }

  function initCatRandom() {
    if (!catRandomEl) return;
    catRandomEl.addEventListener('click', () => {
      const cat = NAV_CATEGORIES.find(c => c.id === activeCategoryId);
      if (!cat) return;
      const list = [];
      (cat.groups || []).forEach(g => (g.items || []).forEach(it => {
        if (it && it.url && it.url !== '#' && it.url !== 'javascript:void(0)') list.push(it);
      }));
      if (!list.length) return;
      const pick = list[Math.floor(Math.random() * list.length)];
      if (SETTINGS.openInNewTab) window.open(pick.url, '_blank', 'noopener');
      else window.location.href = pick.url;
    });
  }

  function scrollToResultsTop() {
    if (!navGroupsEl) return;
    const noticeBarH = (noticeBar.hidden || !SETTINGS.noticeBar) ? 0 : noticeBar.offsetHeight;
    const offset = 60 + noticeBarH + (navSearchEl ? navSearchEl.offsetHeight : 50) + 8;
    const rect = navGroupsEl.getBoundingClientRect();
    const targetY = Math.max(0, rect.top + window.scrollY - offset);
    if (Math.abs(window.scrollY - targetY) < 4) return;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  }

  function scrollToGroup(groupId) {
    if (!navGroupsEl) return;
    requestAnimationFrame(() => {
      const targetEl = navGroupsEl.querySelector(groupId === 'all' ? '.nav-group' : '.nav-group[data-group-id="' + groupId + '"]');
      if (!targetEl) return;
      const noticeBarH = (noticeBar.hidden || !SETTINGS.noticeBar) ? 0 : noticeBar.offsetHeight;
      const offset = 60 + noticeBarH + (navSearchEl ? navSearchEl.offsetHeight : 50) + 16;
      const rect = targetEl.getBoundingClientRect();
      const targetY = rect.top + window.scrollY - offset;
      if (Math.abs(window.scrollY - targetY) < 4) return;
      isAutoScrolling = true;
      clearTimeout(autoScrollTimer);
      autoScrollTimer = setTimeout(() => { isAutoScrolling = false; }, 800);
      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    });
  }

  function updateActiveSubTab() {
    if (!navGroupsEl || !catNavEl) return;
    if (window.matchMedia('(max-width: 1024px)').matches) return;
    if (navKeyword.trim()) return;
    const groups = navGroupsEl.querySelectorAll('.nav-group');
    if (!groups.length) return;
    const noticeBarH = (noticeBar.hidden || !SETTINGS.noticeBar) ? 0 : noticeBar.offsetHeight;
    const offset = 60 + noticeBarH + (navSearchEl ? navSearchEl.offsetHeight : 50) + 60;
    let currentGroupId = '';
    for (let i = groups.length - 1; i >= 0; i--) {
      if (groups[i].getBoundingClientRect().top <= offset) { currentGroupId = groups[i].dataset.groupId; break; }
    }
    catNavEl.querySelectorAll('.sub-tab').forEach(sub => sub.classList.toggle('active', sub.dataset.group === currentGroupId));
  }

  function handleScroll() {
    hideTip();
    if (inlineDropdown) closeInlineDropdown();
    updateBackTop();
    if (!isAutoScrolling) {
      clearTimeout(scrollSpyTimer);
      scrollSpyTimer = setTimeout(updateActiveSubTab, 100);
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });

  function renderCatNav() {
    let catHtml = '';
    NAV_CATEGORIES.forEach(cat => {
      const total = (cat.groups || []).reduce((sum, g) => sum + ((g.items || []).length), 0);
      const isActive = cat.id === activeCategoryId;
      catHtml += '<div class="cat-block">';
      catHtml += '<button class="cat-tab' + (isActive ? ' active' : '') + '" type="button" data-cat="' + esc(cat.id) + '"><span class="cat-tab-name">' + esc(cat.title) + '</span><span class="cat-tab-count">' + total + '</span></button>';
      catHtml += '<div class="sub-cats-wrap' + (isActive ? ' show' : '') + '"><div class="sub-cats-inner">';
      (cat.groups || []).forEach(g => { catHtml += '<button class="sub-tab' + (activeGroupId === g.id ? ' active' : '') + '" type="button" data-group="' + esc(g.id) + '">' + esc(g.title) + '</button>'; });
      catHtml += '</div></div></div>';
    });
    catNavEl.innerHTML = catHtml;
    bindCatEvents();
  }

  function bindCatEvents() {
    catNavEl.onclick = async e => {
      const sub = e.target.closest('.sub-tab');
      if (sub) {
        catNavEl.querySelectorAll('.sub-tab').forEach(st => st.classList.toggle('active', st === sub));
        scrollToGroup(sub.dataset.group);
        return;
      }
      const tab = e.target.closest('.cat-tab');
      if (!tab) return;

      if (activeCategoryId === tab.dataset.cat) return;
      activeCategoryId = tab.dataset.cat;
      activeGroupId = 'all';
      hideTip(); closeInlineDropdown();
      catNavEl.querySelectorAll('.cat-tab').forEach(t => t.classList.toggle('active', t === tab));
      catNavEl.querySelectorAll('.cat-block').forEach(block => {
        const subWrap = block.querySelector('.sub-cats-wrap');
        if (!subWrap) return;
        const isCurrent = block.contains(tab);
        subWrap.classList.toggle('show', isCurrent);
        if (isCurrent) subWrap.querySelectorAll('.sub-tab').forEach(st => st.classList.remove('active'));
      });
      if (window.matchMedia('(max-width: 1024px)').matches && tab.scrollIntoView) tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      renderGroupNav(); renderCards();
      if (window.matchMedia('(min-width: 1025px)').matches) scrollToGroup('all');
    };
  }

  function renderGroupNav() {
    const currentCat = NAV_CATEGORIES.find(c => c.id === activeCategoryId);
    const groups = currentCat ? (currentCat.groups || []) : [];
    let chips = '<button class="chip' + (activeGroupId === 'all' ? ' active' : '') + '" type="button" data-group="all">全部</button>';
    groups.forEach(g => { chips += '<button class="chip' + (activeGroupId === g.id ? ' active' : '') + '" type="button" data-group="' + esc(g.id) + '">' + esc(g.title) + '</button>'; });
    groupNavEl.innerHTML = chips;
    groupNavEl.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        if (activeGroupId === chip.dataset.group) return;
        activeGroupId = chip.dataset.group;
        updateGroupNavActive();
        renderCards();
      });
    });
  }

  function updateGroupNavActive() {
    groupNavEl.querySelectorAll('.chip').forEach(chip => chip.classList.toggle('active', chip.dataset.group === activeGroupId));
  }

  function renderCards() {
    closeInlineDropdown();
    const q = navKeyword.trim().toLowerCase();
    const cardTarget = SETTINGS.openInNewTab ? '_blank' : '_self';
    const cardRel = SETTINGS.openInNewTab ? 'noopener' : '';
    const isDesktop = window.matchMedia('(min-width: 1025px)').matches;
    const currentCat = NAV_CATEGORIES.find(c => c.id === activeCategoryId);
    const groups = currentCat ? (currentCat.groups || []) : [];
    let html = '', shown = 0;

    groups.forEach(group => {
      if (!isDesktop && activeGroupId !== 'all' && activeGroupId !== group.id) return;
      const filtered = (group.items || []).map((it, i) => ({ it, i })).filter(o => {
        if (!q) return true;
        return ((o.it.name || '') + ' ' + (o.it.desc || '')).toLowerCase().indexOf(q) !== -1;
      });
      if (!filtered.length) { if (q) return; }
      else shown += filtered.length;

      const cards = filtered.map(o => {
        const it = o.it, name = it.name || '', desc = it.desc || '', hasDesc = !!desc;
        const letter = it.letter || (name ? name.charAt(0).toUpperCase() : '链');
        let colorHash = 0;
        for (let i = 0; i < name.length; i++) colorHash += name.charCodeAt(i);
        const bgColor = it.color || AUTO_COLORS[colorHash % AUTO_COLORS.length];
        let iconUrl = it.icon, iconDomain = '';
        if (!iconUrl && it.url && it.url !== '#' && it.url !== 'javascript:void(0)') {
          try { iconDomain = new URL(it.url).hostname; } catch (e) {}
        }
        const hasIcon = !!iconUrl || !!iconDomain;
        const icoClass = hasIcon ? 'nav-ico nav-ico-img' : 'nav-ico';
        const icoStyle = hasIcon ? '' : 'background:' + esc(bgColor);
        let icoContent;
        if (hasIcon) {
          const imgAttrs = iconUrl ? 'src="' + esc(iconUrl) + '"' : 'data-domain="' + esc(iconDomain) + '" data-letter="' + esc(letter) + '" data-color="' + esc(bgColor) + '"';
          icoContent = '<img data-fallback ' + imgAttrs + ' alt="" referrerpolicy="no-referrer">';
        } else icoContent = '<span>' + esc(letter) + '</span>';

        const allLinks = getItemLinks(it);
        const primaryUrl = allLinks[0] ? allLinks[0].url : '';
        const noLink = !primaryUrl;
        const multiLinks = SETTINGS.enableMultiLinks && allLinks.length > 1;
        let cardHref, cardAttrs;
        if (multiLinks) { cardHref = 'javascript:void(0)'; cardAttrs = 'data-multi="true" role="button" tabindex="0" aria-haspopup="menu" '; }
        else if (noLink) { cardHref = 'javascript:void(0)'; cardAttrs = 'data-disabled="true" aria-disabled="true" tabindex="0" '; }
        else { cardHref = esc(primaryUrl); cardAttrs = 'target="' + cardTarget + '" ' + (cardRel ? 'rel="' + cardRel + '" ' : ''); }

        return '<a class="nav-card' + (hasDesc ? ' has-desc' : '') + '" href="' + cardHref + '" ' + cardAttrs +
          'data-cat="' + esc(currentCat.id) + '" data-group="' + esc(group.id) + '" data-idx="' + o.i + '">' +
          '<span class="' + icoClass + '" style="' + icoStyle + '">' + icoContent + '</span>' +
          '<span class="nav-info"><span class="nav-name">' + highlight(name, q) + '</span>' +
          (hasDesc ? '<span class="nav-desc">' + highlight(desc, q) + '</span>' : '') + '</span>' +
          (hasDesc ? '<span class="nav-info-btn" role="button" tabindex="-1" aria-label="查看完整简介">i</span>' : '') +
          '</a>';
      }).join('');

      html += '<div class="nav-group" data-group-id="' + esc(group.id) + '"><h2 class="group-title">' + esc(group.title || '') + '<span class="group-count">' + filtered.length + '</span></h2><div class="nav-grid">' + cards + '</div></div>';
    });

    navGroupsEl.innerHTML = html;

    const showEmptyState = shown === 0;
    navEmptyEl.hidden = !showEmptyState;
    if (showEmptyState) {
      let steamIdBtn = '';
      if (/^\d+$/.test(q)) {
        steamIdBtn = `<button class="ext-btn" onclick="window.open('https://steamcommunity.com/sharedfiles/filedetails/?id=' + encodeURIComponent('${esc(q)}'), '_blank')">Steam 搜创意工坊</button>`;
      }
      navEmptyEl.innerHTML = `<div class="external-search">
        <p>没有找到匹配的站点，去搜索引擎看看？</p>
        <div class="ext-search-btns">
          <button class="ext-btn" onclick="window.open('https://www.google.com/search?q=' + encodeURIComponent('${esc(q)}'), '_blank')">Google</button>
          <button class="ext-btn" onclick="window.open('https://duckduckgo.com/?q=' + encodeURIComponent('${esc(q)}'), '_blank')">DuckDuckGo</button>
          <button class="ext-btn" onclick="window.open('https://search.brave.com/search?q=' + encodeURIComponent('${esc(q)}'), '_blank')">Brave</button>
          <button class="ext-btn" onclick="window.open('https://www.startpage.com/sp/search?query=' + encodeURIComponent('${esc(q)}'), '_blank')">Startpage</button>
        </div>
        <div class="ext-search-btns">
          <button class="ext-btn" onclick="window.open('https://github.com/search?q=' + encodeURIComponent('${esc(q)}') + '&type=repositories', '_blank')">GitHub 搜项目</button>
          <button class="ext-btn" onclick="window.open('https://store.steampowered.com/search/?term=' + encodeURIComponent('${esc(q)}'), '_blank')">Steam 搜游戏</button>
          ${steamIdBtn}
        </div>
        <p style="margin-top:16px;font-size:12px;color:var(--text-mute);">或 <button id="emptyClearBtn" type="button" style="background:none;border:none;padding:0;color:var(--accent);text-decoration:underline;cursor:pointer;font-family:inherit;font-size:inherit;">清空关键词</button> 重新查找</p></div>`;
      const btn = document.getElementById('emptyClearBtn');
      if (btn) btn.addEventListener('click', () => {
        searchEl.value = ''; navKeyword = ''; groupNavEl.hidden = false;
        renderCards();
        if (!IS_TOUCH) searchEl.focus();
      });
    }

    navGroupsEl.classList.remove('fade-in-content');
    void navGroupsEl.offsetWidth;
    navGroupsEl.classList.add('fade-in-content');
    guardImgs(navGroupsEl);
    observeImages(navGroupsEl);
    bindNavTips();
    bindFontsReadyMeasure();
  }

  function renderNav() {
    renderCatNav(); renderGroupNav(); renderCards();
    setTimeout(updateActiveSubTab, 100);
  }

  function renderFriends() {
    if (!friendsSectionEl || !friendsGridEl) return;
    if (!SETTINGS.showFriends) { friendsSectionEl.hidden = true; return; }
    const visible = (FRIENDS || []).filter(f => f && f.hidden !== true);
    if (!visible.length) { friendsSectionEl.hidden = true; friendsGridEl.innerHTML = ''; return; }
    friendsSectionEl.hidden = false;
    friendsGridEl.innerHTML = visible.map(f => {
      const name = f.name || '', letter = f.letter || (name ? name.charAt(0).toUpperCase() : '友');
      let colorHash = 0;
      for (let i = 0; i < name.length; i++) colorHash += name.charCodeAt(i);
      const bgColor = f.color || AUTO_COLORS[colorHash % AUTO_COLORS.length];
      let iconUrl = f.icon, iconDomain = '';
      if (!iconUrl && f.url && f.url !== '#' && f.url !== 'javascript:void(0)') {
        try { iconDomain = new URL(f.url).hostname; } catch (e) {}
      }
      const hasIcon = !!iconUrl || !!iconDomain;
      const icoStyle = hasIcon ? '' : 'background:' + esc(bgColor);
      let icoContent;
      if (hasIcon) {
        const imgAttrs = iconUrl ? 'src="' + esc(iconUrl) + '"' : 'data-domain="' + esc(iconDomain) + '" data-letter="' + esc(letter) + '" data-color="' + esc(bgColor) + '"';
        icoContent = '<img data-fallback ' + imgAttrs + ' alt="" referrerpolicy="no-referrer">';
      } else icoContent = '<span>' + esc(letter) + '</span>';
      return '<a class="friend-card" href="' + esc(f.url || '#') + '" target="_blank" rel="noopener" title="' + esc(name) + '"><span class="friend-ico" style="' + icoStyle + '">' + icoContent + '</span><span class="friend-name">' + esc(name) + '</span></a>';
    }).join('');
    guardImgs(friendsGridEl);
    observeImages(friendsGridEl);
  }

  const BAR_INTERVAL = 7000;
  let barIndex = 0, barTimer = null, barPaused = false;
  const pinnedNotices = () => NOTICES.filter(n => n.pinned);
  const stopBarTimer = () => { if (barTimer) { clearInterval(barTimer); barTimer = null; } };

  function startBarTimer() {
    stopBarTimer();
    const pinned = pinnedNotices();
    if (pinned.length < 2) return;
    barTimer = setInterval(() => {
      if (barPaused) return;
      barIndex = (barIndex + 1) % pinned.length;
      renderNoticeBar(false);
    }, BAR_INTERVAL);
  }

  function renderNoticeBar(restartTimer) {
    if (!SETTINGS.noticeBar) {
      noticeBar.hidden = true; barPaused = false; stopBarTimer(); updateNoticeBarH(); return;
    }
    const pinned = pinnedNotices();
    if (!pinned.length) {
      noticeBar.hidden = true; barPaused = false; stopBarTimer(); updateNoticeBarH(); return;
    }
    if (barIndex >= pinned.length) barIndex = 0;
    const n = pinned[barIndex];
    noticeBar.hidden = false;
    barTag.textContent = n.tag || '';
    barTag.className = ('bar-tag ' + (n.tagClass || '')).trim();
    barText.textContent = n.title || '';
    barText.title = n.title || '';
    barText.onclick = () => { if (n.noModal && n.links && n.links.length) openExternal(n.links[0].url); else openModal(n); };

    if (pinned.length > 1) {
      if (barDots.children.length !== pinned.length) {
        barDots.innerHTML = '';
        pinned.forEach((_, i) => {
          const d = document.createElement('button');
          d.type = 'button';
          d.className = 'bar-dot-item';
          d.setAttribute('aria-label', '第 ' + (i + 1) + ' 条置顶公告');
          d.addEventListener('click', () => { barIndex = i; renderNoticeBar(); });
          barDots.appendChild(d);
        });
      }
      Array.from(barDots.children).forEach((dot, i) => dot.classList.toggle('active', i === barIndex));
    } else barDots.innerHTML = '';

    updateNoticeBarH();
    if (restartTimer !== false) startBarTimer();
  }

  noticeBar.addEventListener('mouseenter', () => { barPaused = true; });
  noticeBar.addEventListener('mouseleave', () => { barPaused = false; });

  function renderNoticeTabs() {
    if (TAGS.indexOf(noticeFilter) === -1) noticeFilter = '全部';
    noticeTabsEl.hidden = !!noticeKeyword.trim();
    noticeTabsEl.innerHTML = '';
    TAGS.forEach(tag => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'notice-tab' + (tag === noticeFilter ? ' active' : '');
      btn.dataset.tag = tag;
      btn.textContent = tag;
      btn.addEventListener('click', () => { noticeFilter = tag; renderNoticeTabs(); renderNotices(); });
      noticeTabsEl.appendChild(btn);
    });
  }

  function updateNoticeTabsActive() {
    noticeTabsEl.querySelectorAll('.notice-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tag === noticeFilter));
  }

  function renderNotices() {
    const q = noticeKeyword.trim().toLowerCase();
    let list = NOTICES.filter(n => {
      const okTag = noticeFilter === '全部' || n.tag === noticeFilter;
      return okTag && (!q || (n._searchText || '').indexOf(q) !== -1);
    }).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    noticeListEl.innerHTML = '';
    if (!list.length) {
      noticeEmptyEl.textContent = '没有匹配的公告';
      noticeEmptyEl.hidden = false;
      return;
    }
    noticeEmptyEl.hidden = true;

    list.forEach(n => {
      const li = document.createElement('li');
      li.className = 'notice';
      li.tabIndex = 0;
      li.setAttribute('role', 'button');
      const body = document.createElement('div');
      body.className = 'notice-body';
      const meta = document.createElement('div');
      meta.className = 'notice-meta';
      if (n.pinned) {
        const pin = document.createElement('span');
        pin.className = 'pin';
        pin.textContent = '置顶';
        meta.appendChild(pin);
      }
      const tagEl = document.createElement('span');
      tagEl.className = ('tag ' + (n.tagClass || '')).trim();
      tagEl.textContent = n.tag || '';
      meta.appendChild(tagEl);
      const h3 = document.createElement('h3');
      h3.innerHTML = highlight(n.title || '', q);
      const p = document.createElement('p');
      p.innerHTML = highlight(n.excerpt || '', q);
      body.appendChild(meta); body.appendChild(h3); body.appendChild(p);
      li.appendChild(body);
      const activate = () => { if (n.noModal && n.links && n.links.length) openExternal(n.links[0].url); else openModal(n); };
      li.addEventListener('click', activate);
      li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
      noticeListEl.appendChild(li);
    });

    noticeListEl.classList.remove('fade-in-content');
    void noticeListEl.offsetWidth;
    noticeListEl.classList.add('fade-in-content');
  }

  function renderStructuredBody(sections) {
    const frag = document.createDocumentFragment();
    sections.forEach(sec => {
      const wrap = document.createElement('div');
      wrap.className = 'section';
      if (sec.title) {
        const h = document.createElement('h3');
        h.className = 'section-title';
        h.textContent = sec.title;
        wrap.appendChild(h);
      }
      if (sec.type === 'image') {
        const fig = document.createElement('figure');
        fig.className = 'section-figure';
        const src = sec.src || '';
        if (src) {
          const a = document.createElement('a');
          a.href = sec.href || src;
          a.target = '_blank';
          a.rel = 'noopener';
          a.title = sec.alt || sec.caption || '点击查看大图';
          const img = document.createElement('img');
          img.src = src;
          img.alt = sec.alt || sec.caption || '';
          img.loading = 'lazy';
          if (sec.maxWidth) img.style.maxWidth = sec.maxWidth + 'px';
          img.addEventListener('error', () => {
            const ph = document.createElement('div');
            ph.className = 'section-img-fail';
            ph.textContent = '图片加载失败';
            a.replaceWith(ph);
          }, { once: true });
          a.addEventListener('click', e => { e.preventDefault(); openLightbox(src, img.alt); });
          a.appendChild(img);
          fig.appendChild(a);
        }
        if (sec.caption) {
          const cap = document.createElement('figcaption');
          cap.textContent = sec.caption;
          fig.appendChild(cap);
        }
        wrap.appendChild(fig);
      } else if (sec.type === 'kv') {
        const ul = document.createElement('ul');
        ul.className = 'kv-list';
        (sec.items || []).forEach(it => {
          const li = document.createElement('li');
          li.className = 'kv-item';
          const label = document.createElement('span');
          label.className = 'kv-label';
          label.textContent = it.label;
          const value = document.createElement('span');
          value.className = 'kv-value';
          if (it.valueHtml) value.innerHTML = it.valueHtml;
          else value.innerHTML = highlight(it.value || '', '');
          if (it.note) {
            const note = document.createElement('span');
            note.className = 'kv-note';
            note.textContent = it.note;
            value.appendChild(note);
          }
          li.appendChild(label); li.appendChild(value); ul.appendChild(li);
        });
        wrap.appendChild(ul);
      } else if (sec.type === 'num') {
        const ol = document.createElement('ol');
        ol.className = 'num-list';
        (sec.items || []).forEach(text => {
          const li = document.createElement('li');
          li.innerHTML = text;
          ol.appendChild(li);
        });
        wrap.appendChild(ol);
      } else if (sec.type === 'text') {
        const p = document.createElement('p');
        p.className = 'section-text';
        p.innerHTML = sec.text || '';
        wrap.appendChild(p);
      }
      frag.appendChild(wrap);
    });
    return frag;
  }

  function openModal(n) {
    modalTag.textContent = n.tag || '';
    modalTag.className = ('tag ' + (n.tagClass || '')).trim();
    modalTitle.textContent = n.title || '';
    modalBody.innerHTML = '';
    if (n.sections && n.sections.length) {
      modalBody.classList.remove('plain');
      modalBody.appendChild(renderStructuredBody(n.sections));
    } else {
      modalBody.classList.add('plain');
      modalBody.textContent = n.content || n.excerpt || '';
    }
    modalBody.scrollTop = 0;
    guardImgs(modalBody);
    modalActions.innerHTML = '';
    (n.links || []).forEach((link, i) => {
      const a = document.createElement('a');
      a.className = 'modal-btn' + (i > 0 ? ' ghost' : '');
      a.href = link.url || '#';
      a.textContent = link.text;
      if (link.url && link.url !== '#') { a.target = '_blank'; a.rel = 'noopener'; }
      modalActions.appendChild(a);
    });
    modalActions.hidden = modalActions.children.length === 0;
    lastFocused = document.activeElement;
    modalMask.classList.add('show');
    modalMask.setAttribute('aria-hidden', 'false');
    lockBodyScroll();
    modalClose.focus();
  }

  function closeModal() {
    modalMask.classList.remove('show');
    modalMask.setAttribute('aria-hidden', 'true');
    if (!lightbox || !lightbox.classList.contains('show')) unlockBodyScroll();
    if (lastFocused && document.body.contains(lastFocused)) lastFocused.focus();
  }

  modalClose.addEventListener('click', closeModal);
  modalMask.addEventListener('click', e => { if (e.target === modalMask) closeModal(); });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (inlineDropdown) { closeInlineDropdown(); return; }
    if (lightbox && lightbox.classList.contains('show')) { closeLightbox(); return; }
    if (settingsMask && settingsMask.classList.contains('show')) { closeSettings(); return; }
    if (modalMask.classList.contains('show')) closeModal();
  });

  let navSearchTimer = null;
  searchEl.addEventListener('input', e => {
    clearTimeout(navSearchTimer);
    const value = e.target.value;
    navSearchTimer = setTimeout(() => {
      navKeyword = value;
      if (!NAV_CATEGORIES.length) return;
      const isSearching = !!navKeyword.trim();
      groupNavEl.hidden = isSearching;
      if (isSearching) {
        activeGroupId = 'all';
        catNavEl.querySelectorAll('.sub-tab').forEach(st => st.classList.remove('active'));
      }
      updateGroupNavActive();
      renderCards();
      if (isSearching) scrollToResultsTop();
    }, 120);
  });

  if (noticeSearchEl) {
    let noticeSearchTimer = null;
    noticeSearchEl.addEventListener('input', e => {
      clearTimeout(noticeSearchTimer);
      const value = e.target.value;
      noticeSearchTimer = setTimeout(() => {
        noticeKeyword = value;
        if (!NOTICES.length) return;
        const isSearching = !!noticeKeyword.trim();
        noticeTabsEl.hidden = isSearching;
        if (isSearching) noticeFilter = '全部';
        updateNoticeTabsActive();
        renderNotices();
      }, 120);
    });
  }

  (function initShortcuts() {
    document.addEventListener('keydown', e => {
      const active = document.activeElement;
      const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);

      if (!isInput && (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'))) {
        if (document.body.classList.contains('modal-open')) return;
        e.preventDefault();
        if (navSearchEl && !navSearchEl.hidden) { searchEl.focus(); searchEl.select(); }
        return;
      }

      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !isInput && !modalMask.classList.contains('show')) {
        const cards = Array.from(navGroupsEl.querySelectorAll('.nav-card:not([data-disabled="true"])'));
        if (!cards.length) return;
        e.preventDefault();
        const currentIdx = cards.indexOf(document.activeElement);
        let nextIdx = 0;
        if (e.key === 'ArrowDown') nextIdx = currentIdx === -1 || currentIdx === cards.length - 1 ? 0 : currentIdx + 1;
        else nextIdx = currentIdx === -1 || currentIdx === 0 ? cards.length - 1 : currentIdx - 1;
        cards[nextIdx].focus();
        cards[nextIdx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  })();

  function isFollowSystem() {
    try { const v = localStorage.getItem('site.theme'); return !v || v === 'system'; }
    catch (e) { return true; }
  }

  function setFollowSystem(on) {
    if (on) {
      try { localStorage.setItem('site.theme', 'system'); } catch (e) {}
      document.documentElement.dataset.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      try { localStorage.setItem('site.theme', document.documentElement.dataset.theme || 'light'); } catch (e) {}
    }
  }

  themeBtn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('site.theme', next); } catch (e) {}
    syncSettingsUI();
  });

  (function initSystemThemeWatcher() {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = e => { if (isFollowSystem()) document.documentElement.dataset.theme = e.matches ? 'dark' : 'light'; };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  })();

  const mqLayout = window.matchMedia('(max-width: 1024px)');
  const handleLayoutChange = e => { renderCards(); if (!e.matches) setTimeout(updateActiveSubTab, 150); };
  if (mqLayout.addEventListener) mqLayout.addEventListener('change', handleLayoutChange);
  else if (mqLayout.addListener) mqLayout.addListener(handleLayoutChange);

  let toastTimer = null;
  function showToast(msg, isError) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.toggle('error', !!isError);
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  function exportSettings() {
    let themeVal = 'system';
    try { themeVal = localStorage.getItem('site.theme') || 'system'; } catch (e) {}
    
    // 不再剔除 GH 项，直接导出所有
    const data = { version: 1, exportedAt: new Date().toISOString(), theme: themeVal, settings: SETTINGS };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const d = new Date();
    const pad = n => n < 10 ? '0' + n : '' + n;
    const dateStr = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes());
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kawang-settings-' + dateStr + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('配置已导出');
  }

  function importSettingsFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data || typeof data !== 'object') throw new Error('文件内容不是有效的配置对象');
        const incoming = (data.settings && typeof data.settings === 'object') ? data.settings : data;
        const incomingTheme = typeof data.theme === 'string' ? data.theme : null;
        
        const merged = Object.assign({}, DEFAULT_SETTINGS);
        if (typeof incoming.themeColor === 'string' && THEME_COLORS.some(c => c.id === incoming.themeColor)) merged.themeColor = incoming.themeColor;
        if (typeof incoming.noticeBar === 'boolean') merged.noticeBar = incoming.noticeBar;
        if (typeof incoming.showFriends === 'boolean') merged.showFriends = incoming.showFriends;
        if (typeof incoming.enableMultiLinks === 'boolean') merged.enableMultiLinks = incoming.enableMultiLinks;
        if (typeof incoming.openInNewTab === 'boolean') merged.openInNewTab = incoming.openInNewTab;
        if (typeof incoming.defaultCategory === 'string') merged.defaultCategory = incoming.defaultCategory;
        
        SETTINGS = merged;
        saveSettings();
        
        if (incomingTheme === 'system') {
          try { localStorage.setItem('site.theme', 'system'); } catch (err) {}
          document.documentElement.dataset.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } else if (incomingTheme === 'light' || incomingTheme === 'dark') {
          try { localStorage.setItem('site.theme', incomingTheme); } catch (err) {}
          document.documentElement.dataset.theme = incomingTheme;
        }
        applySettings(); syncSettingsUI();
        showToast('配置已导入');
      } catch (err) {
        console.error(err);
        showToast('导入失败：' + (err.message || '文件格式不正确'), true);
      }
    };
    reader.onerror = () => showToast('导入失败：读取文件出错', true);
    reader.readAsText(file);
  }

  function applySettings() {
    document.documentElement.dataset.themeColor = SETTINGS.themeColor || 'orange';
    if (NOTICES.length) renderNoticeBar();
    else if (!SETTINGS.noticeBar) { noticeBar.hidden = true; stopBarTimer(); updateNoticeBarH(); }
    if (NAV_CATEGORIES.length) renderCards();
    renderFriends();
  }

  function syncSettingsUI() {
    if (themeColorsEl) {
      themeColorsEl.innerHTML = '';
      THEME_COLORS.forEach(c => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'color-dot' + (c.id === SETTINGS.themeColor ? ' active' : '');
        b.dataset.color = c.id;
        b.title = c.name;
        b.style.setProperty('--dot-bg', c.dot);
        b.addEventListener('click', () => { SETTINGS.themeColor = c.id; saveSettings(); applySettings(); syncSettingsUI(); });
        themeColorsEl.appendChild(b);
      });
    }

    if (setFollowSystemEl) setFollowSystemEl.checked = isFollowSystem();
    if (setNoticeBarEl) setNoticeBarEl.checked = !!SETTINGS.noticeBar;
    if (setShowFriendsEl) setShowFriendsEl.checked = !!SETTINGS.showFriends;
    if (setEnableMultiLinksEl) setEnableMultiLinksEl.checked = !!SETTINGS.enableMultiLinks;

    if (setDefaultCategoryEl) {
      const current = SETTINGS.defaultCategory || '';
      let effective = '';
      if (NAV_CATEGORIES.length) {
        let found = NAV_CATEGORIES.find(c => c.id === current);
        if (!found && current) { SETTINGS.defaultCategory = ''; saveSettings(); }
        if (!found) found = NAV_CATEGORIES.find(c => c.default) || NAV_CATEGORIES[0];
        effective = found ? found.id : '';
        let html = '';
        NAV_CATEGORIES.forEach(c => { html += '<option value="' + esc(c.id) + '">' + esc(c.title) + '</option>'; });
        setDefaultCategoryEl.innerHTML = html;
      } else setDefaultCategoryEl.innerHTML = '<option value="">加载中…</option>';
      setDefaultCategoryEl.value = effective;
    }

    if (setOpenModeEl) {
      const mode = SETTINGS.openInNewTab ? 'new' : 'self';
      setOpenModeEl.querySelectorAll('button').forEach(btn => btn.classList.toggle('active', btn.dataset.value === mode));
    }
  }

  function initSettings() {
    if (settingsBtn && settingsMask) {
      settingsBtn.addEventListener('click', () => {
        if (settingsMask.classList.contains('show')) closeSettings();
        else openSettings();
      });
    }
    if (settingsClose) settingsClose.addEventListener('click', closeSettings);
    if (settingsMask) settingsMask.addEventListener('click', e => { if (e.target === settingsMask) closeSettings(); });

    if (setFollowSystemEl) setFollowSystemEl.addEventListener('change', () => { setFollowSystem(!!setFollowSystemEl.checked); syncSettingsUI(); });
    if (setNoticeBarEl) setNoticeBarEl.addEventListener('change', () => { SETTINGS.noticeBar = !!setNoticeBarEl.checked; saveSettings(); applySettings(); });
    if (setShowFriendsEl) setShowFriendsEl.addEventListener('change', () => { SETTINGS.showFriends = !!setShowFriendsEl.checked; saveSettings(); renderFriends(); });
    if (setEnableMultiLinksEl) setEnableMultiLinksEl.addEventListener('change', () => { SETTINGS.enableMultiLinks = !!setEnableMultiLinksEl.checked; saveSettings(); applySettings(); });
    if (setDefaultCategoryEl) setDefaultCategoryEl.addEventListener('change', () => { SETTINGS.defaultCategory = setDefaultCategoryEl.value; saveSettings(); });

    if (setOpenModeEl) setOpenModeEl.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
      SETTINGS.openInNewTab = btn.dataset.value === 'new';
      saveSettings(); applySettings(); syncSettingsUI();
    }));

    if (settingsExportEl) settingsExportEl.addEventListener('click', exportSettings);

    if (settingsImportEl && settingsFileEl) {
      settingsImportEl.addEventListener('click', () => { settingsFileEl.value = ''; settingsFileEl.click(); });
      settingsFileEl.addEventListener('change', () => {
        const file = settingsFileEl.files && settingsFileEl.files[0];
        if (file) importSettingsFromFile(file);
      });
    }

    if (settingsResetEl) settingsResetEl.addEventListener('click', () => {
      const { themeColor } = SETTINGS;
      SETTINGS = Object.assign({}, DEFAULT_SETTINGS, { themeColor });
      saveSettings();
      setFollowSystem(true);
      applySettings(); syncSettingsUI();
      renderCatNav(); renderGroupNav();
      showToast('已恢复默认设置');
    });
  }

  function openSettings() {
    if (!settingsMask) return;
    syncSettingsUI();
    settingsMask.classList.add('show');
    settingsMask.setAttribute('aria-hidden', 'false');
    lockBodyScroll();
  }

  function closeSettings() {
    if (!settingsMask) return;
    settingsMask.classList.remove('show');
    settingsMask.setAttribute('aria-hidden', 'true');
    if (!modalMask.classList.contains('show') && !lightbox.classList.contains('show')) unlockBodyScroll();
  }

  function updateBackTop() { backTopBtn.classList.toggle('show', window.scrollY > 400); }
  function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
  backTopBtn.addEventListener('click', scrollToTop);

  (function initBrandHome() {
    const brand = document.querySelector('.brand');
    if (!brand) return;
    brand.addEventListener('click', e => { if (window.scrollY <= 8) return; e.preventDefault(); scrollToTop(); });
  })();

  function bindQRCodeFallback() {
    const qrEl = document.getElementById('qrCode');
    if (!qrEl) return;
    const img = qrEl.querySelector('img');
    if (!img) { qrEl.innerHTML = makeQRCode(20241018); return; }
    const fallback = () => {
      qrEl.removeAttribute('href'); qrEl.removeAttribute('target'); qrEl.removeAttribute('rel');
      qrEl.style.cursor = 'default';
      qrEl.innerHTML = makeQRCode(20241018);
    };
    qrEl.addEventListener('click', e => {
      if (!img.isConnected) return;
      e.preventDefault();
      openLightbox(img.src, img.alt || '公众号二维码');
    });
    if (img.complete && img.naturalWidth === 0) { fallback(); return; }
    img.addEventListener('error', fallback, { once: true });
  }

  function initGreeting() {
    const el = document.getElementById('greetingText');
    if (!el) return;
    const list = ['夜深了，注意身体早点休息 🌛', '早上好，新的一天开始了 ☀️', '上午好，今天也要加油 💪', '中午好，记得午休哦 ☕', '下午好，喝杯水吧 🍵', '晚上好，辛苦一天了 🌙'];
    const update = () => {
      const h = new Date().getHours();
      el.textContent = list[h < 5 ? 0 : h < 9 ? 1 : h < 12 ? 2 : h < 14 ? 3 : h < 18 ? 4 : 5];
    };
    update();
    setInterval(update, 600000);
  }

  async function loadData() {
    try {
      const navRes = await fetchWithTimeout(NAV_URL);
      if (!navRes.ok) throw new Error('导航 JSON 加载失败：' + navRes.status);
      const navData = await navRes.json();
      if (Array.isArray(navData)) NAV_CATEGORIES = [{ id: 'all', title: '全部导航', default: true, groups: navData }];
      else if (navData && Array.isArray(navData.categories)) NAV_CATEGORIES = navData.categories;
      else throw new Error('导航 JSON 结构不正确');

      let targetCatId = '';
      if (SETTINGS.defaultCategory) {
        const found = NAV_CATEGORIES.find(c => c.id === SETTINGS.defaultCategory);
        if (found) targetCatId = found.id;
      }
      if (!targetCatId) {
        const def = NAV_CATEGORIES.find(c => c.default) || NAV_CATEGORIES[0];
        targetCatId = def ? def.id : '';
      }
      activeCategoryId = targetCatId;
      activeGroupId = 'all';
      if (catFootEl) catFootEl.hidden = false;
      renderNav();
    } catch (err) {
      console.error(err);
      if (navSearchEl) navSearchEl.hidden = true;
      if (catFootEl) catFootEl.hidden = true;
      catNavEl.innerHTML = ''; groupNavEl.innerHTML = '';
      navGroupsEl.innerHTML = '<div class="empty empty-lg">导航数据加载失败</div>';
    }

    try {
      const noticeRes = await fetchWithTimeout(NOTICE_URL);
      if (!noticeRes.ok) throw new Error('公告 JSON 加载失败：' + noticeRes.status);
      const noticeData = await noticeRes.json();
      NOTICES = Array.isArray(noticeData) ? noticeData : [];
      NOTICES.forEach(n => {
        n._searchText = ((n.title || '') + ' ' + (n.excerpt || '') + ' ' + (n.tag || '') + ' ' + (n.content || '') + ' ' + JSON.stringify(n.sections || '')).toLowerCase();
      });
      TAGS = ['全部', ...new Set(NOTICES.map(n => n.tag).filter(Boolean))];
      renderNoticeTabs(); renderNotices(); renderNoticeBar();
    } catch (err) {
      console.error(err);
      NOTICES = [];
      noticeListEl.innerHTML = '';
      noticeEmptyEl.textContent = '公告数据加载失败';
      noticeEmptyEl.hidden = false;
      noticeBar.hidden = true;
      stopBarTimer();
      updateNoticeBarH();
    }

    try {
      const fRes = await fetchWithTimeout(FRIENDS_URL, 6000);
      if (fRes.ok) {
        const data = await fRes.json();
        FRIENDS = Array.isArray(data) ? data : [];
      }
    } catch (e) { FRIENDS = []; }
    renderFriends();
    syncSettingsUI();
    updateBackTop();
  }

  initImgObserver();
  guardImgs(document);
  bindQRCodeFallback();
  updateBackTop();
  initCatRandom();
  initSettings();
  applySettings();
  renderNavSkeleton();
  renderNoticeSkeleton();
  initGreeting();
  loadData();
})();