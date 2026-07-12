// ============================================================
// 模块导入
// ============================================================
import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home/index.vue'
import Chat from '@/views/Chat/index.vue'
import Profile from '@/views/Profile/index.vue'
import Detail from '@/views/Detail/index.vue'

// ============================================================
// 路由配置
// ============================================================

/**
 * 路由设计：
 * - /       首页：表单输入 + 热门城市
 * - /chat   聊天页：AI 对话
 * - /profile 我的：个人信息 + 功能菜单
 * - /detail 详情页：行程展示
 * 
 * 路由名称用于：
 * - App.vue 中控制 Tabbar 显示
 * - 编程式导航 router.push({ name: 'Home' })
 */
const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home
    },
    {
        path: '/chat',
        name: 'Chat',
        component: Chat
    },
    {
        path: '/profile',
        name: 'Profile',
        component: Profile
    },
    {
        path: '/detail',
        name: 'Detail',
        component: Detail
    }
]

// ============================================================
// 创建路由实例
// ============================================================
const router = createRouter({
    // 使用 HTML5 History 模式（URL 不带 #）
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

export default router