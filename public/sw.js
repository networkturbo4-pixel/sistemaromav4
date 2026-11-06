/* =============================================================================
 * SISTEMA ROMA V4 - SERVICE WORKER PARA PWA Y PUSH NOTIFICATIONS MÓVILES
 * Compatible con Android, iOS 16.4+ (PWA en pantalla de inicio) y Navegadores Modernos
 * ============================================================================= */

self.addEventListener('install', (event) => {
  // Activar inmediatamente el nuevo service worker sin esperar
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Tomar el control de todos los clientes de inmediato
  event.waitUntil(self.clients.claim());
});

// 1. MANEJADOR DE PUSH NOTIFICATIONS DESDE EL SERVIDOR (Web Push API)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Notificación del Sistema ROMA', body: event.data.text() };
    }
  }

  const title = data.title || 'Sistema ROMA SaaS';
  const options = {
    body: data.body || 'Tienes una nueva notificación de tu agencia.',
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    vibrate: data.vibrate || [100, 50, 100, 50, 150],
    data: data.data || { url: '/' },
    tag: data.tag || 'roma-general',
    renotify: true,
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Ver detalle' },
      { action: 'close', title: 'Cerrar' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 2. CLIC EN LA NOTIFICACIÓN EN EL CELULAR O ESCRITORIO
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const notifData = event.notification.data || {};
  let targetUrl = notifData.link || notifData.url || '/';

  // Si tiene un módulo o link especificado, abrir en esa ruta
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Si ya hay una ventana o PWA abierta, enfocarla y navegar
        for (const client of windowClients) {
          if ('focus' in client) {
            client.focus();
            if (client.navigate && targetUrl) {
              return client.navigate(targetUrl);
            }
            return;
          }
        }
        // Si la PWA estaba cerrada, abrir una nueva ventana con la URL
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// 3. MENSAJES LOCALES DESDE LA APLICACIÓN WEB
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title || 'Sistema ROMA', options || {});
  } else if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
