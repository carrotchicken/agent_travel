// ====================== 导入需要用到的工具包 ======================
// ChatOpenAI：用来对接AI大模型，不管是DeepSeek还是硅基流动都能用这个客户端
import { ChatOpenAI } from "@langchain/openai"
// SystemMessage：给AI设定固定人设；HumanMessage：存用户发出去的提问
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
// 读取项目根目录.env文件里保存的密钥、接口地址等隐私配置
import 'dotenv/config'

// ====================== 旅游助手核心处理类 ======================
/**
 * 这个类专门处理和AI相关的旅游功能
 * 1. 直接创建一个全局唯一实例，整个项目从头到尾只用这一个，不用重复初始化AI
 * 2. 创建这个类的时候就自动连接AI接口，不用每次用户发请求都重新连一遍
 * 3. 把拼提示词、调AI、解析返回数据这些麻烦逻辑全部包在里面，外面页面直接调用方法就行
 */
/**
 * 这个类专门处理和AI相关的旅游功能
 * 
 */
class TravelService {

    /** @type {ChatOpenAI|null} AI 客户端实例 */
    llm = null

    constructor() {
        this.initLLM()
    }

    // ====================== 初始化AI连接，切换不同AI服务商 ======================
    /**
     * 根据.env配置文件里写的服务商，自动切换AI接口
     * 现在支持两种AI：DeepSeek、硅基流动
     * 好处：
     * 1. 想换AI不用改业务代码，只改.env文件里的配置文字
     * 2. 其中一个AI服务崩了，一键切换另一个，不影响项目使用
     * 3. 方便对比两个AI回答效果好坏
     */
    initLLM() {
        // 读取配置文件里设置的当前AI服务商
        const provider = process.env.MODEL_PROVIDER
        
        // 定义变量存密钥、接口地址、使用的模型名称
        let apikey, baseURL, model;
        
        // 如果配置写的是DeepSeek，就拿DeepSeek对应的配置
        if (provider === 'DEEPSEEK') {
            apikey = process.env.DEEPSEEK_API_KEY
            baseURL = process.env.DEEPSEEK_BASE_URL
            model = process.env.DEEPSEEK_BASE_MODEL
        } else {
            // 没指定服务商，默认用硅基流动
            apikey = process.env.SILICONFLOW_API_KEY
            baseURL = process.env.SILICONFLOW_BASE_URL
            model = process.env.SILICONFLOW_MODEL
        }

        /**
         * 创建AI连接实例，参数说明：
         * configuration：存放AI接口密钥、请求地址、模型名称
         * temperature：控制AI回答灵活度，范围0~1
         *   0.5刚刚好：既有创意不会死板，也不会乱编离谱内容
         *   想要回答更严谨不出错，可以改成0.3
         * streaming: true streaming: true 表示 AI 客户端支持流式传输
            调用 invoke() 时：虽然是流式客户端，但会等全部内容生成完，一次性返回
            调用 stream() 时：才会逐字推送
         */
        this.llm = new ChatOpenAI({
            configuration: {
                apiKey: apikey,
                baseURL: baseURL
            },
            model,
            temperature: 0.5,
            streaming: true
        })
    }

    // ====================== 功能1：根据城市、预算、天数生成完整旅游方案 ======================
    /**
     * 用户填完目的地、预算、出行天数后，调用这个方法生成整套行程
     * 执行步骤：
     * 1. 简单校验用户输入：预算不能太少，天数不能超出合理范围
     * 2. 拼一段完整的提示文字发给AI，告诉AI要输出什么内容、什么格式
     * 3. 一次性等待AI生成完整内容，不逐字推送
     * 4. 从AI返回的一大段文字里，提取出程序能识别的JSON数据
     * 5. 把JSON转成JS对象返回给前端页面渲染
     * 
     * 为什么不用流式逐字返回？
     * 旅游规划需要一整套完整数据才能渲染页面，零散文字没法分段展示行程，一次性返回体验更好
     */
    /**
     * 根据城市、预算、天数生成完整旅游方案
     * @param {string} city - 目的地城市
     * @param {number} budget - 预算金额（元）
     * @param {number} days - 旅行天数
     * @returns {Promise<Object>} 行程数据对象
     */
    async recommend(city, budget, days) {
        // 1. 校验用户输入，不符合规则直接抛报错
        if (budget < 100 || days < 1 || days > 30) {
            throw new Error('预算不能低于100元，出行天数只能在1~30天之间')
        }

        // 2. 拼接发给AI的完整提示文案
        const message = this.getTravelPrompt(city, budget, days)

        // 3. 调用AI接口获取完整回答
        try {
            // invoke：等待AI写完所有内容再一次性返回全部文字
            const response = await this.llm.invoke(message)
            const fullResponse = typeof response.content === 'string' ? response.content : JSON.stringify(response.content) || ''
            
            // 打印AI原始返回内容，自己调试找bug的时候方便看
            console.log('===== AI原始返回全部内容 =====')
            console.log(fullResponse)
            console.log('=============================')

            // 4. 从AI返回文字里抠出JSON代码
            try {
                /**
                 * 分3种情况匹配JSON，按匹配优先级从高到低：
                 * 情况1：AI用 ```json 代码块包裹JSON（最标准、最稳定）
                 * 情况2：AI用 ``` 代码块包裹JSON，但没标注json字样（很常见）
                 * 情况3：AI直接裸输出一段JSON，没有任何包裹（最容易解析失败）
                 * 
                 * 注意：前两种匹配会单独把JSON内容提取出来存在数组第1位；第三种直接把整段匹配内容存在数组第0位
                 */
                const jsonMatch = fullResponse.match(/```json\n([\s\S]*?)\n```/) ||
                    fullResponse.match(/```\n([\s\S]*?)\n```/) ||
                    fullResponse.match(/\{[\s\S]*\}/);
                
                // 三种方式都没找到JSON，直接返回错误提示给前端
                if (!jsonMatch) {
                    return {
                        success: false,
                        error: 'AI返回的内容里没有找到可解析的行程数据',
                        rawResponse: fullResponse.substring(0, 200)
                    }
                }
                
                // 优先取代码块里单独提取的JSON内容，没有就用裸匹配到的整段文本
                const jsonString = jsonMatch[1] || jsonMatch[0]
                
                // 5. 把文本格式的JSON转换成程序能用的对象，直接返回
                const resData = JSON.parse(jsonString)
                return resData
                
            } catch (error) {
                // JSON格式损坏、转译失败时返回友好错误信息
                return {
                    success: false,
                    error: '解析AI行程数据失败，格式错乱',
                    rawResponse: error.message
                }
            }
        } catch (error) {
            // AI接口调用失败（密钥错误、网络报错、服务宕机等）返回错误
            return {
                success: false,
                error: error.message
            }
        }
    }

    // ====================== 辅助方法：拼接发给AI的提示文案 ======================
    /**
     * 把用户输入的城市、预算、天数，拼成一段清晰指令发给AI
     * 文案设计思路：
     * 1. 先告诉AI它要扮演什么角色：专业旅游规划师
     * 2. 把用户的需求全部写清楚：去哪、花多少钱、玩几天
     * 3. 逐条列清楚必须包含的内容：每日行程、景点介绍、交通、费用、避坑提醒
     * 4. 给AI一段标准JSON模板，照着模板输出，避免AI乱说话
     * 5. 反复强调必须只输出标准JSON，不要多余文字
     * 
     * 这么写的原因：AI很容易自由发挥胡说八道，指令越详细、给好模板，AI输出格式越稳定，程序越好解析
     */
    /**
     * 拼接发给 AI 的提示词
     * @param {string} city
     * @param {number} budget
     * @param {number} days
     * @returns {string} 完整提示词
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

    // ====================== 功能2：聊天对话流式接口（AI聊天页面打字机效果） ======================
    /**
     * 用户在聊天框提问时调用，实现逐字实时推送AI回答
     * 和上面生成行程的recommend方法区别：
     * recommend：等AI全部写完一次性返回，适合整份行程数据
     * chat：AI写一个字就推送一个字，适合聊天对话页面
     * 
     * 执行步骤：
     * 1. 组装两条消息：AI固定人设、用户当前提问
     * 2. 开启AI流式输出通道
     * 3. 循环读取AI一点点吐出来的文字片段
     * 4. 每读到一小段文字，立刻传给前端展示，实现打字效果
     * 5. AI全部回答完毕后，把完整文字打包返回
     * 
     * 流式输出好处：
     * 1. 用户不用干等加载，实时看到文字，体验更好
     * 2. 不会因为AI生成内容太长，页面长时间空白卡住
     */
    /**
     * 聊天对话流式接口
     * @param {string} message - 用户消息
     * @param {(chunk: string) => void} streamCallback - 每收到一段文字的回调
     * @returns {Promise<{success: boolean, reply?: string, error?: string}>}
     */
    async chat(message, streamCallback) {
        // 1. 组装对话消息
        // SystemMessage：固定给AI的人设，每次聊天都生效
        // HumanMessage：用户这次发的提问内容
        const messages = [
            new SystemMessage('你是友好的旅游问答助手，只用中文回答用户旅游相关问题'),
            new HumanMessage(message)
        ]

        // 2. 开启AI流式传输
        try {
            // stream 会持续返回一段一段的文字片段
            const stream = await this.llm.stream(messages)
            
            // 用来存放AI全部回答文字，等结束后统一返回
            let fullResponse = ''

            // 3. 循环读取每一段文字片段
            for await (const chunk of stream) {
                // 提取当前这一段文字，确保是字符串类型
                const content = typeof chunk.content === 'string' ? chunk.content : ''
                
                // 空白字符直接跳过，不用传给前端
                if (content.trim() === '') {
                    continue
                }
                
                // 累加保存完整回答
                fullResponse += content
                
                // 把当前小段文字传给前端，实时渲染打字效果
                if (streamCallback) {
                    streamCallback(content)
                }
            }

            // 4. AI回答全部结束，返回完整结果
            return {
                success: true,
                reply: fullResponse
            }
        } catch (error) {
            // 聊天接口报错时返回错误信息
            return {
                success: false,
                error: error.message
            }
        }
    }
}

// ====================== 导出全局唯一实例 ======================
/**
 * 项目启动时直接创建一个TravelService实例，全局共用这一个
 * 不会每次调用接口都新建AI连接，节省接口请求资源，速度更快
 */
export default new TravelService()