// #87 通知（Web Push）を受け取って表示し、タップでその募集を開く Service Worker
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const id = Number(data.event_id);
  event.waitUntil(self.registration.showNotification(typeof data.title === 'string' ? data.title : 'このゆびとまれ', {
    body: typeof data.body === 'string' ? data.body : '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: typeof data.tag === 'string' ? data.tag : undefined,
    data: { event_id: Number.isInteger(id) && id > 0 ? id : null },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const id = event.notification.data && event.notification.data.event_id;
  const url = new URL(Number.isInteger(id) && id > 0 ? `/?event=${id}` : '/', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // 開いている画面があれば、その画面で募集を開く（読み込み直し）。無ければ新しく開く
    for (const client of windows) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      try {
        const opened = 'navigate' in client ? await client.navigate(url) : null;
        if (opened) return opened.focus();
      } catch { /* 操作できない画面は飛ばす */ }
    }
    return self.clients.openWindow(url);
  })());
});
