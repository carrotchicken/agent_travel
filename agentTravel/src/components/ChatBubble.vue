<!--
  ChatBubble — 聊天气泡组件
  职责：根据消息角色（user/ai）渲染不同样式的气泡
  使用场景：Chat/index.vue 中 v-for 循环渲染每条消息
-->
<template>
  <!--
    外层容器：通过 :class 动态绑定 messageClass 计算属性
    messageClass 返回 'user-message' 或 'ai-message'
    CSS 用这个类名控制气泡是靠左还是靠右、什么颜色
  -->
  <div class="chat-bubble" :class="messageClass">
    <!-- 气泡内容区 -->
    <div class="bubble-content">
      <!-- 用户消息：直接展示文字 -->
      <div class="message-text" v-if="message.role === 'user'">{{ message.content }}</div>
      <!-- AI 消息：用 template 包裹，支持空内容时也不报错（流式刚开始时 content 为空字符串） -->
      <div class="message-text ai-message" v-else>
        <template v-if="message.content">{{ message.content }}</template>
      </div>
    </div>
    <!--
      时间显示：只在有内容且有时间戳时展示
      流式生成过程中 content 不为空，显示实时时间
    -->
    <div class="message-time" v-if="showTime">{{ formatTime }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// ============================================================
// Props 定义
// ============================================================

// 接收父组件传来的消息对象
// 格式：{ id: 时间戳, role: 'user'|'ai', content: 文本, timestamp: ISO时间字符串 }
const props = defineProps({
  message: {
    type: Object,
    required: true   // 必传，否则组件没有渲染意义
  }
})

// ============================================================
// 计算属性
// ============================================================

/**
 * 根据消息角色返回对应的 CSS 类名
 * 'user' → 靠右对齐 + 蓝色背景（像微信自己的消息）
 * 'ai'   → 靠左对齐 + 灰色背景（像对方的消息）
 * 
 * 为什么用计算属性？
 * - props.message 变化时自动重新计算
 * - 模板里写表达式太复杂，抽出来清晰
 */
const messageClass = computed(() => {
  return props.message.role === 'user' ? 'user-message' : 'ai-message'
})

/**
 * 控制是否显示时间戳
 * 条件：消息有时间戳 且 内容不为空
 * 流式刚开始时 content 为空，不显示时间，等有内容了再显示
 */
const showTime = computed(() => {
  return props.message.timestamp && props.message.content
})

/**
 * 格式化时间戳为 HH:MM
 * 例如 "2024-06-15T14:30:00.000Z" → "14:30"
 * 
 * padStart(2, '0') 确保个位数前面补零，如 9:05 显示为 "09:05"
 */
const formatTime = computed(() => {
  if (!props.message.timestamp) return ''
  const date = new Date(props.message.timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
})
</script>

<style scoped>
/* 
  气泡整体布局：用 flex 纵向排列（气泡内容 + 时间）
  max-width: 80% 防止长文本撑满屏幕
*/
.chat-bubble {
  display: flex;
  flex-direction: column;
  max-width: 80%;
}

/* 用户消息：靠右 */
.user-message {
  align-self: flex-end;
  align-items: flex-end;
}

/* AI 消息：靠左 */
.ai-message {
  align-self: flex-start;
  align-items: flex-start;
}

/* 气泡内容通用样式 */
.bubble-content {
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 15px;
  line-height: 1.5;
  word-break: break-word;   /* 长英文单词强制换行，避免溢出 */
}

/* 用户气泡：蓝色背景 + 右下角直角（模仿微信风格） */
.user-message .bubble-content {
  background: #1989fa;
  color: #fff;
  border-bottom-right-radius: 4px;
}

/* AI 气泡：灰色背景 + 左下角直角 */
.ai-message .bubble-content {
  background: #f5f5f5;
  color: #323233;
  border-bottom-left-radius: 4px;
}

/* 时间文字 */
.message-time {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
  padding: 0 4px;
}
</style>
