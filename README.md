# 🏖️ 智能旅游助手 (AI Travel Planner)

> 基于 Vue 3 + Express + LangChain 的全栈 AI 旅游规划平台

- **前端：** Vue 3 + TypeScript + Pinia + Vant 4 — [agentTravel/](./agentTravel/)
- **后端：** Express + LangChain (ChatOpenAI) + SQLite — [travel-server/](./travel-server/)

## ✨ 功能亮点

- **🤖 AI 流式对话** — SSE 实时流式响应，支持多轮上下文、中途取消、断线重试
- **📋 智能行程规划** — 输入城市 + 预算 + 天数，AI 自动生成每日行程、景点推荐、预算明细
- **💬 多会话管理** — 对话历史按会话组织，支持新建/切换/删除，最多 10 个会话
- **⭐ 收藏 & 历史** — 行程一键收藏，历史记录回溯，登录后云端同步
- **👤 用户系统** — JWT 认证，bcrypt 密码加密，数据按用户完全隔离
- **📱 移动端适配** — Vant 4 UI 组件库，安全区域适配，触摸交互优化
- **🐳 一键部署** — Docker Compose 编排，Nginx 反向代理 + SPA fallback

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 (Composition API) + TypeScript |
| 状态管理 | Pinia (Setup Store) |
| UI 组件库 | Vant 4 |
| 路由 | Vue Router 4 |
| HTTP 客户端 | Axios + 原生 Fetch (SSE 流式) |
| Markdown | marked + DOMPurify |
| 构建工具 | Vite |
| 后端运行时 | Node.js + Express |
| AI 引擎 | LangChain (ChatOpenAI)，支持 DeepSeek / 硅基流动双模型 |
| 数据库 | SQLite (better-sqlite3) |
| 认证 | JWT (jsonwebtoken) + bcryptjs |
| 部署 | Docker + Nginx |

## 📂 项目结构

```
agent_travel_pr/
├── agentTravel/          # 前端 (Vue 3 + Vite)
│   ├── src/
│   │   ├── views/        # 页面组件 (Home/Chat/Detail/Profile/Login/Register)
│   │   ├── stores/       # Pinia 状态管理 (auth/chat/travel)
│   │   ├── router/       # 路由配置 + 导航守卫
│   │   ├── components/   # 通用组件 (ChatBubble/SpotItem/BudgetTable)
│   │   ├── utils/        # 工具函数 (request/storage/markdown/tripExport)
│   │   └── types/        # TypeScript 类型定义
│   ├── nginx.conf        # Nginx 反向代理配置
│   └── Dockerfile
├── travel-server/        # 后端 (Express + LangChain)
│   ├── src/
│   │   ├── routes/       # API 路由 (auth/travel)
│   │   ├── services/     # 业务逻辑 (LangChain 集成)
│   │   ├── middleware/   # JWT 认证中间件
│   │   └── utils/        # 工具 (SQLite/SSE)
│   └── Dockerfile
└── docker-compose.yml    # 一键部署编排
```

## 🚀 快速启动

### Docker 部署（推荐）

```bash
# 1. 配置后端环境变量
cp travel-server/.env.example travel-server/.env
# 编辑 .env 填入 DEEPSEEK_API_KEY 或 SILICONFLOW_API_KEY

# 2. 一键启动
docker-compose up -d

# 3. 访问
# 前端：http://localhost
# 后端：http://localhost:3300
```

### 本地开发

```bash
# 后端
cd travel-server
cp .env.example .env   # 配置 API Key
npm install
npm run dev             # 启动在 :3300

# 前端
cd agentTravel
npm install
npm run dev             # 启动在 :5173，自动代理 /api → :3300
```

## 🔧 环境变量

后端 `travel-server/.env`（复制自 `.env.example` 并填入真实密钥）：

```env
PORT=3300
JWT_SECRET=请替换为你的随机密钥（至少32位）

# 模型提供商：DEEPSEEK 或 SILICONFLOW
MODEL_PROVIDER=DEEPSEEK

# DeepSeek
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_BASE_MODEL=deepseek-chat

# 硅基流动（SiliconFlow）
SILICONFLOW_API_KEY=sk-your-siliconflow-api-key
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_MODEL=deepseek-ai/DeepSeek-V4-Flash

# SQLite
DATABASE_URL="file:./data/travel.db"
```

## 📝 License

MIT
