<!--
  SpotItem — 单个景点信息卡片
  职责：展示景点的名称、时长、门票、交通、描述
  使用场景：Detail/index.vue 的每日行程中，上午/下午/晚上各渲染一个
-->
<template>
  <!-- 有数据时：展示完整景点信息 -->
  <div class="spot-item" v-if="data">
    <!--
      景点名称：优先取 data.spot，兼容 data.name 字段
      为什么兼容两个字段名？
      - AI 返回的 JSON 严格按照 prompt 模板，字段名是 spot
      - 但不同 AI 模型可能输出略有差异，name 作为兜底
    -->
    <div class="spot-name">{{ data.spot || data.name || '待定' }}</div>

    <!--
      景点元信息行：时长 / 门票 / 交通
      只在至少有一个字段有值时渲染，避免空行占位
    -->
    <div class="spot-details" v-if="data.duration || data.ticket || data.transportation">
      <!-- 游玩时长，图标：时钟 -->
      <div class="detail-row" v-if="data.duration">
        <van-icon name="clock-o" size="14" />
        <span>{{ data.duration }}</span>
      </div>
      <!-- 门票价格，图标：门票 -->
      <div class="detail-row" v-if="data.ticket">
        <van-icon name="ticket-o" size="14" />
        <span>{{ data.ticket }}</span>
      </div>
      <!-- 交通方式，图标：物流/车辆 -->
      <div class="detail-row" v-if="data.transportation">
        <van-icon name="logistics" size="14" />
        <span>{{ data.transportation }}</span>
      </div>
    </div>

    <!-- 景点描述文字：AI 生成的一段介绍 -->
    <div class="spot-desc" v-if="data.description">{{ data.description }}</div>
  </div>

  <!-- 无数据时（data 为 null/undefined）：显示空状态 -->
  <div class="spot-item empty" v-else>
    <van-empty description="暂无安排" :image-size="40" />
  </div>
</template>

<script setup>
// ============================================================
// Props 定义
// ============================================================

// 接收父组件传来的景点数据对象
// 字段来自 AI 返回的 JSON：
//   spot:           景点名称
//   duration:       建议游玩时长（如 "2-3小时"）
//   ticket:         门票价格（如 "60元"）
//   transportation: 交通方式（如 "地铁2号线直达"）
//   description:    景点介绍（一段文字）
defineProps({
  data: {
    type: Object,
    // 默认为 null：未传时显示空状态，传空对象 {} 时也视为无数据
    default: null
  }
})
</script>

<style scoped>
/* 景点条目容器 */
.spot-item {
  padding: 8px 0;
}

/* 空数据状态下增加 padding */
.spot-item.empty {
  padding: 16px 0;
}

/* 景点名称：加粗、深色 */
.spot-name {
  font-size: 16px;
  font-weight: 600;
  color: #4a4a5a;
  margin-bottom: 8px;
}

/* 元信息行：flex 横向排列，允许换行 */
.spot-details {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
}

/* 单个信息项：图标 + 文字 */
.detail-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #666;
}

/* 描述文字 */
.spot-desc {
  font-size: 14px;
  color: #969799;
  line-height: 1.5;
}
</style>
