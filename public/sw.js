// FIT INN Admin Service Worker for Push Notifications

const CACHE_NAME = 'fitinn-admin-v3';

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(clients.claim());
});

// Push event - receive push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = {
    title: 'FIT INN Admin',
    body: 'Neue Benachrichtigung',
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: 'default',
    url: '/admin/tickets'
  };

  if (event.data) {
    try {
      const textData = event.data.text();
      console.log('[SW] Raw push data:', textData);
      const jsonData = JSON.parse(textData);
      console.log('[SW] Parsed push data:', JSON.stringify(jsonData));
      data = { ...data, ...jsonData };
    } catch (e) {
      console.log('[SW] Parse error:', e.message);
      data.body = event.data.text() || 'Neue Benachrichtigung';
    }
  } else {
    console.log('[SW] No event.data');
  }

  console.log('[SW] Final notification data:', JSON.stringify(data));

  // Basic options that work on all platforms including iOS Safari
  const options = {
    body: data.body,
    icon: data.icon || '/favicon.png',
    badge: data.badge || '/favicon.png',
    tag: data.tag || 'default',
    renotify: true,
    data: {
      url: data.url || '/admin/tickets',
      ticketId: data.ticketId
    }
  };

  // Only add actions if not on iOS (iOS Safari doesn't support notification actions)
  const isIOS = /iPad|iPhone|iPod/.test(self.navigator?.userAgent || '');
  if (!isIOS) {
    options.actions = [
      { action: 'open', title: 'Öffnen' },
      { action: 'dismiss', title: 'Schließen' }
    ];
    options.vibrate = [200, 100, 200];
    options.requireInteraction = data.requireInteraction || false;
  }

  console.log('[SW] isIOS:', isIOS, 'Options:', JSON.stringify(options));

  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => {
        console.log('[SW] Notification shown successfully');
      })
      .catch((error) => {
        console.error('[SW] Failed to show notification:', error);
      })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/admin/tickets';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes('/admin') && 'focus' in client) {
          client.focus();
          if (event.notification.data?.ticketId) {
            client.navigate(`/admin/tickets/${event.notification.data.ticketId}`);
          }
          return;
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Push subscription change event
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed');
  event.waitUntil(
    self.registration.pushManager.subscribe({ userVisibleOnly: true })
      .then((subscription) => {
        return fetch('/api/admin/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });
      })
  );
});
