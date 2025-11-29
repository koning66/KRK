const CACHE_NAME = 'bodymetrics-cache-v1';
const URLS_TO_CACHE = ['/', '/index.html'];

// 安裝：預先把首頁丟進快取
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

// 啟用：之後可以做 cache 清理（這裡先簡單略過）
self.addEventListener('activate', () => {
  // 可選：清理舊 cache
});

// 必要的：fetch 事件處理（Chrome 查安裝條件會看這個）
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // 先用快取，沒有再打網路
      return response || fetch(event.request);
    })
  );
});