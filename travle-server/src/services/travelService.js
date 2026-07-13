import { ChatOpenAI } from "@langchain/openai"
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import 'dotenv/config'

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
   * 生成完整旅游行程
   * @param {string} city - 目的地城市
   * @param {number} budget - 总预算（元）
   * @param {number} days - 旅行天数
   * @returns {Promise<Object>} 行程数据对象
   */
  async recommend(city, budget, days) {
    if (budget < 100 || days < 1 || days > 30) {
      throw new Error('预算不能低于100元，出行天数只能在1~30天之间')
    }

    const message = this.getTravelPrompt(city, budget, days)

    try {
      const response = await this.llm.invoke(message)
      const fullResponse = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content) || ''

      console.log('===== AI 原始返回 =====')
      console.log(fullResponse)
      console.log('======================')

      try {
        // 三层正则 fallback：标准 json 代码块 → 无标注代码块 → 裸 JSON（括号平衡匹配）
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
        // 如果裸 JSON 匹配过长（AI 在 JSON 后附加了其他内容），尝试截断到最后一个合法的 }
        if (!jsonMatch[1]) {
          const lastBrace = jsonString.lastIndexOf('}')
          if (lastBrace > 0) {
            jsonString = jsonString.substring(0, lastBrace + 1)
          }
        }
        const resData = JSON.parse(jsonString)
        return resData

      } catch (error) {
        return {
          success: false,
          error: '解析AI行程数据失败，格式错乱',
          rawResponse: error.message
        }
      }
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
   * 流式聊天接口
   * @param {string} message - 用户消息
   * @param {(chunk: string) => void} streamCallback - 流式回调
   * @returns {Promise<{success: boolean, reply?: string, error?: string}>}
   */
  async chat(message, streamCallback) {
    const messages = [
      new SystemMessage('你是友好的旅游问答助手，只用中文回答用户旅游相关问题'),
      new HumanMessage(message)
    ]

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
