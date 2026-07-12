<script setup>
// ============================================================
// 模块导入
// ============================================================
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showDialog } from 'vant'
import { useTravelStore } from '@/stores/travel'

// ============================================================
// 路由 & Store
// ============================================================
const router = useRouter()
const travelStore = useTravelStore()

// ============================================================
// 响应式数据
// ============================================================

// 用户信息（后续可对接登录系统）
const userAvatar = 'https://img.yzcdn.cn/vant/cat.jpeg'
const userName = '游客'

// 关于我们弹窗
const aboutDialogVisible = ref(false)

// ============================================================
// 方法
// ============================================================

// 页面挂载时，确保历史记录从 localStorage 加载
onMounted(() => {
  // Pinia Store 在初始化时已自动 loadHistory()
  // 这里无需额外操作，直接绑定即可
})

// 点击历史记录卡片 → 跳到详情页展示（用 store 的 currentTrip）
const viewTrip = (trip) => {
  travelStore.currentTrip = trip
  router.push({
    path: '/detail',
    query: {
      city: trip.city,
      budget: trip.totalBudget,
      days: trip.days
    }
  })
}

// 删除单条历史
const removeTrip = (index) => {
  showDialog({
    title: '删除记录',
    message: '确定要删除这条行程记录吗？'
  }).then(() => {
    travelStore.removeHistory(index)
    showToast('已删除')
  }).catch(() => {})
}

// 清空全部历史
const clearAll = () => {
  showDialog({
    title: '清空记录',
    message: '确定要清空所有历史记录吗？此操作不可恢复。'
  }).then(() => {
    travelStore.clearHistory()
    showToast('已清空')
  }).catch(() => {})
}

// 格式化保存时间
const formatDate = (isoStr) => {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  const hours = d.getHours().toString().padStart(2, '0')
  const mins = d.getMinutes().toString().padStart(2, '0')
  return `${month}-${day} ${hours}:${mins}`
}

// 关于我们
const showAboutDialog = () => {
  aboutDialogVisible.value = true
}
</script>

<template>
  <div class="profile-container">
    <!-- 顶部导航 -->
    <van-nav-bar title="我的" :left-arrow="false" />

    <!-- 用户信息 -->
    <div class="user-info">
      <van-image :src="userAvatar" round class="avatar" />
      <div class="user-details">
        <h2 class="user-name">{{ userName }}</h2>
        <p class="user-desc">欢迎使用智能旅游助手</p>
      </div>
    </div>

    <!-- 我的服务 -->
    <div class="menu-section">
      <h3 class="menu-title">我的服务</h3>
      <van-cell-group>
        <van-cell title="我的收藏" is-link icon="star-o" @click="showToast('功能开发中')" />
        <van-cell title="设置" is-link icon="setting-o" @click="showToast('功能开发中')" />
      </van-cell-group>
    </div>

    <!-- 历史记录 -->
    <div class="menu-section">
      <div class="menu-header">
        <h3 class="menu-title">历史记录</h3>
        <span v-if="travelStore.hasHistory" class="clear-btn" @click="clearAll">清空</span>
      </div>

      <!-- 有历史记录 -->
      <div v-if="travelStore.hasHistory" class="history-list">
        <div
          v-for="(trip, idx) in travelStore.tripHistory"
          :key="idx"
          class="history-item"
          @click="viewTrip(trip)"
        >
          <div class="history-left">
            <div class="history-city">{{ trip.city }}</div>
            <div class="history-meta">
              {{ trip.days }}天 · ¥{{ trip.totalBudget }}
              <span v-if="trip.savedAt" class="history-time"> · {{ formatDate(trip.savedAt) }}</span>
            </div>
          </div>
          <div class="history-right">
            <van-icon name="arrow" size="16" color="#c8c9cc" />
            <van-icon
              name="delete-o"
              size="16"
              color="#ee0a24"
              class="delete-icon"
              @click.stop="removeTrip(idx)"
            />
          </div>
        </div>
      </div>

      <!-- 无历史记录 -->
      <van-empty v-else description="暂无历史记录，去首页规划一次行程吧" :image-size="60" />
    </div>

    <!-- 关于 -->
    <div class="menu-section">
      <h3 class="menu-title">关于</h3>
      <van-cell-group>
        <van-cell title="关于我们" is-link @click="showAboutDialog" />
        <van-cell title="版本信息" value="v1.0.0" />
      </van-cell-group>
    </div>

    <!-- 关于我们弹窗 -->
    <van-dialog v-model:show="aboutDialogVisible" title="关于我们" show-cancel-button>
      <div class="about-content">
        <p>智能旅游助手 v1.0.0</p>
        <p class="mt-2">基于 AI 技术的智能旅游规划平台</p>
        <p class="mt-2">为您提供个性化的旅游行程推荐和实时旅游咨询服务</p>
        <p class="mt-4 text-center">© 2024 智能旅游助手</p>
      </div>
    </van-dialog>
  </div>
</template>

<style scoped>
.profile-container {
  padding-bottom: 50px;
}

.user-info {
  display: flex;
  align-items: center;
  padding: 30px 20px;
  background: linear-gradient(135deg, #1989fa 0%, #36cbcb 100%);
  color: white;
}

.avatar {
  width: 80px;
  height: 80px;
  border: 3px solid rgba(255, 255, 255, 0.3);
}

.user-details {
  margin-left: 20px;
}

.user-name {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 5px;
}

.user-desc {
  font-size: 14px;
  opacity: 0.9;
}

/* ---- 菜单区块 ---- */
.menu-section {
  background-color: white;
  border-radius: 12px;
  margin: 15px 10px 0;
  overflow: hidden;
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
}

.menu-title {
  font-size: 14px;
  color: #646566;
  padding: 12px 15px;
  border-bottom: 1px solid #f0f0f0;
}

.menu-header .menu-title {
  border-bottom: none;
}

.clear-btn {
  font-size: 13px;
  color: #ee0a24;
  padding: 12px 15px;
  cursor: pointer;
}

/* ---- 历史记录列表 ---- */
.history-list {
  padding: 0;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
}

.history-item:last-child {
  border-bottom: none;
}

.history-item:active {
  background: #f7f8fa;
}

.history-left {
  flex: 1;
  min-width: 0;
}

.history-city {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 4px;
}

.history-meta {
  font-size: 13px;
  color: #999;
}

.history-time {
  color: #c8c9cc;
}

.history-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  margin-left: 8px;
}

.delete-icon {
  padding: 4px;
}

.delete-icon:active {
  opacity: 0.6;
}

/* ---- 弹窗 ---- */
.about-content {
  text-align: center;
  line-height: 1.6;
}

.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 16px; }
.text-center { text-align: center; }
</style>
