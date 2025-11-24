# Web Scraper 功能说明

## 概述

应用现在**优先使用网页爬取**来获取实时占用数据，每次打开应用或刷新时都会自动爬取一次。

## 架构

### 开发环境

1. **Scraper API Server** (端口 3001)
   - 使用 Puppeteer 加载 Transport NSW 网站
   - 等待 JavaScript 执行完成
   - 提取停车场占用数据

2. **Vite Dev Server** (端口 3000)
   - 代理 `/api/scrape` 请求到 Scraper API
   - 提供前端应用

3. **启动方式**:
   ```bash
   npm run dev
   ```
   这会同时启动两个服务。

### 生产环境 (Docker)

1. **Dockerfile** 配置：
   - 安装 Chromium 和必要的系统库
   - 同时运行 Scraper API 和静态文件服务器
   - Scraper API 在后台运行
   - 静态文件服务器在前台运行

2. **端口**:
   - `8000` (或 `PORT` 环境变量): 静态文件服务器
   - `3001` (或 `SCRAPER_PORT` 环境变量): Scraper API

## 数据流程

1. **用户打开应用** → `App.tsx` 调用 `loadData()`
2. **loadData()** → `fetchCarparkData()`
3. **fetchCarparkData()** → 优先调用 `scrapeCarparkOccupancy()`
4. **scrapeCarparkOccupancy()** → 请求 `/api/scrape/carpark-occupancy`
5. **Scraper API** → 使用 Puppeteer 爬取网站数据
6. **返回数据** → 匹配并合并到停车场列表

## 刷新机制

- **每次打开应用**: `useEffect` 自动调用 `loadData()`
- **手动刷新**: 点击刷新按钮调用 `loadData()`
- **刷新占用数据**: 点击 "Refresh Occupancy" 调用 `fetchOccupancyDataOnly()`

## 故障转移

如果网页爬取失败，会自动尝试使用 Transport NSW API 作为备用：

1. 网页爬取 (优先)
2. Transport NSW API (备用)

## Docker 部署

### 构建镜像

```bash
docker build -t nsw-park-ride-checker .
```

### 运行容器

```bash
docker run -p 8000:8000 -p 3001:3001 \
  -e PORT=8000 \
  -e SCRAPER_PORT=3001 \
  nsw-park-ride-checker
```

### 环境变量

- `PORT`: 静态文件服务器端口 (默认: 8000)
- `SCRAPER_PORT`: Scraper API 端口 (默认: 3001)
- `PUPPETEER_EXECUTABLE_PATH`: Chromium 路径 (Docker 中自动设置)

## 性能考虑

- **爬取时间**: 每次爬取大约需要 5-10 秒（等待页面加载）
- **缓存**: 可以考虑添加缓存机制，避免频繁爬取
- **并发**: Scraper API 可以处理多个请求，但建议添加请求队列

## 故障排除

### Scraper API 无法启动

1. 检查端口是否被占用
2. 检查 Puppeteer 是否正确安装
3. 检查 Chromium 是否可用

### 爬取失败

1. 检查网络连接
2. 检查 Transport NSW 网站是否可访问
3. 查看服务器日志

### Docker 中 Chromium 问题

确保 Dockerfile 中安装了所有必要的依赖：
- chromium
- nss
- freetype
- harfbuzz

## 相关文件

- `server/scraper.js` - Puppeteer 爬取逻辑
- `server/api.js` - Express API 服务器
- `services/webScrapingService.ts` - 前端服务调用
- `services/tfnswService.ts` - 数据获取服务（已集成爬取）
- `Dockerfile` - Docker 配置

