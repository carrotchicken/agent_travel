// ============================================================
// 认证路由：注册 + 登录
// POST /api/auth/register — 注册新用户
// POST /api/auth/login    — 用户登录
// GET  /api/auth/me       — 获取当前用户信息（需登录）
// ============================================================
import express from 'express'
import bcrypt from 'bcryptjs'
import { findUserByUsername, findUserById, createUser } from '../utils/db.js'
import { authMiddleware, generateToken } from '../middleware/auth.js'

const router = express.Router()

// ===================== 注册 =====================

/**
 * POST /api/auth/register
 * 请求体：{ username, password }
 * 密码用 bcrypt 加盐哈希后存入数据库，明文不落库
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body

    // 校验：用户名 2-20 位
    if (!username || username.length < 2 || username.length > 20) {
      return res.status(400).json({ success: false, error: '用户名需 2-20个字符' })
    }

    // 校验：密码至少 6 位
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: '密码至少 6 位' })
    }

    // 检查用户名是否已被注册
    const exist = await findUserByUsername(username)
    if (exist) {
      return res.status(409).json({ success: false, error: '用户名已被注册' })
    }

    // bcrypt 哈希密码（saltRounds=10，安全与性能的平衡点）
    const hashedPassword = await bcrypt.hash(password, 10)

    // 创建用户
    const user = await createUser(username, hashedPassword)

    // 生成 JWT token
    const token = generateToken(user)

    return res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        token
      }
    })
  } catch (err) {
    console.error('注册失败:', err)
    return res.status(500).json({ success: false, error: '服务器错误' })
  }
})

// ===================== 登录 =====================

/**
 * POST /api/auth/login
 * 请求体：{ username, password }
 * 用户名不存在或密码不匹配 → 统一返回"用户名或密码错误"（避免暴力枚举）
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ success: false, error: '请输入用户名和密码' })
    }

    // 查用户
    const user = await findUserByUsername(username)
    if (!user) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' })
    }

    // 验证密码
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' })
    }

    // 生成 JWT
    const token = generateToken(user)

    return res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        token
      }
    })
  } catch (err) {
    console.error('登录失败:', err)
    return res.status(500).json({ success: false, error: '服务器错误' })
  }
})

// ===================== 获取当前用户 =====================

/**
 * GET /api/auth/me
 * 需在请求头携带 Authorization: Bearer <token>
 * authMiddleware 验证通过后将用户信息放在 req.user
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await findUserById(req.user.id)

    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' })
    }

    return res.json({ success: true, data: user })
  } catch (err) {
    console.error('获取用户信息失败:', err)
    return res.status(500).json({ success: false, error: '服务器错误' })
  }
})

export default router
