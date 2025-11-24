# 迁移指南：从集成服务到独立应用

本文档说明如何将 Scraper Service 从主应用中拆分为独立的微服务。

## 当前状态

Scraper Service 已经独立到 `scraper-service/` 文件夹中，包含：

- ✅ 独立的 `package.json`
- ✅ 独立的源代码 (`src/`)
- ✅ 独立的 Dockerfile
- ✅ 完整的文档

## 目录结构

```
nsw-park-&-ride-checker/
├── scraper-service/          # 独立的爬虫服务
│   ├── src/
│   │   ├── api.js           # Express API 服务器
│   │   └── scraper.js       # Puppeteer 爬取逻辑
│   ├── docs/
│   │   ├── IMPLEMENTATION.md
│   │   └── MIGRATION.md     # 本文件
│   ├── Dockerfile
│   ├── package.json
│   └── README.md
├── server/                   # 旧的位置（可删除）
│   ├── api.js
│   └── scraper.js
└── ...
```

## 步骤 1: 独立部署 Scraper Service

### 选项 A: 作为独立 Docker 容器

1. **构建镜像**:
   ```bash
   cd scraper-service
   docker build -t nsw-park-ride-scraper .
   ```

2. **运行容器**:
   ```bash
   docker run -d \
     --name scraper-service \
     -p 3001:3001 \
     -e SCRAPER_PORT=3001 \
     nsw-park-ride-scraper
   ```

3. **更新主应用配置**:
   - 更新 Vite 代理配置，指向独立的服务
   - 或使用环境变量配置服务 URL

### 选项 B: 作为独立 Node.js 服务

1. **安装依赖**:
   ```bash
   cd scraper-service
   npm install
   ```

2. **运行服务**:
   ```bash
   npm start
   ```

3. **使用进程管理器** (PM2):
   ```bash
   pm2 start src/api.js --name scraper-service
   ```

## 步骤 2: 更新主应用配置

### 更新 Vite 配置

如果 Scraper Service 运行在不同的主机/端口：

```typescript
// vite.config.ts
proxy: {
  '/api/scrape': {
    target: process.env.SCRAPER_SERVICE_URL || 'http://localhost:3001',
    changeOrigin: true,
  },
}
```

### 环境变量配置

创建 `.env` 文件：

```bash
# Scraper Service URL
SCRAPER_SERVICE_URL=http://localhost:3001

# 或者如果部署在不同的服务器
SCRAPER_SERVICE_URL=https://scraper-service.example.com
```

## 步骤 3: 清理旧文件

一旦独立服务正常运行，可以删除：

```bash
rm -rf server/
```

## 步骤 4: 更新 Docker Compose（可选）

如果使用 Docker Compose，创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  scraper-service:
    build: ./scraper-service
    ports:
      - "3001:3001"
    environment:
      - SCRAPER_PORT=3001
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - SCRAPER_SERVICE_URL=http://scraper-service:3001
    depends_on:
      - scraper-service
```

## 步骤 5: 部署到生产环境

### 独立部署

1. **Scraper Service**:
   - 部署到独立的服务器/容器
   - 配置负载均衡（如果需要）
   - 设置监控和日志

2. **主应用**:
   - 更新环境变量指向 Scraper Service URL
   - 移除本地 Scraper Service 代码

### 服务发现

如果使用 Kubernetes 或类似平台：

```yaml
# scraper-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scraper-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: scraper-service
  template:
    metadata:
      labels:
        app: scraper-service
    spec:
      containers:
      - name: scraper
        image: nsw-park-ride-scraper:latest
        ports:
        - containerPort: 3001
        env:
        - name: SCRAPER_PORT
          value: "3001"
---
apiVersion: v1
kind: Service
metadata:
  name: scraper-service
spec:
  selector:
    app: scraper-service
  ports:
  - port: 3001
    targetPort: 3001
```

## 验证

### 1. 检查 Scraper Service 健康状态

```bash
curl http://localhost:3001/health
```

应该返回:
```json
{"status":"ok","service":"scraper-api"}
```

### 2. 测试爬取端点

```bash
curl http://localhost:3001/api/scrape/carpark-occupancy
```

应该返回停车场数据。

### 3. 测试主应用集成

访问主应用，检查是否能正常获取数据。

## 回滚计划

如果出现问题，可以：

1. **快速回滚**: 恢复使用 `server/` 文件夹中的旧代码
2. **配置回滚**: 更新环境变量指向旧的服务位置
3. **代码回滚**: 使用 Git 回滚到之前的版本

## 监控和日志

### 日志位置

- **开发环境**: 控制台输出
- **生产环境**: 
  - Docker: `docker logs scraper-service`
  - PM2: `pm2 logs scraper-service`

### 监控指标

建议监控：
- 请求数量
- 响应时间
- 错误率
- 内存使用
- CPU 使用

## 常见问题

### Q: 如何确保服务高可用？

A: 
- 部署多个实例
- 使用负载均衡
- 实现健康检查
- 设置自动重启

### Q: 如何处理服务不可用的情况？

A:
- 在主应用中实现重试机制
- 使用备用数据源（Transport NSW API）
- 实现断路器模式

### Q: 如何更新 Scraper Service？

A:
- 构建新镜像
- 滚动更新（零停机）
- 或使用蓝绿部署

## 下一步

1. ✅ 独立文件夹结构
2. ✅ 独立 package.json
3. ✅ 独立 Dockerfile
4. ✅ 完整文档
5. ⏳ 独立部署测试
6. ⏳ 性能测试
7. ⏳ 监控集成

## 相关文档

- [README.md](../README.md) - 服务概述
- [IMPLEMENTATION.md](./IMPLEMENTATION.md) - 实现细节

