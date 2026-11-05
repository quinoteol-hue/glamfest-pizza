// Shows the "Your pizza is ready" pop-up sent by the kitchen, even when the page is closed.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  const title = data.title || 'Your pizza is ready! 🍕';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || 'Come and collect it from the pizza table.',
    tag: data.tag || 'pizza-ready',
    renotify: true,
    requireInteraction: true,
    vibrate: [400, 150, 400, 150, 800],
    icon: '/assets/pizza-icon.png',
    badge: '/assets/pizza-badge.png',
    data: { url: data.url || '/' }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of all) {
      if (new URL(client.url).origin === self.location.origin) { await client.focus(); return; }
    }
    await self.clients.openWindow(url);
  })());
});
