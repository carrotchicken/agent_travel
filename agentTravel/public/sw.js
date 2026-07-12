// ============================================================
// PWA Service Worker
// 功能：缓存静态资源，支持离线访问
// 当前为基础版本，生产环境可扩展为 Workbox 完整方案
// ============================================================
const CACHE_NAME = 'travel-assistant-v1'

// 需要预缓存的资源
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
]

// 安装阶段：预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS)
    })
  )
})

// 激活阶段：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    })
  )
})

// 请求拦截：优先从缓存读取（Network First 策略适合 API 数据）
self.addEventListener('fetch', (event) => {
  // 跳过 API 请求（由网络处理）
  if (event.request.url.includes('/api/')) return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request)
    })
  )
})
