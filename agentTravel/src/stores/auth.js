// ============================================================
// 认证 Store（Pinia）
// 职责：管理登录状态、用户信息、Token 持久化
// 登录/登出时自动切换 chat 和 travel store 的数据命名空间
// ============================================================
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authPost, authGet } from '@/utils/request'

export const useAuthStore = defineStore('auth', () => {
  // ===================== 状态 =====================

  const user = ref(loadUser())
  const token = ref(loadToken())

  // ===================== 计算属性 =====================

  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const displayName = computed(() => user.value?.username || '游客')
  const displayAvatar = computed(() => user.value?.avatar || 'https://img.yzcdn.cn/vant/cat.jpeg')

  // ===================== 方法 =====================

  async function register(username, password) {
    try {
      const res = await authPost('/register', { username, password })
      if (res.success) setAuth(res.data)
      return res
    } catch (err) { return err }
  }

  async function login(username, password) {
    try {
      const res = await authPost('/login', { username, password })
      if (res.success) setAuth(res.data)
      return res
    } catch (err) { return err }
  }

  async function restoreSession() {
    if (!token.value) return false
    try {
      const res = await authGet('/me')
      if (res.success) {
        user.value = res.data
        await _switchStores(res.data.id)
        return true
      }
    } catch { /* token 失效 */ }
    clearAuth()
    return false
  }

  function logout() {
    clearAuth()
  }

  // ===================== 私有辅助 =====================

  function setAuth(data) {
    user.value = { id: data.id, username: data.username, avatar: data.avatar }
    token.value = data.token
    localStorage.setItem('auth_user', JSON.stringify(user.value))
    localStorage.setItem('auth_token', token.value)
    _switchStores(data.id)
  }

  function clearAuth() {
    _switchStores(null)
    user.value = null
    token.value = null
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_token')
  }

  function loadUser() {
    try {
      const raw = localStorage.getItem('auth_user')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }

  function loadToken() {
    return localStorage.getItem('auth_token') || null
  }

  /**
   * 通知 chat / travel store 切换用户数据命名空间
   * 使用动态 import 避免循环依赖
   */
  function _switchStores(userId) {
    return Promise.all([
      import('@/stores/chat').then(m => m.useChatStore().switchUser(userId)),
      import('@/stores/travel').then(m => m.useTravelStore().switchUser(userId))
    ]).catch(() => {})
  }

  // ===================== 导出 =====================
  return {
    user, token, isLoggedIn, displayName, displayAvatar,
    register, login, restoreSession, logout
  }
})
