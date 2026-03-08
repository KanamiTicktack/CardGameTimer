const CACHE_NAME = 'versus-timer-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// 1. インストール時にキャッシュを保存し、すぐに新しいService Workerを待機状態からアクティブにする
self.addEventListener('install', event => {
  self.skipWaiting(); // ユーザーがタブを閉じなくても即座に更新を適用する
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. アクティブになったら、古いバージョンのキャッシュを削除してクリーンにする
self.addEventListener('activate', event => {
  event.waitUntil(clients.claim()); // コントロールを即座に奪う
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('古いキャッシュを削除しました:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. ネットワークファースト（Network First）戦略
self.addEventListener('fetch', event => {
  // GETリクエスト以外（ブラウザの拡張機能など）はスルーする
  if (event.request.method !== 'GET') return;

  event.respondWith(
    // まずネットワークから最新のファイルを取得しにいく
    fetch(event.request)
      .then(response => {
        // 取得に成功したら、それをそのまま返しつつ、裏でキャッシュも最新版に上書き更新する
        if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // もしオフライン（機内モードや電波がない状態）で取得に失敗したら、保存しておいたキャッシュを返す
        return caches.match(event.request);
      })
  );
});
