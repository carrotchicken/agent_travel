<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { fetchStream } from '@/utils/request'
import { showToast } from 'vant'
import ChatBubble from '@/components/ChatBubble.vue'
import { useTravelStore } from '@/stores/travel'
// 路由
const router = useRouter()
const route = useRoute()

// Pinia Store：跨页面获取当前城市（详情页跳转时的兜底）
const travelStore = useTravelStore()

// 响应式数据
// AI 是否正在生成回复
const isStreaming = ref(false)
// 消息列表
const messages = ref([])
// 当前输入框内容
const inputMessage = ref('')

// 计算属性
/**
 * 发送按钮是否禁用
 * - 输入为空时禁用
 * - AI 正在回复时禁用（防止重复发送）
 */
const isSendDisabled = computed(() => {
    return !inputMessage.value.trim() || isStreaming.value
})

// 静态数据
/**
 * 快捷问题列表
 * 点击后自动填充到输入框并发送
 */
const quickQuestions = ref([
    '北京有哪些必去的景点？',
    '上海美食推荐',
    '成都三日游攻略',
    '如何选择旅行保险？'
])
// 方法
/**
 * 返回上一页
 */
const onBack = () => {
    router.back()
}

/**
 * 滚动到消息列表底部
 * 使用 nextTick 确保 DOM 更新后再滚动
 */
const scrollToBottom = () => {
    // 等 Vue 把 DOM 更新完，再执行里面的代码。
    nextTick(() => {
        const container = document.querySelector('.message-list')
        // 为什么还要判断container是否存在呢？
        if (container) {
            // scrollHeight:就是整个内容的总高度（1200px），包括超出容器的部分
            //scrollTop: 容器"已经向上滚了多少 0:最顶部
            // 把滚动位置设为总高度，这样就自动滚到最底部了。
            container.scrollTop = container.scrollHeight
        }
    })
}

/**
 * 添加用户消息
 * @param {string} content - 消息内容
 */
const addUserMessage = (content) => {
    messages.value.push({
        id: Date.now(),
        role: 'user',
        content,
        timestamp: new Date().toISOString()
    })
    scrollToBottom()
}

/**
 * 点击快捷问题
 * @param {string} q - 问题内容
 */
const handleClickTag = (q) => {
    if (isStreaming.value) return
    inputMessage.value = q
    sendMessage()
}

/**
 * 发送消息
 * 
 * 执行流程：
 * 1. 校验输入不能为空
 * 2. 添加用户消息到列表
 * 3. 清空输入框
 * 4. 调用 AI 接口获取回复
 */
const sendMessage = () => {
    const msg = inputMessage.value.trim()
    if (!msg || isStreaming.value) {
        return
    }

    addUserMessage(msg)
    inputMessage.value = ''
    fetchAIResponse(msg)
}

/**
 * 获取 AI 回复（流式）
 * 
 * 执行流程：
 * 1. 添加一条空的 AI 消息占位
 * 2. 调用 fetchStream 发起流式请求
 * 3. 每次收到 chunk，更新最后一条 AI 消息的内容
 * 4. 全部接收完毕，关闭流式状态
 * 5. 发生错误时，显示错误信息
 * 
 * 关键技术：
 * - 流式响应实现打字机效果
 * - 通过 id 准确定位要更新的消息
 * 
 * @param {string} userMsg - 用户消息
 */
const fetchAIResponse = (userMsg) => {
    isStreaming.value = true

    // 创建 AI 消息占位（先显示空内容）
    const aiMessageId = Date.now() + 1
    messages.value.push({
        id: aiMessageId,
        role: 'ai',
        content: '',
        timestamp: new Date().toISOString()
    })
    scrollToBottom()

    let fullResponse = ''

    fetchStream(
        'chat',
        { message: userMsg },
        // onChunk：收到数据块
        (chunk) => {
            fullResponse += chunk
            // 找到最后一条 AI 消息并更新内容
            const lastMsg = messages.value[messages.value.length - 1]
            if (lastMsg && lastMsg.role === 'ai' && lastMsg.id === aiMessageId) {
                lastMsg.content = fullResponse
            }
            scrollToBottom()
        },
        // onComplete：完成
        () => {
            isStreaming.value = false
            scrollToBottom()
        },
        // onError：错误
        (errMsg) => {
            const lastMsg = messages.value[messages.value.length - 1]
            if (lastMsg && lastMsg.role === 'ai' && lastMsg.id === aiMessageId) {
                lastMsg.content = `抱歉，AI 发生了错误：${errMsg || '未知错误'}`
            }
            isStreaming.value = false
            showToast('AI 发生了错误，请稍后重试')
            scrollToBottom()
        }
    )
}
// 生命周期：页面挂载
/**
 * 从详情页跳转过来时，自动发送预设问题
 * 
 * 场景：用户在详情页点击"咨询 AI 助手"
 * 跳转时携带 scene=detail&city=北京
 * 自动发送"我想了解一下北京的旅游景点"
 */
onMounted(() => {
    if (route.query.scene === 'detail' && route.query.city) {
        inputMessage.value = `我想了解一下${route.query.city}的旅游景点`
        // 自动发送
        sendMessage()
    }
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
            />
        </div>
        <!-- ====== 聊天区域 ====== -->
        <div class="chat-container" ref="container">
            <!-- 空状态：没有消息时显示 -->
            <div v-if="messages.length === 0" class="chat-empty">
                <van-empty description="开始和AI助手聊天吧" />
                <div class="quick-question">
                    <div class="quick-title">💡 快速提问</div>
                    <div class="quick-tags">
                        <van-tag 
                            v-for="q in quickQuestions" 
                            :key="q" 
                            size="large" 
                            mark 
                            type="primary"
                            @click="handleClickTag(q)">
                            {{ q }}
                        </van-tag>
                    </div>
                </div>
            </div>

            <!-- 消息列表 -->
            <div class="message-list">
                <!-- 循环渲染消息 -->
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
            <van-field 
                v-model="inputMessage" 
                placeholder="输入您的问题...." 
                :disabled="isStreaming"
                @keyup.enter="sendMessage"
                clearable >
                <template #button>
                    <van-button 
                        @click="sendMessage" 
                        type="primary" 
                        size="small" 
                        :disabled="isSendDisabled" >
                        发送
                    </van-button>
                </template>
            </van-field>
        </div>
    </div>
</template>
<style scoped>
.page-header{
  height: 46px;
}
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding-bottom: 0px !important;
}

.chat-container {
  height: 650px;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 60px;
}

.chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.quick-questions {
  margin-top: 32px;
  text-align: center;
}

.quick-title {
  font-size: 14px;
  color: #999;
  margin-bottom: 16px;
}

.quick-tag {
  margin: 8px;
  cursor: pointer;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  color: #999;
  font-size: 14px;
}

.chat-input-area {
  position: fixed;
  bottom: 50px;
  left: 0;
  right: 0;
  background: #fff;
  padding: 8px 16px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
  max-width: 750px;
  margin: 0 auto;
}

.chat-input-area :deep(.van-field) {
  background: #f7f8fa;
  border-radius: 20px;
  padding: 8px 16px;
}
</style>