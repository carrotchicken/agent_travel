import express, { json } from 'express'
import travelService from '../services/travelService.js'
import {createStreamResponse} from '../utils/streamUtils.js'

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

        // 成功：返回业务结果
        return res.json(result)

    } catch (error) {
        // ❌ 只捕获 try 块内部的错误
        // 进入这里意味着：参数校验已通过，但业务处理过程中出错
        // 500 = Internal Server Error，表示服务器内部处理异常（服务器问题）
        console.error('推荐接口异常:', error)
        return res.status(500).json({
            success:false,
            message:error.message||'服务器内部错误'
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

    try{
        // ✅ 在 try 块内：调用 AI 聊天服务，流式返回结果
        const result=await travelService.chat(message,(chunk)=>{
            stream.send({'type':'chunk',content:chunk})
        })

        // 聊天完成，发送结束标记
        stream.send({'type':'complete',content:result})
        stream.end()

    }catch(err){
        // ❌ 只捕获 travelService.chat() 抛出的异常
        console.error('聊天接口异常:',err)
        stream.send({'type':'error',error:err.message||'AI服务异常'})
        stream.end()
    }
})

export default router