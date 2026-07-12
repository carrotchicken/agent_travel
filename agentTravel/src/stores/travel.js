// ============================================================
// 旅游数据 Store（Pinia）
// 职责：管理跨页面共享的行程数据和历史记录
// 使用场景：
//   - Detail 页保存 AI 返回的行程
//   - Chat 页读取当前城市名用于自动提问
//   - Profile 页读取历史记录列表
// ============================================================
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useTravelStore = defineStore('travel', () => {
  // ===================== 状态 =====================

  // 当前正在查看/刚生成的行程数据
  const currentTrip = ref(null)

  // 历史行程列表（从 localStorage 恢复）
  const tripHistory = ref(loadHistory())

  // ===================== 计算属性 =====================

  // 当前行程的城市名（方便其他页面快速获取）
  const currentCity = computed(() => currentTrip.value?.city || '')

  // 历史记录是否为空
  const hasHistory = computed(() => tripHistory.value.length > 0)

  // ===================== 方法 =====================

  /**
   * 保存行程数据（AI 生成完成后调用）
   * 同时写入 currentTrip 和 tripHistory
   * @param {Object} trip - AI 返回的行程对象
   */
  function setTrip(trip) {
    currentTrip.value = trip

    // 加入历史记录（去重：相同城市+天数视为同一条，覆盖旧的）
    const idx = tripHistory.value.findIndex(
      t => t.city === trip.city && t.days === trip.days
    )
    const record = {
      ...trip,
      savedAt: new Date().toISOString()  // 记录保存时间
    }
    if (idx >= 0) {
      tripHistory.value[idx] = record
    } else {
      tripHistory.value.unshift(record)  // 最新排最前
    }

    // 持久化到 localStorage
    saveHistory()
  }

  /**
   * 删除一条历史记录
   * @param {number} index - 要删除的索引
   */
  function removeHistory(index) {
    tripHistory.value.splice(index, 1)
    saveHistory()
  }

  /**
   * 清空全部历史
   */
  function clearHistory() {
    tripHistory.value = []
    saveHistory()
  }

  // ===================== 私有辅助 =====================

  // localStorage 的 key 名
  const STORAGE_KEY = 'travel_history'

  /**
   * 从 localStorage 加载历史记录
   */
  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  /**
   * 将历史记录写入 localStorage
   * 最多保留 20 条，避免存储空间过大
   */
  function saveHistory() {
    try {
      const toSave = tripHistory.value.slice(0, 20)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    } catch (e) {
      console.error('保存历史记录失败:', e)
    }
  }

  // ===================== 导出 =====================
  return {
    currentTrip,
    tripHistory,
    currentCity,
    hasHistory,
    setTrip,
    removeHistory,
    clearHistory
  }
})
