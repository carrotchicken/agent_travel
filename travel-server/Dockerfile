# ============================================================
# 后端 Dockerfile
# 运行：docker build -t travel-server . && docker run -p 3300:3300 --env-file .env travel-server
# ============================================================
FROM node:20

WORKDIR /app

# 复制依赖文件
COPY package.json package-lock.json ./
RUN npm ci --production

# 复制源码
COPY src/ ./src/

# 确保 data 目录存在（SQLite 数据库文件存放位置）
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 3300

# 启动（生产模式，不使用 nodemon）
CMD ["node", "src/index.js"]
