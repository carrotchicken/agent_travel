import express from 'express'
import travelService from '../services/travelService.js'
import {createStreamResponse} from '../utils/streamUtils.js'
import { saveTrip, getTripsByUserId, deleteTripById, toggleTripFavorite } from '../utils/db.js'

/**
 * 强制登录守卫 — 用于 save/trips 等需要用户身份的端点
 * softAuthMiddleware 已注入 req.user（如果 token 有效），这里只检查是否存在
 */
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: '请先登录' })
  }
  next()
}

const router= express.Router()

/**
 * 旅行推荐接口（SSE 流式响应）
 * POST /api/travel/recommend
 */
router.post('/recommend', async (req, res) => {
  const { city, budget, days } = req.body

  if (!city || !budget || !days) {
    return res.status(400).json({
      success: false,
      message: '缺少必要参数'
    })
  }

  const stream = createStreamResponse(res)
  let aborted = false
  req.on('close', () => {
    if (!aborted) {
      aborted = true
      console.log('推荐接口 SSE 客户端断开连接')
    }
  })

  try {
    const result = await travelService.recommendStream(city, budget, days, (chunk) => {
      if (!aborted) {
        stream.send({ type: 'chunk', content: chunk })
      }
    })

    if (!aborted) {
      if (result && result.success === false) {
        stream.send({ type: 'error', error: result.error || '行程生成失败' })
      } else {
        stream.send({ type: 'complete', data: result })
      }
      stream.end()
    }
  } catch (error) {
    console.error('推荐接口异常:', error)
    if (!aborted) {
      const isDev = process.env.NODE_ENV !== 'production'
      stream.send({
        type: 'error',
        error: isDev ? (error.message || '服务器内部错误') : '服务器内部错误，请稍后重试'
      })
      stream.end()
    }
  }
})

/**
 * 旅行聊天接口（流式响应，支持多轮上下文）
 * POST /api/travel/chat
 *
 * 请求体参数：
 * - message: 用户消息（必填）
 * - history: 历史消息数组（可选）[{ role: 'user'|'ai', content: string }]
 */
router.post('/chat', async (req, res) => {
  const { message, history } = req.body

  if (!message && (!Array.isArray(history) || history.length === 0)) {
    return res.status(400).json({
      success: false,
      error: '缺少必要参数'
    })
  }

  const stream = createStreamResponse(res)

  let aborted = false
  req.on('close', () => {
    if (!aborted) {
      aborted = true
      console.log('SSE 客户端断开连接，中止推送')
    }
  })

  try {
    const result = await travelService.chat(message, (chunk) => {
      if (!aborted) {
        stream.send({ type: 'chunk', content: chunk })
      }
    }, history)

    if (!aborted) {
      if (result && result.success === false) {
        stream.send({ type: 'error', error: result.error || 'AI 服务异常' })
      } else {
        stream.send({ type: 'complete', data: result })
      }
      stream.end()
    }
  } catch (err) {
    console.error('聊天接口异常:', err)
    if (!aborted) {
      const isDev = process.env.NODE_ENV !== 'production'
      stream.send({
        type: 'error',
        error: isDev ? (err.message || 'AI服务异常') : 'AI服务异常，请稍后重试'
      })
      stream.end()
    }
  }
})

/**
 * 保存行程（服务端持久化）
 * POST /api/travel/save
 */
router.post('/save', requireAuth, async (req, res) => {
  try {
    const { city, days, totalBudget, tripData, isFavorite } = req.body
    if (!city || !tripData) {
      return res.status(400).json({ success: false, message: '缺少必要参数' })
    }
    const result = saveTrip(req.user.id, city, days, totalBudget, tripData, isFavorite)
    return res.json({ success: true, data: result })
  } catch (err) {
    console.error('保存行程失败:', err)
    return res.status(500).json({ success: false, message: '保存失败' })
  }
})

/**
 * 获取用户所有行程
 * GET /api/travel/trips
 */
router.get('/trips', requireAuth, async (req, res) => {
  try {
    const trips = getTripsByUserId(req.user.id)
    return res.json({ success: true, data: trips })
  } catch (err) {
    console.error('获取行程列表失败:', err)
    return res.status(500).json({ success: false, message: '获取失败' })
  }
})

/**
 * 删除行程
 * DELETE /api/travel/trips/:id
 */
router.delete('/trips/:id', requireAuth, async (req, res) => {
  try {
    const result = deleteTripById(req.params.id, req.user.id)
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: '行程不存在' })
    }
    return res.json({ success: true })
  } catch (err) {
    console.error('删除行程失败:', err)
    return res.status(500).json({ success: false, message: '删除失败' })
  }
})

/**
 * 切换行程收藏状态
 * PATCH /api/travel/trips/:id/favorite
 */
router.patch('/trips/:id/favorite', requireAuth, async (req, res) => {
  try {
    const result = toggleTripFavorite(req.params.id, req.user.id)
    if (!result) {
      return res.status(404).json({ success: false, message: '行程不存在' })
    }
    return res.json({ success: true, data: result })
  } catch (err) {
    console.error('切换收藏失败:', err)
    return res.status(500).json({ success: false, message: '操作失败' })
  }
})

export default router