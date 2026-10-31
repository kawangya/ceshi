/* =========================================================
   卡王的导航 - 主脚本 (清理版)
   ========================================================= */

(function () {
  'use strict';

  const NAV_URL = './data/nav.json';
  const NOTICE_URL = './data/notices.json';
  const FRIENDS_URL = './data/friends.json';

  const SETTINGS_KEY = 'site.settings';
  const DEFAULT_SETTINGS = {
    themeColor: 'orange',
    noticeBar: true,
    showFriends: true,
    enableMultiLinks: false,
    defaultCategory: '',
    openInNewTab: true,
    ghOwner: '',
    ghRepo: '',
    ghPath: 'data/nav.json',
    ghToken: '',
    editMode: false
  };

  const THEME_COLORS = [
    { id: 'orange', name: '暖阳橘 (默认)', dot: '#C07B57' },
    { id: 'default', name: '海蓝', dot: '#3F729B' },
    { id: 'green', name: '护眼绿', dot: '#5C8D76' },
    { id: 'purple', name: '极客紫', dot: '#7E6B8F' },
    { id: 'pink', name: '樱花粉', dot: '#B26A76' },
    { id: 'cyan', name: '抹茶青', dot: '#3E8A7B' },
    { id: 'gray', name: '晨雾灰', dot: '#595959' },
    { id: 'indigo', name: '石墨蓝', dot: '#465E7B' }
  ];
  let SETTINGS = loadSettings();
  let editTarget = { catId: '', groupId: '', itemIndex: -1 };
  let floatingSaveBtn = null;

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw)) : Object.assign({}, DEFAULT_SETTINGS);
    } catch (e) {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(SETTINGS));
    } catch (e) {
      console.warn('配置保存失败，可能处于隐私模式');
    }
  }

  (function autoDetectGitHub() {
    const host = window.location.hostname;
    const path = window.location.pathname;
    if (host.endsWith('.github.io')) {
      const owner = host.split('.')[0];
      const repoSegments = path.split('/').filter(Boolean);
      const repo = repoSegments.length > 0 ? repoSegments[0] : host;
      if (owner && repo) {
        if (SETTINGS.ghOwner !== owner || SETTINGS.ghRepo !== repo) {
          SETTINGS.ghOwner = owner;
          SETTINGS.ghRepo = repo;
          saveSettings();
        }
      }
    }
  })();

  let NAV_CATEGORIES = [];
  let NOTICES = [];
  let FRIENDS = [];
  let TAGS = ['全部'];

  let navKeyword = '';
  let noticeKeyword = '';
  let noticeFilter = '全部';
  let activeCategoryId = '';
  let activeGroupId = 'all';
  let lastFocused = null;

  let isAutoScrolling = false;
  let autoScrollTimer = null;
  let scrollSpyTimer = null;

  let IS_TOUCH = window.matchMedia('(hover: none)').matches;
  (function watchHoverCapability() {
    const mq = window.matchMedia('(hover: none)');
    function onChange(e) {
      IS_TOUCH = e.matches;
      hideTip();
    }
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  })();

  /* ============ 元素 ============ */
  const navGroupsEl   = document.getElementById('navGroups');
  const navEmptyEl    = document.getElementById('navEmpty');
  const navSearchEl   = document.getElementById('navSearch');
  const catNavEl      = document.getElementById('catNav');
  const catFootEl     = document.getElementById('catFoot');
  const catRandomEl   = document.getElementById('catRandom');
  const groupNavEl    = document.getElementById('groupNav');
  const navTipEl      = document.getElementById('navTip');

  const friendsSectionEl = document.getElementById('friendsSection');
  const friendsGridEl    = document.getElementById('friendsGrid');

  const noticeBar     = document.getElementById('noticeBar');
  const barTag        = document.getElementById('barTag');
  const barText       = document.getElementById('barText');
  const barDots       = document.getElementById('barDots');

  const noticeListEl   = document.getElementById('noticeList');
  const noticeEmptyEl  = document.getElementById('noticeEmpty');
  const noticeTabsEl   = document.getElementById('noticeTabs');
  const noticeSearchEl = document.getElementById('noticeSearch');

  const searchEl      = document.getElementById('search');
  const themeBtn      = document.getElementById('themeBtn');
  const settingsBtn   = document.getElementById('settingsBtn');
  const backTopBtn    = document.getElementById('backTop');

  const modalMask     = document.getElementById('modalMask');
  const modalTag      = document.getElementById('modalTag');
  const modalTitle    = document.getElementById('modalTitle');
  const modalBody     = document.getElementById('modalBody');
  const modalActions  = document.getElementById('modalActions');
  const modalClose    = document.getElementById('modalClose');

  const lightbox      = document.getElementById('lightbox');
  const lightboxImg   = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxOpen  = document.getElementById('lightboxOpen');
  const lightboxZoom  = document.getElementById('lightboxZoom');

  const settingsMask    = document.getElementById('settingsMask');
  const settingsClose   = document.getElementById('settingsClose');
  const themeColorsEl   = document.getElementById('themeColors');
  const setFollowSystemEl = document.getElementById('setFollowSystem');
  const setNoticeBarEl  = document.getElementById('setNoticeBar');
  const setShowFriendsEl = document.getElementById('setShowFriends');
  const setEnableMultiLinksEl = document.getElementById('setEnableMultiLinks');
  const setDefaultCategoryEl = document.getElementById('setDefaultCategory');
  const setOpenModeEl   = document.getElementById('setOpenMode');
  const settingsResetEl = document.getElementById('settingsReset');
  const settingsExportEl = document.getElementById('settingsExport');
  const settingsImportEl = document.getElementById('settingsImport');
  const settingsFileEl   = document.getElementById('settingsFile');
  const toastEl          = document.getElementById('toast');

  const ghRepoEl = document.getElementById('ghRepo');
  const ghTokenEl = document.getElementById('ghToken');
  const setEditModeEl = document.getElementById('setEditMode');

  const editModalMask  = document.getElementById('editModalMask');
  const editModalTitle = document.getElementById('editModalTitle');
  const editModalClose = document.getElementById('editModalClose');
  const editNameEl     = document.getElementById('editName');
  const editUrlEl      = document.getElementById('editUrl');
  const editDescEl     = document.getElementById('editDesc');
  const editLetterEl   = document.getElementById('editLetter');
  const editColorEl    = document.getElementById('editColor');
  const editSaveBtn    = document.getElementById('editSaveBtn');

  const editLinksList  = document.getElementById('editLinksList');
  const editLinksAdd   = document.getElementById('editLinksAdd');

  /* ============ 工具 ============ */
  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

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
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, ms);
    return fetch(url, { signal: controller.signal }).then(function (res) {
      clearTimeout(timer);
      return res;
    }, function (err) {
      clearTimeout(timer);
      throw err;
    });
  }

  function guardImg(img) {
    if (!img) return;
    function fail() { img.style.display = 'none'; }
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
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = scrollbarWidth + 'px';
    }
  }

  function unlockBodyScroll() {
    document.body.classList.remove('modal-open');
    document.body.style.paddingRight = '';
  }

  /* ---------- 二维码占位 ---------- */
  function makeQRCode(seed) {
    const SIZE = 25;
    const finders = [[0, 0], [SIZE - 7, 0], [0, SIZE - 7]];
    function inFinder(x, y) {
      for (let i = 0; i < finders.length; i++) {
        const fx = finders[i][0], fy = finders[i][1];
        if (x >= fx && x < fx + 7 && y >= fy && y < fy + 7) return true;
      }
      return false;
    }
    let s = seed >>> 0;
    function rnd() {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    }
    let path = '';
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (inFinder(x, y)) continue;
        if (rnd() > 0.55) path += 'M' + x + ' ' + y + 'h1v1h-1z';
      }
    }
    let finderSvg = '';
    for (let i = 0; i < finders.length; i++) {
      const fx = finders[i][0], fy = finders[i][1];
      finderSvg += '<rect x="' + fx + '" y="' + fy + '" width="7" height="7"/>';
      finderSvg += '<rect x="' + (fx + 1) + '" y="' + (fy + 1) + '" width="5" height="5" fill="#fff"/>';
      finderSvg += '<rect x="' + (fx + 2) + '" y="' + (fy + 2) + '" width="3" height="3"/>';
    }
    return '<svg viewBox="-1 -1 ' + (SIZE + 2) + ' ' + (SIZE + 2) + '" ' +
           'xmlns="http://www.w3.org/2000/svg" fill="#2B2B2B" shape-rendering="crispEdges">' +
           '<path d="' + path + '"/>' + finderSvg + '</svg>';
  }

  /* ============ 图片灯箱 ============ */
  let lbScale = 1, lbTx = 0, lbTy = 0;
  let lbDragging = false, lbMoved = false;
  let lbStartX = 0, lbStartY = 0, lbStartTx = 0, lbStartTy = 0;
  let lbPinchDist = 0, lbPinchScale = 1;
  let lbLastDragEnd = 0;

  function applyLightboxTransform() {
    if (!lightboxImg) return;
    lightboxImg.style.transform =
      'translate(' + lbTx + 'px,' + lbTy + 'px) scale(' + lbScale + ')';
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
    lightbox.addEventListener('click', function (e) {
      if (Date.now() - lbLastDragEnd < 300) return;
      if (e.target === lightbox) closeLightbox();
    });

    lightbox.addEventListener('wheel', function (e) {
      if (!lightbox.classList.contains('show')) return;
      e.preventDefault();
      const rect = lightboxImg.getBoundingClientRect();
      const imgCx = rect.left + rect.width / 2;
      const imgCy = rect.top + rect.height / 2;
      const dx = e.clientX - imgCx;
      const dy = e.clientY - imgCy;
      const oldScale = lbScale;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      lbScale = Math.min(5, Math.max(0.5, lbScale * factor));
      const ratio = lbScale / oldScale;
      lbTx = dx - (dx - lbTx) * ratio;
      lbTy = dy - (dy - lbTy) * ratio;
      applyLightboxTransform();
    }, { passive: false });

    if (lightboxImg) {
      lightboxImg.addEventListener('dblclick', function (e) {
        e.stopPropagation();
        if (lbScale > 1.01) { resetLightboxTransform(); return; }
        const rect = lightboxImg.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        lbScale = 2; lbTx = dx - dx * 2; lbTy = dy - dy * 2;
        applyLightboxTransform();
      });

      lightboxImg.addEventListener('mousedown', function (e) {
        if (e.button !== 0 || lbScale <= 1.01) return;
        lbDragging = true; lbMoved = false;
        lbStartX = e.clientX; lbStartY = e.clientY;
        lbStartTx = lbTx; lbStartTy = lbTy;
        lightboxImg.classList.add('dragging');
        applyLightboxTransform();
        e.preventDefault();
      });

      lightboxImg.addEventListener('touchstart', function (e) {
        if (e.touches.length === 1 && lbScale > 1.01) {
          lbDragging = true; lbMoved = false;
          lbStartX = e.touches[0].clientX;
          lbStartY = e.touches[0].clientY;
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

      lightboxImg.addEventListener('touchmove', function (e) {
        if (lbDragging && e.touches.length === 1) {
          const dx = e.touches[0].clientX - lbStartX;
          const dy = e.touches[0].clientY - lbStartY;
          if (Math.abs(dx) + Math.abs(dy) > 3) lbMoved = true;
          lbTx = lbStartTx + dx;
          lbTy = lbStartTy + dy;
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

      lightboxImg.addEventListener('touchend', function (e) {
        if (e.touches.length === 0) {
          if (lbMoved) lbLastDragEnd = Date.now();
          lbDragging = false;
          lightboxImg.classList.remove('dragging');
          applyLightboxTransform();
        }
        if (e.touches.length < 2) lbPinchDist = 0;
      });
    }

    if (lightboxZoom) {
      lightboxZoom.addEventListener('click', function (e) {
        e.stopPropagation();
        resetLightboxTransform();
      });
    }
  }

  window.addEventListener('mousemove', function (e) {
    if (!lbDragging) return;
    const dx = e.clientX - lbStartX;
    const dy = e.clientY - lbStartY;
    if (Math.abs(dx) + Math.abs(dy) > 3) lbMoved = true;
    lbTx = lbStartTx + dx;
    lbTy = lbStartTy + dy;
    applyLightboxTransform();
  });

  window.addEventListener('mouseup', function () {
    if (!lbDragging) return;
    lbDragging = false;
    if (lbMoved) lbLastDragEnd = Date.now();
    if (lightboxImg) lightboxImg.classList.remove('dragging');
    applyLightboxTransform();
  });

  /* ============ 导航提示浮层 ============ */
  let tipCard = null;
  let tipAutoHideTimer = null;

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
    const gap = 8;
    const vw = window.innerWidth, vh = window.innerHeight;
    let top = rect.bottom + gap;
    let left = rect.left;
    if (left + tipRect.width > vw - 12) left = vw - tipRect.width - 12;
    if (left < 12) left = 12;
    if (top + tipRect.height > vh - 12 && rect.top - gap - tipRect.height >= 12) {
      top = rect.top - gap - tipRect.height;
    }
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
    navGroupsEl.querySelectorAll('.nav-card').forEach(function (card) {
      const descEl = card.querySelector('.nav-desc');
      if (!descEl) return;
      card.dataset.truncated =
        descEl.scrollWidth > descEl.clientWidth + 1 ? 'true' : 'false';
    });
  }

  let fontsReadyBound = false;
  function bindFontsReadyMeasure() {
    if (fontsReadyBound) return;
    fontsReadyBound = true;
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measureCardTruncation).catch(function () {});
    }
  }

  let measureResizeTimer = null;
  window.addEventListener('resize', function () {
    hideTip();
    closeInlineDropdown();
    clearTimeout(measureResizeTimer);
    measureResizeTimer = setTimeout(function () {
      measureCardTruncation();
      updateNoticeBarH();
    }, 150);
  }, { passive: true });

  function bindNavTips() {
    hideTip();
    measureCardTruncation();
  }

  document.addEventListener('click', function (e) {
    if (!navTipEl.classList.contains('show')) return;
    if (e.target.closest('.nav-card') || e.target === navTipEl) return;
    hideTip();
  }, true);

  navGroupsEl.addEventListener('mouseover', function (e) {
    if (IS_TOUCH) return;
    const card = e.target.closest('.nav-card');
    if (!card || card.dataset.truncated !== 'true') return;
    const descEl = card.querySelector('.nav-desc');
    if (descEl) showTip(card, descEl.textContent.trim());
  });

  navGroupsEl.addEventListener('mouseout', function (e) {
    if (IS_TOUCH) return;
    if (!e.relatedTarget || !e.relatedTarget.closest('.nav-card')) hideTip();
  });

  navGroupsEl.addEventListener('focusin', function (e) {
    if (e.target.closest('.nav-card')) hideTip();
  });

  /* ============ 多链接辅助 ============ */
  function getItemLinks(it) {
    const arr = [];
    if (it.url && it.url !== '#' && it.url !== 'javascript:void(0)') {
      arr.push({ url: it.url });
    }
    (it.links || []).forEach(function (l) {
      if (l && l.url && l.url !== '#') arr.push({ text: l.text || '', url: l.url });
    });
    return arr;
  }

  /* ============ 内联下拉（卡片正下方） ============ */
  let inlineDropdown = null;
  let inlineDropdownAnchor = null;

  function positionInlineDropdown(card, dropdown) {
    const rect = card.getBoundingClientRect();
    const dRect = dropdown.getBoundingClientRect();
    const gap = 6;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let width = rect.width;
    if (width > vw - 24) width = vw - 24;

    let left = rect.left;
    if (left + width > vw - 12) left = vw - width - 12;
    if (left < 12) left = 12;

    let top = rect.bottom + gap;
    if (top + dRect.height > vh - 12) {
      const upTop = rect.top - gap - dRect.height;
      top = upTop >= 12 ? upTop : Math.max(12, vh - dRect.height - 12);
    }

    dropdown.style.left = left + 'px';
    dropdown.style.top = top + 'px';
    dropdown.style.width = width + 'px';
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

    links.forEach(function (l, i) {
      const a = document.createElement('a');
      a.className = 'inline-link';
      a.href = l.url;
      if (SETTINGS.openInNewTab) {
        a.target = '_blank';
        a.rel = 'noopener';
      }

      const label = i === 0 ? (item.name || '主链接') : (l.text || '链接');
      
      if (i === 0) {
        a.innerHTML = '<span class="inline-link-text">' + esc(label) + '</span>' +
                      '<span class="inline-link-badge">主</span>';
      } else {
        a.innerHTML = '<span class="inline-link-text">' + esc(label) + '</span>';
      }

      a.addEventListener('click', function () {
        closeInlineDropdown();
      });
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
    const el = inlineDropdown;
    const anchor = inlineDropdownAnchor;
    inlineDropdown = null;
    inlineDropdownAnchor = null;
    el.classList.remove('show');
    if (anchor) anchor.classList.remove('dropdown-open');
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 160);
  }

  document.addEventListener('click', function (e) {
    if (!inlineDropdown) return;
    if (inlineDropdown.contains(e.target)) return;
    if (e.target.closest('.nav-card')) return;
    closeInlineDropdown();
  }, true);

  /* ============ 统一事件委托：卡片交互 ============ */
  navGroupsEl.addEventListener('click', function (e) {
    /* 0. 多链接卡片 */
    const multiCard = e.target.closest('.nav-card[data-multi="true"]');
    if (multiCard &&
        !e.target.closest('.nav-info-btn') &&
        !document.body.classList.contains('edit-mode')) {
      e.preventDefault();
      e.stopPropagation();
      if (inlineDropdownAnchor === multiCard) {
        closeInlineDropdown();
        return;
      }
      const catId = multiCard.dataset.cat;
      const groupId = multiCard.dataset.group;
      const idx = parseInt(multiCard.dataset.idx, 10);
      const cat = NAV_CATEGORIES.find(function (c) { return c.id === catId; });
      const group = cat && cat.groups && cat.groups.find(function (g) { return g.id === groupId; });
      if (group && group.items && group.items[idx]) {
        openInlineDropdown(multiCard, group.items[idx]);
      }
      return;
    }

    /* 1. 无链接卡片拦截 */
    if (!document.body.classList.contains('edit-mode')) {
      const disabledCard = e.target.closest('.nav-card[data-disabled="true"]');
      if (disabledCard) {
        e.preventDefault();
        showToast('该站点暂未提供链接');
        return;
      }
    }

    /* 2. 编辑模式下的操作拦截 */
    if (document.body.classList.contains('edit-mode')) {
      const moveGroupBtn = e.target.closest('.move-group');
      if (moveGroupBtn) {
        e.preventDefault(); e.stopPropagation();
        const catId = moveGroupBtn.dataset.cat;
        const groupId = moveGroupBtn.dataset.group;
        const dir = moveGroupBtn.dataset.dir;
        const cat = NAV_CATEGORIES.find(c => c.id === catId);
        if (!cat || !cat.groups) return;
        const idx = cat.groups.findIndex(g => g.id === groupId);
        if (idx === -1) return;
        if (dir === 'up' && idx > 0) {
          const temp = cat.groups[idx];
          cat.groups[idx] = cat.groups[idx - 1];
          cat.groups[idx - 1] = temp;
          renderGroupNav(); renderCards();
          showToast('分组已上移，请记得保存');
        } else if (dir === 'down' && idx < cat.groups.length - 1) {
          const temp = cat.groups[idx];
          cat.groups[idx] = cat.groups[idx + 1];
          cat.groups[idx + 1] = temp;
          renderGroupNav(); renderCards();
          showToast('分组已下移，请记得保存');
        }
        return;
      }

      const editGroupBtn = e.target.closest('.edit-group');
      const delGroupBtn = e.target.closest('.del-group');
      if (editGroupBtn || delGroupBtn) {
        e.preventDefault(); e.stopPropagation();
        const catId = (editGroupBtn || delGroupBtn).dataset.cat;
        const groupId = (editGroupBtn || delGroupBtn).dataset.group;
        const cat = NAV_CATEGORIES.find(c => c.id === catId);
        if (!cat) return;
        const groupIdx = cat.groups.findIndex(g => g.id === groupId);
        if (groupIdx === -1) return;
        const group = cat.groups[groupIdx];
        if (editGroupBtn) {
          const newName = prompt('请输入新的分组名称：', group.title);
          if (newName && newName.trim()) {
            group.title = newName.trim();
            renderCards(); renderGroupNav();
            showToast('分组已重命名，请记得保存');
          }
        } else if (delGroupBtn) {
          if (confirm('确定要删除分组「' + group.title + '」及其下的所有卡片吗？')) {
            cat.groups.splice(groupIdx, 1);
            renderCards(); renderGroupNav();
            showToast('分组已删除，请记得保存');
          }
        }
        return;
      }

      const moveItemBtn = e.target.closest('.move-item');
      if (moveItemBtn) {
        e.preventDefault(); e.stopPropagation();
        const card = moveItemBtn.closest('.nav-card');
        const catId = card.dataset.cat;
        const groupId = card.dataset.group;
        const idx = parseInt(card.dataset.idx, 10);
        const dir = moveItemBtn.dataset.dir;
        const cat = NAV_CATEGORIES.find(c => c.id === catId);
        const group = cat && cat.groups && cat.groups.find(g => g.id === groupId);
        if (!group || !group.items) return;
        if (dir === 'up' && idx > 0) {
          const temp = group.items[idx];
          group.items[idx] = group.items[idx - 1];
          group.items[idx - 1] = temp;
          renderCards();
          showToast('卡片已上移，请记得保存');
        } else if (dir === 'down' && idx < group.items.length - 1) {
          const temp = group.items[idx];
          group.items[idx] = group.items[idx + 1];
          group.items[idx + 1] = temp;
          renderCards();
          showToast('卡片已下移，请记得保存');
        }
        return;
      }

      const editBtn = e.target.closest('.edit-btn.edit');
      const delBtn = e.target.closest('.edit-btn.del');
      const card = e.target.closest('.nav-card');
      if (card && (editBtn || delBtn)) {
        e.preventDefault(); e.stopPropagation();
        const catId = card.dataset.cat;
        const groupId = card.dataset.group;
        const idx = parseInt(card.dataset.idx, 10);
        const cat = NAV_CATEGORIES.find(c => c.id === catId);
        const group = cat && cat.groups && cat.groups.find(g => g.id === groupId);
        if (!group || !group.items) return;
        if (editBtn) {
          openEditModal(catId, groupId, idx);
        } else if (delBtn) {
          if (confirm('确定要删除「' + group.items[idx].name + '」吗？')) {
            group.items.splice(idx, 1);
            renderCards();
            showToast('已删除，请记得点击右下角保存');
          }
        }
        return;
      }
    }

    /* 3. 简介提示 */
    const infoBtn = e.target.closest('.nav-info-btn');
    if (infoBtn) {
      e.preventDefault(); e.stopPropagation();
      const card = infoBtn.closest('.nav-card');
      const descEl = card.querySelector('.nav-desc');
      if (!descEl) return;
      if (tipCard === card) hideTip();
      else showTip(card, descEl.textContent.trim());
      return;
    }
  });

  navGroupsEl.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (document.body.classList.contains('edit-mode')) return;

    const multiCard = e.target.closest('.nav-card[data-multi="true"]');
    if (multiCard) {
      e.preventDefault();
      if (inlineDropdownAnchor === multiCard) {
        closeInlineDropdown();
        return;
      }
      const catId = multiCard.dataset.cat;
      const groupId = multiCard.dataset.group;
      const idx = parseInt(multiCard.dataset.idx, 10);
      const cat = NAV_CATEGORIES.find(function (c) { return c.id === catId; });
      const group = cat && cat.groups && cat.groups.find(function (g) { return g.id === groupId; });
      if (group && group.items && group.items[idx]) openInlineDropdown(multiCard, group.items[idx]);
      return;
    }

    const card = e.target.closest('.nav-card[data-disabled="true"]');
    if (!card) return;
    e.preventDefault();
    showToast('该站点暂未提供链接');
  });

  /* ============ 骨架屏 ============ */
  function renderNavSkeleton() {
    var cards = '';
    for (var i = 0; i < 6; i++) cards += '<div class="skeleton skeleton-card"></div>';
    navGroupsEl.innerHTML =
      '<div class="nav-group">' +
        '<div class="skeleton skeleton-group-title"></div>' +
        '<div class="nav-grid">' + cards + '</div>' +
      '</div>';
  }

  function renderNoticeSkeleton() {
    var items = '';
    for (var i = 0; i < 3; i++) items += '<li class="skeleton skeleton-notice"></li>';
    noticeListEl.innerHTML = items;
  }

  /* ============ 随机逛逛 ============ */
  function collectSitesInCategory(catId) {
    var cat = NAV_CATEGORIES.find(function (c) { return c.id === catId; });
    if (!cat) return [];
    var list = [];
    (cat.groups || []).forEach(function (g) {
      (g.items || []).forEach(function (it) {
        if (it && it.url && it.url !== '#' && it.url !== 'javascript:void(0)') list.push(it);
      });
    });
    return list;
  }

  function initCatRandom() {
    if (!catRandomEl) return;
    catRandomEl.addEventListener('click', function () {
      var list = collectSitesInCategory(activeCategoryId);
      if (!list.length) return;
      var pick = list[Math.floor(Math.random() * list.length)];
      if (SETTINGS.openInNewTab) window.open(pick.url, '_blank', 'noopener');
      else window.location.href = pick.url;
    });
  }

  /* ============ 滚动定位与监听 ============ */
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
    requestAnimationFrame(function () {
      let targetEl = navGroupsEl.querySelector(groupId === 'all' ? '.nav-group' : '.nav-group[data-group-id="' + groupId + '"]');
      if (!targetEl) return;
      const noticeBarH = (noticeBar.hidden || !SETTINGS.noticeBar) ? 0 : noticeBar.offsetHeight;
      const offset = 60 + noticeBarH + (navSearchEl ? navSearchEl.offsetHeight : 50) + 16;
      const rect = targetEl.getBoundingClientRect();
      const targetY = rect.top + window.scrollY - offset;
      if (Math.abs(window.scrollY - targetY) < 4) return;
      isAutoScrolling = true;
      clearTimeout(autoScrollTimer);
      autoScrollTimer = setTimeout(function () { isAutoScrolling = false; }, 800);
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
      if (groups[i].getBoundingClientRect().top <= offset) {
        currentGroupId = groups[i].dataset.groupId;
        break;
      }
    }
    catNavEl.querySelectorAll('.sub-tab').forEach(function (sub) {
      sub.classList.toggle('active', sub.dataset.group === currentGroupId);
    });
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

  /* ============ 导航渲染 ============ */
  function renderCatNav() {
    let catHtml = '';
    NAV_CATEGORIES.forEach(function (cat) {
      const total = (cat.groups || []).reduce(function (sum, g) { return sum + ((g.items || []).length); }, 0);
      const isActive = cat.id === activeCategoryId;

      let catActions = '';
      if (document.body.classList.contains('edit-mode')) {
        catActions = `
          <span class="cat-actions">
            <span class="edit-btn move-cat" role="button" data-cat="${esc(cat.id)}" data-dir="up" title="上移">↑</span>
            <span class="edit-btn move-cat" role="button" data-cat="${esc(cat.id)}" data-dir="down" title="下移">↓</span>
            <span class="edit-btn edit-cat" role="button" data-cat="${esc(cat.id)}" title="重命名">✎</span>
            <span class="edit-btn del-cat" role="button" data-cat="${esc(cat.id)}" title="删除分类">×</span>
          </span>
        `;
      }

      catHtml += '<div class="cat-block">';
      catHtml += '<button class="cat-tab' + (isActive ? ' active' : '') +
                 '" type="button" data-cat="' + esc(cat.id) + '">' +
                 '<span class="cat-tab-name">' + esc(cat.title) + '</span>' +
                 catActions +
                 '<span class="cat-tab-count">' + total + '</span>' +
                 '</button>';

      catHtml += '<div class="sub-cats-wrap' + (isActive ? ' show' : '') + '">';
      catHtml += '<div class="sub-cats-inner">';
      (cat.groups || []).forEach(function (g) {
        catHtml += '<button class="sub-tab' + (activeGroupId === g.id ? ' active' : '') + '" type="button" data-group="' + esc(g.id) + '">' + esc(g.title) + '</button>';
      });
      catHtml += '</div></div></div>';
    });

    if (document.body.classList.contains('edit-mode')) {
      catHtml += '<button class="add-btn" id="addCatBtn" type="button">+ 添加分类</button>';
    }

    catNavEl.innerHTML = catHtml;
    bindCatEvents();

    const addCatBtn = document.getElementById('addCatBtn');
    if (addCatBtn) {
      addCatBtn.addEventListener('click', function() {
        const name = prompt('请输入新分类的名称（如：影视资源）：');
        if (!name || !name.trim()) return;
        const id = 'cat_' + Date.now();
        NAV_CATEGORIES.push({ id: id, title: name.trim(), groups: [] });
        activeCategoryId = id;
        renderNav();
        showToast('分类已添加，请记得保存');
      });
    }
  }

  function bindCatEvents() {
    catNavEl.onclick = function (e) {
      const sub = e.target.closest('.sub-tab');
      if (sub) {
        catNavEl.querySelectorAll('.sub-tab').forEach(st => st.classList.toggle('active', st === sub));
        scrollToGroup(sub.dataset.group);
        return;
      }

      const tab = e.target.closest('.cat-tab');
      if (!tab) return;

      if (document.body.classList.contains('edit-mode')) {
        const moveBtn = e.target.closest('.move-cat');
        const editBtn = e.target.closest('.edit-cat');
        const delBtn  = e.target.closest('.del-cat');

        if (moveBtn) {
          e.preventDefault(); e.stopPropagation();
          const catId = moveBtn.dataset.cat;
          const dir   = moveBtn.dataset.dir;
          const idx   = NAV_CATEGORIES.findIndex(c => c.id === catId);
          if (idx === -1) return;
          if (dir === 'up' && idx > 0) {
            const t = NAV_CATEGORIES[idx]; NAV_CATEGORIES[idx] = NAV_CATEGORIES[idx - 1]; NAV_CATEGORIES[idx - 1] = t;
            renderNav(); showToast('分类已上移，请记得保存');
          } else if (dir === 'down' && idx < NAV_CATEGORIES.length - 1) {
            const t = NAV_CATEGORIES[idx]; NAV_CATEGORIES[idx] = NAV_CATEGORIES[idx + 1]; NAV_CATEGORIES[idx + 1] = t;
            renderNav(); showToast('分类已下移，请记得保存');
          }
          return;
        }

        if (editBtn || delBtn) {
          e.preventDefault(); e.stopPropagation();
          const catId  = (editBtn || delBtn).dataset.cat;
          const catIdx = NAV_CATEGORIES.findIndex(c => c.id === catId);
          if (catIdx === -1) return;
          const cat = NAV_CATEGORIES[catIdx];
          if (editBtn) {
            const newName = prompt('请输入新的大类名称：', cat.title);
            if (newName && newName.trim()) {
              cat.title = newName.trim();
              renderNav();
              showToast('分类已重命名，请记得保存');
            }
          } else {
            if (confirm('确定要删除大类「' + cat.title + '」及其下的所有内容吗？')) {
              NAV_CATEGORIES.splice(catIdx, 1);
              if (activeCategoryId === catId) activeCategoryId = NAV_CATEGORIES[0] ? NAV_CATEGORIES[0].id : '';
              renderNav();
              showToast('分类已删除，请记得保存');
            }
          }
          return;
        }
      }

      if (activeCategoryId === tab.dataset.cat) return;
      activeCategoryId = tab.dataset.cat;
      activeGroupId = 'all';
      hideTip();
      closeInlineDropdown();

      catNavEl.querySelectorAll('.cat-tab').forEach(t => t.classList.toggle('active', t === tab));
      catNavEl.querySelectorAll('.cat-block').forEach(block => {
        const subWrap = block.querySelector('.sub-cats-wrap');
        if (!subWrap) return;
        const isCurrent = block.contains(tab);
        subWrap.classList.toggle('show', isCurrent);
        if (isCurrent) subWrap.querySelectorAll('.sub-tab').forEach(st => st.classList.remove('active'));
      });

      if (window.matchMedia('(max-width: 1024px)').matches && tab.scrollIntoView) {
        tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }

      renderGroupNav();
      renderCards();

      if (window.matchMedia('(min-width: 1025px)').matches) scrollToGroup('all');
    };
  }

  function renderGroupNav() {
    const currentCat = NAV_CATEGORIES.find(c => c.id === activeCategoryId);
    const groups = currentCat ? (currentCat.groups || []) : [];
    let chips = '<button class="chip' + (activeGroupId === 'all' ? ' active' : '') + '" type="button" data-group="all">全部</button>';
    groups.forEach(function (g) {
      chips += '<button class="chip' + (activeGroupId === g.id ? ' active' : '') + '" type="button" data-group="' + esc(g.id) + '">' + esc(g.title) + '</button>';
    });
    groupNavEl.innerHTML = chips;
    groupNavEl.querySelectorAll('.chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        if (activeGroupId === chip.dataset.group) return;
        activeGroupId = chip.dataset.group;
        updateGroupNavActive();
        renderCards();
      });
    });
  }

  function updateGroupNavActive() {
    groupNavEl.querySelectorAll('.chip').forEach(function (chip) {
      chip.classList.toggle('active', chip.dataset.group === activeGroupId);
    });
  }

  function renderCards() {
    closeInlineDropdown();

    const q          = navKeyword.trim().toLowerCase();
    const cardTarget = SETTINGS.openInNewTab ? '_blank' : '_self';
    const cardRel    = SETTINGS.openInNewTab ? 'noopener' : '';
    const isDesktop  = window.matchMedia('(min-width: 1025px)').matches;
    const isEditMode = document.body.classList.contains('edit-mode');

    const currentCat = NAV_CATEGORIES.find(c => c.id === activeCategoryId);
    const groups = currentCat ? (currentCat.groups || []) : [];

    let html = '';
    let shown = 0;

    groups.forEach(function (group) {
      if (!isDesktop && activeGroupId !== 'all' && activeGroupId !== group.id) return;

      const filtered = (group.items || [])
        .map((it, i) => ({ it, i }))
        .filter(o => {
          if (!q) return true;
          return ((o.it.name || '') + ' ' + (o.it.desc || '')).toLowerCase().indexOf(q) !== -1;
        });

      if (!filtered.length) {
        if (!isEditMode || q) return;
      } else {
        shown += filtered.length;
      }

      const cards = filtered.map(function (o) {
        const it = o.it;
        const originalIdx = o.i;
        const name = it.name || '';
        const desc = it.desc || '';
        const hasDesc = !!desc;
        const hasIcon = !!(it.icon && it.icon.trim());
        const iconHtml = hasIcon ? '<img data-fallback src="' + esc(it.icon) + '" alt="">' : '';

        const allLinks   = getItemLinks(it);
        const primaryUrl = allLinks[0] ? allLinks[0].url : '';
        const noLink     = !primaryUrl;
        const multiLinks = SETTINGS.enableMultiLinks && allLinks.length > 1;

        let cardHref, cardAttrs;
        if (multiLinks) {
          cardHref  = 'javascript:void(0)';
          cardAttrs = 'data-multi="true" role="button" tabindex="0" aria-haspopup="menu" ';
        } else if (noLink) {
          cardHref  = 'javascript:void(0)';
          cardAttrs = 'data-disabled="true" aria-disabled="true" tabindex="0" ';
        } else {
          cardHref  = esc(primaryUrl);
          cardAttrs = 'target="' + cardTarget + '" ' + (cardRel ? 'rel="' + cardRel + '" ' : '');
        }

        // 清理了无用的 has-multi 类
        return '<a class="nav-card' + (hasDesc ? ' has-desc' : '') + '" ' +
                 'href="' + cardHref + '" ' +
                 cardAttrs +
                 'data-cat="' + esc(currentCat.id) + '" data-group="' + esc(group.id) + '" data-idx="' + originalIdx + '" ' +
                 '>' +
                 '<span class="nav-ico" style="background:' + esc(it.color || '#4E7296') + '">' +
                   '<span>' + esc(it.letter || '') + '</span>' + iconHtml +
                 '</span>' +
                 '<span class="nav-info">' +
                   '<span class="nav-name">' + highlight(name, q) + '</span>' +
                   (hasDesc ? '<span class="nav-desc">' + highlight(desc, q) + '</span>' : '') +
                 '</span>' +
                 (hasDesc ? '<span class="nav-info-btn" role="button" tabindex="-1" aria-label="查看完整简介">i</span>' : '') +
                 '<div class="edit-actions">' +
                   '<button class="edit-btn move-item" type="button" data-dir="up"   title="上移">↑</button>' +
                   '<button class="edit-btn move-item" type="button" data-dir="down" title="下移">↓</button>' +
                   '<button class="edit-btn edit"      type="button" title="编辑">✎</button>' +
                   '<button class="edit-btn del"       type="button" title="删除">×</button>' +
                 '</div>' +
               '</a>';
      }).join('');

      let groupActions = '';
      if (isEditMode) {
        groupActions =
          '<div class="group-actions">' +
            '<button class="edit-btn move-group" type="button" title="上移分组" data-cat="' + esc(currentCat.id) + '" data-group="' + esc(group.id) + '" data-dir="up"   style="width:20px;height:20px;">↑</button>' +
            '<button class="edit-btn move-group" type="button" title="下移分组" data-cat="' + esc(currentCat.id) + '" data-group="' + esc(group.id) + '" data-dir="down" style="width:20px;height:20px;">↓</button>' +
            '<button class="edit-btn edit-group" type="button" title="修改分组名" data-cat="' + esc(currentCat.id) + '" data-group="' + esc(group.id) + '" style="width:20px;height:20px;">✎</button>' +
            '<button class="edit-btn del del-group" type="button" title="删除分组" data-cat="' + esc(currentCat.id) + '" data-group="' + esc(group.id) + '" style="width:20px;height:20px;">×</button>' +
          '</div>';
      }

      html += '<div class="nav-group" data-group-id="' + esc(group.id) + '">' +
                '<h2 class="group-title">' + esc(group.title || '') +
                  '<span class="group-count">' + filtered.length + '</span>' + groupActions +
                '</h2>' +
                '<div class="nav-grid">' + cards;

      if (isEditMode) {
        html += '<button class="add-btn add-card-btn" type="button" data-cat="' + esc(currentCat.id) + '" data-group="' + esc(group.id) + '">+ 添加卡片</button>';
      }

      html += '</div></div>';
    });

    if (isEditMode) {
      html += '<button class="add-btn" id="addGroupBtn" type="button" style="margin-top:24px;" data-cat="' + esc(currentCat.id) + '">+ 添加新分组</button>';
    }

    navGroupsEl.innerHTML = html;

    const showEmptyState = shown === 0 && !(isEditMode && !q);
    navEmptyEl.hidden = !showEmptyState;

    if (showEmptyState) {
      let steamIdBtn = '';
      if (/^\d+$/.test(q)) {
        steamIdBtn = `<button class="ext-btn" onclick="window.open('https://steamcommunity.com/sharedfiles/filedetails/?id=' + encodeURIComponent('${esc(q)}'), '_blank')">Steam 搜创意工坊</button>`;
      }
      navEmptyEl.innerHTML = `
        <div class="external-search">
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
          <p style="margin-top: 16px; font-size: 12px; color: var(--text-mute);">
            或 <button id="emptyClearBtn" type="button" style="background:none; border:none; padding:0; color:var(--accent); text-decoration:underline; cursor:pointer; font-family:inherit; font-size:inherit;">清空关键词</button> 重新查找
          </p>
        </div>
      `;
      const btn = document.getElementById('emptyClearBtn');
      if (btn) {
        btn.addEventListener('click', function() {
          searchEl.value = '';
          navKeyword = '';
          groupNavEl.hidden = false;
          renderCards();
          if (!IS_TOUCH) searchEl.focus();
        });
      }
    }

    const addGroupBtn = document.getElementById('addGroupBtn');
    if (addGroupBtn) {
      addGroupBtn.addEventListener('click', function() {
        const name = prompt('请输入新分组的名称（如：常用工具）：');
        if (!name || !name.trim()) return;
        const cat = NAV_CATEGORIES.find(c => c.id === activeCategoryId);
        if (!cat) return;
        if (!cat.groups) cat.groups = [];
        cat.groups.push({ id: 'group_' + Date.now(), title: name.trim(), items: [] });
        renderGroupNav();
        renderCards();
        showToast('分组已添加，请记得保存');
      });
    }

    document.querySelectorAll('.add-card-btn').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openEditModal(this.dataset.cat, this.dataset.group, -1);
      });
    });

    navGroupsEl.classList.remove('fade-in-content');
    void navGroupsEl.offsetWidth;
    navGroupsEl.classList.add('fade-in-content');

    guardImgs(navGroupsEl);
    bindNavTips();
    bindFontsReadyMeasure();
  }

  function renderNav() {
    renderCatNav();
    renderGroupNav();
    renderCards();
    setTimeout(updateActiveSubTab, 100);
  }

  /* ============ 友站渲染 ============ */
  function renderFriends() {
    if (!friendsSectionEl || !friendsGridEl) return;
    if (!SETTINGS.showFriends) { friendsSectionEl.hidden = true; return; }
    const visible = (FRIENDS || []).filter(function (f) { return f && f.hidden !== true; });
    if (!visible.length) {
      friendsSectionEl.hidden = true;
      friendsGridEl.innerHTML = '';
      return;
    }
    friendsSectionEl.hidden = false;
    friendsGridEl.innerHTML = visible.map(function (f) {
      const hasIcon = !!(f.icon && f.icon.trim());
      const iconHtml = hasIcon ? '<img data-fallback src="' + esc(f.icon) + '" alt="">' : '';
      return '<a class="friend-card" href="' + esc(f.url || '#') + '" target="_blank" rel="noopener" title="' + esc(f.name || '') + '">' +
               '<span class="friend-ico" style="background:' + esc(f.color || '#4E7296') + '">' +
                 '<span>' + esc(f.letter || '友') + '</span>' + iconHtml +
               '</span>' +
               '<span class="friend-name">' + esc(f.name || '') + '</span>' +
             '</a>';
    }).join('');
    guardImgs(friendsGridEl);
  }

  /* ============ 公告条 ============ */
  const BAR_INTERVAL = 7000;
  let barIndex = 0;
  let barTimer = null;
  let barPaused = false;

  function pinnedNotices() { return NOTICES.filter(function (n) { return n.pinned; }); }
  function stopBarTimer() { if (barTimer) { clearInterval(barTimer); barTimer = null; } }

  function startBarTimer() {
    stopBarTimer();
    const pinned = pinnedNotices();
    if (pinned.length < 2) return;
    barTimer = setInterval(function () {
      if (barPaused) return;
      barIndex = (barIndex + 1) % pinned.length;
      renderNoticeBar(false);
    }, BAR_INTERVAL);
  }

  function renderNoticeBar(restartTimer) {
    if (!SETTINGS.noticeBar) {
      noticeBar.hidden = true;
      barPaused = false;
      stopBarTimer();
      updateNoticeBarH();
      return;
    }
    const pinned = pinnedNotices();
    if (!pinned.length) {
      noticeBar.hidden = true;
      barPaused = false;
      stopBarTimer();
      updateNoticeBarH();
      return;
    }
    if (barIndex >= pinned.length) barIndex = 0;
    const n = pinned[barIndex];

    noticeBar.hidden = false;
    barTag.textContent = n.tag || '';
    barTag.className = ('bar-tag ' + (n.tagClass || '')).trim();
    barText.textContent = n.title || '';
    barText.title = n.title || '';
    barText.onclick = function () {
      if (n.noModal && n.links && n.links.length) {
        openExternal(n.links[0].url);
        return;
      }
      openModal(n);
    };

    if (pinned.length > 1) {
      if (barDots.children.length !== pinned.length) {
        barDots.innerHTML = '';
        pinned.forEach(function (_, i) {
          const d = document.createElement('button');
          d.type = 'button';
          d.className = 'bar-dot-item';
          d.setAttribute('aria-label', '第 ' + (i + 1) + ' 条置顶公告');
          d.addEventListener('click', function () {
            barIndex = i;
            renderNoticeBar();
          });
          barDots.appendChild(d);
        });
      }
      Array.from(barDots.children).forEach(function (dot, i) {
        dot.classList.toggle('active', i === barIndex);
      });
    } else {
      barDots.innerHTML = '';
    }
    updateNoticeBarH();
    if (restartTimer !== false) startBarTimer();
  }

  noticeBar.addEventListener('mouseenter', function () { barPaused = true; });
  noticeBar.addEventListener('mouseleave', function () { barPaused = false; });

  function renderNoticeTabs() {
    if (TAGS.indexOf(noticeFilter) === -1) noticeFilter = '全部';
    noticeTabsEl.hidden = !!noticeKeyword.trim();
    noticeTabsEl.innerHTML = '';
    TAGS.forEach(function (tag) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'notice-tab' + (tag === noticeFilter ? ' active' : '');
      btn.dataset.tag = tag;
      btn.textContent = tag;
      btn.addEventListener('click', function () {
        noticeFilter = tag;
        renderNoticeTabs();
        renderNotices();
      });
      noticeTabsEl.appendChild(btn);
    });
  }

  function updateNoticeTabsActive() {
    noticeTabsEl.querySelectorAll('.notice-tab').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.tag === noticeFilter);
    });
  }

  function renderNotices() {
    const q = noticeKeyword.trim().toLowerCase();
    let list = NOTICES.filter(function (n) {
      const okTag = noticeFilter === '全部' || n.tag === noticeFilter;
      const okQ = !q || (n._searchText || '').indexOf(q) !== -1;
      return okTag && okQ;
    });
    list = list.sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0); });

    noticeListEl.innerHTML = '';
    if (!list.length) {
      noticeEmptyEl.textContent = '没有匹配的公告';
      noticeEmptyEl.hidden = false;
      return;
    }
    noticeEmptyEl.hidden = true;

    list.forEach(function (n) {
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

      body.appendChild(meta);
      body.appendChild(h3);
      body.appendChild(p);
      li.appendChild(body);

      function activate() {
        if (n.noModal && n.links && n.links.length) {
          openExternal(n.links[0].url);
          return;
        }
        openModal(n);
      }

      li.addEventListener('click', activate);
      li.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      });

      noticeListEl.appendChild(li);
    });

    noticeListEl.classList.remove('fade-in-content');
    void noticeListEl.offsetWidth;
    noticeListEl.classList.add('fade-in-content');
  }

  /* ============ 结构化内容渲染 ============ */
  function renderStructuredBody(sections) {
    const frag = document.createDocumentFragment();
    sections.forEach(function (sec) {
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
          img.addEventListener('error', function () {
            const ph = document.createElement('div');
            ph.className = 'section-img-fail';
            ph.textContent = '图片加载失败';
            a.replaceWith(ph);
          }, { once: true });
          a.addEventListener('click', function (e) {
            e.preventDefault();
            openLightbox(src, img.alt);
          });
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
        (sec.items || []).forEach(function (it) {
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
          li.appendChild(label);
          li.appendChild(value);
          ul.appendChild(li);
        });
        wrap.appendChild(ul);
      } else if (sec.type === 'num') {
        const ol = document.createElement('ol');
        ol.className = 'num-list';
        (sec.items || []).forEach(function (text) {
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

  /* ============ 弹窗 ============ */
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
    (n.links || []).forEach(function (link, i) {
      const a = document.createElement('a');
      a.className = 'modal-btn' + (i > 0 ? ' ghost' : '');
      a.href = link.url || '#';
      a.textContent = link.text;
      if (link.url && link.url !== '#') {
        a.target = '_blank';
        a.rel = 'noopener';
      }
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
  modalMask.addEventListener('click', function (e) { if (e.target === modalMask) closeModal(); });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (inlineDropdown) { closeInlineDropdown(); return; }
    if (lightbox && lightbox.classList.contains('show')) { closeLightbox(); return; }
    if (settingsMask && settingsMask.classList.contains('show')) { closeSettings(); return; }
    if (editModalMask && editModalMask.classList.contains('show')) {
      editModalMask.classList.remove('show');
      unlockBodyScroll();
      return;
    }
    if (modalMask.classList.contains('show')) closeModal();
  });

  /* ============ 卡片编辑弹窗 ============ */
  function addEditLinkRow(text, url) {
    if (!editLinksList) return null;
    const row = document.createElement('div');
    row.className = 'edit-link-row';
    row.innerHTML =
      '<input type="text" class="setting-input edit-link-text" placeholder="名称（可选）">' +
      '<input type="text" class="setting-input edit-link-url" placeholder="URL">' +
      '<button type="button" class="edit-link-del" aria-label="删除">×</button>';
    row.querySelector('.edit-link-text').value = text || '';
    row.querySelector('.edit-link-url').value = url || '';
    row.querySelector('.edit-link-del').addEventListener('click', function () { row.remove(); });
    editLinksList.appendChild(row);
    return row;
  }

  function openEditModal(catId, groupId, itemIndex) {
    editTarget = { catId: catId, groupId: groupId, itemIndex: itemIndex };
    if (editLinksList) editLinksList.innerHTML = '';

    const cat = NAV_CATEGORIES.find(function (c) { return c.id === catId; });
    const group = cat && cat.groups && cat.groups.find(function (g) { return g.id === groupId; });
    const it = (itemIndex > -1 && group && group.items) ? group.items[itemIndex] : null;

    if (it) {
      editNameEl.value = it.name || '';
      editUrlEl.value = it.url || '';
      editDescEl.value = it.desc || '';
      editLetterEl.value = it.letter || '';
      editColorEl.value = it.color || '#4E7296';
      (it.links || []).forEach(function (l) { addEditLinkRow(l.text || '', l.url || ''); });
      editModalTitle.textContent = '编辑卡片';
    } else {
      editNameEl.value = '';
      editUrlEl.value = '';
      editDescEl.value = '';
      editLetterEl.value = '';
      editColorEl.value = '#4E7296';
      editModalTitle.textContent = '添加新卡片';
    }
    editModalMask.classList.add('show');
    lockBodyScroll();
  }

  if (editModalClose) {
    editModalClose.addEventListener('click', function () {
      editModalMask.classList.remove('show');
      unlockBodyScroll();
    });
  }

  if (editLinksAdd) {
    editLinksAdd.addEventListener('click', function () {
      const row = addEditLinkRow('', '');
      if (row) row.querySelector('.edit-link-url').focus();
    });
  }

  if (editSaveBtn) {
    editSaveBtn.addEventListener('click', function () {
      const name = editNameEl.value.trim();
      const url  = editUrlEl.value.trim();
      if (!name || !url) return showToast('名称和主链接不能为空', true);

      const cat = NAV_CATEGORIES.find(function (c) { return c.id === editTarget.catId; });
      const group = cat && cat.groups && cat.groups.find(function (g) { return g.id === editTarget.groupId; });
      if (!group || !group.items) return;

      const extras = [];
      if (editLinksList) {
        editLinksList.querySelectorAll('.edit-link-row').forEach(function (row) {
          const t = row.querySelector('.edit-link-text').value.trim();
          const u = row.querySelector('.edit-link-url').value.trim();
          if (u) extras.push({ text: t, url: u });
        });
      }

      const newItem = {
        name: name,
        url: url,
        desc: editDescEl.value.trim(),
        letter: editLetterEl.value.trim() || name.charAt(0),
        color: editColorEl.value.trim() || '#4E7296',
        icon: ''
      };
      
      if (extras.length) {
        newItem.links = extras;
      } else if (editTarget.itemIndex > -1 && group.items[editTarget.itemIndex].links) {
        newItem.links = group.items[editTarget.itemIndex].links;
      }

      if (editTarget.itemIndex > -1) {
        group.items[editTarget.itemIndex] = newItem;
      } else {
        group.items.push(newItem);
      }

      editModalMask.classList.remove('show');
      unlockBodyScroll();
      renderCards();
      showToast('已修改，请记得点击右下角保存');
    });
  }

  /* ============ GitHub 保存 ============ */
  async function saveToGitHub() {
    if (!SETTINGS.ghOwner || !SETTINGS.ghRepo || !SETTINGS.ghToken || !SETTINGS.ghPath) {
      return showToast('请先在设置中填写完整的 GitHub 配置', true);
    }
    const btn = floatingSaveBtn;
    if (!btn) return;
    const oldText = btn.textContent;
    btn.textContent = '保存中...';
    btn.disabled = true;

    const url = `https://api.github.com/repos/${SETTINGS.ghOwner}/${SETTINGS.ghRepo}/contents/${SETTINGS.ghPath}`;
    const headers = {
      'Authorization': `token ${SETTINGS.ghToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };

    try {
      const getRes = await fetch(url, { headers, method: 'GET' });
      let sha = '';
      if (getRes.ok) sha = (await getRes.json()).sha;
      else if (getRes.status !== 404) throw new Error('获取文件信息失败，请检查仓库是否存在或 Token 是否有权限');

      const contentStr = JSON.stringify({ categories: NAV_CATEGORIES }, null, 2);
      const contentBase64 = btoa(unescape(encodeURIComponent(contentStr)));

      const putBody = { message: 'Update nav.json via web editor', content: contentBase64 };
      if (sha) putBody.sha = sha;

      const putRes = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(putBody) });
      if (!putRes.ok) {
        const errData = await putRes.json();
        throw new Error(errData.message || '保存失败');
      }
      showToast('🎉 保存成功！稍等片刻 GitHub Pages 即可生效');
    } catch (err) {
      console.error(err);
      showToast('保存失败：' + err.message, true);
    } finally {
      btn.textContent = oldText;
      btn.disabled = false;
    }
  }

  (function initEditMode() {
    floatingSaveBtn = document.createElement('button');
    floatingSaveBtn.className = 'floating-save';
    floatingSaveBtn.innerHTML = '☁️ 保存到 GitHub';
    floatingSaveBtn.addEventListener('click', saveToGitHub);
    document.body.appendChild(floatingSaveBtn);
  })();

  /* ============ 搜索 ============ */
  let navSearchTimer = null;
  searchEl.addEventListener('input', function (e) {
    clearTimeout(navSearchTimer);
    const value = e.target.value;
    navSearchTimer = setTimeout(function () {
      navKeyword = value;
      if (!NAV_CATEGORIES.length) return;
      const isSearching = !!navKeyword.trim();
      groupNavEl.hidden = isSearching;
      if (isSearching) {
        activeGroupId = 'all';
        catNavEl.querySelectorAll('.sub-tab').forEach(function(st) { st.classList.remove('active'); });
      }
      updateGroupNavActive();
      renderCards();
      if (isSearching) scrollToResultsTop();
    }, 120);
  });

  if (noticeSearchEl) {
    let noticeSearchTimer = null;
    noticeSearchEl.addEventListener('input', function (e) {
      clearTimeout(noticeSearchTimer);
      const value = e.target.value;
      noticeSearchTimer = setTimeout(function () {
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

  /* ============ 快捷键 ============ */
  (function initShortcuts() {
    document.addEventListener('keydown', function (e) {
      const active = document.activeElement;
      const isInput = active && (
        active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.isContentEditable
      );

      if (!isInput && (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'))) {
        if (document.body.classList.contains('modal-open')) return;
        e.preventDefault();
        if (navSearchEl && !navSearchEl.hidden) {
          searchEl.focus();
          searchEl.select();
        }
        return;
      }

      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !isInput && !modalMask.classList.contains('show')) {
        const cards = Array.from(navGroupsEl.querySelectorAll('.nav-card:not([data-disabled="true"])'));
        if (!cards.length) return;
        e.preventDefault();
        const currentIdx = cards.indexOf(document.activeElement);
        let nextIdx = 0;
        if (e.key === 'ArrowDown') {
          nextIdx = currentIdx === -1 || currentIdx === cards.length - 1 ? 0 : currentIdx + 1;
        } else {
          nextIdx = currentIdx === -1 || currentIdx === 0 ? cards.length - 1 : currentIdx - 1;
        }
        cards[nextIdx].focus();
        cards[nextIdx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  })();

  /* ============ 主题控制 ============ */
  function isFollowSystem() {
    try {
      var v = localStorage.getItem('site.theme');
      return !v || v === 'system';
    } catch (e) { return true; }
  }

  function setFollowSystem(on) {
    if (on) {
      try { localStorage.setItem('site.theme', 'system'); } catch (e) {}
      var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    } else {
      var current = document.documentElement.dataset.theme || 'light';
      try { localStorage.setItem('site.theme', current); } catch (e) {}
    }
  }

  themeBtn.addEventListener('click', function () {
    var current = document.documentElement.dataset.theme;
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('site.theme', next); } catch (e) {}
    syncSettingsUI();
  });

  (function initSystemThemeWatcher() {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    function onChange(e) {
      if (!isFollowSystem()) return;
      document.documentElement.dataset.theme = e.matches ? 'dark' : 'light';
    }
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  })();

  const mqLayout = window.matchMedia('(max-width: 1024px)');
  function handleLayoutChange(e) {
    renderCards();
    if (!e.matches) setTimeout(updateActiveSubTab, 150);
  }
  if (mqLayout.addEventListener) mqLayout.addEventListener('change', handleLayoutChange);
  else if (mqLayout.addListener) mqLayout.addListener(handleLayoutChange);

  /* ============ Toast ============ */
  let toastTimer = null;
  function showToast(msg, isError) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.toggle('error', !!isError);
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  /* ============ 导出 / 导入配置 ============ */
  function exportSettings() {
    var themeVal = 'system';
    try { themeVal = localStorage.getItem('site.theme') || 'system'; } catch (e) {}

    const safeSettings = Object.assign({}, SETTINGS);
    delete safeSettings.ghOwner;
    delete safeSettings.ghRepo;
    delete safeSettings.ghPath;
    delete safeSettings.ghToken;
    delete safeSettings.editMode;

    var data = { version: 1, exportedAt: new Date().toISOString(), theme: themeVal, settings: safeSettings };
    var json = JSON.stringify(data, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);

    var d = new Date();
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    var dateStr = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes());

    var a = document.createElement('a');
    a.href = url;
    a.download = 'kawang-settings-' + dateStr + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    showToast('配置已导出');
  }

  function importSettingsFromFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = JSON.parse(e.target.result);
        if (!data || typeof data !== 'object') throw new Error('文件内容不是有效的配置对象');

        var incoming = {};
        var incomingTheme = null;
        if (data.settings && typeof data.settings === 'object') {
          incoming = data.settings;
          if (typeof data.theme === 'string') incomingTheme = data.theme;
        } else {
          incoming = data;
          if (typeof data.theme === 'string') incomingTheme = data.theme;
        }

        var merged = Object.assign({}, DEFAULT_SETTINGS);
        const currentGhConfig = {
          ghOwner: SETTINGS.ghOwner,
          ghRepo: SETTINGS.ghRepo,
          ghPath: SETTINGS.ghPath,
          ghToken: SETTINGS.ghToken,
          editMode: SETTINGS.editMode
        };

        if (typeof incoming.themeColor === 'string') {
          if (THEME_COLORS.some(function (c) { return c.id === incoming.themeColor; })) {
            merged.themeColor = incoming.themeColor;
          }
        }
        if (typeof incoming.noticeBar === 'boolean') merged.noticeBar = incoming.noticeBar;
        if (typeof incoming.showFriends === 'boolean') merged.showFriends = incoming.showFriends;
        if (typeof incoming.enableMultiLinks === 'boolean') merged.enableMultiLinks = incoming.enableMultiLinks;
        if (typeof incoming.openInNewTab === 'boolean') merged.openInNewTab = incoming.openInNewTab;
        if (typeof incoming.defaultCategory === 'string') merged.defaultCategory = incoming.defaultCategory;

        Object.assign(merged, currentGhConfig);
        SETTINGS = merged;
        saveSettings();

        if (incomingTheme === 'system') {
          try { localStorage.setItem('site.theme', 'system'); } catch (err) {}
          var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
        } else if (incomingTheme === 'light' || incomingTheme === 'dark') {
          try { localStorage.setItem('site.theme', incomingTheme); } catch (err) {}
          document.documentElement.dataset.theme = incomingTheme;
        }

        applySettings();
        syncSettingsUI();
        showToast('配置已导入');
      } catch (err) {
        console.error(err);
        showToast('导入失败：' + (err.message || '文件格式不正确'), true);
      }
    };
    reader.onerror = function () { showToast('导入失败：读取文件出错', true); };
    reader.readAsText(file);
  }

  /* ============ 设置面板 ============ */
  function applySettings() {
    document.documentElement.dataset.themeColor = SETTINGS.themeColor || 'orange';
    document.body.classList.toggle('edit-mode', !!(SETTINGS.editMode && SETTINGS.ghToken));
    
    // 增加多链接状态同步
    document.body.classList.toggle('multi-links-enabled', !!SETTINGS.enableMultiLinks);

    if (NOTICES.length) renderNoticeBar();
    else if (!SETTINGS.noticeBar) {
      noticeBar.hidden = true;
      stopBarTimer();
      updateNoticeBarH();
    }

    if (NAV_CATEGORIES.length) renderCards();
    renderFriends();
  }

  function syncSettingsUI() {
    if (themeColorsEl) {
      themeColorsEl.innerHTML = '';
      THEME_COLORS.forEach(function (c) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'color-dot' + (c.id === SETTINGS.themeColor ? ' active' : '');
        b.dataset.color = c.id;
        b.title = c.name;
        b.style.setProperty('--dot-bg', c.dot);
        b.addEventListener('click', function () {
          SETTINGS.themeColor = c.id;
          saveSettings();
          applySettings();
          syncSettingsUI();
        });
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
        let found = NAV_CATEGORIES.find(function (c) { return c.id === current; });
        if (!found && current) { SETTINGS.defaultCategory = ''; saveSettings(); }
        if (!found) found = NAV_CATEGORIES.find(function (c) { return c.default; }) || NAV_CATEGORIES[0];
        effective = found ? found.id : '';
        let html = '';
        NAV_CATEGORIES.forEach(function (c) {
          html += '<option value="' + esc(c.id) + '">' + esc(c.title) + '</option>';
        });
        setDefaultCategoryEl.innerHTML = html;
      } else {
        setDefaultCategoryEl.innerHTML = '<option value="">加载中…</option>';
      }
      setDefaultCategoryEl.value = effective;
    }

    if (ghRepoEl) ghRepoEl.value = SETTINGS.ghRepo || '';
    if (ghTokenEl) ghTokenEl.value = SETTINGS.ghToken || '';
    if (setEditModeEl) setEditModeEl.checked = !!SETTINGS.editMode;

    if (setOpenModeEl) {
      const mode = SETTINGS.openInNewTab ? 'new' : 'self';
      setOpenModeEl.querySelectorAll('button').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.value === mode);
      });
    }
  }

  function initSettings() {
    if (settingsBtn && settingsMask) {
      settingsBtn.addEventListener('click', function () {
        if (settingsMask.classList.contains('show')) closeSettings();
        else openSettings();
      });
    }
    if (settingsClose) settingsClose.addEventListener('click', closeSettings);
    if (settingsMask) settingsMask.addEventListener('click', function (e) { if (e.target === settingsMask) closeSettings(); });

    if (setFollowSystemEl) {
      setFollowSystemEl.addEventListener('change', function () {
        setFollowSystem(!!setFollowSystemEl.checked);
        syncSettingsUI();
      });
    }
    if (setNoticeBarEl) {
      setNoticeBarEl.addEventListener('change', function () {
        SETTINGS.noticeBar = !!setNoticeBarEl.checked;
        saveSettings();
        applySettings();
      });
    }
    if (setShowFriendsEl) {
      setShowFriendsEl.addEventListener('change', function () {
        SETTINGS.showFriends = !!setShowFriendsEl.checked;
        saveSettings();
        renderFriends();
      });
    }
    // 监听多链接开关
    if (setEnableMultiLinksEl) {
      setEnableMultiLinksEl.addEventListener('change', function () {
        SETTINGS.enableMultiLinks = !!setEnableMultiLinksEl.checked;
        saveSettings();
        applySettings();
        showToast(SETTINGS.enableMultiLinks ? '已开启多链接下拉' : '已关闭多链接下拉');
      });
    }
    if (setDefaultCategoryEl) {
      setDefaultCategoryEl.addEventListener('change', function () {
        SETTINGS.defaultCategory = setDefaultCategoryEl.value;
        saveSettings();
      });
    }
    if (setOpenModeEl) {
      setOpenModeEl.querySelectorAll('button').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const v = btn.dataset.value;
          SETTINGS.openInNewTab = (v === 'new');
          saveSettings();
          applySettings();
          syncSettingsUI();
        });
      });
    }

    if (ghRepoEl) ghRepoEl.addEventListener('input', e => { SETTINGS.ghRepo = e.target.value.trim(); saveSettings(); });
    if (ghTokenEl) ghTokenEl.addEventListener('input', e => { SETTINGS.ghToken = e.target.value.trim(); saveSettings(); });

    if (setEditModeEl) {
      setEditModeEl.addEventListener('change', function() {
        if (setEditModeEl.checked && !ghTokenEl.value.trim()) {
          showToast('请先填写 Personal Access Token 才能开启', true);
          setEditModeEl.checked = false;
          return;
        }
        SETTINGS.editMode = setEditModeEl.checked;
        saveSettings();
        document.body.classList.toggle('edit-mode', SETTINGS.editMode);
        renderNav();
        showToast(SETTINGS.editMode ? '已开启编辑模式' : '已关闭编辑模式');
      });
    }

    if (settingsExportEl) settingsExportEl.addEventListener('click', exportSettings);

    if (settingsImportEl && settingsFileEl) {
      settingsImportEl.addEventListener('click', function () {
        settingsFileEl.value = '';
        settingsFileEl.click();
      });
      settingsFileEl.addEventListener('change', function () {
        var file = settingsFileEl.files && settingsFileEl.files[0];
        if (file) importSettingsFromFile(file);
      });
    }

    if (settingsResetEl) {
      settingsResetEl.addEventListener('click', function () {
        const ghConfig = {
          ghOwner: SETTINGS.ghOwner,
          ghRepo: SETTINGS.ghRepo,
          ghPath: SETTINGS.ghPath,
          ghToken: SETTINGS.ghToken
        };
        SETTINGS = Object.assign({}, DEFAULT_SETTINGS, ghConfig);
        SETTINGS.editMode = false;
        saveSettings();
        setFollowSystem(true);
        applySettings();
        syncSettingsUI();
        renderNav();
        showToast('已恢复默认设置');
      });
    }
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
    if (!modalMask.classList.contains('show') && !lightbox.classList.contains('show')) {
      unlockBodyScroll();
    }
  }

  /* ============ 回到顶部 & 品牌主页 ============ */
  function updateBackTop() {
    backTopBtn.classList.toggle('show', window.scrollY > 400);
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  backTopBtn.addEventListener('click', scrollToTop);

  (function initBrandHome() {
    const brand = document.querySelector('.brand');
    if (!brand) return;
    brand.addEventListener('click', function (e) {
      if (window.scrollY <= 8) return;
      e.preventDefault();
      scrollToTop();
    });
  })();

  /* ============ 公众号二维码 ============ */
  function bindQRCodeFallback() {
    const qrEl = document.getElementById('qrCode');
    if (!qrEl) return;
    const img = qrEl.querySelector('img');
    if (!img) { qrEl.innerHTML = makeQRCode(20241018); return; }
    function fallback() {
      qrEl.removeAttribute('href');
      qrEl.removeAttribute('target');
      qrEl.removeAttribute('rel');
      qrEl.style.cursor = 'default';
      qrEl.innerHTML = makeQRCode(20241018);
    }
    qrEl.addEventListener('click', function (e) {
      if (!img.isConnected) return;
      e.preventDefault();
      openLightbox(img.src, img.alt || '公众号二维码');
    });
    if (img.complete && img.naturalWidth === 0) { fallback(); return; }
    img.addEventListener('error', fallback, { once: true });
  }

  /* ============ 时光问候 ============ */
  function initGreeting() {
    const greetingEl = document.getElementById('greetingText');
    if (!greetingEl) return;
    function updateGreeting() {
      const hour = new Date().getHours();
      let text = '';
      if (hour >= 5 && hour < 9) text = '早上好，新的一天开始了 ☀️';
      else if (hour >= 9 && hour < 12) text = '上午好，今天也要加油 💪';
      else if (hour >= 12 && hour < 14) text = '中午好，记得午休哦 ☕';
      else if (hour >= 14 && hour < 18) text = '下午好，喝杯水吧 🍵';
      else if (hour >= 18 && hour < 24) text = '晚上好，辛苦一天了 🌙';
      else text = '夜深了，注意身体早点休息 🌛';
      greetingEl.textContent = text;
    }
    updateGreeting();
    setInterval(updateGreeting, 600000);
  }

  /* ============ 加载远程 JSON ============ */
  async function loadData() {
    try {
      const navRes = await fetchWithTimeout(NAV_URL);
      if (!navRes.ok) throw new Error('导航 JSON 加载失败：' + navRes.status);
      const navData = await navRes.json();
      if (Array.isArray(navData)) {
        NAV_CATEGORIES = [{ id: 'all', title: '全部导航', default: true, groups: navData }];
      } else if (navData && Array.isArray(navData.categories)) {
        NAV_CATEGORIES = navData.categories;
      } else {
        throw new Error('导航 JSON 结构不正确');
      }

      let targetCatId = '';
      if (SETTINGS.defaultCategory) {
        const found = NAV_CATEGORIES.find(function (c) { return c.id === SETTINGS.defaultCategory; });
        if (found) targetCatId = found.id;
      }
      if (!targetCatId) {
        const def = NAV_CATEGORIES.find(function (c) { return c.default; }) || NAV_CATEGORIES[0];
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
      catNavEl.innerHTML = '';
      groupNavEl.innerHTML = '';
      navGroupsEl.innerHTML = '<div class="empty empty-lg">导航数据加载失败</div>';
    }

    try {
      const noticeRes = await fetchWithTimeout(NOTICE_URL);
      if (!noticeRes.ok) throw new Error('公告 JSON 加载失败：' + noticeRes.status);
      const noticeData = await noticeRes.json();
      NOTICES = Array.isArray(noticeData) ? noticeData : [];

      NOTICES.forEach(function (n) {
        n._searchText = (
          (n.title || '') + ' ' + (n.excerpt || '') + ' ' + (n.tag || '') + ' ' + (n.content || '') + ' ' + JSON.stringify(n.sections || '')
        ).toLowerCase();
      });

      TAGS = ['全部', ...new Set(NOTICES.map(function (n) { return n.tag; }).filter(Boolean))];

      renderNoticeTabs();
      renderNotices();
      renderNoticeBar();
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
    } catch (e) {
      FRIENDS = [];
    }
    renderFriends();

    syncSettingsUI();
    updateBackTop();
  }

  /* ============ 启动 ============ */
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