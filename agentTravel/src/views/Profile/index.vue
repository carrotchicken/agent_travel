<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showDialog } from 'vant'
import { useTravelStore } from '@/stores/travel'
import { useAuthStore } from '@/stores/auth'
import storage from '@/utils/storage'

const router = useRouter()
const travelStore = useTravelStore()
const authStore = useAuthStore()

// 当前激活的 Tab：history / favorite
const activeTab = ref('history')

// 关于我们弹窗
const aboutDialogVisible = ref(false)
// 偏好设置弹窗
const preferenceDialogVisible = ref(false)
// 偏好设置内容
const PREFS_KEY = 'travel_preferences'
const travelPreferences = ref({
  city: '',
  budget: '',
  days: '',
  theme: ''
})

// 页面挂载时加载已保存的偏好
onMounted(() => {
  const saved = storage.get(PREFS_KEY, null)
  if (saved) Object.assign(travelPreferences.value, saved)
})

// 当前列表数据（根据 Tab 切换）
const currentList = computed(() => {
  return activeTab.value === 'history'
    ? travelStore.tripHistory
    : travelStore.favorites
})

// 当前列表是否为空
const listEmpty = computed(() => currentList.value.length === 0)

// 点击行程卡片 → 跳到详情页
const viewTrip = (trip) => {
  if (activeTab.value === 'history') {
    travelStore.loadFromHistory(trip)
  } else {
    travelStore.loadFromFavorite(trip)
  }
  router.push({
    path: '/detail',
    query: {
      city: trip.city,
      budget: trip.totalBudget,
      days: trip.days
    }
  })
}

// 删除单条
const removeItem = (index) => {
  const isFav = activeTab.value === 'favorite'
  showDialog({
    title: '删除确认',
    message: isFav ? '确定取消收藏这条行程吗？' : '确定要删除这条行程记录吗？'
  }).then(() => {
    if (isFav) {
      travelStore.removeFavorite(index)
    } else {
      travelStore.removeHistory(index)
    }
    showToast('已删除')
  }).catch(() => {})
}

// 清空当前列表
const clearAll = () => {
  const isFav = activeTab.value === 'favorite'
  showDialog({
    title: '清空确认',
    message: isFav
      ? '确定要清空所有收藏吗？此操作不可恢复。'
      : '确定要清空所有历史记录吗？此操作不可恢复。'
  }).then(() => {
    if (isFav) {
      travelStore.clearFavorites()
    } else {
      travelStore.clearHistory()
    }
    showToast('已清空')
  }).catch(() => {})
}

// 格式化时间
const formatDate = (isoStr) => {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  const hours = d.getHours().toString().padStart(2, '0')
  const mins = d.getMinutes().toString().padStart(2, '0')
  return `${month}-${day} ${hours}:${mins}`
}

// 获取时间字段名（历史用 savedAt，收藏用 favoritedAt）
const getTimeField = (item) => {
  return item.savedAt || item.favoritedAt || ''
}

const showAboutDialog = () => {
  aboutDialogVisible.value = true
}

const showPreferenceDialog = () => {
  preferenceDialogVisible.value = true
}

const savePreferences = () => {
  storage.set(PREFS_KEY, { ...travelPreferences.value })
  preferenceDialogVisible.value = false
  showToast('偏好已保存')
}

// 跳转首页
const goHome = () => router.push('/')
</script>

<template>
  <div class="profile-container">
    <!-- 顶部导航 -->
    <van-nav-bar title="我的" :left-arrow="false" />

    <!-- 用户信息卡片 -->
    <div class="user-info">
      <!-- 黏土装饰层 -->
      <div class="profile-decor">
        <div class="pd-blob pd-blob--1"></div>
        <div class="pd-blob pd-blob--2"></div>
        <div class="pd-blob pd-blob--3"></div>
        <div class="pd-ring"></div>
        <div class="pd-dot pd-dot--1"></div>
        <div class="pd-dot pd-dot--2"></div>
        <div class="pd-dot pd-dot--3"></div>
        <div class="pd-dot pd-dot--4"></div>
        <span class="pd-emoji">🧳</span>
      </div>
      <van-image :src="authStore.displayAvatar" round class="avatar" />
      <div class="user-details">
        <h2 class="user-name">{{ authStore.displayName }}</h2>
        <p class="user-desc">欢迎使用智能旅游助手</p>
      </div>
    </div>

    <!-- 未登录提示 -->
    <div v-if="!authStore.isLoggedIn" class="login-prompt">
      <van-button type="primary" size="small" round @click="router.push('/login')">
        登录 / 注册
      </van-button>
    </div>

    <!-- 行程管理 Tab 卡片 -->
    <div class="trip-section">
      <van-tabs v-model:active="activeTab" sticky>
        <van-tab title="历史记录" name="history" />
        <van-tab title="我的收藏" name="favorite" />
      </van-tabs>

      <div class="list-header">
        <span class="list-count">共 {{ currentList.length }} 条行程</span>
        <span v-if="!listEmpty" class="clear-btn" @click="clearAll">清空全部</span>
      </div>

      <!-- 有数据列表 -->
      <div v-if="!listEmpty" class="trip-list">
        <div
          v-for="(item, idx) in currentList"
          :key="item.savedAt || item.favoritedAt || idx"
          class="trip-item"
          @click="viewTrip(item)"
        >
          <div class="trip-left">
            <div class="trip-city">{{ item.city }}</div>
            <div class="trip-meta">
              {{ item.days }}天 · ¥{{ item.totalBudget }}
              <span v-if="getTimeField(item)" class="trip-time"> · {{ formatDate(getTimeField(item)) }}</span>
            </div>
          </div>
          <div class="trip-right">
            <van-icon name="arrow" size="16" color="#c8c9cc" />
            <van-icon
              name="delete-o"
              size="16"
              color="#ee0a24"
              class="delete-icon"
              @click.stop="removeItem(idx)"
            />
          </div>
        </div>
      </div>

      <!-- 空状态美化 -->
      <div v-else class="empty-wrap">
        <van-empty
          :description="activeTab === 'history' ? '暂无历史记录，去首页规划一次行程吧' : '暂无收藏，去详情页收藏喜欢的行程吧'"
          :image-size="70"
        />
        <van-button type="primary" round size="small" class="empty-btn" @click="goHome">
          去首页规划行程
        </van-button>
      </div>
    </div>

    <!-- 我的服务菜单卡片 -->
    <div class="menu-section">
      <h3 class="menu-title">我的服务</h3>
      <van-cell-group>
        <van-cell title="偏好设置" is-link icon="like-o" @click="showPreferenceDialog" />
        <van-cell
          v-if="authStore.isLoggedIn"
          title="退出登录"
          icon="revoke"
          class="logout-cell"
          @click="authStore.logout(); showToast('已退出登录')"
        />
      </van-cell-group>
    </div>

    <!-- 关于菜单卡片 -->
    <div class="menu-section">
      <h3 class="menu-title">关于</h3>
      <van-cell-group>
        <van-cell title="关于我们" is-link @click="showAboutDialog" />
        <van-cell title="版本信息" value="v1.1.0" />
      </van-cell-group>
    </div>

    <!-- 偏好弹窗 -->
    <van-dialog v-model:show="preferenceDialogVisible" title="偏好设置" show-cancel-button @confirm="savePreferences">
      <div class="preference-content">
        <van-field v-model="travelPreferences.city" label="常去城市" placeholder="例如：杭州、成都" />
        <van-field v-model="travelPreferences.budget" label="预算范围" placeholder="例如：2000-5000" />
        <van-field v-model="travelPreferences.days" label="出行天数" placeholder="例如：3天、5天" />
        <van-field v-model="travelPreferences.theme" label="旅行偏好" placeholder="例如：美食、自然、人文" />
      </div>
    </van-dialog>

    <!-- 关于弹窗 -->
    <van-dialog v-model:show="aboutDialogVisible" title="关于我们" show-cancel-button>
      <div class="about-content">
        <p class="text-lg">智能旅游助手 v1.1.0</p>
        <p class="mt-2 text-gray">基于 AI 技术的智能旅游规划平台</p>
        <p class="mt-2 text-gray">为您提供个性化旅游行程推荐与出行咨询</p>
        <p class="mt-6 text-center text-light-gray">© 2026 智能旅游助手</p>
      </div>
    </van-dialog>
  </div>
</template>

<style scoped>
.profile-container {
  padding-bottom: 80px;
  background: #f3efe8;
  min-height: 100vh;
}

/* 黏土用户信息卡片 */
.user-info {
  display: flex;
  align-items: center;
  padding: 32px 20px 42px;
  margin: 12px 12px 0;
  background: #82bcc8;
  color: #fff;
  border-radius: 24px;
  position: relative;
  overflow: hidden;
  box-shadow:
    0 8px 24px rgba(130, 188, 200, 0.3),
    0 2px 8px rgba(130, 188, 200, 0.12);
}

/* ====== 黏土装饰层 ====== */
.profile-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

/* 柔和光晕 blob */
.pd-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(24px);
}

.pd-blob--1 {
  width: 120px;
  height: 120px;
  background: rgba(255, 255, 255, 0.13);
  top: -30px;
  right: 20px;
  animation: pd-float 8s ease-in-out infinite;
}

.pd-blob--2 {
  width: 80px;
  height: 80px;
  background: rgba(216, 216, 159, 0.2);
  bottom: 5px;
  left: 60%;
  animation: pd-float 10s ease-in-out 3s infinite;
}

.pd-blob--3 {
  width: 100px;
  height: 100px;
  background: rgba(255, 255, 255, 0.1);
  top: 50%;
  right: -20px;
  animation: pd-float 9s ease-in-out 5s infinite;
}

/* 头像光环 */
.pd-ring {
  position: absolute;
  width: 106px;
  height: 106px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.25);
  top: 22px;
  left: 10px;
  animation: pd-pulse 4s ease-in-out infinite;
}

/* 装饰小圆点 */
.pd-dot {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
}

.pd-dot--1 {
  width: 8px;
  height: 8px;
  top: 18px;
  right: 60px;
  animation: pd-float 6s ease-in-out 1s infinite;
}

.pd-dot--2 {
  width: 5px;
  height: 5px;
  top: 55px;
  right: 40px;
  animation: pd-float 7s ease-in-out 4s infinite;
}

.pd-dot--3 {
  width: 6px;
  height: 6px;
  bottom: 20px;
  right: 100px;
  animation: pd-float 5s ease-in-out 2s infinite;
}

.pd-dot--4 {
  width: 4px;
  height: 4px;
  top: 40px;
  right: 80px;
  animation: pd-float 8s ease-in-out 6s infinite;
}

/* 旅行装饰 emoji */
.pd-emoji {
  position: absolute;
  font-size: 28px;
  opacity: 0.35;
  bottom: 10px;
  right: 16px;
  animation: pd-float 7s ease-in-out 2s infinite;
}

@keyframes pd-float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(6px, -10px) scale(1.06);
  }
}

@keyframes pd-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.08);
    opacity: 0.6;
  }
}

.avatar {
  width: 86px;
  height: 86px;
  border: 3px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
  z-index: 2;
}

.user-details {
  margin-left: 18px;
  z-index: 2;
}
.user-name {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 6px;
  letter-spacing: 0.5px;
}
.user-desc {
  font-size: 13px;
  opacity: 0.88;
  margin: 0;
}

/* 未登录按钮 */
.login-prompt {
  text-align: right;
  margin: -30px 16px 24px;
  position: relative;
  z-index: 3;
}
.login-prompt :deep(.van-button) {
  background: #fff !important;
  color: #5d9aa8 !important;
  border: none !important;
  font-weight: 600;
  box-shadow:
    0 4px 14px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

/* 行程Tab卡片 */
.trip-section {
  background-color: #ffffff;
  border-radius: 24px;
  margin: 20px 12px 0;
  overflow: hidden;
  box-shadow:
    0 6px 24px rgba(0, 0, 0, 0.04),
    0 2px 8px rgba(0, 0, 0, 0.03);
}
/* tab下划线美化 */
.trip-section :deep(.van-tabs__line) {
  background: #82bcc8;
  width: 30px !important;
  border-radius: 99px;
  height: 3px;
}
.trip-section :deep(.van-tab) {
  font-size: 14px;
}
.trip-section :deep(.van-tab--active) {
  color: #82bcc8 !important;
  font-weight: 600;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px;
  border-bottom: 1px solid #f3efe6;
}
.list-count {
  font-size: 13px;
  color: #999;
}
.clear-btn {
  font-size: 13px;
  color: #82bcc8;
  cursor: pointer;
  transition: opacity 0.2s;
}
.clear-btn:active {
  opacity: 0.6;
}

/* 行程列表项 */
.trip-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px;
  border-bottom: 1px solid #f7f4ec;
  cursor: pointer;
  transition: background 0.24s ease;
}
.trip-item:last-child {
  border-bottom: none;
}
.trip-item:active {
  background: #eaf5f7;
}
.trip-left {
  flex: 1;
  min-width: 0;
}
.trip-city {
  font-size: 16px;
  font-weight: 600;
  color: #4a4a5a;
  margin-bottom: 5px;
}
.trip-meta {
  font-size: 12.5px;
  color: #888;
}
.trip-time {
  color: #aaa;
}
.trip-right {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}
.delete-icon {
  padding: 5px;
  transition: opacity 0.2s;
}
.delete-icon:active {
  opacity: 0.5;
}

/* 空状态区域 */
.empty-wrap {
  padding: 30px 20px 40px;
  text-align: center;
}
.empty-btn {
  margin-top: 16px;
  background: #82bcc8 !important;
  border: none;
  font-weight: 600;
}

/* 黏土菜单通用区块 */
.menu-section {
  background-color: #fff;
  border-radius: 24px;
  margin: 20px 12px 0;
  overflow: hidden;
  box-shadow:
    0 6px 24px rgba(0, 0, 0, 0.04),
    0 2px 8px rgba(0, 0, 0, 0.03);
}
.menu-title {
  font-size: 13px;
  color: #a0a0b0;
  padding: 14px 18px 8px;
  margin: 0;
  font-weight: normal;
}
.menu-section :deep(.van-cell) {
  padding: 16px 18px;
}
.menu-section :deep(.van-cell__left-icon) {
  color: #82bcc8;
  margin-right: 12px;
  font-size: 19px;
}
/* 退出登录红色区分 */
.menu-section :deep(.logout-cell .van-cell__title) {
  color: #ee0a24;
}
.menu-section :deep(.logout-cell .van-cell__left-icon) {
  color: #ee0a24;
}

/* 弹窗内容 */
.about-content,
.preference-content {
  line-height: 1.7;
  color: #555;
  font-size: 14px;
}
.preference-content :deep(.van-field) {
  margin-bottom: 8px;
}

/* 工具类 */
.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 16px; }
.mt-6 { margin-top: 24px; }
.text-center { text-align: center; }
.text-lg { font-size: 16px; font-weight: 500; color: #222; }
.text-gray { color: #666; }
.text-light-gray { color: #aaa; font-size: 13px; }
</style>