# 测试说明

## 网页爬取功能测试结果

### 发现的问题

1. **网站使用 Next.js**: Transport NSW 网站使用 Next.js 框架，数据通过 JavaScript 动态加载
2. **HTML 解析无效**: 简单的 HTML 解析无法获取数据，因为数据在页面加载后才通过 JavaScript 渲染
3. **CORS 限制**: 浏览器环境有 CORS 限制，无法直接 fetch 网站内容

### 解决方案

#### 方案 1: 后端代理服务（推荐）

创建一个 Node.js 后端服务，使用 Puppeteer 或 Playwright 来：
1. 加载完整页面（等待 JavaScript 执行）
2. 提取 DOM 中的数据
3. 通过 API 提供给前端

**示例代码** (需要安装 puppeteer):
```javascript
// server.js
const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.get('/api/scrape/carpark-occupancy', async (req, res) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://transportnsw.info/travel-info/ways-to-get-around/drive/parking/transport-parkride-car-parks');
  
  // Wait for content to load
  await page.waitForSelector('button');
  
  // Extract data
  const data = await page.evaluate(() => {
    const carparkData = {};
    const buttons = Array.from(document.querySelectorAll('button'));
    buttons.forEach(btn => {
      const text = btn.textContent || '';
      if (text.includes('Park&Ride') && text.includes('spaces')) {
        const match = text.match(/Park&Ride\s*-\s*([^0-9]+?)\s+(\d+)\s+spaces/i);
        if (match) {
          const name = match[1].trim();
          const spaces = parseInt(match[2], 10);
          carparkData[name] = { name, spaces };
        }
      }
    });
    return carparkData;
  });
  
  await browser.close();
  res.json(data);
});

app.listen(3001);
```

#### 方案 2: 使用 CORS 代理服务

使用公共 CORS 代理服务（不推荐用于生产环境）:
- `https://cors-anywhere.herokuapp.com/`
- `https://api.allorigins.win/`

#### 方案 3: 浏览器扩展

创建一个浏览器扩展来：
1. 在用户访问 Transport NSW 网站时提取数据
2. 通过消息传递发送给应用

### 当前实现状态

- ✅ 代码已更新以支持备用数据源
- ✅ 在 API 失败时自动尝试网页爬取
- ⚠️ 由于 CORS 和 JavaScript 渲染问题，需要后端服务才能正常工作

### 测试步骤

1. **测试 API 功能**:
   ```bash
   npm run dev
   # 访问 http://localhost:3000
   # 检查控制台日志
   ```

2. **测试网页爬取** (需要后端服务):
   - 启动后端代理服务
   - 配置 Vite 代理指向后端服务
   - 测试备用数据源功能

### 建议

由于 Transport NSW 网站的技术限制，建议：

1. **优先使用官方 API**: 继续使用 Transport NSW API 作为主要数据源
2. **申请更高配额**: 联系 Transport NSW 申请更高的 API 配额
3. **实现后端服务**: 如果需要网页爬取作为备用，创建后端服务使用 Puppeteer
4. **监控 API 状态**: 实现 API 健康检查，自动切换数据源

### 相关文件

- `services/webScrapingService.ts` - 网页爬取服务
- `services/tfnswService.ts` - API 服务（已集成备用方案）
- `WEB_SCRAPING_FALLBACK.md` - 功能说明文档

