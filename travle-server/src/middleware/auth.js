// ============================================================
// JWT 认证中间件
// 验证请求头中的 Bearer Token，解析出用户信息注入到 req.user
// ============================================================
import jwt from 'jsonwebtoken'

// JWT 密钥（必须在 .env 中配置）
const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  console.error('错误：请在 .env 文件中配置 JWT_SECRET')
  process.exit(1)
}

/**
 * 验证 JWT Token 中间件（强制）
 * 从 Authorization 头提取 Bearer token → 验证 → 注入 req.user
 * 验证失败返回 401
 */
export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: '未登录，请先登录' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = /** @type {{ id: number, username: string }} */ (decoded)
    next()
  } catch (err) {
    return res.status(401).json({ success: false, error: '登录已过期，请重新登录' })
  }
}

/**
 * 可选认证中间件：有 token 就注入用户，没有也放行
 * 用于 recommend/chat 等接口 — 未登录也能用，登录后有额外能力（保存等）
 */
export const softAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      req.user = /** @type {{ id: number, username: string }} */ (decoded)
    } catch {
      // token 无效，忽略，继续以访客身份访问
    }
  }
  next()
}

/**
 * 生成 JWT Token
 * @param {Object} user - { id, username }
 * @returns {string} JWT token（7天有效期）
 */
export const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export { JWT_SECRET }
