/* =========================================================
   卡王的导航 - Service Worker
   ---------------------------------------------------------
   缓存策略：
   - 预缓存（Precache）: index.html, css, js, manifest, 图标
   - 网络优先（Network First）: data/*.json（导航/公告/友站需要最新数据）
   - 缓存优先（Cache First）: images/*, 字体等静态资源
   - 离线回退: 网络不可用时返回缓存的 index.html
   ========================================================= */

const CACHE_VERSION = 'v1';
const CACHE_NAME = 'kawang-nav-' + CACHE_VERSION;

/* 预缓存的核心资源（首次安装时下载） */
const PRECACHE_URLS = [
  './',
  './index.html',
  './css/style.css',
  './js/script.js',
  './manifest.json',
  './data/nav.json',
  './data/notices.json',
  './data/friends.json',
  './images/icons/icon-192.png',
  './images/icons/icon-512.png',
  './images/icons/apple-touch-icon.png'
];

/* ---------- 安装：预缓存核心资源 ---------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

/* ---------- 激活：清理旧版本缓存 ---------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

/* ---------- 拦截请求：按资源类型选择策略 ---------- */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  /* 只处理同源请求 */
  if (url.origin !== self.location.origin) {
    return;
  }

  /* 1. data/*.json → Network First（优先网络，离线回退缓存） */
  if (url.pathname.includes('/data/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  /* 2. 页面导航请求 → Network First + 离线回退 index.html */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('./index.html');
      })
    );
    return;
  }

  /* 3. 其他静态资源（CSS/JS/图片/字体）→ Cache First */
  event.respondWith(cacheFirst(request));
});

/* ---------- 策略：Network First ---------- */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    /* 网络成功，更新缓存 */
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch (err) {
    /* 网络失败，回退缓存 */
    const cached = await caches.match(request);
    return cached || new Response('离线状态，暂无数据', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

/* ---------- 策略：Cache First ---------- */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  /* 只缓存成功的响应 */
  if (response && response.status === 200) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}