// ============================================================
// Vue Router 路由元信息类型扩展
// ============================================================
import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** 是否需要登录才能访问 */
    requiresAuth?: boolean
  }
}
