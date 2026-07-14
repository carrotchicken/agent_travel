import { ChatOpenAI } from "@langchain/openai"
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages'
import 'dotenv/config'

/** 多轮对话保留的最大消息条数（user + ai 合计） */
const MAX_CHAT_HISTORY = 10

/**
 * 旅游 AI 服务类
 * 负责行程生成、AI 聊天等核心业务逻辑
 */
class TravelService {
  /** @type {ChatOpenAI|null} */
  llm = null

  constructor() {
    this.initLLM()
  }

  /**
   * 根据环境变量初始化 AI 模型客户端
   * 支持 DeepSeek / 硅基流动 切换
   */
  initLLM() {
    const provider = process.env.MODEL_PROVIDER
    let apikey, baseURL, model

    if (provider === 'DEEPSEEK') {
      apikey = process.env.DEEPSEEK_API_KEY
      baseURL = process.env.DEEPSEEK_BASE_URL
      model = process.env.DEEPSEEK_BASE_MODEL
    } else {
      apikey = process.env.SILICONFLOW_API_KEY
      baseURL = process.env.SILICONFLOW_BASE_URL
      model = process.env.SILICONFLOW_MODEL
    }

    this.llm = new ChatOpenAI({
      configuration: { apiKey: apikey, baseURL },
      model,
      temperature: 0.5,
      streaming: true
    })
  }

  /**
   * 校验行程推荐参数
   */
  validateRecommendParams(city, budget, days) {
    if (budget < 100 || days < 1 || days > 30) {
      throw new Error('预算不能低于100元，出行天数只能在1~30天之间')
    }
    if (!city || !String(city).trim()) {
      throw new Error('目的地城市不能为空')
    }
  }

  /**
   * 从 AI 原始文本中解析行程 JSON
   * @param {string} fullResponse
   * @returns {Object}
   */
  parseTripResponse(fullResponse) {
    try {
      const jsonMatch = fullResponse.match(/```json\n([\s\S]*?)\n```/) ||
        fullResponse.match(/```\n([\s\S]*?)\n```/) ||
        fullResponse.match(/\{[\s\S]*\}/)

      if (!jsonMatch) {
        return {
          success: false,
          error: 'AI返回的内容里没有找到可解析的行程数据',
          rawResponse: fullResponse.substring(0, 200)
        }
      }

      let jsonString = jsonMatch[1] || jsonMatch[0]
      if (!jsonMatch[1]) {
        const lastBrace = jsonString.lastIndexOf('}')
        if (lastBrace > 0) {
          jsonString = jsonString.substring(0, lastBrace + 1)
        }
      }
      return JSON.parse(jsonString)
    } catch (error) {
      return {
        success: false,
        error: '解析AI行程数据失败，格式错乱',
        rawResponse: error.message
      }
    }
  }

  /**
   * 生成完整旅游行程（非流式，保留兼容）
   */
  async recommend(city, budget, days) {
    this.validateRecommendParams(city, budget, days)
    const message = this.getTravelPrompt(city, budget, days)

    try {
      const response = await this.llm.invoke(message)
      const fullResponse = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content) || ''

      return this.parseTripResponse(fullResponse)
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 流式生成旅游行程
   * @param {string} city
   * @param {number} budget
   * @param {number} days
   * @param {(chunk: string) => void} streamCallback
   * @returns {Promise<Object>}
   */
  async recommendStream(city, budget, days, streamCallback) {
    this.validateRecommendParams(city, budget, days)
    const prompt = this.getTravelPrompt(city, budget, days)

    try {
      const stream = await this.llm.stream([new HumanMessage(prompt)])
      let fullResponse = ''

      for await (const chunk of stream) {
        const content = typeof chunk.content === 'string' ? chunk.content : ''
        if (!content) continue

        fullResponse += content
        if (streamCallback) {
          streamCallback(content)
        }
      }

      return this.parseTripResponse(fullResponse)
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 构建行程生成的 Prompt
   * @param {string} city
   * @param {number} budget
   * @param {number} days
   * @returns {string}
   */
  getTravelPrompt(city, budget, days) {
    return `你是专业旅游规划师，根据用户需求生成完整旅行方案。
用户出行信息：
- 目的地：${city}
- 总预算：${budget}元
- 游玩天数：${days}天
必须包含以下全部内容：
1. 每一天上午、下午、晚上分别去哪玩
2. 每个景点详细介绍
3. 当地出行交通建议
4. 总预算拆分明细
5. 出行避坑、注意事项
严格按照下面JSON模板输出内容，不要额外加解释、不要分段文字，只输出可正常解析的JSON：
{
  "success": true,
  "city": "城市名称",
  "days": 游玩总天数数字,
  "totalBudget": 总预算数字,
  "dailyItinerary": [
    {
      "day": 第几天数字,
      "date": "第X天",
      "morning": {
        "spot": "景点名字",
        "duration": "逛多久",
        "ticket": "门票价格",
        "transportation": "怎么过去",
        "description": "景点介绍文字"
      },
      "afternoon": {
        "spot": "景点名字",
        "duration": "逛多久",
        "ticket": "门票价格",
        "transportation": "怎么过去",
        "description": "景点介绍文字"
      },
      "evening": {
        "spot": "活动名称",
        "duration": "活动时长",
        "ticket": "花费金额",
        "transportation": "出行方式",
        "description": "活动介绍文字"
      }
    }
  ],
  "budgetBreakdown": {
    "accommodation": 住宿花费数字,
    "food": 吃饭花费数字,
    "transportation": 交通花费数字,
    "tickets": 门票总花费数字,
    "other": 其他杂项花费数字
  },
  "tips": ["出行小贴士1", "出行小贴士2", "出行小贴士3"],
  "warnings": ["注意事项1", "注意事项2"]
}
保证JSON格式完整、无语法错误，可以直接被程序读取解析。`
  }

  /**
   * 构建多轮对话消息列表
   * @param {string} message - 当前用户消息
   * @param {Array<{role: string, content: string}>} history - 历史消息
   * @returns {Array}
   */
  buildChatMessages(message, history = []) {
    const messages = [
      new SystemMessage('你是友好的旅游问答助手，只用中文回答用户旅游相关问题')
    ]

    const recent = Array.isArray(history) ? history.slice(-MAX_CHAT_HISTORY) : []
    for (const item of recent) {
      if (!item?.content?.trim()) continue
      if (item.role === 'user') {
        messages.push(new HumanMessage(item.content))
      } else if (item.role === 'ai') {
        messages.push(new AIMessage(item.content))
      }
    }

    if (message?.trim()) {
      const last = recent[recent.length - 1]
      if (!last || last.role !== 'user' || last.content !== message) {
        messages.push(new HumanMessage(message))
      }
    }

    return messages
  }

  /**
   * 流式聊天接口（支持多轮上下文）
   * @param {string} message - 用户消息
   * @param {(chunk: string) => void} streamCallback - 流式回调
   * @param {Array<{role: string, content: string}>} history - 历史消息
   * @returns {Promise<{success: boolean, reply?: string, error?: string}>}
   */
  async chat(message, streamCallback, history = []) {
    const messages = this.buildChatMessages(message, history)

    try {
      const stream = await this.llm.stream(messages)
      let fullResponse = ''

      for await (const chunk of stream) {
        const content = typeof chunk.content === 'string' ? chunk.content : ''
        if (content.trim() === '') continue

        fullResponse += content
        if (streamCallback) {
          streamCallback(content)
        }
      }

      return {
        success: true,
        reply: fullResponse
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export default new TravelService()
