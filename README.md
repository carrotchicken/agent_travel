# 🧳 智能旅游助手 — AI Travel Planner

<p align="center">
  <img src="https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js&logoColor=white" alt="Vue">
  <img src="https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/TypeScript-7.0-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vant-4.9-07C160?logoColor=white" alt="Vant">
  <img src="https://img.shields.io/badge/Express-4.19-000000?logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/LangChain-1.2-1C3C3C?logo=langchain&logoColor=white" alt="LangChain">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
</p>

<p align="center">
  <b>🖥️ 在线体验：</b><a href="https://travel-aymi-d3gfbp2ir98b1ac06.webapps.tcloudbase.com" target="_blank">travel-aymi-d3gfbp2ir98b1ac06.webapps.tcloudbase.com</a>
</p>

<p align="center">
  基于 <b>Vue 3 + Express + LangChain</b> 的全栈 AI 旅游规划平台，<br>
  输入城市、预算、天数，AI 自动生成完整旅行攻略。
</p>

---

## 📖 目录

- [✨ 功能亮点](#-功能亮点)
- [🎨 Claymorphism 设计风格](#-claymorphism-设计风格)
- [🏗 项目架构](#-项目架构)
- [📂 项目结构](#-项目结构)
- [🛠 技术栈](#-技术栈)
- [🚀 快速启动](#-快速启动)
- [📡 API 接口文档](#-api-接口文档)
- [🔐 安全设计](#-安全设计)
- [☁️ 部署指南](#️-部署指南)
- [📝 License](#-license)

---

## ✨ 功能亮点

### 🤖 AI 流式对话
- 基于 **SSE（Server-Sent Events）** 实时流式推送，AI 回复逐字呈现（打字机效果）
- 支持**多轮上下文**对话，最近 10 条消息作为历史上下文
- **中途取消**生成 + 失败**重试**机制
- 4 个预设快捷提问，点击即问

### 📋 智能行程规划
- 输入**城市 + 预算 + 天数**，AI 自动生成：
  - 📅 每日行程安排（早中晚分时段）
  - 🏛️ 景点推荐与简介
  - 💰 预算明细表（交通/住宿/餐饮/门票/购物）
  - 💡 旅行小贴士
- 支持 **40+ 热门城市**选择（北京/上海/成都/大理/拉萨…）
- Markdown 渲染 + **XSS 防护**（DOMPurify）

### 💬 多会话管理
- 对话按**会话**组织，最多支持 10 个独立会话
- 新建 / 切换 / 删除会话，互不干扰
- 从详情页跳转聊天时自动创建新会话并预填充城市名

### ⭐ 收藏 & 历史记录
- 行程规划结果**一键收藏**
- 历史记录自动保存，按时间倒序展示
- 登录后**云端同步**，换设备不丢失
- 支持单条删除 + 一键清空

### 👤 用户系统
- **JWT 认证**（jsonwebtoken），Token 自动存储在 localStorage
- **bcryptjs** 密码加密存储，不存明文
- **数据完全隔离**：用户 A 的对话/行程/收藏与用户 B 互不可见
- 路由导航守卫：未登录自动跳转登录页，已登录跳过登录页

### 📱 移动端适配
- **Vant 4** UI 组件库，专为移动端设计
- 底部安全区域适配（`safe-area-inset-bottom`）
- Tabbar 底部导航 + 路由联动
- 触摸友好交互：按压态反馈、弹性动画

### 🐳 一键部署
- **Docker Compose** 编排前端 + 后端 + Nginx
- Nginx 反向代理 `/api` 到后端，SPA fallback 支持

---

## 🎨 Claymorphism 设计风格

本项目采用 **Claymorphism（黏土形态）** 设计风格，打破传统扁平化设计的冰冷感：

| 元素 | 实现 |
|------|------|
| 配色 | 马卡龙色系（薄荷青 `#82bcc8` + 奶油杏 `#ede8e0` + 暖灰白 `#f3efe8`） |
| 卡片 | 超大圆角（24px）+ 双重外阴影（悬浮感） |
| 按钮 | 胶囊形（28px 圆角）+ 弹性按压动画（cubic-bezier 弹性曲线） |
| 输入框 | 黏土凹槽效果（`inset` 内阴影） |
| 背景 | 半透明黏土色 blob 漂浮装饰 |
| 头像 | 半透明光环脉冲动画 |

**设计原则：** 在保留 Vant 组件完整功能的前提下，通过 CSS 变量 + 组件级样式覆盖实现黏土风格，不破坏 Vant 技术栈。

---

## 🏗 项目架构

```
┌─────────────────────────────────────────────────────────┐
│                    用户浏览器（移动端）                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │          Vue 3 SPA (Vant 4 + Pinia)               │  │
│  │  Home / Chat / Detail / Profile / Login / Register │  │
│  └──────────────┬────────────────────────────────────┘  │
│                 │  HTTP + SSE Stream                     │
└─────────────────┼───────────────────────────────────────┘
                  │
     ┌────────────▼────────────┐
     │   Nginx 反向代理 :80     │
     │   /api/* → backend:3300 │
     │   /*     → frontend     │
     └────────────┬────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                    Express Server :3300                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ CORS     │ │ Rate     │ │ JWT      │ │ LangChain  │ │
│  │ 跨域     │ │ Limit    │ │ Auth     │ │ AI 引擎    │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────┬──────┘ │
│                                               │         │
│                          ┌────────────────────▼───────┐ │
│                          │  DeepSeek / SiliconFlow     │ │
│                          │  (ChatOpenAI 兼容 API)     │ │
│                          └────────────────────────────┘ │
│                                               │         │
│  ┌────────────────────────────────────────────▼───────┐ │
│  │              SQLite (better-sqlite3)               │ │
│  │  users / chat_sessions / chat_messages / trips ... │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 📂 项目结构

```
agent_travel/
├── agentTravel/                      # 🖥️ 前端 Vue 3 SPA
│   ├── src/
│   │   ├── views/                    # 页面组件（6 个路由页）
│   │   │   ├── Home/index.vue        #   首页：行程创建表单 + 快捷入口
│   │   │   ├── Chat/index.vue        #   AI 对话：流式聊天 + 多会话
│   │   │   ├── Detail/index.vue      #   行程详情：每日计划 + 预算表
│   │   │   ├── Profile/index.vue     #   个人中心：历史/收藏 + 偏好
│   │   │   ├── Login/index.vue       #   登录页
│   │   │   └── Register/index.vue    #   注册页
│   │   ├── components/               # 通用组件
│   │   │   ├── ChatBubble.vue        #   聊天气泡（Markdown 渲染）
│   │   │   ├── SpotItem.vue          #   景点展示卡片
│   │   │   └── BudgetTable.vue       #   预算明细表
│   │   ├── stores/                   # Pinia 状态管理
│   │   │   ├── auth.ts               #   用户认证状态 + JWT 管理
│   │   │   ├── chat.ts               #   对话状态 + 多会话管理
│   │   │   └── travel.ts             #   行程数据 + 收藏/历史
│   │   ├── router/index.ts           # Vue Router 配置 + 导航守卫
│   │   ├── utils/                    # 工具函数
│   │   │   ├── request.ts            #   Axios + fetchStream (SSE)
│   │   │   ├── storage.ts            #   localStorage 封装
│   │   │   ├── markdown.ts           #   Markdown 渲染 + XSS 防护
│   │   │   └── tripExport.ts         #   行程导出
│   │   ├── styles/common.css         # 全局 Claymorphism 主题变量
│   │   ├── types/                    # TypeScript 类型定义
│   │   ├── App.vue                   # 根组件（Tabbar 布局）
│   │   └── main.ts                   # 入口文件
│   ├── .env.example                  # 环境变量模板
│   ├── .env.production               # 生产环境配置
│   ├── vite.config.js                # Vite 构建 + API 代理 + Vitest
│   ├── nginx.conf                    # Nginx 反向代理 + SPA fallback
│   └── Dockerfile
├── travel-server/                    # ⚙️ 后端 Express 服务
│   ├── src/
│   │   ├── routes/
│   │   │   ├── travel.js             #   行程 API（规划/收藏/历史/删除）
│   │   │   └── auth.js               #   认证 API（登录/注册/获取用户）
│   │   ├── services/
│   │   │   └── travelService.js      #   LangChain 集成 + Prompt 构建
│   │   ├── middleware/
│   │   │   └── auth.js               #   JWT 验证中间件（软认证 + 硬认证）
│   │   ├── utils/
│   │   │   ├── db.js                 #   SQLite 数据库初始化 + 表创建
│   │   │   └── streamUtils.js        #   SSE 流式推送工具
│   │   └── index.js                  #   服务入口（Express 配置）
│   ├── data/                         # SQLite 数据库文件存放
│   ├── .env.example                  # 环境变量模板
│   ├── .env                          # ⚠️ 环境变量（不提交 Git）
│   └── Dockerfile
├── docker-compose.yml                # 🐳 Docker 编排
├── package.json                      # 根级脚本（concurrently 并行启动）
└── README.md
```

---

## 🛠 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| **前端框架** | Vue 3 + Composition API | 组件化 UI 开发 |
| **类型系统** | TypeScript | 类型安全 |
| **状态管理** | Pinia (Setup Store) | 跨组件/跨页面数据共享 |
| **UI 组件库** | Vant 4 | 移动端 UI 组件（Field/Button/Tabbar/NavBar/Popup…） |
| **路由** | Vue Router 4 | SPA 页面导航 + 导航守卫 |
| **HTTP 客户端** | Axios | REST API 请求 |
| **SSE 流式** | 原生 Fetch + ReadableStream | AI 打字机效果 |
| **Markdown** | marked + DOMPurify | 内容渲染 + XSS 过滤 |
| **构建工具** | Vite 8 | 极速开发/HMR/打包 |
| **测试** | Vitest + happy-dom | 单元测试 |
| **后端框架** | Express 4 | RESTful API 服务 |
| **AI 引擎** | LangChain (ChatOpenAI) | LLM 调用抽象层 |
| **模型支持** | DeepSeek / 硅基流动(SiliconFlow) | 双模型可切换 |
| **数据库** | SQLite (better-sqlite3) | 轻量嵌入式数据库 |
| **认证** | JWT (jsonwebtoken) + bcryptjs | 无状态认证 + 密码哈希 |
| **安全** | express-rate-limit + CORS + Helmet | 限流/跨域/安全头 |
| **部署** | Docker + Nginx | 容器化 + 反向代理 |

---

## 🚀 快速启动

### 前置要求

- **Node.js** >= 18
- **npm** >= 9
- （可选）**Docker** + Docker Compose

### 方式一：本地开发（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/carrotchicken/agent_travel.git
cd agent_travel

# 2. 安装全部依赖
npm run install:all

# 3. 配置后端环境变量
cp travel-server/.env.example travel-server/.env
# 编辑 travel-server/.env，至少填入一个 API Key：
#   DEEPSEEK_API_KEY=sk-xxx  （推荐）
#   或 SILICONFLOW_API_KEY=sk-xxx

# 4. 一键启动前后端
npm run dev

# 前端 → http://localhost:5173
# 后端 → http://localhost:3300
# 前端 /api 请求自动代理到后端
```

### 方式二：Docker 部署

```bash
# 1. 配置环境变量
cp travel-server/.env.example travel-server/.env
# 编辑 travel-server/.env 填入 API Key

# 2. 构建并启动
docker-compose up -d --build

# 3. 访问
# 前端：http://localhost
```

### 方式三：分别启动

```bash
# 启动后端
cd travel-server
cp .env.example .env    # 配置 API Key
npm install
npm run dev              # → http://localhost:3300

# 另开终端启动前端
cd agentTravel
npm install
npm run dev              # → http://localhost:5173
```

---

## 📡 API 接口文档

### 认证相关 `/api/auth`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| `POST` | `/api/auth/register` | 用户注册 | ❌ |
| `POST` | `/api/auth/login` | 用户登录 | ❌ |
| `GET` | `/api/auth/me` | 获取当前用户信息 | ✅ JWT |

**注册请求体：**
```json
{
  "username": "your_username",
  "password": "your_password"
}
```

**登录响应：**
```json
{
  "code": 0,
  "data": {
    "token": "eyJhbGciOiJI...",
    "user": { "id": 1, "username": "your_username" }
  }
}
```

### 行程相关 `/api/travel`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| `POST` | `/api/travel/plan` | AI 生成行程（SSE 流式） | ❌ |
| `POST` | `/api/travel/chat` | AI 对话（SSE 流式） | ❌ |
| `GET` | `/api/travel/history` | 获取行程历史 | ⚠️ 软认证 |
| `GET` | `/api/travel/favorites` | 获取收藏列表 | ⚠️ 软认证 |
| `POST` | `/api/travel/favorites` | 添加收藏 | ⚠️ 软认证 |
| `DELETE` | `/api/travel/favorites` | 删除收藏 | ⚠️ 软认证 |
| `DELETE` | `/api/travel/history` | 删除历史 | ⚠️ 软认证 |
| `GET` | `/api/travel/heartbeat` | 心跳检测 | ❌ |

> **软认证**：有 Token 时返回该用户的数据，无 Token 时返回空数组。

**行程规划请求体：**
```json
{
  "city": "成都",
  "budget": 3000,
  "days": 3
}
```

**SSE 流式响应格式：**
```
data: {"type":"text","content":"成都是一座..."}
data: {"type":"text","content":"美食之都..."}
event:end
data:{"done":true}
```

---

## 🔐 安全设计

| 措施 | 说明 |
|------|------|
| **密码加密** | bcryptjs 哈希存储，盐值轮次 10 |
| **JWT 认证** | 无状态 Token，24 小时过期 |
| **数据隔离** | 每个 API 调用通过 JWT 注入 `req.userId`，数据库查询强制带 `user_id` 条件 |
| **CORS 白名单** | 仅允许指定的前端域名 + 本地开发地址 |
| **请求限流** | AI 接口每分钟 5 次/每 IP（防止 API Key 被刷爆） |
| **请求体限制** | `express.json({ limit: '1mb' })` 防止大 payload 攻击 |
| **XSS 防护** | 用户输入 + AI 输出均通过 DOMPurify 过滤 |
| **SQL 注入防护** | 使用参数化查询（better-sqlite3 prepared statements） |
| **Token 安全** | 不由前端手动管理过期，统一由 `401` 状态码触发清理 |

---

## ☁️ 部署指南

### 腾讯云 CloudBase 部署

本项目已部署在腾讯云 CloudBase：

- **前端静态托管：** `https://travel-aymi-d3gfbp2ir98b1ac06.webapps.tcloudbase.com`
- **后端云托管：** `travelserver-281839-8-1429643134.sh.run.tcloudbase.com`

部署时需额外配置环境变量：

**后端云托管环境变量：**
```env
PORT=3300
CORS_ORIGIN=https://travel-aymi-d3gfbp2ir98b1ac06.webapps.tcloudbase.com
MODEL_PROVIDER=DEEPSEEK
DEEPSEEK_API_KEY=sk-your-key
JWT_SECRET=your-random-secret-key
```

**前端构建环境变量（`.env.production`）：**
```env
VITE_API_HOST=https://travelserver-281839-8-1429643134.sh.run.tcloudbase.com
```

### ⚠️ SQLite 数据持久化注意

SQLite 是文件数据库，部署到 Serverless/云托管平台时容器重启会丢失数据。

- **仅演示/面试展示**：不影响，重启后重新注册即可
- **需要持久化**：建议替换为腾讯云 CloudBase 数据库或 MySQL/PostgreSQL

### 其他平台部署

项目支持 Docker Compose 部署，可迁移到任意支持 Docker 的平台（阿里云、华为云、AWS、 Railway、Render 等）。

---

## 📝 开发命令参考

```bash
# 根目录
npm run dev              # 并行启动前后端
npm run install:all      # 安装全部依赖

# 前端
cd agentTravel
npm run dev              # 启动 Vite 开发服务器
npm run build            # 生产构建
npm run lint             # ESLint 代码检查
npm run format           # Prettier 格式化
npm run test             # 运行单元测试

# 后端
cd travel-server
npm run dev              # 启动 Express（nodemon 热重载）
npm start                # 生产启动
npm run lint             # ESLint 代码检查
npm run test             # 运行单元测试
```

---

## 🙏 致谢

- [Vant](https://vant-ui.github.io/) — 轻量、可靠的移动端 Vue 组件库
- [LangChain](https://www.langchain.com/) — LLM 应用开发框架
- [DeepSeek](https://www.deepseek.com/) — 高性价比大语言模型
- [硅基流动 SiliconFlow](https://siliconflow.cn/) — LLM API 聚合平台
- Claymorphism 设计灵感来自 GitHub 开源 UI 社区

---

## 📝 License

MIT © 2026

---

<p align="center">
  <b>⭐ 如果这个项目对你有帮助，欢迎 Star！</b><br>
  <a href="https://github.com/carrotchicken/agent_travel">github.com/carrotchicken/agent_travel</a>
</p>
