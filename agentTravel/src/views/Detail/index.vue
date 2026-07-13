<script setup>
import { onMounted, reactive, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router'
import { post } from '@/utils/request';
import { useTravelStore } from '@/stores/travel'
import { showToast, showDialog } from 'vant'
import SpotItem from '@/components/SpotItem.vue';
import BudgetTable from '@/components/BudgetTable.vue';
import { exportTripAsText } from '@/utils/tripExport'

const router = useRouter()
const route = useRoute()

// Pinia Store：跨页面共享行程数据
const travelStore = useTravelStore()

// 加载状态
const isloading = ref(true)
// 错误信息
const errMsg = ref('')

// 表单数据（从首页 query 参数获取）
const formData = reactive({
  city: '',
  budget: null,
  days: null
})

// AI 返回的行程数据
const tripData = ref(null)
// 折叠面板默认展开项
const activeDays = ref([])

// 是否为历史查看模式（不重新调用 AI）
const isHistoryMode = computed(() => travelStore.viewMode !== 'new')

// 当前行程是否已收藏
const isFavorited = computed(() => travelStore.isCurrentFavorited)

// 模式标签文字
const modeLabel = computed(() => {
  if (travelStore.viewMode === 'history') return '历史记录'
  if (travelStore.viewMode === 'favorite') return '已收藏'
  return ''
})

const onBack = () => {
  router.back()
}

/**
 * 请求后端生成行程规划
 */
const fetchTripData = async () => {
  isloading.value = true
  errMsg.value = ''
  try {
    const res = await post('recommend', {
      city: formData.city,
      budget: formData.budget,
      days: formData.days
    })

    if (res && res.success === true) {
      tripData.value = res
      // 写入 Pinia Store，供 Chat/Profile 页面跨页面访问
      travelStore.setTrip(res)
      // 默认展开所有天数
      if (res.dailyItinerary) {
        activeDays.value = res.dailyItinerary.map(d => d.day)
      }
    } else if (res && res.error) {
      errMsg.value = res.error
    } else {
      console.error('后端返回了异常数据:', res)
      errMsg.value = '行程数据解析失败，请稍后重试'
    }
  } catch (err) {
    console.error('请求行程规划失败:', err)
    errMsg.value = err.message || '网络请求失败，请检查后端服务是否启动'
  } finally {
    isloading.value = false
  }
}

/**
 * 从 Store 加载行程（历史/收藏模式）
 * 不调用 AI，直接渲染已有数据
 */
const loadFromStore = () => {
  const trip = travelStore.currentTrip
  if (trip && trip.success !== false) {
    tripData.value = trip
    formData.city = trip.city
    formData.budget = trip.totalBudget
    formData.days = trip.days
    if (trip.dailyItinerary) {
      activeDays.value = trip.dailyItinerary.map(d => d.day)
    }
    isloading.value = false
    return true
  }
  return false
}

/**
 * 切换收藏状态
 */
const handleToggleFavorite = () => {
  const result = travelStore.toggleFavorite()
  showToast(result ? '已收藏' : '已取消收藏')
}

/**
 * 导出行程为文本
 */
const handleExport = () => {
  if (!tripData.value) return
  const text = exportTripAsText(tripData.value)
  // 复制到剪贴板
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('行程已复制到剪贴板')
    }).catch(() => {
      fallbackCopy(text)
    })
  } else {
    fallbackCopy(text)
  }
}

/**
 * 降级复制方案（兼容旧浏览器）
 */
const fallbackCopy = (text) => {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    document.execCommand('copy')
    showToast('行程已复制到剪贴板')
  } catch {
    showDialog({
      title: '行程文本',
      message: '长按文本可复制',
      confirmButtonText: '知道了'
    })
  }
  document.body.removeChild(textarea)
}

/**
 * 重新生成行程
 */
const regenerate = () => {
  travelStore.viewMode = 'new'
  travelStore.currentTrip = null  // 清除旧数据，避免 loadFromStore 短路
  fetchTripData()
}

const goTochat = () => {
  router.push({
    path: '/chat',
    query: {
      scene: 'detail',
      city: formData.city
    }
  })
}

onMounted(() => {
  // 优先判断：是否从历史记录/收藏页跳转而来（Store 里有数据且模式非 new）
  if (travelStore.viewMode !== 'new' && travelStore.currentTrip) {
    const loaded = loadFromStore()
    if (loaded) return
  }

  // 正常模式：从 query 参数读取并请求 AI
  formData.city = route.query.city || ''
  formData.budget = Number(route.query.budget) || null
  formData.days = Number(route.query.days) || null

  if (formData.city && formData.budget && formData.days) {
    fetchTripData()
  } else {
    isloading.value = false
    errMsg.value = '缺少必要的出行信息，请返回首页重新填写'
  }
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <van-nav-bar
        fixed
        left-text="返回"
        left-arrow
        @click-left="onBack"
        :title="formData.city ? formData.city + '行程规划' : '行程规划'"
      >
        <template #right>
          <van-icon
            :name="isFavorited ? 'star-fill' : 'star-o'"
            size="20"
            :color="isFavorited ? '#ff976a' : '#969799'"
            @click="handleToggleFavorite"
          />
        </template>
      </van-nav-bar>
    </div>

    <div class="page-content">
      <!-- Loading 状态 -->
      <div v-if="isloading" class="loading-container">
        <van-loading size="48px" type="spinner" vertical>
          正在生成旅游规划...
        </van-loading>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="errMsg" class="error-container">
        <van-empty :description="errMsg">
          <template #footer>
            <van-button type="primary" @click="fetchTripData">重新规划</van-button>
          </template>
        </van-empty>
      </div>

      <!-- 成功状态 -->
      <template v-else-if="tripData && tripData.success !== false">
        <!-- 概览卡片 -->
        <div class="card overview-card fade-in-up">
          <div class="trip-header">
            <div class="trip-title-wrap">
              <h2>{{ tripData.city }}·{{ tripData.days }}天行程规划</h2>
              <van-tag v-if="modeLabel" class="mode-tag">{{ modeLabel }}</van-tag>
            </div>
            <div class="trip-budget">
              <span class="budget-num">¥{{ tripData.totalBudget }}</span>
              <span class="budget-label">总预算</span>
            </div>
          </div>
          <div class="trip-actions">
            <van-button size="small" plain class="action-btn export-btn" @click="handleExport">
              <van-icon name="share-o" /> 导出行程
            </van-button>
            <van-button
              v-if="isHistoryMode"
              size="small"
              class="action-btn primary-gradient-btn"
              @click="regenerate"
            >
              重新生成
            </van-button>
          </div>
        </div>

        <!-- 每日行程折叠面板 -->
        <van-collapse v-model="activeDays" class="day-collapse">
          <van-collapse-item
            v-for="day in tripData.dailyItinerary"
            :key="day.day"
            :title="'第' + day.day + '天'"
            :name="day.day">
            <div class="day-schedule">
              <div class="schedule-section">
                  <div class="section-label morning">☀️ 上午</div>
                  <SpotItem :data="day.morning"/>
              </div>
              <div class="schedule-section">
                  <div class="section-label afternoon">🌤 下午</div>
                  <SpotItem :data="day.afternoon"/>
              </div>
              <div class="schedule-section">
                  <div class="section-label evening">🌙 晚上</div>
                  <SpotItem :data="day.evening"/>
              </div>
            </div>
          </van-collapse-item>
        </van-collapse>

        <div class="card budget-card" v-if="tripData.budgetBreakdown">
          <div class="section-title">预算明细</div>
          <BudgetTable :data="tripData.budgetBreakdown" :total="tripData.totalBudget"/>
        </div>

        <div class="card tips-card" v-if="tripData.tips && tripData.tips.length">
          <div class="section-title">温馨提示</div>
          <ul class="tips-list">
            <li v-for="(tip,idx) in tripData.tips" :key="idx">{{ tip }}</li>
          </ul>
        </div>

        <div class="card warnings-card" v-if="tripData.warnings && tripData.warnings.length">
          <div class="section-title">注意事项</div>
          <ul class="warnings-list">
            <li v-for="(warning,idx) in tripData.warnings" :key="idx">{{ warning }}</li>
          </ul>
        </div>
      </template>

      <!-- 兜底：未知状态 -->
      <div v-else class="error-container">
        <van-empty description="加载行程数据失败，请返回首页重试">
          <template #footer>
            <van-button type="primary" @click="onBack">返回首页</van-button>
          </template>
        </van-empty>
      </div>
    </div>

    <div class="detail-footer" v-if="tripData && tripData.success !== false">
      <van-button size="large" class="footer-btn primary-gradient-btn" @click="goTochat">咨询 AI 助手</van-button>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  height: 46px;
}

.page-content {
  padding-top: 46px;
  padding-bottom: 90px;
}

/* ---- 概览卡片 ---- */
.overview-card {
  margin-bottom: 16px;
  position: relative;
  overflow: hidden;
}

.overview-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #ff6b35, #f7931e);
}

.trip-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 8px;
}

.trip-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.trip-header h2 {
  font-size: 20px;
  color: #1a1a1a;
  margin: 0;
  font-weight: 700;
}

.mode-tag {
  background: #fff1e8 !important;
  color: #ff6b35 !important;
  border: none !important;
  border-radius: 10px !important;
  padding: 0 8px !important;
  font-size: 12px !important;
}

.trip-budget {
  text-align: right;
}

.budget-num {
  font-size: 22px;
  color: #ff6b35;
  font-weight: 700;
  display: block;
  line-height: 1.2;
}

.budget-label {
  font-size: 12px;
  color: #999;
}

.trip-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  width: 100%;
}

.action-btn {
  flex: 1;
  height: 36px;
  border-radius: 18px !important;
  font-size: 14px;
}

.export-btn {
  color: #ff6b35 !important;
  border-color: #ffd0bf !important;
  background: #fff8f5 !important;
}

/* ---- 每日行程 ---- */
.day-collapse {
  margin-bottom: 16px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(255, 107, 53, 0.06);
}

.day-collapse :deep(.van-collapse-item__title) {
  font-weight: 600;
  color: #1a1a1a;
  padding: 14px 16px;
}

.day-collapse :deep(.van-cell) {
  background: #fff;
}

.day-schedule {
  padding: 4px 0 8px;
}

.schedule-section {
  margin-bottom: 18px;
}

.schedule-section:last-child {
  margin-bottom: 0;
}

.section-label {
  font-size: 14px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
  display: inline-block;
  margin-bottom: 10px;
  font-size: 13px;
}

.section-label.morning {
  background: #fff4e6;
  color: #fa8c16;
}

.section-label.afternoon {
  background: #e6f4ff;
  color: #1677ff;
}

.section-label.evening {
  background: #f0f5ff;
  color: #722ed1;
}

/* ---- 预算/提示卡片 ---- */
.budget-card,
.tips-card,
.warnings-card {
  margin-bottom: 16px;
}

.tips-list,
.warnings-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tips-list li,
.warnings-list li {
  padding: 10px 0;
  color: #555;
  font-size: 14px;
  border-bottom: 1px solid #f7f7f7;
  line-height: 1.6;
  padding-left: 16px;
  position: relative;
}

.tips-list li::before {
  content: '💡';
  position: absolute;
  left: 0;
  top: 10px;
  font-size: 12px;
}

.warnings-list li::before {
  content: '⚠️';
  position: absolute;
  left: 0;
  top: 10px;
  font-size: 12px;
}

.tips-list li:last-child,
.warnings-list li:last-child {
  border-bottom: none;
}

/* ---- 底部按钮 ---- */
.detail-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);
  max-width: 750px;
  margin: 0 auto;
  z-index: 100;
}

.footer-btn {
  width: 100%;
  height: 46px;
  font-size: 16px;
  font-weight: 500;
}

.error-container {
  text-align: center;
  padding: 40px 16px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}
</style>
