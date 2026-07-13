<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showDialog } from 'vant'
import { useTravelStore } from '@/stores/travel'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const travelStore = useTravelStore()
const authStore = useAuthStore()

// 当前激活的 Tab：history / favorite
const activeTab = ref('history')

// 关于我们弹窗
const aboutDialogVisible = ref(false)

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
</script>

<template>
  <div class="profile-container">
    <!-- 顶部导航 -->
    <van-nav-bar title="我的" :left-arrow="false" />

    <!-- 用户信息 -->
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

    <!-- 行程管理 Tab 区 -->
    <div class="trip-section">
      <!-- Tab 切换 -->
      <van-tabs v-model:active="activeTab" sticky>
        <van-tab title="历史记录" name="history" />
        <van-tab title="我的收藏" name="favorite" />
      </van-tabs>

      <!-- 列表头部：数量 + 清空 -->
      <div class="list-header">
        <span class="list-count">
          共 {{ currentList.length }} 条
        </span>
        <span
          v-if="!listEmpty"
          class="clear-btn"
          @click="clearAll"
        >
          清空
        </span>
      </div>

      <!-- 列表内容 -->
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
              <span v-if="getTimeField(item)" class="trip-time">
                 · {{ formatDate(getTimeField(item)) }}
              </span>
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

      <!-- 空状态 -->
      <van-empty
        v-else
        :description="activeTab === 'history' ? '暂无历史记录，去首页规划一次行程吧' : '暂无收藏，去详情页收藏喜欢的行程吧'"
        :image-size="60"
      />
    </div>

    <!-- 我的服务 -->
    <div class="menu-section">
      <h3 class="menu-title">我的服务</h3>
      <van-cell-group>
        <van-cell title="设置" is-link icon="setting-o" @click="showToast('功能开发中')" />
        <van-cell
          v-if="authStore.isLoggedIn"
          title="退出登录"
          icon="revoke"
          @click="authStore.logout(); showToast('已退出')"
        />
      </van-cell-group>
    </div>

    <!-- 关于 -->
    <div class="menu-section">
      <h3 class="menu-title">关于</h3>
      <van-cell-group>
        <van-cell title="关于我们" is-link @click="showAboutDialog" />
        <van-cell title="版本信息" value="v1.1.0" />
      </van-cell-group>
    </div>

    <!-- 关于我们弹窗 -->
    <van-dialog v-model:show="aboutDialogVisible" title="关于我们" show-cancel-button>
      <div class="about-content">
        <p>智能旅游助手 v1.1.0</p>
        <p class="mt-2">基于 AI 技术的智能旅游规划平台</p>
        <p class="mt-2">为您提供个性化的旅游行程推荐和实时旅游咨询服务</p>
        <p class="mt-4 text-center">© 2024 智能旅游助手</p>
      </div>
    </van-dialog>
  </div>
</template>

<style scoped>
.profile-container {
  padding-bottom: 60px;
  background: #fff8f5;
  min-height: 100vh;
}

/* ---- 用户信息区 ---- */
.user-info {
  display: flex;
  align-items: center;
  padding: 30px 20px 40px;
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
  color: white;
  border-radius: 0 0 20px 20px;
  margin-top: -46px;
  padding-top: 60px;
}

.avatar {
  width: 64px;
  height: 64px;
  border: 3px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.user-details {
  margin-left: 16px;
}

.user-name {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 4px;
}

.user-desc {
  font-size: 13px;
  opacity: 0.85;
  margin: 0;
}

/* 未登录提示 */
.login-prompt {
  text-align: right;
  margin-top: -28px;
  margin-bottom: 20px;
  padding: 0 16px;
}

.login-prompt :deep(.van-button) {
  background: #fff !important;
  color: #ff6b35 !important;
  border: none !important;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* ---- 行程管理区 ---- */
.trip-section {
  background-color: #fff;
  border-radius: 12px;
  margin: 16px 12px 0;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(255, 107, 53, 0.06);
}

.trip-section :deep(.van-tabs__line) {
  background: linear-gradient(90deg, #ff6b35, #f7931e);
  width: 24px !important;
  border-radius: 2px;
}

.trip-section :deep(.van-tab--active) {
  color: #ff6b35 !important;
  font-weight: 600;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid #f5f5f5;
}

.list-count {
  font-size: 13px;
  color: #999;
}

.clear-btn {
  font-size: 13px;
  color: #ff6b35;
  cursor: pointer;
}

/* ---- 行程列表 ---- */
.trip-list {
  padding: 0;
}

.trip-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #f7f7f7;
  cursor: pointer;
  transition: background 0.2s ease;
}

.trip-item:last-child {
  border-bottom: none;
}

.trip-item:active {
  background: #fff8f5;
}

.trip-left {
  flex: 1;
  min-width: 0;
}

.trip-city {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.trip-meta {
  font-size: 12px;
  color: #999;
}

.trip-time {
  color: #bbb;
}

.trip-right {
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

/* ---- 菜单区块 ---- */
.menu-section {
  background-color: #fff;
  border-radius: 12px;
  margin: 16px 12px 0;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(255, 107, 53, 0.06);
}

.menu-title {
  font-size: 13px;
  color: #999;
  padding: 12px 16px 8px;
  margin: 0;
  font-weight: normal;
}

.menu-section :deep(.van-cell) {
  padding: 14px 16px;
}

.menu-section :deep(.van-cell__left-icon) {
  color: #ff6b35;
  margin-right: 10px;
  font-size: 18px;
}

/* ---- 弹窗 ---- */
.about-content {
  text-align: center;
  line-height: 1.6;
  color: #666;
  font-size: 14px;
}

.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 16px; }
.text-center { text-align: center; }
</style>
