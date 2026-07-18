<!--
  BudgetTable — 预算明细表
  职责：展示旅行预算的五大类目明细 + 总计
  使用场景：Detail/index.vue 行程详情页中，位于每日行程下方
-->
<template>
  <div class="budget-table">
    <!--
      预算明细列表：用 Vant 的 van-cell-group 渲染
      v-for 遍历 budgetItems 计算属性的键值对
      例如 { accommodation: 800, food: 500, transportation: 200, tickets: 300, other: 200 }
      每一项渲染为一行动画 cell：左侧中文标签，右侧 ¥金额
       中文标签：住宿/餐饮/交通/门票/其他 
       金额前面加 ¥ 符号
       去掉行之间的分割线
    -->
    <van-cell-group :border="false">
      <van-cell
        v-for="(value, key) in budgetItems"
        :key="key"
        :title="getLabel(key)"     
        :value="`${value}`"       
        :border="false"          
      />
    </van-cell-group>

    <!-- 总计行：和明细区分开，用独立的高亮样式 -->
    <div class="budget-total">
      <span>总计</span>
      <span class="total-amount">¥{{ total }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// ============================================================
// Props 定义
// ============================================================

const props = defineProps({
  // AI 返回的预算拆分明细对象
  // 格式：{ accommodation: 800, food: 500, transportation: 200, tickets: 300, other: 200 }
  data: {
    type: Object,
    default: () => ({})
  },
  // 总预算金额（来自 tripData.totalBudget）
  total: {
    type: [Number, String],
    default: 0
  }
})

// ============================================================
// 计算属性
// ============================================================

/**
 * 将 props.data（可能为空或部分缺失）标准化为完整的五类目对象
 * 
 * 为什么需要这个计算属性？
 * - AI 返回的 budgetBreakdown 可能缺少某个字段
 * - 模板 v-for 需要稳定的键值对来循环
 * - || 0 保证缺失字段显示为 ¥0 而不是 undefined
 */
const budgetItems = computed(() => {
  return {
    accommodation: props.data.accommodation || 0,  // 住宿
    food: props.data.food || 0,                     // 餐饮
    transportation: props.data.transportation || 0, // 交通
    tickets: props.data.tickets || 0,               // 门票
    other: props.data.other || 0                    // 其他
  }
})

// ============================================================
// 辅助方法
// ============================================================

// 英文字段名 → 中文标签的映射表
const labelMap = {
  accommodation: '住宿',
  food: '餐饮',
  transportation: '交通',
  tickets: '门票',
  other: '其他'
}

/**
 * 根据英文字段名获取中文标签
 * 如果映射表里没有对应字段（理论上不会发生），直接返回原字段名兜底
 */
const getLabel = (key) => {
  return labelMap[key] || key
}
</script>

<style scoped>
.budget-table {
  margin-top: 8px;
}

/* 总计行：黏土风格 */
.budget-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #eaf5f7;
  border-radius: 14px;
  margin-top: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #4a4a5a;
}

/* 总计金额：主色突出 */
.total-amount {
  color: #82bcc8;
  font-size: 18px;
  font-weight: 700;
}
</style>
