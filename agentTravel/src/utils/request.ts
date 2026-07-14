// ============================================================
// HTTP 请求工具（TypeScript）
// 包含 Axios 封装 + SSE 流式请求 + 统一错误处理
// ============================================================
import axios, { type AxiosError } from 'axios'

// 硬编码线上后端域名，解决静态托管不读取.env.production导致接口404
const API_HOST = 'https://travelserver-281839-8-1429643134.sh.run.tcloudbase.com'

// ============================================================
// 错误处理工具
// ============================================================

const HTTP_ERROR_MAP: Record<number, string> = {
  400: '请求参数有误',
  401: '登录已过期，请重新登录',
  403: '没有访问权限',
  404: '请求的资源不存在',
  429: '请求过于频繁，请稍后再试（每分钟最多 5 次）',
  500: '服务器内部错误，请稍后重试',
  502: 'AI 服务暂时不可用，请稍后重试'
}

/** 401 时清除登录态并跳转登录页 */
function handleUnauthorized() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_user')
  const path = window.location.pathname
  if (!path.includes('/login') && !path.includes('/register')) {
    const redirect = encodeURIComponent(path + window.location.search)
    window.location.href = `/login?redirect=${redirect}`
  }
}

/** 从各类错误对象中提取用户可读的错误信息 */
export function getErrorMessage(err: unknown): string {
  if (!err) return '未知错误'
  if (typeof err === 'string') return err

  if (!navigator.onLine) {
    return '网络已断开，请检查网络连接'
  }

  if (err instanceof Error) {
    return err.message || '请求失败，请稍后重试'
  }

  const e = err as Record<string, unknown>
  const status = e.status as number | undefined

  if (status && HTTP_ERROR_MAP[status]) {
    return HTTP_ERROR_MAP[status]
  }

  return (e.error as string) || (e.message as string) || '请求失败，请稍后重试'
}

function handleAxiosError(error: AxiosError) {
  const status = error.response?.status
  const data = error.response?.data as Record<string, unknown> | undefined

  if (status === 401) {
    handleUnauthorized()
  }

  const message = (data?.error as string) ||
    (data?.message as string) ||
    (status && HTTP_ERROR_MAP[status]) ||
    error.message ||
    '请求失败，请稍后重试'

  return Promise.reject({ message, status, ...data })
}

// ============================================================
// 创建 Axios 实例
// ============================================================

const request = axios.create({
  baseURL: `${API_HOST}/api/travel`,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
})

request.interceptors.request.use(
  config => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

request.interceptors.response.use(
  response => response.data,
  error => handleAxiosError(error)
)

// ============================================================
// 导出 HTTP 方法
// ============================================================

export function post(url: string, data?: unknown): Promise<any> {
  return request.post(url, data)
}

export function get(url: string, params?: unknown): Promise<any> {
  return request.get(url, { params })
}

export function del(url: string): Promise<any> {
  return request.delete(url)
}

export function patch(url: string, data?: unknown): Promise<any> {
  return request.patch(url, data)
}

// ============================================================
// Auth 专用请求实例
// ============================================================

const authRequest = axios.create({
  baseURL: `${API_HOST}/api/auth`,
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
  error => handleAxiosError(error)
)

export function authPost(url: string, data?: unknown): Promise<any> {
  return authRequest.post(url, data)
}

export function authGet(url: string, params?: unknown): Promise<any> {
  return authRequest.get(url, { params })
}

// ============================================================
// SSE 流式请求
// ============================================================

type ChunkCallback = (chunk: string) => void
type CompleteCallback = (data?: any) => void
type ErrorCallback = (error: string) => void

export interface StreamHandle {
  abort: () => void
}

/**
 * 解析 SSE 响应体中的错误信息（非 200 时响应可能是 JSON）
 */
async function parseStreamHttpError(response: Response): Promise<string> {
  const fallback = HTTP_ERROR_MAP[response.status] || `请求失败: HTTP ${response.status}`

  try {
    const body = await response.json()
    return (body.error as string) || (body.message as string) || fallback
  } catch {
    return fallback
  }
}

/**
 * 流式请求 - 用于 AI 对话 / 行程生成
 * 返回 abort 句柄，调用方可在组件卸载时取消请求
 */
export function fetchStream(
  url: string,
  data: unknown,
  onChunk: ChunkCallback,
  onComplete: CompleteCallback,
  onError: ErrorCallback
): StreamHandle {
  const controller = new AbortController()
  let completed = false

  const finish = (fn: () => void) => {
    if (completed) return
    completed = true
    fn()
  }

  ;(async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      const token = localStorage.getItem('auth_token')
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_HOST}/api/travel/${url}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        signal: controller.signal
      })

      if (!response.ok) {
        if (response.status === 401) handleUnauthorized()
        const errMsg = await parseStreamHttpError(response)
        finish(() => onError(errMsg))
        return
      }

      if (!response.body) {
        finish(() => onError('服务器未返回流式数据'))
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine) continue

          try {
            if (trimmedLine.startsWith('event:')) {
              const eventType = trimmedLine.substring(6).trim()
              if (eventType === 'end') {
                finish(() => onComplete())
                return
              }
              continue
            }

            if (trimmedLine.startsWith('data:')) {
              const jsonStr = trimmedLine.substring(5).trim()
              if (!jsonStr) continue

              const jsonData = JSON.parse(jsonStr)

              if (jsonData.type === 'chunk') {
                onChunk(jsonData.content)
              } else if (jsonData.type === 'error') {
                finish(() => onError(jsonData.error || '未知错误'))
                return
              } else if (jsonData.error) {
                finish(() => onError(jsonData.error))
                return
              } else if (jsonData.type === 'complete') {
                finish(() => onComplete(jsonData.data ?? jsonData.content))
                return
              } else if (jsonData.done) {
                finish(() => onComplete(jsonData.data))
                return
              }
            }
          } catch {
            console.error('SSE 数据解析异常:', trimmedLine)
          }
        }
      }

      finish(() => onComplete())
    } catch (err: any) {
      if (err.name === 'AbortError') return
      console.error('fetchStream 错误:', err)
      if (!navigator.onLine) {
        finish(() => onError('网络已断开，请检查网络连接'))
      } else {
        finish(() => onError(err.message || '网络请求失败'))
      }
    }
  })()

  return {
    abort: () => controller.abort()
  }
}