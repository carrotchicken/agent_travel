// ============================================================
// 聊天 Store（Pinia）
// 职责：管理聊天消息、会话历史、本地持久化
// 隔离策略：不同用户使用不同的 localStorage key（chat_sessions_{userId}）
// ============================================================
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import storage from '@/utils/storage'
import type { ChatMessage, ChatSession } from '@/types'

const MAX_SESSIONS = 10
const MAX_MESSAGES_PER_SESSION = 100

export const useChatStore = defineStore('chat', () => {
  // ===================== 状态 =====================

  const _userId = ref<number | null>(null)
  const currentSessionId = ref<string | null>(null)
  const sessions = ref<ChatSession[]>([])
  const messages = ref<ChatMessage[]>([])

  // 初始化：游客模式
  _loadForUser()

  // ===================== 计算属性 =====================

  const currentSession = computed(() =>
    sessions.value.find(s => s.id === currentSessionId.value) || null
  )
  const hasHistory = computed(() => sessions.value.length > 0)

  // ===================== 核心：用户感知 =====================

  /**
   * 切换用户时调用：先以旧 userId 保存，再加载新用户数据。
   * 注意：保存必须发生在 _loadForUser 之前，因为 _loadForUser 会更新 _userId。
   */
  function switchUser(newUserId: number | null): void {
    if (currentSessionId.value) _persistCurrentSession()
    _loadForUser(newUserId)
  }

  function _loadForUser(userId: number | null = null): void {
    _userId.value = userId
    sessions.value = storage.get(_sessionsKey(), [])
    currentSessionId.value = storage.get(_currentKey(), generateId())
    messages.value = _loadCurrentMessages()
  }

  // ===================== 方法 =====================

  function addMessage(msg: ChatMessage): void {
    messages.value.push(msg)
    if (messages.value.length > MAX_MESSAGES_PER_SESSION) {
      messages.value = messages.value.slice(-MAX_MESSAGES_PER_SESSION)
    }
    _persistCurrentSession()
  }

  function updateLastAIMessage(content: string): boolean {
    const lastMsg = messages.value[messages.value.length - 1]
    if (lastMsg && lastMsg.role === 'ai') {
      lastMsg.content = content
      _persistCurrentSession()
      return true
    }
    return false
  }

  function createNewSession(): string {
    const newId = generateId()
    currentSessionId.value = newId
    messages.value = []
    sessions.value.unshift({
      id: newId, title: '新对话', messages: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    })
    if (sessions.value.length > MAX_SESSIONS) sessions.value = sessions.value.slice(0, MAX_SESSIONS)
    _persistSessions()
    storage.set(_currentKey(), currentSessionId.value)
    return newId
  }

  function switchSession(sessionId: string): void {
    const session = sessions.value.find(s => s.id === sessionId)
    if (session) {
      currentSessionId.value = sessionId
      messages.value = [...session.messages]
      storage.set(_currentKey(), currentSessionId.value)
    }
  }

  function deleteSession(sessionId: string): void {
    const idx = sessions.value.findIndex(s => s.id === sessionId)
    if (idx >= 0) {
      sessions.value.splice(idx, 1)
      _persistSessions()
      if (sessionId === currentSessionId.value) {
        if (sessions.value.length > 0) switchSession(sessions.value[0].id)
        else createNewSession()
      }
    }
  }

  function clearAllSessions(): void {
    sessions.value = []
    createNewSession()
  }

  // ===================== 私有辅助 =====================

  function _sessionsKey(): string {
    return _userId.value ? `chat_sessions_${_userId.value}` : 'chat_sessions_guest'
  }
  function _currentKey(): string {
    return _userId.value ? `chat_current_${_userId.value}` : 'chat_current_guest'
  }
  function generateId(): string { return 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8) }
  function _loadCurrentMessages(): ChatMessage[] {
    const s = sessions.value.find(s => s.id === currentSessionId.value)
    return s ? [...s.messages] : []
  }

  function _persistCurrentSession(): void {
    const idx = sessions.value.findIndex(s => s.id === currentSessionId.value)
    const msgs = [...messages.value]
    const first = msgs.find(m => m.role === 'user')
    const title = first ? first.content.substring(0, 20) + (first.content.length > 20 ? '...' : '') : '新对话'
    const data: ChatSession = { id: currentSessionId.value!, title, messages: msgs,
      updatedAt: new Date().toISOString(), createdAt: sessions.value[idx]?.createdAt || new Date().toISOString() }
    if (idx >= 0) { sessions.value[idx] = data; sessions.value.splice(idx, 1); sessions.value.unshift(data) }
    else sessions.value.unshift(data)
    _persistSessions()
  }
  function _persistSessions(): void { storage.set(_sessionsKey(), sessions.value) }

  // ===================== 导出 =====================
  return {
    currentSessionId, sessions, messages, currentSession, hasHistory,
    addMessage, updateLastAIMessage, createNewSession,
    switchSession, deleteSession, clearAllSessions, switchUser
  }
})
