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
 * 旅行推荐接口
 * POST /api/travel/recommend
 * 
 * 请求体参数：
 * - city: 城市名称（必填）
 * - budget: 预算金额（必填）
 * - days: 游玩天数（必填）
 * 
 * 错误处理逻辑：
 * - 参数校验失败 → 返回 400（客户端问题）
 * - 业务处理出错 → 返回 500（服务器问题）
 */
router.post('/recommend',async(req,res)=>{
    try {
        // ✅ 在 try 块内：如果这里出错，会被 catch 捕获
        const {city,budget,days}=req.body

        // 阶段1：参数校验（快速失败原则）
        // 如果参数缺失，直接返回 400 错误，不进入业务逻辑
        // 400 = Bad Request，表示请求格式不正确（客户端问题）
        if(!city||!budget||!days){
            return res.status(400).json({
                success:false,
                message:'缺少必要参数'
            })
        }

        // 阶段2：业务处理
        // 参数校验通过后，调用服务层处理业务逻辑
        // 如果这里出错（如 AI 服务调用失败、数据库异常），会被 catch 捕获
        const result=await travelService.recommend(city,budget,days)

        // 业务层返回的错误（如 AI 解析失败）
        if (result && result.success === false) {
          return res.status(502).json(result)
        }

        // 成功：返回业务结果
        return res.json(result)

    } catch (error) {
        // ❌ 只捕获 try 块内部的错误
        // 进入这里意味着：参数校验已通过，但业务处理过程中出错
        // 500 = Internal Server Error，表示服务器内部处理异常（服务器问题）
        console.error('推荐接口异常:', error)
        // 生产环境不暴露内部错误详情，仅返回通用消息
        const isDev = process.env.NODE_ENV !== 'production'
        return res.status(500).json({
            success:false,
            message: isDev ? (error.message || '服务器内部错误') : '服务器内部错误，请稍后重试'
        })
    }
})

/**
 * 旅行聊天接口（流式响应）
 * POST /api/travel/chat
 * 
 * 请求体参数：
 * - message: 用户消息（必填）
 * 
 * 返回格式：SSE 流式响应
 */
router.post('/chat',async(req,res)=>{
    // ❌ 在 try 块外面：如果这里出错，不会被下面的 catch 捕获
    const {message}=req.body

    // 参数校验：在 try 块外提前返回（快速失败）
    if(!message){
        return res.status(400).json({
            success:false,
            error:'缺少必要参数'
        })
    }

    // 创建流式响应对象
    const stream= createStreamResponse(res)

    // 监听客户端断开连接：及时中止 AI 流，避免浪费 token
    let aborted = false
    req.on('close', () => {
      if (!aborted) {
        aborted = true
        console.log('SSE 客户端断开连接，中止推送')
      }
    })

    try{
        // ✅ 在 try 块内：调用 AI 聊天服务，流式返回结果
        const result=await travelService.chat(message,(chunk)=>{
            if (!aborted) {
                stream.send({'type':'chunk',content:chunk})
            }
        })

        if (!aborted) {
            // 聊天完成，发送结束标记
            stream.send({'type':'complete',content:result})
            stream.end()
        }

    }catch(err){
        // ❌ 只捕获 travelService.chat() 抛出的异常
        console.error('聊天接口异常:',err)
        if (!aborted) {
            // 生产环境不暴露内部错误详情
            const isDev = process.env.NODE_ENV !== 'production'
            stream.send({'type':'error',error: isDev ? (err.message || 'AI服务异常') : 'AI服务异常，请稍后重试'})
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