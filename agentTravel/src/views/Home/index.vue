<script setup>
// ============================================================
// 模块导入
// ============================================================
import { showToast } from 'vant'
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'

// ============================================================
// 路由
// ============================================================
const router = useRouter()

// ============================================================
// 响应式数据
// ============================================================

// 城市选择器显示状态
const showPicker = ref(false)

// 表单数据（使用 reactive 保证响应式）
const formData = reactive({
    city: '',      // 目的地城市
    budget: null,  // 预算金额
    days: null     // 旅行天数
})

// 提交按钮加载状态
const isLoading = ref(false)

// ============================================================
// 静态数据
// ============================================================

// 所有可选城市列表
const cities = [
    '北京', '上海', '广州', '深圳', '成都', '杭州', '西安', '重庆',
    '南京', '武汉', '苏州', '长沙', '天津', '郑州', '济南', '青岛',
    '大连', '沈阳', '哈尔滨', '长春', '福州', '厦门', '南昌', '合肥',
    '昆明', '贵阳', '南宁', '桂林', '海口', '三亚', '丽江', '大理',
    '西安', '兰州', '乌鲁木齐', '拉萨', '呼和浩特', '太原', '石家庄'
]

// 热门城市（取前 8 个）
const popularCities = cities.slice(0, 8)

// 城市选择器列数据（需要 {text, value} 格式）
const cityColumns = cities.map(city => ({ text: city, value: city }))

// ============================================================
// 方法
// ============================================================

/**
 * 城市选择器确认回调
 * @param {Object} selectedValues - 选中的值
 */
const handleCityConfirm = (selectedValues) => {
    
    formData.city = selectedValues.selectedOptions[0].value
    showPicker.value = false
}

/**
 * 提交表单 - 跳转到详情页
 * 
 * 执行流程：
 * 1. 校验表单数据  校验：目的地 校验：预算（不能低于 100）天数（1-30 天）
 * 2. 通过 URL query 参数传递数据 跳转到详情页，通过 query 传递参数
 * 3. 跳转到 /detail 页面
 * 
 * 为什么用 query 传参？
 * - 简单直接，页面刷新数据不丢失
 * - 适合少量数据的传递
 * - 缺点是数据暴露在 URL 中（但本场景无敏感数据）
 */
const handleSubmit = () => {
    isLoading.value = true
    
    // 校验：目的地
    if (!formData.city) {
        showToast('请选择目的地')
        isLoading.value = false
        return
    }
    
    // 校验：预算（不能低于 100）
    if (!formData.budget || formData.budget < 100) {
        showToast('预算不能低于100')
        isLoading.value = false
        return
    }
    
    // 校验：天数（1-30 天）
    if (!formData.days || formData.days < 1 || formData.days > 30) {
        showToast('天数必须在1-30天之间')
        isLoading.value = false
        return
    }
    
    // 跳转到详情页，通过 query 传递参数
    router.push({
        path: '/detail',
        query: {
            city: formData.city,
            budget: formData.budget,
            days: formData.days
        }
    })
    
    isLoading.value = false
}

/**
 * 跳转到指定页面
 * @param {string} path - 目标路径
 */
const goPage = (path) => {
    router.push(path)
}

/**
 * 点击热门城市标签
 * 自动填充到表单
 * @param {string} city - 城市名
 */
const selectedCity = (city) => {
    formData.city = city
}
</script>

<template>
    <div class="page-container">
        <!-- ====== 顶部导航 ====== -->
        <div class="page-header">
            <van-nav-bar background="linear-gradient(90deg, #D09D69 0%, #E0C1A1 100%)" title="智能旅游助手"/>
        </div>
        
        <div class="page-content">
            <!-- ====== 通知栏 ====== -->
            <van-notice-bar 
                left-icon="info-o" 
                text="基于 AI 的智能景点与行程规划系统" 
                style="margin-bottom: 16px;" 
            />
            
            <!-- ====== 搜索表单 ====== -->
            <div class="card search-card">
                <div class="section-title">规划你的行程</div>
                
                <!-- 目的地选择 -->
                <van-field 
                    is-link 
                    readonly 
                    v-model="formData.city" 
                    @click="showPicker = true" 
                    label="目的地" 
                    placeholder="请选择目的地城市"
                    style="background-color: #f7f8fa; border-radius: 8px; margin-bottom: 12px;" 
                />
                
                <!-- 预算输入 -->
                <van-field
                    v-model="formData.budget"
                    type="number"
                    label="预算"
                    placeholder="请输入您的预算（元）"
                    style="background-color: #f7f8fa; border-radius: 8px; margin-bottom: 12px;"
                />
                
                <!-- 天数输入 -->
                <van-field
                    v-model="formData.days"
                    type="digit"
                    label="天数"
                    placeholder="请输入旅行天数"
                    style="background-color: #f7f8fa; border-radius: 8px; margin-bottom: 12px;"
                />
                
                <!-- 提交按钮 -->
                <van-button 
                    type="primary" 
                    size="large" 
                    round 
                    :loading="isLoading" 
                    @click="handleSubmit">
                    开始规划
                </van-button>
            </div>
            
            <!-- ====== 快捷入口 ====== -->
            <div class="card quick-actions">
                <div class="section-title">快捷入口</div>
                <van-grid :column-num="2" :gutter="12">
                    <van-grid-item @click="goPage('/chat')" icon="chat-o" text="AI对话" />
                    <van-grid-item @click="goPage('/profile')" icon="user-o" text="我的" />
                </van-grid>
            </div>
            
            <!-- ====== 热门目的地 ====== -->
            <div class="card popular-destination">
                <div class="section-title">热门目的地</div>
                <van-grid :column-num="4">
                    <van-grid-item 
                        @click="selectedCity(city)" 
                        v-for="(city, index) in popularCities" 
                        :key="index">
                        <div class="city-tag" :class="{ active: formData.city === city }">
                            {{ city }}
                        </div>
                    </van-grid-item>
                </van-grid>
            </div>
            
            <!-- ====== 城市选择弹出层 ====== -->
            <van-popup round v-model:show="showPicker" position="bottom">
                <van-picker
                    title="请选择城市"
                    :columns="cityColumns"
                    @confirm="handleCityConfirm"
                    @cancel="showPicker = false"
                />
            </van-popup>
        </div>
    </div>
</template>
<style scoped>
.page-content {
    margin-top: 20px;
}

.search-card {
    margin-bottom: 16px;
}

.city-tag {
    padding: 8px 12px;
    border-radius: 16px;
    font-size: 14px;
    color: #666;
    background-image: linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%);
    transition: all 0.3s;
}

.city-tag.active {
    background-image: linear-gradient(to top, #a8edea 0%, #fed6e3 100%);
    color: #fff;

}

</style>