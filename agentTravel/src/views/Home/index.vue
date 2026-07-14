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
const cities = [...new Set([
    '北京', '上海', '广州', '深圳', '成都', '杭州', '西安', '重庆',
    '南京', '武汉', '苏州', '长沙', '天津', '郑州', '济南', '青岛',
    '大连', '沈阳', '哈尔滨', '长春', '福州', '厦门', '南昌', '合肥',
    '昆明', '贵阳', '南宁', '桂林', '海口', '三亚', '丽江', '大理',
    '兰州', '乌鲁木齐', '拉萨', '呼和浩特', '太原', '石家庄'
])]

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
    <div class="page-container home-page">
        <!-- ====== 顶部导航 ====== -->
        <div class="page-header">
            <van-nav-bar title="智能旅游助手" />
        </div>

        <div class="page-content">
            <!-- ====== 欢迎横幅 ====== -->
            <div class="welcome-banner">
                <div class="banner-text">
                    <h1 class="banner-title">AI 智能规划</h1>
                    <p class="banner-sub">你的专属旅行管家</p>
                </div>
                <div class="banner-icon">✈️</div>
            </div>

            <!-- ====== 搜索表单 ====== -->
            <div class="card search-card fade-in-up">
                <div class="section-title">规划你的行程</div>

                <!-- 目的地选择 -->
                <van-field
                    is-link
                    readonly
                    v-model="formData.city"
                    @click="showPicker = true"
                    label="目的地"
                    placeholder="请选择目的地城市"
                    class="form-field"
                />

                <!-- 预算输入 -->
                <van-field
                    v-model="formData.budget"
                    type="number"
                    label="预算"
                    placeholder="请输入您的预算（元）"
                    class="form-field"
                />

                <!-- 天数输入 -->
                <van-field
                    v-model="formData.days"
                    type="digit"
                    label="天数"
                    placeholder="请输入旅行天数"
                    class="form-field"
                />

                <!-- 提交按钮 -->
                <van-button
                    type="primary"
                    size="large"
                    class="submit-btn primary-gradient-btn"
                    :loading="isLoading"
                    @click="handleSubmit">
                    开始规划
                </van-button>
            </div>

            <!-- ====== 快捷入口 ====== -->
            <div class="card quick-actions fade-in-up">
                <div class="section-title">快捷入口</div>
                <van-grid :column-num="2" :gutter="12" :border="false">
                    <van-grid-item @click="goPage('/chat')">
                        <div class="quick-item">
                            <div class="quick-icon chat-icon">💬</div>
                            <span class="quick-text">AI 对话</span>
                        </div>
                    </van-grid-item>
                    <van-grid-item @click="goPage('/profile')">
                        <div class="quick-item">
                            <div class="quick-icon profile-icon">👤</div>
                            <span class="quick-text">我的</span>
                        </div>
                    </van-grid-item>
                </van-grid>
            </div>

            <!-- ====== 热门目的地 ====== -->
            <div class="card popular-destination fade-in-up">
                <div class="section-title">热门目的地</div>
                <div class="city-tags">
                    <div
                        class="city-tag"
                        :class="{ active: formData.city === city }"
                        v-for="(city, index) in popularCities"
                        :key="index"
                        @click="selectedCity(city)">
                        {{ city }}
                    </div>
                </div>
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
.home-page .page-content {
    padding-top: 0;
}

/* ---- 欢迎横幅 ---- */
.welcome-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 16px 16px;
    background: linear-gradient(135deg, #3b6892 0%, #5a8ab8 100%);
    margin: 10px 10px;
    border-radius: 7px 7px;
    color: #fff;
    position: relative;
    overflow: hidden;
}

.welcome-banner::after {
    content: '';
    position: absolute;
    right: -20px;
    top: -20px;
    width: 100px;
    height: 100px;
    background: radial-gradient(circle, rgba(216, 216, 159, 0.2) 0%, transparent 70%);
    border-radius: 50%;
}

.banner-title {
    font-size: 22px;
    font-weight: 700;
    margin: 0 0 4px;
    letter-spacing: 1px;
}

.banner-sub {
    font-size: 13px;
    opacity: 0.85;
    margin: 0;
}

.banner-icon {
    font-size: 40px;
    opacity: 0.9;
}

/* ---- 表单 ---- */
.search-card {
    margin-bottom: 16px;
}

.form-field {
    background-color: #f7f5ee !important;
    border-radius: 10px;
    margin-bottom: 12px;
}

.form-field :deep(.van-field__body) {
    padding-right: 12px;
}

.submit-btn {
    width: 100%;
    margin-top: 8px;
    height: 46px;
    font-size: 16px;
    font-weight: 500;
}

/* ---- 快捷入口 ---- */
.quick-actions {
    margin-bottom: 16px;
}

.quick-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
}

.quick-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    background: linear-gradient(135deg, #e8f0f8 0%, #d4e4f2 100%);
    transition: transform 0.2s ease;
}

.quick-item:active .quick-icon {
    transform: scale(0.95);
}

.quick-text {
    font-size: 13px;
    color: #3c3c3c;
}

/* ---- 热门城市 ---- */
.city-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: flex-start;
}

.city-tag {
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 13px;
    color: #5c5c5c;
    background: #ebe7d8;
    transition: all 0.2s ease;
    cursor: pointer;
    border: 1px solid transparent;
}

.city-tag:active {
    transform: scale(0.96);
}

.city-tag.active {
    background: linear-gradient(135deg, #3b6892 0%, #5a8ab8 100%);
    color: #fff;
    box-shadow: 0 4px 10px rgba(59, 104, 146, 0.25);
}
</style>