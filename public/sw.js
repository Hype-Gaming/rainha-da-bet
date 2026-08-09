const CACHE_NAME = 'rainha-da-bet-v2';
const VERSION_URL = '/version.json';
const CHECK_INTERVAL = 30000; // Verificar a cada 30 segundos

// ATENÇÃO: todas as URLs aqui precisam existir de verdade. cache.addAll()
// rejeita por inteiro se QUALQUER uma falhar, o install quebra e o Service
// Worker nunca ativa — o que desliga o push junto.
const urlsToCache = [
  '/',
  '/auth/login',
  '/logo.png',
  '/robots.txt'
];

let currentVersion = null;

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
  // Força ativação imediata
  self.skipWaiting();
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Pega controle de todas as abas imediatamente
      return self.clients.claim();
    }).then(() => {
      checkForUpdates();
    })
  );
});

// Fetch event - network first, then cache
self.addEventListener('fetch', (event) => {
  // Não cachear requisições de API
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('grupoautoma.com') ||
      event.request.url.includes('version.json')) {
    return event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request).then((cachedResponse) => cachedResponse || Response.error());
      })
    );
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se conseguiu da rede, atualiza o cache
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Se falhou, tenta do cache
        return caches.match(event.request);
      })
  );
});

// Verificar nova versão
async function checkForUpdates() {
  try {
    const response = await fetch(VERSION_URL + '?t=' + Date.now(), {
      cache: 'no-store'
    });
    
    if (!response.ok) return;
    
    const data = await response.json();
    const newVersion = data.version;
    
    if (currentVersion === null) {
      currentVersion = newVersion;
      console.log('[SW] Version initialized:', currentVersion);
      return;
    }
    
    if (newVersion !== currentVersion) {
      console.log('[SW] New version detected:', newVersion, '(current:', currentVersion, ')');
      currentVersion = newVersion;
      
      // Notifica todas as abas abertas
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(client => {
        client.postMessage({
          type: 'UPDATE_AVAILABLE',
          version: newVersion
        });
      });
    }
  } catch (error) {
    console.log('[SW] Error checking for updates:', error);
  }
}

// Verificar atualizações periodicamente
setInterval(checkForUpdates, CHECK_INTERVAL);

// Receber mensagens das páginas
self.addEventListener('message', (event) => {
  if (event.data === 'CHECK_UPDATE') {
    checkForUpdates();
  }
  
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data === 'FORCE_REFRESH') {
    // Limpa cache e força refresh em todas as abas
    caches.delete(CACHE_NAME).then(() => {
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'REFRESH_PAGE' });
        });
      });
    });
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  // Payload enviado pelo servidor como JSON: { title, body, url, icon }.
  // Mantém compatibilidade com texto cru e com push sem payload.
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'Rainha da Bet';
  const options = {
    body: data.body || 'Você tem uma nova notificação!',
    icon: data.icon || '/logo.png',
    badge: '/logo.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now()
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event - foca uma aba aberta ou abre a URL do payload
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(targetUrl);
          return;
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
