// ============================================================
// HTTP 请求工具（TypeScript）
// 包含 Axios 封装 + SSE 流式请求
// ============================================================
import axios from 'axios'

// ============================================================
// 创建 Axios 实例
// ============================================================

const request = axios.create({
  // 基础 URL：开发环境通过 Vite proxy 转发到后端，生产环境需配置 nginx
  baseURL: '/api/travel',
  // 超时时间：60 秒（AI 生成需要时间）
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// ============================================================
// 请求拦截器
// ============================================================

request.interceptors.request.use(
  config => {
    // 自动从 localStorage 读取 token 并添加到请求头
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// ============================================================
// 响应拦截器
// ============================================================

// 直接返回 response.data，调用方不用再取 .data
// 注意：4xx/5xx 状态码也会进入这里，因为我们在 error 处理中也返回了数据
request.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response && error.response.data) {
      return Promise.reject(error.response.data)
    }
    return Promise.reject(error)
  }
)

// ============================================================
// 导出 HTTP 方法
// ============================================================

/** POST 请求 */
export function post(url: string, data?: unknown): Promise<any> {
  return request.post(url, data)
}

/** GET 请求 */
export function get(url: string, params?: unknown): Promise<any> {
  return request.get(url, { params })
}

/** DELETE 请求 */
export function del(url: string): Promise<any> {
  return request.delete(url)
}

/** PATCH 请求 */
export function patch(url: string, data?: unknown): Promise<any> {
  return request.patch(url, data)
}

// ============================================================
// Auth 专用请求实例（baseURL = /api/auth，带 Token 拦截器）
// ============================================================

const authRequest = axios.create({
  baseURL: '/api/auth',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

authRequest.interceptors.request.use(
  config => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

authRequest.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response && error.response.data) {
      return Promise.reject(error.response.data)
    }
    return Promise.reject(error)
  }
)

export function authPost(url: string, data?: unknown): Promise<any> {
  return authRequest.post(url, data)
}

export function authGet(url: string, params?: unknown): Promise<any> {
  return authRequest.get(url, { params })
}

// ============================================================
// 类型定义
// ============================================================

/** SSE 流式请求的回调函数类型 */
type ChunkCallback = (chunk: string) => void
type CompleteCallback = (data?: any) => void
type ErrorCallback = (error: string) => void

// ============================================================
// SSE 流式请求（核心功能）
// ============================================================

/**
 * 流式请求 - 用于 AI 对话
 *
 * 为什么用原生 fetch 而不是 Axios？
 * - Axios 不支持读取流式响应（response.body.getReader）
 * - fetch 原生支持 ReadableStream
 *
 * SSE 数据格式：
 *   data: {"type":"chunk","content":"北京"}  → 调用 onChunk
 *   event: end                                → 调用 onComplete
 *   data: {"done":true}                       → 调用 onComplete
 *
 * @param url     - 接口路径（会自动拼接 /api/travel/）
 * @param data    - 请求体数据
 * @param onChunk - 收到数据块时调用
 * @param onComplete - 全部接收完毕时调用
 * @param onError - 发生错误时调用
 */
export async function fetchStream(
  url: string,
  data: unknown,
  onChunk: ChunkCallback,
  onComplete: CompleteCallback,
  onError: ErrorCallback
): Promise<void> {
  const controller = new AbortController()

  try {
    // 构建请求头：携带 JWT Token（与 Axios 拦截器保持一致）
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const token = localStorage.getItem('auth_token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`/api/travel/${url}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      signal: controller.signal
    })

    if (!response.ok || !response.body) {
      onError(`请求失败: HTTP ${response.status}`)
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        onComplete()
        break
      }

      const chunk = decoder.decode(value, { stream: true })
      buffer += chunk
      const lines = buffer.split('\n')
      // 最后一行可能不完整，暂存到下一次循环拼接
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue

        try {
          // event: 开头 → 结束事件
          if (trimmedLine.startsWith('event:')) {
            const eventType = trimmedLine.substring(6).trim()
            if (eventType === 'end') onComplete()
            continue
          }

          // data: 开头 → 数据块
          if (trimmedLine.startsWith('data:')) {
            const jsonStr = trimmedLine.substring(5).trim()
            if (!jsonStr) continue

            const jsonData = JSON.parse(jsonStr)

            if (jsonData.type === 'chunk') {
              onChunk(jsonData.content)
            } else if (jsonData.error) {
              onError(jsonData.error)
            } else if (jsonData.type === 'complete') {
              onComplete(jsonData.data)
            } else if (jsonData.done) {
              onComplete(jsonData.data)
            }
          }
        } catch {
          console.error('SSE 数据解析异常:', trimmedLine)
        }
      }
    }
  } catch (err: any) {
    console.error('fetchStream 错误:', err)
    if (err.name !== 'AbortError') {
      onError(err.message || '网络请求失败')
    }
  }
}
