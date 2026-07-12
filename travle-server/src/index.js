// ============================================================
// 模块导入
// ============================================================
import express from 'express'           // Web 框架
import travelRouter from './routes/travel.js'  // 旅游相关路由
import 'dotenv/config'                  // 加载 .env 环境变量
import cors from 'cors'                 // 跨域中间件
import rateLimit from 'express-rate-limit'  // 请求限流，防止 API Key 被刷爆

// ============================================================
// 创建 Express 应用实例
// ============================================================
const app = express()

// 从环境变量读取端口，如果未定义则使用 3300
const port = process.env.PORT || 3300

// ============================================================
// 注册中间件（按顺序执行）
// ============================================================

// 1. CORS 跨域：允许前端（localhost:5174）访问后端 API
//    必须放在最前面，否则跨域请求会被拦截
app.use(cors())

// 2. JSON 解析：将请求体中的 JSON 数据解析为 JavaScript 对象
//    这样在路由中可以用 req.body 直接获取
app.use(express.json())

// 3. URL 编码解析：解析表单提交的 application/x-www-form-urlencoded 数据
//    extended: true 表示支持复杂对象（数组、嵌套对象）
app.use(express.urlencoded({ extended: true }))

// 4. 请求限流：AI 接口每分钟最多 5 次请求（防止 API Key 被恶意消耗）
//    仅对 /api/travel 路由生效，心跳接口不受限制
const travelLimiter = rateLimit({
  windowMs: 60 * 1000,    // 时间窗口：1 分钟
  max: 5,                  // 每个 IP 最多 5 次
  message: {
    success: false,
    error: '请求过于频繁，请稍后再试（每分钟最多 5 次）'
  },
  standardHeaders: true,   // 返回 RateLimit-* 头
  legacyHeaders: false     // 不返回 X-RateLimit-* 头
})

// ============================================================
// 路由注册
// ============================================================

/**
 * 健康检查接口 - 用于验证服务是否正常运行
 * 使用场景：
 *   - 开发时用 Apifox/Postman 测试服务是否启动
 *   - 部署后配合 Docker/K8s 健康检查
 *   - 负载均衡器（Nginx）检测后端是否存活
 */
app.get('/api/heartbeat', (req, res) => {
    res.json({
        message: '服务正常运行中',
        timestamp: new Date().toISOString()
    })
})

/**
 * 挂载旅游路由
 * 所有以 /api/travel 开头的请求，交给 travelRouter 处理
 * 
 * 例如：
 *   POST /api/travel/recommend  → travelRouter 处理
 *   POST /api/travel/chat       → travelRouter 处理
 */
app.use('/api/travel', travelLimiter, travelRouter)

// ============================================================
// 启动服务器
// ============================================================
app.listen(port, () => {
    console.log(`服务地址:http://localhost:${port}`)
})