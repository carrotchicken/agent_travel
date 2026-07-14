// ============================================================
// 全局类型定义
// ============================================================

// ---- 用户 / 认证 ----

export interface User {
  id: number
  username: string
  avatar: string
}

export interface AuthResult {
  success: boolean
  data?: User & { token: string }
  error?: string
  message?: string
}

// ---- 聊天 ----

export interface ChatMessage {
  id: number
  role: 'user' | 'ai'
  content: string
  timestamp: string
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

// ---- 行程 ----

export interface TripData {
  _id?: number
  city: string
  days: number
  totalBudget: number
  savedAt?: string
  favoritedAt?: string
  [key: string]: unknown
}

// ---- API 通用 ----

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
