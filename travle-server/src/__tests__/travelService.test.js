// ============================================================
// travelService 核心逻辑单元测试
// 只测试纯函数（不依赖 API 的方法），避免 mock 复杂度
// ============================================================
import { describe, it, expect, vi, beforeAll } from 'vitest'

// 必须在 import 之前 mock，阻止构造函数连接 AI
vi.mock('@langchain/openai', () => {
  const mockLLM = vi.fn()
  mockLLM.prototype.invoke = vi.fn()
  mockLLM.prototype.stream = vi.fn()
  return { ChatOpenAI: mockLLM }
})

vi.mock('@langchain/core/messages', () => ({
  HumanMessage: vi.fn(),
  SystemMessage: vi.fn()
}))

vi.mock('dotenv/config', () => ({ default: {} }))

// 设置必需的 fake 环境变量
process.env.MODEL_PROVIDER = 'DEEPSEEK'
process.env.DEEPSEEK_API_KEY = 'test-key'
process.env.DEEPSEEK_BASE_URL = 'https://test.com/v1'
process.env.DEEPSEEK_BASE_MODEL = 'test-model'

describe('TravelService', () => {
  let service

  beforeAll(async () => {
    const mod = await import('../services/travelService.js')
    service = mod.default
  })

  describe('getTravelPrompt()', () => {
    it('应包含城市名', () => {
      const prompt = service.getTravelPrompt('北京', 3000, 3)
      expect(prompt).toContain('北京')
    })

    it('应包含预算金额', () => {
      const prompt = service.getTravelPrompt('上海', 5000, 5)
      expect(prompt).toContain('5000')
    })

    it('应包含游玩天数', () => {
      const prompt = service.getTravelPrompt('成都', 2000, 2)
      expect(prompt).toContain('2天')
    })

    it('应包含 JSON 模板关键字', () => {
      const prompt = service.getTravelPrompt('杭州', 4000, 3)
      expect(prompt).toContain('JSON')
      expect(prompt).toContain('dailyItinerary')
      expect(prompt).toContain('budgetBreakdown')
    })

    it('应包含出行贴士字段', () => {
      const prompt = service.getTravelPrompt('杭州', 4000, 3)
      expect(prompt).toContain('tips')
      expect(prompt).toContain('warnings')
    })
  })

  describe('recommend() 参数校验', () => {
    it('预算低于 100 应抛出异常', async () => {
      await expect(service.recommend('北京', 50, 3)).rejects.toThrow('预算不能低于100')
    })

    it('天数 < 1 应抛出异常', async () => {
      await expect(service.recommend('北京', 2000, 0)).rejects.toThrow('天数只能在1~30天之间')
    })

    it('天数 > 30 应抛出异常', async () => {
      await expect(service.recommend('北京', 2000, 31)).rejects.toThrow('天数只能在1~30天之间')
    })
  })
})
