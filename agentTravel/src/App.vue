<script setup>
// ============================================================
// 模块导入
// ============================================================
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTravelStore } from '@/stores/travel'

// ============================================================
// 路由与状态
// ============================================================

// 获取当前路由对象，用于判断当前在哪个页面
// route.name 返回路由配置中的 name 值：'Home' / 'Chat' / 'Profile' / 'Detail'
const route = useRoute()
const authStore = useAuthStore()
const travelStore = useTravelStore()

// Tabbar 当前激活项的索引（0=首页, 1=对话, 2=我的）
// 注意：这里用 ref(0) 硬编码初始值，实际切换由 van-tabbar 的 route 属性自动管理
const active = ref(0)

// ============================================================
// 应用启动时恢复登录状态
// 调用后端 GET /api/auth/me 验证 token 并获取最新用户信息
// ============================================================
onMounted(async () => {
  try {
    await authStore.restoreSession()
    // 登录成功后从后端同步行程数据
    if (authStore.isLoggedIn) {
      travelStore.syncFromServer()
    }
  } catch {
    // token 验证失败，静默处理（store 内已清理）
  }
})
</script>

<template>
    <div class="app-container">
        <!-- 
          RouterView：Vue Router 的核心占位组件
          根据当前 URL 路径，动态渲染对应的页面组件：
            /        → Home/index.vue   （首页）
            /detail  → Detail/index.vue （行程详情）
            /chat    → Chat/index.vue   （AI 对话）
            /profile → Profile/index.vue（个人中心）
        -->
        <RouterView />

        <!-- 
          Tabbar 底部导航栏（移动端核心交互）
          
          显示逻辑：只在首页/对话/我的 三个主页显示，详情页隐藏
          为什么详情页隐藏？
          - 详情页有固定底部的"咨询AI助手"按钮，和 tabbar 冲突
          - 详情页用户操作完后应该返回首页，不需要 tabbar 跳转
          
          route 属性：启用 Vant 的路由模式，点击 tab 自动调用 router.push()
          v-model="active"：双向绑定当前高亮项索引
          active-color：选中态图标颜色
        -->
        <van-tabbar
            class="app-tabbar"
            v-if="['Home', 'Chat', 'Profile'].includes(route.name)"
            route
            v-model="active"
        >
            <!-- to="/" 对应路由 path: '/' → Home -->
            <van-tabbar-item to="/" icon="home-o">首页</van-tabbar-item>
            <!-- to="/chat" 对应路由 path: '/chat' → Chat -->
            <van-tabbar-item to="/chat" icon="chat-o">对话</van-tabbar-item>
            <!-- to="/profile" 对应路由 path: '/profile' → Profile -->
            <van-tabbar-item to="/profile" icon="user-o">我的</van-tabbar-item>
        </van-tabbar>
    </div>
</template>

<style>
.app-tabbar {
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.04);
}

.app-tabbar .van-tabbar-item--active {
  transform: scale(1.05);
  transition: transform 0.2s ease;
}
</style>
