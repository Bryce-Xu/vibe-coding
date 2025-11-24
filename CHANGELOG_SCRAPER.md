# 网页爬取功能更新日志

## 更新内容

### ✅ 已完成

1. **创建后端 Scraper 服务**
   - `server/scraper.js` - 使用 Puppeteer 爬取 Transport NSW 网站
   - `server/api.js` - Express API 服务器，提供爬取端点
   - `server/start.sh` - 启动脚本（用于 Docker）

2. **更新前端服务**
   - `services/webScrapingService.ts` - 更新为使用后端 API
   - `services/tfnswService.ts` - **优先使用网页爬取**，API 作为备用

3. **更新配置**
   - `vite.config.ts` - 添加 `/api/scrape` 代理
   - `package.json` - 添加 `concurrently` 和启动脚本
   - `Dockerfile` - 支持 Puppeteer 和 Chromium

4. **数据流程**
   - ✅ 每次打开应用时自动爬取
   - ✅ 用户刷新时自动爬取
   - ✅ 手动刷新占用数据时也爬取

## 使用方法

### 开发环境

```bash
npm run dev
```

这会同时启动：
- Scraper API Server (端口 3001)
- Vite Dev Server (端口 3000)

### 生产环境 (Docker)

```bash
docker build -t nsw-park-ride-checker .
docker run -p 8000:8000 -p 3001:3001 nsw-park-ride-checker
```

## 数据优先级

1. **网页爬取** (优先) - 无配额限制，实时数据
2. **Transport NSW API** (备用) - 有配额限制

## 技术细节

- **Puppeteer**: 用于加载完整页面并等待 JavaScript 执行
- **Express**: 提供 REST API 端点
- **Docker**: 支持在容器中运行 Chromium

## 测试状态

- ✅ Scraper API Server 启动成功
- ✅ Health check 端点正常
- ✅ Vite 代理配置正确
- ⏳ 需要测试实际爬取功能

## 下一步

1. 测试完整的爬取流程
2. 添加错误处理和重试机制
3. 考虑添加缓存以减少爬取频率
4. 监控爬取性能和成功率

