/* =========================================================
   卡王的导航 - 主脚本
   ---------------------------------------------------------
   图片预留：
   - 顶栏 logo / 头像：images/apple-touch-icon.png（HTML 中固定）
   - QQ/邮箱/B站/抖音：images/qq.png 等（HTML 中固定）
   - 公众号二维码：images/qr.png（HTML 中固定，缺失时回退假码）
   - 导航图标：nav.json 的 icon 字段
   - 友站图标：friends.json 的 icon 字段
   图片不存在时自动隐藏，回退到字母/渐变占位。

   数据文件：
   - nav.json       导航分组
   - notices.json   公告
   - friends.json   友站（可选，缺失不影响主页面）
   ========================================================= */

(function () {
  'use strict';

  /* ============ 远程 JSON 地址 ============ */
  const NAV_URL = './nav.json';
  const NOTICE_URL = './notices.json';
  const FRIENDS_URL = './friends.json';

  /* ============ 数据容器 ============ */
  let NAV_GROUPS = [];
  let NOTICES = [];
  let FRIENDS = [];
  let TAGS = ['全部'];

  /* ============ 状态 ============ */
  let keyword = '';
  let noticeFilter = '全部';
  let activeGroupId = 'all';
  let lastFocused = null;

  const IS_TOUCH = window.matchMedia('(hover: none)').matches;

  /* ============ 元素 ============ */
  const navGroupsEl   = document.getElementById('navGroups');
  const navEmptyEl    = document.getElementById('navEmpty');
  const siteCountEl   = document.getElementById('siteCount');
  const groupNavEl    = document.getElementById('groupNav');
  const navTipEl      = document.getElementById('navTip');

  const friendsSectionEl = document.getElementById('friendsSection');
  const friendsGridEl    = document.getElementById('friendsGrid');

  const noticeBar     = document.getElementById('noticeBar');
  const barTag        = document.getElementById('barTag');
  const barText       = document.getElementById('barText');
  const barDots       = document.getElementById('barDots');
  const barClose      = document.getElementById('barClose');

  const noticeListEl  = document.getElementById('noticeList');
  const noticeEmptyEl = document.getElementById('noticeEmpty');
  const noticeTabsEl  = document.getElementById('noticeTabs');

  const searchEl      = document.getElementById('search');
  const themeBtn      = document.getElementById('themeBtn');
  const backTopBtn    = document.getElementById('backTop');

  const modalMask     = document.getElementById('modalMask');
  const modalTag      = document.getElementById('modalTag');
  const modalTitle    = document.getElementById('modalTitle');
  const modalBody     = document.getElementById('modalBody');
  const modalActions  = document.getElementById('modalActions');
  const modalClose    = document.getElementById('modalClose');

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

  /* ---------- 图片加载失败处理 ---------- */
  function guardImg(img) {
    if (!img) return;
    function fail() { img.style.display = 'none'; }
    if (img.complete && img.naturalWidth === 0) { fail(); return; }
    img.addEventListener('error', fail, { once: true });
  }

  function guardImgs(root) {
    (root || document).querySelectorAll('img[data-fallback]').forEach(guardImg);
  }

  /* ---------- 二维码占位（图片缺失时使用） ---------- */
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

  /* ============ 导航渲染 ============ */
  function renderNav() {
    const q = keyword.trim().toLowerCase();
    let html = '';
    let shown = 0;

    let chips = '<button class="chip' + (activeGroupId === 'all' ? ' active' : '') +
                '" type="button" data-group="all">全部</button>';
    NAV_GROUPS.forEach(function (g) {
      chips += '<button class="chip' + (activeGroupId === g.id ? ' active' : '') +
               '" type="button" data-group="' + esc(g.id) + '">' + esc(g.title) + '</button>';
    });
    groupNavEl.innerHTML = chips;

    groupNavEl.querySelectorAll('.chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        activeGroupId = chip.dataset.group;
        renderNav();
      });
    });

    NAV_GROUPS.forEach(function (group) {
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
                 'href="' + esc(it.url || '#') + '" target="_blank" rel="noopener">' +
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
    siteCountEl.textContent = shown + ' 个站点';

    guardImgs(navGroupsEl);
    bindNavTips();
  }

  /* ============ 友站渲染（底部横条，只显示图标 + 名字） ============ */
  function renderFriends() {
    if (!friendsSectionEl || !friendsGridEl) return;

    // 过滤掉 hidden: true 的示例条目（用于在 friends.json 里保留格式注释）
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

  /* ============ 公告条：置顶公告轮换 ============ */
  const BAR_INTERVAL = 7000;
  let barIndex = 0;
  let barTimer = null;
  let barPaused = false;
  let barDismissed = false;

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
    if (barDismissed) { noticeBar.hidden = true; stopBarTimer(); return; }

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

  barClose.addEventListener('click', function () {
    barDismissed = true;
    noticeBar.hidden = true;
    stopBarTimer();
  });

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
    const q = keyword.trim().toLowerCase();

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

      if (sec.type === 'kv') {
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
    if (e.key === 'Escape' && modalMask.classList.contains('show')) {
      closeModal();
    }
  });

  /* ============ 搜索 ============ */
  let searchTimer = null;
  searchEl.addEventListener('input', function (e) {
    clearTimeout(searchTimer);
    const value = e.target.value;
    searchTimer = setTimeout(function () {
      keyword = value;
      if (keyword.trim() && activeGroupId !== 'all') {
        activeGroupId = 'all';
      }
      renderNav();
      renderNotices();
    }, 120);
  });

  /* ============ 主题 ============ */
  themeBtn.addEventListener('click', function () {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('site.theme', next); } catch (e) {}
  });

  /* ============ 回到顶部 ============ */
  function updateBackTop() {
    backTopBtn.classList.toggle('show', window.scrollY > 400);
  }

  window.addEventListener('scroll', updateBackTop, { passive: true });

  backTopBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ============ 公众号二维码：图片缺失时回退到占位假码 ============ */
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

    if (img.complete && img.naturalWidth === 0) { fallback(); return; }
    img.addEventListener('error', fallback, { once: true });
  }

  /* ============ 加载远程 JSON ============ */
  async function loadData() {
    try {
      const [navRes, noticeRes] = await Promise.all([
        fetch(NAV_URL),
        fetch(NOTICE_URL)
      ]);

      if (!navRes.ok) throw new Error('导航 JSON 加载失败：' + navRes.status);
      if (!noticeRes.ok) throw new Error('公告 JSON 加载失败：' + noticeRes.status);

      NAV_GROUPS = await navRes.json();
      NOTICES = await noticeRes.json();

      // 友站数据为可选，失败不影响主页面
      try {
        const fRes = await fetch(FRIENDS_URL);
        if (fRes.ok) {
          const data = await fRes.json();
          FRIENDS = Array.isArray(data) ? data : [];
        }
      } catch (e) {
        FRIENDS = [];
      }

      TAGS = ['全部', ...new Set(NOTICES.map(n => n.tag))];

      renderNoticeTabs();
      renderNav();
      renderNotices();
      renderNoticeBar();
      renderFriends();
      updateBackTop();
    } catch (err) {
      console.error(err);
      navGroupsEl.innerHTML =
        '<div class="empty empty-lg">数据加载失败，请检查 nav.json / notices.json 路径，' +
        '并使用本地服务器打开页面。</div>';
      noticeListEl.innerHTML = '';
      noticeEmptyEl.hidden = false;
      noticeEmptyEl.textContent = '公告数据加载失败';
      noticeBar.hidden = true;
      siteCountEl.textContent = '';
      if (friendsSectionEl) friendsSectionEl.hidden = true;
    }
  }

  /* ============ 启动 ============ */
  guardImgs(document);
  bindQRCodeFallback();
  updateBackTop();
  loadData();
})();