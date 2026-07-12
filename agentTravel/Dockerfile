# ============================================================
# 前端 Dockerfile（多阶段构建）
# 阶段 1：Vite 构建 → 阶段 2：Nginx 静态服务
# ============================================================
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Nginx 配置：SPA 路由 fallback + API 反向代理
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
