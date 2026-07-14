// ============================================================
// Auth Store 单元测试
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock 动态导入的 chat / travel store
vi.mock('@/stores/chat', () => ({
  useChatStore: () => ({ switchUser: vi.fn() })
}))
vi.mock('@/stores/travel', () => ({
  useTravelStore: () => ({ switchUser: vi.fn() })
}))

// Mock request 工具（authPost / authGet）
const mockAuthPost = vi.fn()
const mockAuthGet = vi.fn()
vi.mock('@/utils/request', () => ({
  authPost: (...args: unknown[]) => mockAuthPost(...args),
  authGet: (...args: unknown[]) => mockAuthGet(...args)
}))

import { useAuthStore } from '@/stores/auth'

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('初始状态', () => {
    it('无 token 时 isLoggedIn 为 false', () => {
      const store = useAuthStore()
      expect(store.isLoggedIn).toBe(false)
    })

    it('无用户时 displayName 为 "游客"', () => {
      const store = useAuthStore()
      expect(store.displayName).toBe('游客')
    })
  })

  describe('登录', () => {
    it('登录成功设置用户信息并写 localStorage', async () => {
      mockAuthPost.mockResolvedValue({
        success: true,
        data: { id: 1, username: 'test', avatar: '', token: 'jwt-token' }
      })

      const store = useAuthStore()
      const res = await store.login('test', '123456')

      expect(res.success).toBe(true)
      expect(store.isLoggedIn).toBe(true)
      expect(store.displayName).toBe('test')
      expect(localStorage.getItem('auth_token')).toBe('jwt-token')
    })

    it('登录失败返回错误信息', async () => {
      mockAuthPost.mockResolvedValue({
        success: false,
        error: '密码错误'
      })

      const store = useAuthStore()
      const res = await store.login('test', 'wrong')

      expect(res.success).toBe(false)
      expect(res.error).toBe('密码错误')
      expect(store.isLoggedIn).toBe(false)
    })
  })

  describe('注册', () => {
    it('注册成功自动登录', async () => {
      mockAuthPost.mockResolvedValue({
        success: true,
        data: { id: 2, username: 'newbie', avatar: '', token: 'new-token' }
      })

      const store = useAuthStore()
      const res = await store.register('newbie', '123456')

      expect(res.success).toBe(true)
      expect(store.displayName).toBe('newbie')
      expect(localStorage.getItem('auth_token')).toBe('new-token')
    })
  })

  describe('登出', () => {
    it('登出清理用户数据和 localStorage', async () => {
      // 先登录
      mockAuthPost.mockResolvedValue({
        success: true,
        data: { id: 1, username: 'test', avatar: '', token: 'jwt-token' }
      })
      const store = useAuthStore()
      await store.login('test', '123456')
      expect(store.isLoggedIn).toBe(true)

      // 登出
      await store.logout()

      expect(store.isLoggedIn).toBe(false)
      expect(store.displayName).toBe('游客')
      expect(localStorage.getItem('auth_token')).toBeNull()
      expect(localStorage.getItem('auth_user')).toBeNull()
    })
  })
})
