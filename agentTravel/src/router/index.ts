// ============================================================
// 路由配置（TypeScript）
// ============================================================
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import Home from '@/views/Home/index.vue'
import Chat from '@/views/Chat/index.vue'
import Profile from '@/views/Profile/index.vue'
import Detail from '@/views/Detail/index.vue'
import Login from '@/views/Login/index.vue'
import Register from '@/views/Register/index.vue'

// ============================================================
// 路由配置
// ============================================================
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/chat',
    name: 'Chat',
    component: Chat,
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: { requiresAuth: true }
  },
  {
    path: '/detail',
    name: 'Detail',
    component: Detail
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/register',
    name: 'Register',
    component: Register
  }
]

// ============================================================
// 创建路由实例
// ============================================================
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// ============================================================
// 全局导航守卫：需要登录的页面 + 已登录跳转
// ============================================================
router.beforeEach((to) => {
  // 从 localStorage 读取 token（不用 Pinia，因为守卫执行时 store 可能尚未初始化）
  const token = localStorage.getItem('auth_token')

  // 需要登录但没有 token → 跳转到登录页
  if (to.meta.requiresAuth && !token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  // 已登录时访问登录/注册页 → 跳回首页
  if (token && (to.name === 'Login' || to.name === 'Register')) {
    return { path: '/' }
  }
})

export default router
