# NSW Park&Ride Scraper Service

独立的后端爬虫服务，用于从 Transport NSW 网站爬取 Park&Ride 停车场的实时占用数据。

## 功能特性

- 🕷️ 使用 Puppeteer 爬取动态加载的网页内容
- 🚀 Express REST API 服务
- 🐳 Docker 支持
- 📊 返回 JSON 格式的停车场占用数据
- ⚡ 自动等待页面 JavaScript 执行完成

## 快速开始

### 安装依赖

```bash
npm install
```

### 运行服务

```bash
npm start
```

服务将在 `http://localhost:3001` 启动。

### 开发模式（自动重启）

```bash
npm run dev
```

## API 端点

### GET /health

健康检查端点

**响应**:
```json
{
  "status": "ok",
  "service": "scraper-api"
}
```

### GET /api/scrape/carpark-occupancy

爬取停车场占用数据

**响应**:
```json
{
  "Ashfield": {
    "name": "Ashfield",
    "spaces": 168
  },
  "Bella Vista": {
    "name": "Bella Vista",
    "spaces": 487
  },
  ...
}
```

**错误响应** (500):
```json
{
  "error": "Failed to scrape carpark data",
  "message": "Error details..."
}
```

## 环境变量

- `SCRAPER_PORT`: 服务端口（默认: 3001）
- `PUPPETEER_EXECUTABLE_PATH`: Chromium 可执行文件路径（可选，Docker 中需要）

## Docker 部署

### 构建镜像

```bash
docker build -t nsw-park-ride-scraper .
```

### 运行容器

```bash
docker run -p 3001:3001 \
  -e SCRAPER_PORT=3001 \
  nsw-park-ride-scraper
```

## 项目结构

```
scraper-service/
├── src/
│   ├── api.js          # Express API 服务器
│   └── scraper.js      # Puppeteer 爬取逻辑
├── docs/
│   └── IMPLEMENTATION.md  # 实现细节文档
├── Dockerfile          # Docker 配置
├── package.json        # 依赖配置
└── README.md          # 本文件
```

## 技术栈

- **Node.js**: 运行时环境
- **Express**: Web 框架
- **Puppeteer**: 无头浏览器自动化

## 许可证

MIT

