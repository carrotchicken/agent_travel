<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router'
import { post } from '@/utils/request';
import { useTravelStore } from '@/stores/travel'
import SpotItem from '@/components/SpotItem.vue';
import BudgetTable from '@/components/BudgetTable.vue';

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

const onBack = () => {
  router.back()
}

/**
 * 请求后端生成行程规划
 */
const fetchTripData = async () => {
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
      // 兜底：返回了意料之外的数据结构
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

const goTochat = () => {
  router.push({
    path: '/chat',
    query: {
      scene: 'detail',
      city: formData.city
    }
  })
}

onMounted(()=>{
  // 从 query 参数读取首页传来的数据
  formData.city=route.query.city||''
  // query 参数都是字符串，转成数字
  formData.budget=Number(route.query.budget)||null,
  formData.days=Number(route.query.days)||null
  if(formData.city&&formData.budget&&formData.days){
    fetchTripData()
  }else{
    isloading.value=false
    errMsg.value='缺少必要的出行信息，请返回首页重新填写'
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
      />
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
        <div class="card overview-card">
          <div class="trip-header">
            <h2>{{ tripData.city }}·{{ tripData.days }}天行程规划</h2>
            <div class="trip-budget">预算:{{ tripData.totalBudget }}元</div>
          </div>
        </div>
        
        <!-- 每日行程折叠面板 -->
        <van-collapse v-model="activeDays">
          <van-collapse-item 
            v-for="day in tripData.dailyItinerary" 
            :key="day.day" 
            :title="'第' + day.day + '天'" 
            :name="day.day">
            <div class="day-schedule">
              <div class="schedule-section">
                  <div class="section-label morning">上午</div>
                  <SpotItem :data="day.morning"/>
              </div>
              <div class="schedule-section">
                  <div class="section-label afternoon">下午</div>
                  <SpotItem :data="day.afternoon"/>
              </div>
              <div class="schedule-section">
                  <div class="section-label evening">晚上</div>
                  <SpotItem :data="day.evening"/>
              </div>
            </div>
          </van-collapse-item>
        </van-collapse>

        <div class="card budget-cart" v-if="tripData.budgetBreakdown">
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
      <van-button type="primary" size="large" round @click="goTochat" class="primary-button">咨询 AI 助手</van-button>
    </div>
  </div>
</template>
<style scoped>
.page-header {
  height: 46px;
}

.page-content {
  padding-top: 46px;
  padding-bottom: 60px;
}

.overview-card {
  margin-bottom: 16px;
}

.trip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.trip-header h2 {
  font-size: 20px;
  color: #323233;
  margin: 0;
}

.trip-budget {
  font-size: 16px;
  color: #ee0a24;
  font-weight: 600;
}

.trip-collapse {
  margin-bottom: 16px;
}

.day-schedule {
  padding: 8px 0;
}

.schedule-section {
  margin-bottom: 16px;
}

.schedule-section:last-child {
  margin-bottom: 0;
}

.section-label {
  font-size: 14px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
  margin-bottom: 8px;
}

.section-label.morning {
  background: #fff7e6;
  color: #fa8c16;
}

.section-label.afternoon {
  background: #e6f7ff;
  color: #1890ff;
}

.section-label.evening {
  background: #f6ffed;
  color: #52c41a;
}

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
  padding: 8px 0;
  color: #666;
  font-size: 14px;
  border-bottom: 1px solid #f5f5f5;
}

.tips-list li:last-child,
.warnings-list li:last-child {
  border-bottom: none;
}

.detail-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: #fff;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
  max-width: 750px;
  margin: 0 auto;
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
