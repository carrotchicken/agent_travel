<!--
  ChatBubble — 聊天气泡组件
  AI 消息支持 Markdown 渲染（列表、加粗、代码块等）
-->
<template>
  <div class="chat-bubble" :class="messageClass">
    <div class="bubble-content">
      <!-- 用户消息：纯文本 -->
      <div class="message-text" v-if="message.role === 'user'">{{ message.content }}</div>
      <!-- AI 消息：Markdown 渲染 -->
      <div
        v-else
        class="message-text ai-message markdown-body"
        v-html="renderedContent"
      />
    </div>
    <div class="message-time" v-if="showTime">{{ formatTime }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { renderMarkdown } from '@/utils/markdown'

const props = defineProps({
  message: {
    type: Object,
    required: true
  }
})

const messageClass = computed(() => {
  return props.message.role === 'user' ? 'user-message' : 'ai-message'
})

const showTime = computed(() => {
  return props.message.timestamp && props.message.content
})

const formatTime = computed(() => {
  if (!props.message.timestamp) return ''
  const date = new Date(props.message.timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
})

const renderedContent = computed(() => {
  if (!props.message.content) return ''
  return renderMarkdown(props.message.content)
})
</script>

<style scoped>
.chat-bubble {
  display: flex;
  flex-direction: column;
  max-width: 80%;
}

.user-message {
  align-self: flex-end;
  align-items: flex-end;
}

.ai-message {
  align-self: flex-start;
  align-items: flex-start;
}

.bubble-content {
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;
}

.user-message .bubble-content {
  background: #82bcc8;
  color: #fff;
  border-bottom-right-radius: 4px;
  box-shadow:
    0 4px 14px rgba(130, 188, 200, 0.3),
    0 2px 4px rgba(130, 188, 200, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.ai-message .bubble-content {
  background: #fff;
  color: #4a4a5a;
  border-bottom-left-radius: 4px;
  box-shadow:
    0 4px 14px rgba(0, 0, 0, 0.04),
    0 2px 4px rgba(0, 0, 0, 0.02);
}

.message-time {
  font-size: 11px;
  color: #bbb;
  margin-top: 4px;
  padding: 0 4px;
}

/* Markdown 样式 */
.markdown-body :deep(p) {
  margin: 0 0 8px;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 4px 0 8px;
  padding-left: 20px;
}

.markdown-body :deep(li) {
  margin-bottom: 4px;
}

.markdown-body :deep(strong) {
  font-weight: 600;
  color: #4a4a5a;
}

.markdown-body :deep(code) {
  background: #eaf5f7;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  color: #5d9aa8;
}

.markdown-body :deep(pre) {
  background: #ede8e0;
  padding: 10px 12px;
  border-radius: 10px;
  overflow-x: auto;
  margin: 8px 0;
}

.markdown-body :deep(pre code) {
  background: none;
  padding: 0;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  font-size: 15px;
  font-weight: 600;
  margin: 8px 0 4px;
  color: #4a4a5a;
}

.markdown-body :deep(blockquote) {
  border-left: 3px solid #c8e0e8;
  margin: 8px 0;
  padding-left: 12px;
  color: #6e6e7e;
}
</style>
