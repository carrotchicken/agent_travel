// ============================================================
// storage 工具模块类型声明
// ============================================================
declare module '@/utils/storage' {
  interface StorageAPI {
    /** 写入存储，支持 TTL 过期时间（默认 7 天） */
    set(key: string, value: unknown, ttl?: number): boolean
    /** 读取存储，不存在或过期返回 defaultValue */
    get<T = unknown>(key: string, defaultValue?: T): T
    /** 删除单个存储项 */
    remove(key: string): void
    /** 清空所有带前缀的存储项 */
    clear(): void
    /** 获取剩余有效时间（毫秒） */
    getRemainingTTL(key: string): number
    /** 获取存储使用统计 */
    getStats(): { total: number; count: number; remaining: number }
  }
  const storage: StorageAPI
  export default storage
}
