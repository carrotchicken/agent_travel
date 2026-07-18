<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { fetchStream, getErrorMessage } from '@/utils/request'
import { showToast, showDialog } from 'vant'
import ChatBubble from '@/components/ChatBubble.vue'
import { useChatStore } from '@/stores/chat'

const router = useRouter()
const route = useRoute()

const chatStore = useChatStore()

// AI 是否正在生成回复
const isStreaming = ref(false)
// 当前输入框内容
const inputMessage = ref('')
// 历史会话侧边栏显示
const showHistory = ref(false)
// 最近一次待重试的用户消息
const lastSentMessage = ref('')
// 是否允许展示“重新生成”提示（仅失败/中断后）
const retryEnabled = ref(false)

// 直接用 store 里的消息列表（响应式）
const messages = computed(() => chatStore.messages)

// 发送按钮是否禁用
const isSendDisabled = computed(() => {
  return !inputMessage.value.trim() || isStreaming.value
})

const canRetry = computed(() => {
  return retryEnabled.value && !isStreaming.value && !!lastSentMessage.value
})

// 快捷问题列表
const quickQuestions = ref([
  '北京有哪些必去的景点？',
  '上海美食推荐',
  '成都三日游攻略',
  '预算3000元能去哪里玩？'
])

// 当前流式请求句柄（用于取消）
let streamHandle = null

/**
 * 构建多轮对话历史（最近 10 条，排除空的 AI 占位消息）
 */
const buildChatHistory = () => {
  return chatStore.messages
    .slice(0, -1)
    .slice(-10)
    .filter(m => m.content?.trim())
    .map(m => ({ role: m.role, content: m.content }))
}

// 返回上一页
const onBack = () => {
  router.back()
}

// 聊天区域 DOM 引用
const chatContainerRef = ref(null)

const isUserAtBottom = () => {
  const el = chatContainerRef.value
  if (!el) return false
  const { scrollTop, scrollHeight, clientHeight } = el
  return scrollTop + clientHeight >= scrollHeight - 50
}

const scrollToBottom = (force = false) => {
  nextTick(() => {
    requestAnimationFrame(() => {
      const el = chatContainerRef.value
      if (el && (force || isUserAtBottom())) {
        el.scrollTop = el.scrollHeight
      }
    })
  })
}

// 添加用户消息
const addUserMessage = (content) => {
  chatStore.addMessage({
    id: Date.now(),
    role: 'user',
    content,
    timestamp: new Date().toISOString()
  })
  scrollToBottom(true)
}

// 点击快捷问题
const handleClickTag = (q) => {
  if (isStreaming.value) return
  inputMessage.value = q
  sendMessage()
}

const stopStreaming = () => {
  if (streamHandle) {
    streamHandle.abort()
    streamHandle = null
  }
  isStreaming.value = false
  retryEnabled.value = true
}

// 发送消息
const sendMessage = () => {
  const msg = inputMessage.value.trim()
  if (!msg || isStreaming.value) return

  lastSentMessage.value = msg
  retryEnabled.value = false
  addUserMessage(msg)
  inputMessage.value = ''
  fetchAIResponse(msg)
}

const retryLastMessage = () => {
  if (!canRetry.value) return
  inputMessage.value = lastSentMessage.value
  retryEnabled.value = false
  sendMessage()
}

// 获取 AI 回复（流式）
const fetchAIResponse = (userMsg) => {
  isStreaming.value = true

  // 创建 AI 消息占位
  const aiMessageId = Date.now() + 1
  chatStore.addMessage({
    id: aiMessageId,
    role: 'ai',
    content: '',
    timestamp: new Date().toISOString()
  })
  scrollToBottom()

  let fullResponse = ''

  streamHandle = fetchStream(
    'chat',
    { message: userMsg, history: buildChatHistory() },
    // onChunk
    (chunk) => {
      fullResponse += chunk
      chatStore.updateLastAIMessage(fullResponse)
      scrollToBottom()
    },
    // onComplete
    () => {
      isStreaming.value = false
      streamHandle = null
      retryEnabled.value = false
      scrollToBottom()
      setTimeout(() => {
        scrollToBottom()
      }, 300)
    },
    // onError
    (err) => {
      const msg = getErrorMessage(err)
      chatStore.updateLastAIMessage(`抱歉，发生了错误：${msg}`)
      isStreaming.value = false
      streamHandle = null
      retryEnabled.value = true
      showToast(msg)
      scrollToBottom()
    }
  )
}

// 新建对话
const handleNewChat = () => {
  stopStreaming()
  lastSentMessage.value = ''
  retryEnabled.value = false
  chatStore.createNewSession()
  showHistory.value = false
  scrollToBottom()
}

// 切换会话
const handleSwitchSession = (sessionId) => {
  stopStreaming()
  lastSentMessage.value = ''
  retryEnabled.value = false
  chatStore.switchSession(sessionId)
  showHistory.value = false
  scrollToBottom()
}

// 删除会话
const handleDeleteSession = (sessionId) => {
  showDialog({
    title: '删除对话',
    message: '确定删除这个对话记录吗？'
  }).then(() => {
    stopStreaming()
    if (sessionId === chatStore.currentSessionId) {
      lastSentMessage.value = ''
      retryEnabled.value = false
    }
    chatStore.deleteSession(sessionId)
    showToast('已删除')
  }).catch(() => {})
}

// 格式化时间
const formatSessionTime = (isoStr) => {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) {
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0')
  }
  return (d.getMonth() + 1) + '/' + d.getDate()
}

// 页面挂载
onMounted(() => {
  // 从详情页跳转过来时自动提问
  if (route.query.scene === 'detail' && route.query.city) {
    // 如果当前会话已有消息，新建一个会话
    if (messages.value.length > 0) {
      chatStore.createNewSession()
    }
    inputMessage.value = `我想了解一下${route.query.city}的旅游景点`
    retryEnabled.value = false
    sendMessage()
  }
  scrollToBottom()
})
</script>

<template>
  <div class="page-container chat-page">
    <!-- ====== 顶部导航 ====== -->
    <div class="page-header">
      <van-nav-bar
        title="AI旅游助手"
        left-arrow
        left-text="返回"
        fixed
        @click-left="onBack"
      >
        <template #right>
          <div class="header-actions">
            <van-button
              v-if="isStreaming"
              size="small"
              plain
              type="primary"
              @click="stopStreaming"
            >
              停止生成
            </van-button>
            <van-icon name="more-o" size="20" @click="showHistory = true" />
          </div>
        </template>
      </van-nav-bar>
    </div>

    <!-- Claymorphism 黏土背景装饰 blob（页面层级，不被 overflow 裁剪） -->
    <div class="chat-bg-decor">
      <div class="bg-blob blob-1"></div>
      <div class="bg-blob blob-2"></div>
      <div class="bg-blob blob-3"></div>
      <div class="bg-blob blob-4"></div>
    </div>

    <!-- ====== 聊天区域 ====== -->
    <div ref="chatContainerRef" class="chat-container">
      <!-- 空状态 -->
      <div v-if="messages.length === 0" class="chat-empty">
        <van-empty description="开始和AI助手聊天吧" />
        <div class="quick-question">
          <div class="quick-title">💡 快速提问</div>
          <div class="quick-tags">
            <van-tag
              v-for="q in quickQuestions"
              :key="q"
              size="large"
              type="primary"
              @click="handleClickTag(q)">
              {{ q }}
            </van-tag>
          </div>
        </div>
      </div>

      <!-- 消息列表 -->
      <div class="message-list">
        <ChatBubble
          v-for="msg in messages"
          :key="msg.id"
          :message="msg" />

        <!-- AI 思考中状态 -->
        <div v-if="isStreaming" class="ai-thinking">
          <van-loading type="spinner" size="20px" />
          <span>AI 正在思考中...</span>
        </div>
      </div>
    </div>

    <!-- ====== 底部输入区域 ====== -->
    <div class="chat-input-area">
      <div v-if="isStreaming" class="stream-tip">
        <span>AI 正在生成回复...</span>
        <van-button size="mini" plain type="primary" @click="stopStreaming">停止</van-button>
      </div>
      <van-field
        v-model="inputMessage"
        placeholder="输入您的问题...."
        :disabled="isStreaming"
        @keyup.enter="sendMessage"
        clearable>
        <template #button>
          <van-button
            @click="sendMessage"
            type="primary"
            size="small"
            :disabled="isSendDisabled">
            发送
          </van-button>
        </template>
      </van-field>
      <div v-if="canRetry && lastSentMessage" class="retry-link-row">
        <span>上次回复中断了</span>
        <van-button size="small" type="primary" link @click="retryLastMessage">重新生成</van-button>
      </div>
    </div>

    <!-- ====== 历史会话侧边栏 ====== -->
    <van-popup
      v-model:show="showHistory"
      position="right"
      :style="{ width: '75%', height: '100%' }"
    >
      <div class="history-panel">
        <div class="history-header">
          <span class="history-title">对话历史</span>
          <van-button size="small" type="primary" plain @click="handleNewChat">
            新建对话
          </van-button>
        </div>

        <div class="history-list">
          <div
            v-for="session in chatStore.sessions"
            :key="session.id"
            class="history-session-item"
            :class="{ active: session.id === chatStore.currentSessionId }"
            @click="handleSwitchSession(session.id)"
          >
            <div class="session-title">{{ session.title }}</div>
            <div class="session-meta">
              <span>{{ session.messages.length }} 条消息</span>
              <span>{{ formatSessionTime(session.updatedAt) }}</span>
            </div>
            <van-icon
              name="delete-o"
              size="16"
              color="#c8c9cc"
              class="session-delete"
              @click.stop="handleDeleteSession(session.id)"
            />
          </div>

          <van-empty
            v-if="!chatStore.hasHistory"
            description="暂无对话历史"
            :image-size="40"
          />
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.page-header {
  height: 46px;
}

.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding-bottom: 0 !important;
  background: #f3efe8;
  position: relative;
}

/* ---- Claymorphism 背景装饰 blob（页面层级） ---- */
.chat-bg-decor {
  position: absolute;
  top: 46px;        /* header 高度 */
  bottom: 0;
  left: 0;
  right: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(30px);
}

.blob-1 {
  width: 200px;
  height: 200px;
  background: #bfd8df;
  opacity: 0.5;
  top: 8%;
  right: 12%;
  animation: blob-float 13s ease-in-out infinite;
}

.blob-2 {
  width: 150px;
  height: 150px;
  background: #e0dbb0;
  opacity: 0.45;
  bottom: 20%;
  left: 10%;
  animation: blob-float 16s ease-in-out 3s infinite;
}

.blob-3 {
  width: 120px;
  height: 120px;
  background: #eed9c8;
  opacity: 0.5;
  top: 40%;
  right: 25%;
  animation: blob-float 11s ease-in-out 5s infinite;
}

.blob-4 {
  width: 180px;
  height: 180px;
  background: #cddce8;
  opacity: 0.4;
  bottom: 30%;
  right: 5%;
  animation: blob-float 15s ease-in-out 7s infinite;
}

@keyframes blob-float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(12px, -18px) scale(1.08);
  }
  50% {
    transform: translate(-8px, 12px) scale(0.94);
  }
  75% {
    transform: translate(-14px, -6px) scale(1.05);
  }
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 80px;
  padding-top: 60px;
  position: relative;
  z-index: 1;
}

/* ---- 空状态 ---- */
.chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.quick-question {
  margin-top: 32px;
  text-align: center;
  width: 100%;
}

.quick-title {
  font-size: 14px;
  color: #999;
  margin-bottom: 16px;
}

.quick-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  padding: 0 60px;
}

/* ---- 消息列表 ---- */
.message-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ai-thinking {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  color: #82bcc8;
  font-size: 13px;
  background: #fff;
  border-radius: 0 18px 18px 18px;
  align-self: flex-start;
  box-shadow:
    0 4px 14px rgba(130, 188, 200, 0.1),
    0 2px 4px rgba(0, 0, 0, 0.03);
}

/* ---- 底部输入区 ---- */
.chat-input-area {
  position: fixed;
  bottom: 50px;
  left: 0;
  right: 0;
  background: #fff;
  padding: 12px 12px calc(12px + env(safe-area-inset-bottom));
  box-shadow:
    0 -6px 20px rgba(0, 0, 0, 0.04),
    0 -2px 6px rgba(0, 0, 0, 0.02);
  border-radius: 20px 20px 0 0;
  max-width: 750px;
  margin: 0 auto;
  z-index: 100;
}

.stream-tip,
.retry-link-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding: 4px 2px;
  font-size: 12px;
  color: #5a5a5a;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-input-area :deep(.van-field) {
  background: #ede8e0;
  border-radius: 22px;
  padding: 10px 10px 10px 18px;
  box-shadow:
    inset 0 2px 5px rgba(0, 0, 0, 0.04),
    inset 0 1px 2px rgba(0, 0, 0, 0.02);
}

.chat-input-area :deep(.van-button--primary) {
  background: #82bcc8 !important;
  border: none !important;
  border-radius: 20px !important;
  height: 34px;
  line-height: 34px;
  padding: 0 18px;
  font-size: 14px;
  font-weight: 600;
  box-shadow:
    0 3px 10px rgba(130, 188, 200, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

/* ---- 历史会话面板 ---- */
.history-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f3efe8;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #82bcc8;
  color: #fff;
  border-radius: 0 0 16px 16px;
}

.history-title {
  font-size: 17px;
  font-weight: 600;
}

.history-header :deep(.van-button) {
  background: rgba(255, 255, 255, 0.2) !important;
  border-color: rgba(255, 255, 255, 0.4) !important;
  color: #fff !important;
  border-radius: 16px !important;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.history-session-item {
  background: #fff;
  border-radius: 18px;
  padding: 14px;
  margin-bottom: 10px;
  position: relative;
  cursor: pointer;
  box-shadow:
    0 4px 14px rgba(0, 0, 0, 0.04),
    0 2px 4px rgba(0, 0, 0, 0.02);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.history-session-item:active {
  transform: scale(0.97);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
}

.history-session-item.active {
  border: 2px solid #82bcc8;
  background: #eaf5f7;
}

.session-title {
  font-size: 14px;
  color: #4a4a5a;
  font-weight: 500;
  margin-bottom: 6px;
  padding-right: 24px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-session-item.active .session-title {
  color: #5d9aa8;
}

.session-meta {
  font-size: 12px;
  color: #999;
  display: flex;
  justify-content: space-between;
}

.session-delete {
  position: absolute;
  top: 14px;
  right: 12px;
  padding: 4px;
}
</style>
