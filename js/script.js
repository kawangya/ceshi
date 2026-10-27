/* =========================================================
   卡王的导航 - 主脚本
   ---------------------------------------------------------
   渲染拆分：
   - renderCatNav()      只渲染大类 tab
   - renderGroupNav()    只渲染分组 chips
   - updateGroupNavActive()  只更新 chips 高亮
   - renderCards()       只渲染站点卡片
   - renderNav()         全量渲染（启动 / 切大类时用）
   搜索输入时只调 updateGroupNavActive + renderCards，
   不重建大类 tab 和分组 chips，避免站点多时卡顿。

   快捷键：
   - /  聚焦导航搜索（不在输入框 / 弹窗 / 设置 / 灯箱内时）
   ========================================================= */

(function () {
  'use strict';

  /* ============ 远程 JSON 地址 ============ */
  const NAV_URL = './data/nav.json';
  const NOTICE_URL = './data/notices.json';
  const FRIENDS_URL = './data/friends.json';

  /* ============ 设置存储 ============ */
  const SETTINGS_KEY = 'site.settings';
  const DEFAULT_SETTINGS = {
    themeColor: 'default',
    noticeBar: true,
    defaultCategory: '',
    openInNewTab: true
  };

  const THEME_COLORS = [
    { id: 'default', name: '默认', dot: '#4E7296' }
  ];

  let SETTINGS = loadSettings();

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return Object.assign({}, DEFAULT_SETTINGS);
      const obj = JSON.parse(raw);
      return Object.assign({}, DEFAULT_SETTINGS, obj || {});
    } catch (e) {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(SETTINGS));
    } catch (e) {}
  }

  /* ============ 数据容器 ============ */
  let NAV_CATEGORIES = [];
  let NOTICES = [];
  let FRIENDS = [];
  let TAGS = ['全部'];

  /* ============ 状态 ============ */
  let navKeyword = '';
  let noticeKeyword = '';
  let noticeFilter = '全部';
  let activeCategoryId = '';
  let activeGroupId = 'all';
  let lastFocused = null;

  const IS_TOUCH = window.matchMedia('(hover: none)').matches;

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
  const setDefaultCategoryEl = document.getElementById('setDefaultCategory');
  const setOpenModeEl   = document.getElementById('setOpenMode');
  const settingsResetEl = document.getElementById('settingsReset');
  const settingsExportEl = document.getElementById('settingsExport');
  const settingsImportEl = document.getElementById('settingsImport');
  const settingsFileEl   = document.getElementById('settingsFile');
  const toastEl          = document.getElementById('toast');

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
    if (!url || url === '#') return;
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
    if (img.complete && img.naturalWidth === 0) { fail(); return; }
    img.addEventListener('error', fail, { once: true });
  }

  function guardImgs(root) {
    (root || document).querySelectorAll('img[data-fallback]').forEach(guardImg);
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
  let lbScale = 1;
  let lbTx = 0;
  let lbTy = 0;
  let lbDragging = false;
  let lbMoved = false;
  let lbStartX = 0, lbStartY = 0;
  let lbStartTx = 0, lbStartTy = 0;
  let lbPinchDist = 0;
  let lbPinchScale = 1;

  function applyLightboxTransform() {
    if (!lightboxImg) return;
    lightboxImg.style.transform =
      'translate(' + lbTx + 'px,' + lbTy + 'px) scale(' + lbScale + ')';
    if (lightboxZoom) {
      lightboxZoom.textContent = Math.round(lbScale * 100) + '%';
    }
    if (lbScale > 1.01) {
      lightboxImg.style.cursor = lbDragging ? 'grabbing' : 'grab';
    } else {
      lightboxImg.style.cursor = 'zoom-in';
    }
  }

  function resetLightboxTransform() {
    lbScale = 1;
    lbTx = 0;
    lbTy = 0;
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
    document.body.classList.add('modal-open');
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('show');
    lightboxImg.src = '';
    resetLightboxTransform();
    if (!modalMask.classList.contains('show')) {
      document.body.classList.remove('modal-open');
    }
  }

  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }

  if (lightbox) {
    lightbox.addEventListener('click', function (e) {
      if (lbMoved) { lbMoved = false; return; }
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
        if (lbScale > 1.01) {
          resetLightboxTransform();
          return;
        }
        const rect = lightboxImg.getBoundingClientRect();
        const imgCx = rect.left + rect.width / 2;
        const imgCy = rect.top + rect.height / 2;
        const dx = e.clientX - imgCx;
        const dy = e.clientY - imgCy;
        lbScale = 2;
        lbTx = dx - dx * 2;
        lbTy = dy - dy * 2;
        applyLightboxTransform();
      });

      lightboxImg.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        if (lbScale <= 1.01) return;
        lbDragging = true;
        lbMoved = false;
        lbStartX = e.clientX;
        lbStartY = e.clientY;
        lbStartTx = lbTx;
        lbStartTy = lbTy;
        lightboxImg.classList.add('dragging');
        applyLightboxTransform();
        e.preventDefault();
      });

      lightboxImg.addEventListener('touchstart', function (e) {
        if (e.touches.length === 1 && lbScale > 1.01) {
          lbDragging = true;
          lbMoved = false;
          lbStartX = e.touches[0].clientX;
          lbStartY = e.touches[0].clientY;
          lbStartTx = lbTx;
          lbStartTy = lbTy;
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
          lbDragging = false;
          lightboxImg.classList.remove('dragging');
          applyLightboxTransform();
        }
        if (e.touches.length < 2) {
          lbPinchDist = 0;
        }
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
    if (IS_TOUCH) {
      tipAutoHideTimer = setTimeout(hideTip, 4000);
    }
  }

  function positionTip(card) {
    const rect = card.getBoundingClientRect();
    const tipRect = navTipEl.getBoundingClientRect();
    const gap = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

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

  navTipEl.addEventListener('click', function () {
    hideTip();
  });

  function bindNavTips() {
    hideTip();
    navGroupsEl.querySelectorAll('.nav-card').forEach(function (card) {
      const descEl = card.querySelector('.nav-desc');
      if (!descEl) return;

      const truncated = descEl.scrollWidth > descEl.clientWidth + 1;
      card.dataset.truncated = truncated ? 'true' : 'false';

      card.addEventListener('mouseenter', function () {
        if (IS_TOUCH) return;
        if (!truncated) return;
        showTip(card, descEl.textContent.trim());
      });
      card.addEventListener('mouseleave', function () {
        if (!IS_TOUCH) hideTip();
      });
      card.addEventListener('focus', hideTip);

      const btn = card.querySelector('.nav-info-btn');
      if (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (tipCard === card) {
            hideTip();
          } else {
            showTip(card, descEl.textContent.trim());
          }
        });
      }
    });
  }

  document.addEventListener('click', function (e) {
    if (!navTipEl.classList.contains('show')) return;
    if (e.target.closest('.nav-card') || e.target === navTipEl) return;
    hideTip();
  }, true);

  window.addEventListener('scroll', hideTip, { passive: true });
  window.addEventListener('resize', hideTip, { passive: true });

  /* ============ 骨架屏 ============ */
  function renderNavSkeleton() {
    var cards = '';
    for (var i = 0; i < 6; i++) {
      cards += '<div class="skeleton skeleton-card"></div>';
    }
    navGroupsEl.innerHTML =
      '<div class="nav-group">' +
        '<div class="skeleton skeleton-group-title"></div>' +
        '<div class="nav-grid">' + cards + '</div>' +
      '</div>';
  }

  function renderNoticeSkeleton() {
    var items = '';
    for (var i = 0; i < 3; i++) {
      items += '<li class="skeleton skeleton-notice"></li>';
    }
    noticeListEl.innerHTML = items;
  }

  /* ============ 左侧底部：随机逛逛 ============ */
  function collectSitesInCategory(catId) {
    var cat = NAV_CATEGORIES.find(function (c) { return c.id === catId; });
    if (!cat) return [];
    var list = [];
    (cat.groups || []).forEach(function (g) {
      (g.items || []).forEach(function (it) {
        if (it && it.url && it.url !== '#') list.push(it);
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
      if (SETTINGS.openInNewTab) {
        window.open(pick.url, '_blank', 'noopener');
      } else {
        window.location.href = pick.url;
      }
    });
  }

  /* ============ 导航渲染：拆分 ============ */

  /* 只渲染大类 tab */
  function renderCatNav() {
    let catHtml = '';
    NAV_CATEGORIES.forEach(function (cat) {
      const total = (cat.groups || []).reduce(function (sum, g) {
        return sum + ((g.items || []).length);
      }, 0);

      catHtml += '<button class="cat-tab' + (cat.id === activeCategoryId ? ' active' : '') +
                 '" type="button" data-cat="' + esc(cat.id) + '">' +
                 '<span class="cat-tab-name">' + esc(cat.title) + '</span>' +
                 '<span class="cat-tab-count">' + total + '</span>' +
                 '</button>';
    });
    catNavEl.innerHTML = catHtml;

    catNavEl.querySelectorAll('.cat-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        if (activeCategoryId === tab.dataset.cat) return;
        activeCategoryId = tab.dataset.cat;
        activeGroupId = 'all';
        hideTip();

        // 1) tab 复用了 DOM，必须手动同步高亮，否则选中态仍停在旧 tab 上
        catNavEl.querySelectorAll('.cat-tab').forEach(function (t) {
          t.classList.toggle('active', t === tab);
        });

        // 2) 移动端横向 tab 栏：把选中的 tab 平滑滚进可视区域
        if (window.matchMedia('(max-width: 1024px)').matches && tab.scrollIntoView) {
          const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          tab.scrollIntoView({
            behavior: reduceMotion ? 'auto' : 'smooth',
            inline: 'center',
            block: 'nearest'
          });
        }

        // 切换大类：分组列表变了，重建分组 chips；再重渲染卡片
        renderGroupNav();
        renderCards();
      });
    });
  }

  /* 只渲染分组 chips */
  function renderGroupNav() {
    const currentCat = NAV_CATEGORIES.find(function (c) { return c.id === activeCategoryId; });
    const groups = currentCat ? (currentCat.groups || []) : [];

    let chips = '<button class="chip' + (activeGroupId === 'all' ? ' active' : '') +
                '" type="button" data-group="all">全部</button>';
    groups.forEach(function (g) {
      chips += '<button class="chip' + (activeGroupId === g.id ? ' active' : '') +
               '" type="button" data-group="' + esc(g.id) + '">' + esc(g.title) + '</button>';
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

  /* 只更新分组 chips 的 active 状态，不重建 DOM */
  function updateGroupNavActive() {
    groupNavEl.querySelectorAll('.chip').forEach(function (chip) {
      chip.classList.toggle('active', chip.dataset.group === activeGroupId);
    });
  }

  /* 只渲染站点卡片 */
  function renderCards() {
    const q = navKeyword.trim().toLowerCase();
    const cardTarget = SETTINGS.openInNewTab ? '_blank' : '_self';
    const cardRel = SETTINGS.openInNewTab ? 'noopener' : '';

    const currentCat = NAV_CATEGORIES.find(function (c) { return c.id === activeCategoryId; });
    const groups = currentCat ? (currentCat.groups || []) : [];

    let html = '';
    let shown = 0;

    groups.forEach(function (group) {
      if (activeGroupId !== 'all' && activeGroupId !== group.id) return;

      const items = (group.items || []).filter(function (it) {
        if (!q) return true;
        return (it.name + ' ' + (it.desc || '') + ' ' + group.title)
          .toLowerCase().indexOf(q) !== -1;
      });

      if (!items.length) return;
      shown += items.length;

      const cards = items.map(function (it) {
        const hasDesc = !!it.desc;
        const hasIcon = !!(it.icon && it.icon.trim());
        const iconHtml = hasIcon
          ? '<img data-fallback src="' + esc(it.icon) + '" alt="">'
          : '';

        return '<a class="nav-card' + (hasDesc ? ' has-desc' : '') + '" ' +
                 'href="' + esc(it.url || '#') + '" ' +
                 'target="' + cardTarget + '" ' +
                 (cardRel ? 'rel="' + cardRel + '" ' : '') + '>' +
                 '<span class="nav-ico" style="background:' + esc(it.color || '#4E7296') + '">' +
                   '<span>' + esc(it.letter || '') + '</span>' + iconHtml +
                 '</span>' +
                 '<span class="nav-info">' +
                   '<span class="nav-name">' + highlight(it.name, q) + '</span>' +
                   (hasDesc ? '<span class="nav-desc">' + highlight(it.desc, q) + '</span>' : '') +
                 '</span>' +
                 (hasDesc ? '<span class="nav-info-btn" role="button" aria-label="查看完整简介">i</span>' : '') +
               '</a>';
      }).join('');

      html += '<div class="nav-group">' +
                '<h2 class="group-title">' + highlight(group.title, q) +
                  '<span class="group-count">' + items.length + '</span>' +
                '</h2>' +
                '<div class="nav-grid">' + cards + '</div>' +
              '</div>';
    });

    navGroupsEl.innerHTML = html;
    navEmptyEl.hidden = shown > 0;

    guardImgs(navGroupsEl);
    bindNavTips();
  }

  /* 全量渲染：启动 / 切大类时用 */
  function renderNav() {
    renderCatNav();
    renderGroupNav();
    renderCards();
  }

  /* ============ 友站渲染 ============ */
  function renderFriends() {
    if (!friendsSectionEl || !friendsGridEl) return;

    const visible = (FRIENDS || []).filter(function (f) {
      return f && f.hidden !== true;
    });

    if (!visible.length) {
      friendsSectionEl.hidden = true;
      friendsGridEl.innerHTML = '';
      return;
    }

    friendsSectionEl.hidden = false;
    friendsGridEl.innerHTML = visible.map(function (f) {
      const hasIcon = !!(f.icon && f.icon.trim());
      const iconHtml = hasIcon
        ? '<img data-fallback src="' + esc(f.icon) + '" alt="">'
        : '';

      return '<a class="friend-card" ' +
               'href="' + esc(f.url || '#') + '" target="_blank" rel="noopener" ' +
               'title="' + esc(f.name || '') + '">' +
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

  function pinnedNotices() {
    return NOTICES.filter(function (n) { return n.pinned; });
  }

  function stopBarTimer() {
    if (barTimer) { clearInterval(barTimer); barTimer = null; }
  }

  function startBarTimer() {
    stopBarTimer();
    const pinned = pinnedNotices();
    if (pinned.length < 2) return;
    barTimer = setInterval(function () {
      if (barPaused) return;
      barIndex = (barIndex + 1) % pinned.length;
      renderNoticeBar();
    }, BAR_INTERVAL);
  }

  function renderNoticeBar() {
    if (!SETTINGS.noticeBar) { noticeBar.hidden = true; stopBarTimer(); return; }

    const pinned = pinnedNotices();
    if (!pinned.length) { noticeBar.hidden = true; stopBarTimer(); return; }

    if (barIndex >= pinned.length) barIndex = 0;
    const n = pinned[barIndex];

    noticeBar.hidden = false;
    barTag.textContent = n.tag;
    barTag.className = 'bar-tag ' + (n.tagClass || '');
    barText.textContent = n.title;
    barText.title = n.title;

    barText.onclick = function () {
      if (n.noModal && n.links && n.links.length) {
        openExternal(n.links[0].url);
        return;
      }
      openModal(n);
    };

    barDots.innerHTML = '';
    if (pinned.length > 1) {
      pinned.forEach(function (_, i) {
        const d = document.createElement('button');
        d.type = 'button';
        d.className = 'bar-dot-item' + (i === barIndex ? ' active' : '');
        d.setAttribute('aria-label', '第 ' + (i + 1) + ' 条置顶公告');
        d.addEventListener('click', function () {
          barIndex = i;
          renderNoticeBar();
        });
        barDots.appendChild(d);
      });
    }

    startBarTimer();
  }

  noticeBar.addEventListener('mouseenter', function () { barPaused = true; });
  noticeBar.addEventListener('mouseleave', function () { barPaused = false; });

  /* ============ 公告标签筛选 ============ */
  function renderNoticeTabs() {
    noticeTabsEl.innerHTML = '';
    TAGS.forEach(function (tag) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'notice-tab' + (tag === noticeFilter ? ' active' : '');
      btn.textContent = tag;
      btn.addEventListener('click', function () {
        noticeFilter = tag;
        renderNoticeTabs();
        renderNotices();
      });
      noticeTabsEl.appendChild(btn);
    });
  }

  /* ============ 公告列表 ============ */
  function renderNotices() {
    const q = noticeKeyword.trim().toLowerCase();

    let list = NOTICES.filter(function (n) {
      const okTag = noticeFilter === '全部' || n.tag === noticeFilter;
      const okQ = !q ||
        (n.title + ' ' + n.excerpt + ' ' + n.tag + ' ' + (n.content || '') + ' ' + JSON.stringify(n.sections || ''))
          .toLowerCase().indexOf(q) !== -1;
      return okTag && okQ;
    });

    list = list.sort(function (a, b) {
      return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
    });

    noticeListEl.innerHTML = '';

    if (!list.length) {
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
      tagEl.className = 'tag ' + (n.tagClass || '');
      tagEl.textContent = n.tag;
      meta.appendChild(tagEl);

      const h3 = document.createElement('h3');
      h3.innerHTML = highlight(n.title, q);

      const p = document.createElement('p');
      p.innerHTML = highlight(n.excerpt, q);

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
          if (it.valueHtml) {
            value.innerHTML = it.valueHtml;
          } else {
            value.innerHTML = highlight(it.value || '', '');
          }
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
    modalTag.textContent = n.tag;
    modalTag.className = 'tag ' + (n.tagClass || '');
    modalTitle.textContent = n.title;

    modalBody.innerHTML = '';
    if (n.sections && n.sections.length) {
      modalBody.classList.remove('plain');
      modalBody.appendChild(renderStructuredBody(n.sections));
    } else {
      modalBody.classList.add('plain');
      modalBody.textContent = n.content || n.excerpt;
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
    document.body.classList.add('modal-open');
    modalClose.focus();
  }

  function closeModal() {
    modalMask.classList.remove('show');
    modalMask.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (lastFocused && document.body.contains(lastFocused)) {
      lastFocused.focus();
    }
  }

  modalClose.addEventListener('click', closeModal);

  modalMask.addEventListener('click', function (e) {
    if (e.target === modalMask) closeModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (lightbox && lightbox.classList.contains('show')) {
      closeLightbox();
      return;
    }
    if (settingsMask && settingsMask.classList.contains('show')) {
      closeSettings();
      return;
    }
    if (modalMask.classList.contains('show')) {
      closeModal();
    }
  });

  /* ============ 搜索 ============ */
  let navSearchTimer = null;
  searchEl.addEventListener('input', function (e) {
    clearTimeout(navSearchTimer);
    const value = e.target.value;
    navSearchTimer = setTimeout(function () {
      if (!NAV_CATEGORIES.length) return;
      navKeyword = value;
      if (navKeyword.trim() && activeGroupId !== 'all') {
        activeGroupId = 'all';
        updateGroupNavActive();
      }
      renderCards();
    }, 120);
  });

  if (noticeSearchEl) {
    let noticeSearchTimer = null;
    noticeSearchEl.addEventListener('input', function (e) {
      clearTimeout(noticeSearchTimer);
      const value = e.target.value;
      noticeSearchTimer = setTimeout(function () {
        noticeKeyword = value;
        renderNotices();
      }, 120);
    });
  }

  /* ============ 快捷键 / 聚焦导航搜索 ============ */
  (function initSlashShortcut() {
    document.addEventListener('keydown', function (e) {
      if (e.key !== '/') return;

      const active = document.activeElement;
      const tag = (active && active.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (active && active.isContentEditable)) {
        return;
      }
      if (modalMask && modalMask.classList.contains('show')) return;
      if (settingsMask && settingsMask.classList.contains('show')) return;
      if (lightbox && lightbox.classList.contains('show')) return;

      e.preventDefault();
      if (navSearchEl && !navSearchEl.hidden) {
        searchEl.focus();
        searchEl.select();
      }
    });
  })();

  /* ============ 主题（浅 / 深 + 跟随系统） ============ */
  function isFollowSystem() {
    try {
      var v = localStorage.getItem('site.theme');
      return !v || v === 'system';
    } catch (e) {
      return true;
    }
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

  /* ============ Toast ============ */
  let toastTimer = null;
  function showToast(msg, isError) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.toggle('error', !!isError);
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 2200);
  }

  /* ============ 导出 / 导入配置 ============ */
  function exportSettings() {
    var themeVal = 'system';
    try { themeVal = localStorage.getItem('site.theme') || 'system'; } catch (e) {}

    var data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      theme: themeVal,
      settings: SETTINGS
    };

    var json = JSON.stringify(data, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);

    var d = new Date();
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    var dateStr = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate())
                + '-' + pad(d.getHours()) + pad(d.getMinutes());

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
        if (!data || typeof data !== 'object') {
          throw new Error('文件内容不是有效的配置对象');
        }

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

        if (typeof incoming.themeColor === 'string') {
          var okColor = THEME_COLORS.some(function (c) { return c.id === incoming.themeColor; });
          if (okColor) merged.themeColor = incoming.themeColor;
        }
        if (typeof incoming.noticeBar === 'boolean') {
          merged.noticeBar = incoming.noticeBar;
        }
        if (typeof incoming.openInNewTab === 'boolean') {
          merged.openInNewTab = incoming.openInNewTab;
        }
        if (typeof incoming.defaultCategory === 'string') {
          merged.defaultCategory = incoming.defaultCategory;
        }

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
    reader.onerror = function () {
      showToast('导入失败：读取文件出错', true);
    };
    reader.readAsText(file);
  }

  /* ============ 设置面板 ============ */
  function applySettings() {
    document.documentElement.dataset.themeColor = SETTINGS.themeColor || 'default';

    if (NOTICES.length) {
      renderNoticeBar();
    } else if (!SETTINGS.noticeBar) {
      noticeBar.hidden = true;
      stopBarTimer();
    }

    // 只重渲染卡片（打开方式可能变了），不重建大类 tab / 分组 chips
    if (NAV_CATEGORIES.length) {
      renderCards();
    }
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

    if (setFollowSystemEl) {
      setFollowSystemEl.checked = isFollowSystem();
    }

    if (setNoticeBarEl) {
      setNoticeBarEl.checked = !!SETTINGS.noticeBar;
    }

    if (setDefaultCategoryEl) {
      const current = SETTINGS.defaultCategory || '';
      let html = '<option value="">跟随数据</option>';
      NAV_CATEGORIES.forEach(function (c) {
        html += '<option value="' + esc(c.id) + '">' + esc(c.title) + '</option>';
      });
      setDefaultCategoryEl.innerHTML = html;
      setDefaultCategoryEl.value = current;
    }

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

    if (settingsClose) {
      settingsClose.addEventListener('click', closeSettings);
    }

    if (settingsMask) {
      settingsMask.addEventListener('click', function (e) {
        if (e.target === settingsMask) closeSettings();
      });
    }

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

    if (setDefaultCategoryEl) {
      setDefaultCategoryEl.addEventListener('change', function () {
        SETTINGS.defaultCategory = setDefaultCategoryEl.value || '';
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

    if (settingsExportEl) {
      settingsExportEl.addEventListener('click', exportSettings);
    }

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
        SETTINGS = Object.assign({}, DEFAULT_SETTINGS);
        saveSettings();
        setFollowSystem(true);
        applySettings();
        syncSettingsUI();
      });
    }
  }

  function openSettings() {
    if (!settingsMask) return;
    syncSettingsUI();
    settingsMask.classList.add('show');
    settingsMask.setAttribute('aria-hidden', 'false');
    document.body.classList.add('settings-open');
  }

  function closeSettings() {
    if (!settingsMask) return;
    settingsMask.classList.remove('show');
    settingsMask.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('settings-open');
  }

  /* ============ 回到顶部 ============ */
  function updateBackTop() {
    backTopBtn.classList.toggle('show', window.scrollY > 400);
  }

  window.addEventListener('scroll', updateBackTop, { passive: true });

  backTopBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ============ 点击品牌 ============ */
  (function initBrandHome() {
    const brand = document.querySelector('.brand');
    if (!brand) return;
    brand.addEventListener('click', function (e) {
      if (window.scrollY <= 8) return;
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  })();

  /* ============ 公众号二维码 ============ */
  function bindQRCodeFallback() {
    const qrEl = document.getElementById('qrCode');
    if (!qrEl) return;
    const img = qrEl.querySelector('img');

    if (!img) {
      qrEl.innerHTML = makeQRCode(20241018);
      return;
    }

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

  /* ============ 加载远程 JSON ============ */
  async function loadData() {
    try {
      const navRes = await fetchWithTimeout(NAV_URL);
      if (!navRes.ok) throw new Error('导航 JSON 加载失败：' + navRes.status);

      const navData = await navRes.json();

      if (Array.isArray(navData)) {
        NAV_CATEGORIES = [{
          id: 'all',
          title: '全部导航',
          default: true,
          groups: navData
        }];
      } else if (navData && Array.isArray(navData.categories)) {
        NAV_CATEGORIES = navData.categories;
      } else {
        NAV_CATEGORIES = [];
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

      NOTICES = await noticeRes.json();
      TAGS = ['全部', ...new Set(NOTICES.map(n => n.tag))];

      renderNoticeTabs();
      renderNotices();
      renderNoticeBar();
    } catch (err) {
      console.error(err);
      noticeListEl.innerHTML = '';
      noticeEmptyEl.hidden = false;
      noticeEmptyEl.textContent = '公告数据加载失败';
      noticeBar.hidden = true;
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
  loadData();
})();