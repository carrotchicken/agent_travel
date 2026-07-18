// ============================================================
// PWA Service Worker
// 功能：缓存静态资源，支持离线访问
// 策略：index.html 走 Network First，静态资源走 Cache First
// ============================================================
const CACHE_NAME = 'travel-assistant-v2'

// 静态资源缓存（文件名带 hash，可放心用 Cache First）
const STATIC_CACHE = 'travel-static-v2'

// 安装阶段：预缓存核心资源
self.addEventListener('install', (event) => {
  // 立即接管，不等待旧 SW 释放
  self.skipWaiting()
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(['/manifest.json', '/favicon.svg'])
    })
  )
})

// 激活阶段：清理旧缓存 + 立即接管所有页面
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 清理所有旧版本缓存
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      )
      // 立即接管所有客户端页面
      await self.clients.claim()
    })()
  )
})

// 请求拦截
self.addEventListener('fetch', (event) => {
  // 跳过 API 请求和 SSE 请求（由网络直接处理）
  if (event.request.url.includes('/api/')) return

  const url = new URL(event.request.url)

  // 导航请求（HTML 页面）：Network First，确保总是最新
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // 更新缓存
          const cloned = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned))
          return response
        })
        .catch(() => {
          // 离线时回退到缓存
          return caches.match(event.request)
        })
    )
    return
  }

  // 静态资源：Cache First（文件名带 hash，不会过期）
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        // 缓存新发现的静态资源
        const cloned = response.clone()
        caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, cloned))
        return response
      })
    })
  )
})
