// ============================================================
// 本地存储工具类（localStorage 封装）
// 功能：
//   1. 统一的 get/set/remove API
//   2. 支持过期时间（TTL）
//   3. 容量检测与超限降级
//   4. 命名空间隔离，避免 key 冲突
// ============================================================

/**
 * 存储前缀，用于命名空间隔离
 */
const PREFIX = 'travel_app_'

/**
 * 默认过期时间（毫秒）：7 天
 */
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000

/**
 * 安全序列化：处理循环引用等异常情况
 */
function safeSerialize(value) {
  try {
    return JSON.stringify(value)
  } catch (e) {
    console.warn('[storage] 序列化失败:', e)
    return null
  }
}

/**
 * 安全反序列化
 */
function safeParse(str) {
  try {
    return JSON.parse(str)
  } catch (e) {
    console.warn('[storage] 反序列化失败:', e)
    return null
  }
}

/**
 * 检测 localStorage 剩余容量（粗略估算）
 * @returns {number} 剩余字节数，-1 表示无法检测
 */
function getRemainingSpace() {
  try {
    const testKey = PREFIX + '__capacity_test__'
    let testSize = 1024 * 1024 // 1MB
    while (testSize > 1024) {
      try {
        localStorage.setItem(testKey, new Array(testSize).join('a'))
        localStorage.removeItem(testKey)
        return testSize
      } catch {
        testSize = Math.floor(testSize / 2)
      }
    }
    localStorage.removeItem(testKey)
    return testSize
  } catch {
    return -1
  }
}

/**
 * 清理过期数据
 * 遍历所有带前缀的 key，删除已过期的条目
 */
function cleanExpired() {
  const keysToRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(PREFIX)) continue

    const raw = localStorage.getItem(key)
    const data = safeParse(raw)
    if (data && data.__expireAt && Date.now() > data.__expireAt) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k))
}

// 应用启动时清理一次过期数据
if (typeof window !== 'undefined') {
  try {
    cleanExpired()
  } catch (e) {
    console.warn('[storage] 清理过期数据失败:', e)
  }
}

// ============================================================
// 对外 API
// ============================================================

/**
 * 写入存储
 * @param {string} key - 存储键名（自动加前缀）
 * @param {*} value - 要存储的值
 * @param {number} [ttl] - 过期时间（毫秒），不传则使用默认 7 天
 * @returns {boolean} 是否写入成功
 */
export function setStorage(key, value, ttl = DEFAULT_TTL) {
  try {
    const fullKey = PREFIX + key
    const data = {
      value,
      __expireAt: Date.now() + ttl,
      __createdAt: Date.now()
    }
    const serialized = safeSerialize(data)
    if (!serialized) return false

    localStorage.setItem(fullKey, serialized)
    return true
  } catch (e) {
    // 存储已满，尝试清理过期后重试
    if (e.name === 'QuotaExceededError') {
      console.warn('[storage] 存储空间不足，清理过期数据后重试')
      cleanExpired()
      try {
        const fullKey = PREFIX + key
        localStorage.setItem(fullKey, safeSerialize({
          value,
          __expireAt: Date.now() + ttl,
          __createdAt: Date.now()
        }))
        return true
      } catch (e2) {
        console.error('[storage] 写入失败，存储空间不足:', e2)
        return false
      }
    }
    console.error('[storage] 写入失败:', e)
    return false
  }
}

/**
 * 读取存储
 * @param {string} key - 存储键名
 * @param {*} [defaultValue=null] - 默认值
 * @returns {*} 存储的值，过期或不存在返回 defaultValue
 */
export function getStorage(key, defaultValue = null) {
  try {
    const fullKey = PREFIX + key
    const raw = localStorage.getItem(fullKey)
    if (!raw) return defaultValue

    const data = safeParse(raw)
    if (!data) return defaultValue

    // 检查是否过期
    if (data.__expireAt && Date.now() > data.__expireAt) {
      localStorage.removeItem(fullKey)
      return defaultValue
    }

    return data.value
  } catch (e) {
    console.warn('[storage] 读取失败:', e)
    return defaultValue
  }
}

/**
 * 删除单个存储项
 * @param {string} key
 */
export function removeStorage(key) {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch (e) {
    console.warn('[storage] 删除失败:', e)
  }
}

/**
 * 清空所有带前缀的存储项
 */
export function clearStorage() {
  try {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(PREFIX)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k))
  } catch (e) {
    console.warn('[storage] 清空失败:', e)
  }
}

/**
 * 获取某个 key 的剩余有效时间
 * @param {string} key
 * @returns {number} 剩余毫秒数，不存在或已过期返回 0
 */
export function getRemainingTTL(key) {
  try {
    const fullKey = PREFIX + key
    const raw = localStorage.getItem(fullKey)
    if (!raw) return 0

    const data = safeParse(raw)
    if (!data || !data.__expireAt) return 0

    const remaining = data.__expireAt - Date.now()
    return remaining > 0 ? remaining : 0
  } catch {
    return 0
  }
}

/**
 * 获取存储使用情况统计
 * @returns {{total: number, count: number, remaining: number}}
 */
export function getStorageStats() {
  let totalBytes = 0
  let count = 0
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      if (key.startsWith(PREFIX)) count++
      totalBytes += (key.length + (localStorage.getItem(key) || '').length) * 2
    }
  } catch (e) {
    console.warn('[storage] 统计失败:', e)
  }
  return {
    total: totalBytes,
    count,
    remaining: getRemainingSpace()
  }
}

export default {
  set: setStorage,
  get: getStorage,
  remove: removeStorage,
  clear: clearStorage,
  getRemainingTTL,
  getStats: getStorageStats
}
