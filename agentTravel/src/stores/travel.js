// ============================================================
// 旅游数据 Store（Pinia）
// 职责：管理跨页面共享的行程数据、历史记录、收藏列表
// 持久化策略：
//   - 登录用户：优先调用后端 API，localStorage 按 userId 隔离作为本地缓存
//   - 未登录用户：仅使用 localStorage（guest 命名空间）
// ============================================================
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import storage from '@/utils/storage'
import { post, get, del, patch } from '@/utils/request'
import { useAuthStore } from '@/stores/auth'

const MAX_HISTORY = 20
const MAX_FAVORITES = 50

export const useTravelStore = defineStore('travel', () => {
  // ===================== 状态 =====================

  const _userId = ref(null)
  const currentTrip = ref(null)
  const tripHistory = ref([])
  const favorites = ref([])
  const viewMode = ref('new')

  // 初始化：游客模式
  _loadForUser(null)

  // ===================== 计算属性 =====================

  const currentCity = computed(() => currentTrip.value?.city || '')
  const hasHistory = computed(() => tripHistory.value.length > 0)
  const hasFavorites = computed(() => favorites.value.length > 0)
  const isCurrentFavorited = computed(() => {
    if (!currentTrip.value) return false
    return favorites.value.some(
      f => f.city === currentTrip.value.city && f.days === currentTrip.value.days
    )
  })

  // ===================== 核心：用户切换 =====================

  /**
   * 切换当前用户，从对应 localStorage 加载/保存
   * @param {number|null} userId
   */
  function switchUser(userId) {
    _saveAll()
    _loadForUser(userId)
  }

  function _loadForUser(userId) {
    _userId.value = userId
    currentTrip.value = storage.get(_key('current_trip'), null)
    tripHistory.value = storage.get(_key('trip_history'), [])
    favorites.value = storage.get(_key('trip_favorites'), [])
    viewMode.value = 'new'
  }

  // ===================== 方法 =====================

  function setTrip(trip) {
    currentTrip.value = trip
    viewMode.value = 'new'

    const idx = tripHistory.value.findIndex(
      t => t.city === trip.city && t.days === trip.days
    )
    const record = { ...trip, savedAt: new Date().toISOString() }
    if (idx >= 0) {
      if (tripHistory.value[idx]._id) record._id = tripHistory.value[idx]._id
      tripHistory.value.splice(idx, 1)
    }
    tripHistory.value.unshift(record)
    if (tripHistory.value.length > MAX_HISTORY) {
      tripHistory.value = tripHistory.value.slice(0, MAX_HISTORY)
    }

    _saveAll()
    syncTripToServer(record)
  }

  async function syncTripToServer(trip) {
    try {
      const authStore = useAuthStore()
      if (!authStore.isLoggedIn) return
      const res = await post('save', {
        city: trip.city, days: trip.days, totalBudget: trip.totalBudget,
        tripData: trip, isFavorite: isFavorited(trip) ? 1 : 0
      })
      if (res?.success && res.data?.id) {
        trip._id = res.data.id
        _saveHistory()
      }
    } catch { /* 静默 */ }
  }

  function loadFromHistory(trip) {
    currentTrip.value = trip
    viewMode.value = 'history'
    _saveCurrent()
  }

  function loadFromFavorite(trip) {
    currentTrip.value = trip
    viewMode.value = 'favorite'
    _saveCurrent()
  }

  function removeHistory(index) {
    const trip = tripHistory.value[index]
    tripHistory.value.splice(index, 1)
    _saveHistory()
    if (trip?._id) del(`trips/${trip._id}`).catch(() => {})
  }

  function clearHistory() {
    const ids = tripHistory.value.filter(t => t._id).map(t => t._id)
    tripHistory.value = []
    _saveHistory()
    ids.forEach(id => del(`trips/${id}`).catch(() => {}))
  }

  function toggleFavorite(trip = currentTrip.value) {
    if (!trip) return false
    const idx = favorites.value.findIndex(
      f => f.city === trip.city && f.days === trip.days
    )
    if (idx >= 0) {
      favorites.value.splice(idx, 1)
      _saveFavorites()
      if (trip._id) patch(`trips/${trip._id}/favorite`).catch(() => {})
      return false
    } else {
      const favRecord = { ...trip, favoritedAt: new Date().toISOString() }
      favorites.value.unshift(favRecord)
      if (favorites.value.length > MAX_FAVORITES) {
        favorites.value = favorites.value.slice(0, MAX_FAVORITES)
      }
      _saveFavorites()
      if (trip._id) patch(`trips/${trip._id}/favorite`).catch(() => {})
      return true
    }
  }

  function isFavorited(trip) {
    if (!trip) return false
    return favorites.value.some(f => f.city === trip.city && f.days === trip.days)
  }

  function removeFavorite(index) {
    const fav = favorites.value[index]
    favorites.value.splice(index, 1)
    _saveFavorites()
    if (fav?._id) patch(`trips/${fav._id}/favorite`).catch(() => {})
  }

  function clearFavorites() {
    const ids = favorites.value.filter(f => f._id).map(f => f._id)
    favorites.value = []
    _saveFavorites()
    ids.forEach(id => patch(`trips/${id}/favorite`).catch(() => {}))
  }

  // ===================== 服务端同步 =====================

  async function syncFromServer() {
    try {
      const authStore = useAuthStore()
      if (!authStore.isLoggedIn) return
      const res = await get('trips')
      if (!res?.success || !Array.isArray(res.data)) return

      const historyItems = []
      const favItems = []
      for (const t of res.data) {
        const item = { ...t.tripData, _id: t.id, savedAt: t.createdAt, favoritedAt: t.createdAt }
        historyItems.push(item)
        if (t.isFavorite) favItems.push(item)
      }

      const localHistory = tripHistory.value.filter(t => !t._id)
      const localFavs = favorites.value.filter(t => !t._id)
      tripHistory.value = [...historyItems, ...localHistory].slice(0, MAX_HISTORY)
      favorites.value = [...favItems, ...localFavs].slice(0, MAX_FAVORITES)
      _saveHistory()
      _saveFavorites()
    } catch { /* 静默 */ }
  }

  // ===================== 私有辅助 =====================

  /** 实时从 authStore 获取 userId，避免 _userId ref 的异步时序问题 */
  function _currentUserId() {
    try {
      const authStore = useAuthStore()
      return authStore.user?.id || null
    } catch { return null }
  }

  function _key(name) {
    const uid = _currentUserId()
    return uid ? `${name}_${uid}` : `${name}_guest`
  }

  function _saveHistory() { storage.set(_key('trip_history'), tripHistory.value) }
  function _saveFavorites() { storage.set(_key('trip_favorites'), favorites.value) }
  function _saveCurrent() { storage.set(_key('current_trip'), currentTrip.value) }
  function _saveAll() { _saveHistory(); _saveFavorites(); _saveCurrent() }

  // ===================== 导出 =====================
  return {
    currentTrip, tripHistory, favorites, viewMode,
    currentCity, hasHistory, hasFavorites, isCurrentFavorited,
    setTrip, loadFromHistory, loadFromFavorite,
    removeHistory, clearHistory, toggleFavorite, isFavorited, removeFavorite, clearFavorites,
    syncFromServer, switchUser
  }
})
