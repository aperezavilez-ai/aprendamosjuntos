const CACHE_NAME = 'aprendamos-juntos-v2'
const STATIC_CACHE = 'aprendamos-static-v2'

const STATIC_ASSETS = [
  '/offline',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.json',
]

// Instalar el SW y cachear recursos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignorar errores en recursos que no estén disponibles
      })
    })
  )
  self.skipWaiting()
})

// Activar y limpiar caches antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// Estrategia: Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // No cachear API calls ni supabase
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('anthropic') ||
    url.hostname.includes('graph.facebook') ||
    request.method !== 'GET'
  ) {
    return
  }

  // Archivos estáticos: cache first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Páginas: network first, fallback to cache, fallback to offline
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/offline').then((offlinePage) => {
              if (offlinePage) return offlinePage
              return new Response(
              `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sin conexión - Aprendamos Juntos</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #F8FAFC; color: #1E293B; }
    .container { text-align: center; padding: 32px; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
    p { color: #64748B; font-size: 14px; margin-bottom: 24px; }
    button { background: #6366F1; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-size: 14px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📱</div>
    <h1>Sin conexión a internet</h1>
    <p>Verifica tu conexión y vuelve a intentarlo.</p>
    <button onclick="window.location.reload()">Reintentar</button>
  </div>
</body>
</html>`,
                { headers: { 'Content-Type': 'text/html' } }
              )
            })
          }
          return new Response('Offline', { status: 503 })
        })
      })
  )
})

// Sincronización en background cuando vuelve la conexión
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    console.log('Background sync triggered')
  }
})

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body: data.mensaje || data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    tag: data.tag || 'terapia-os',
    data: { url: data.url || '/dashboard' },
    actions: data.acciones || [],
  }

  event.waitUntil(
    self.registration.showNotification(data.titulo || 'Aprendamos Juntos', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      const client = windowClients.find((c) => c.url.includes(url))
      if (client) return client.focus()
      return clients.openWindow(url)
    })
  )
})
