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
  background: #f7f3eb;
  min-height: 100vh;
}

/* 顶部用户信息卡片 */
.user-info {
  display: flex;
  align-items: center;
  padding: 32px 20px 42px;
  margin: 12px 12px 0;
  background: linear-gradient(135deg, #325d86 0%, #5484b3 100%);
  color: #fff;
  border-radius: 20px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 6px 16px rgba(50, 93, 134, 0.18);
}
/* 背景装饰圆形光晕 */
.user-info::after {
  content: '';
  position: absolute;
  right: -40px;
  bottom: -40px;
  width: 160px;
  height: 160px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, transparent 72%);
  border-radius: 50%;
}
.user-info::before {
  content: '';
  position: absolute;
  left: -60px;
  top: -60px;
  width: 140px;
  height: 140px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%);
  border-radius: 50%;
}

.avatar {
  width: 86px;
  height: 86px;
  border: 3px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
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
  color: #325d86 !important;
  border: none !important;
  font-weight: 500;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
}

/* 行程Tab卡片 */
.trip-section {
  background-color: #ffffff;
  border-radius: 20px;
  margin: 20px 12px 0;
  overflow: hidden;
  box-shadow: 0 3px 14px rgba(59, 104, 146, 0.06);
}
/* tab下划线美化 */
.trip-section :deep(.van-tabs__line) {
  background: linear-gradient(90deg, #325d86, #5484b3);
  width: 30px !important;
  border-radius: 99px;
  height: 3px;
}
.trip-section :deep(.van-tab) {
  font-size: 14px;
}
.trip-section :deep(.van-tab--active) {
  color: #325d86 !important;
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
  color: #325d86;
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
  background: #f7f3eb;
}
.trip-left {
  flex: 1;
  min-width: 0;
}
.trip-city {
  font-size: 16px;
  font-weight: 600;
  color: #222;
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
  background: linear-gradient(90deg, #325d86, #5484b3) !important;
  border: none;
}

/* 菜单通用区块 */
.menu-section {
  background-color: #fff;
  border-radius: 20px;
  margin: 20px 12px 0;
  overflow: hidden;
  box-shadow: 0 3px 14px rgba(59, 104, 146, 0.06);
}
.menu-title {
  font-size: 13px;
  color: #999;
  padding: 14px 18px 8px;
  margin: 0;
  font-weight: normal;
}
.menu-section :deep(.van-cell) {
  padding: 16px 18px;
}
.menu-section :deep(.van-cell__left-icon) {
  color: #325d86;
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