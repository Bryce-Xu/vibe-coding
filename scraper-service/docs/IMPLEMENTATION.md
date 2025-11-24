# Scraper Service 实现细节

## 架构概述

Scraper Service 是一个独立的 Node.js 后端服务，使用 Puppeteer 从 Transport NSW 网站爬取 Park&Ride 停车场的实时占用数据。

## 核心组件

### 1. Scraper Module (`src/scraper.js`)

负责实际的网页爬取逻辑。

#### 主要功能

- 启动 Puppeteer 浏览器实例
- 导航到目标网页
- 等待页面内容加载完成
- 提取停车场数据
- 清理资源

#### 实现细节

```javascript
export async function scrapeCarparkOccupancy()
```

**流程**:

1. **浏览器启动**
   ```javascript
   browser = await puppeteer.launch({
     headless: true,
     executablePath, // 可选，Docker 中需要指定
     args: [
       '--no-sandbox',
       '--disable-setuid-sandbox',
       '--disable-dev-shm-usage',
       // ... 其他参数
     ],
   });
   ```

2. **页面导航**
   ```javascript
   await page.goto(url, {
     waitUntil: 'networkidle2', // 等待网络空闲
     timeout: 30000,
   });
   ```

3. **等待内容加载**
   ```javascript
   await page.waitForSelector('button', { timeout: 10000 });
   ```

4. **数据提取**
   - 使用 `page.evaluate()` 在浏览器上下文中执行 JavaScript
   - 查找包含 "Park&Ride" 和 "spaces" 的按钮元素
   - 使用正则表达式提取停车场名称和可用停车位数

5. **数据格式**
   ```javascript
   {
     "Ashfield": {
       "name": "Ashfield",
       "spaces": 168
     },
     ...
   }
   ```

#### 正则表达式模式

```javascript
/Park&Ride\s*-\s*([^\d]+?)(\d+)\s+spaces/i
```

**匹配示例**:
- `"Park&Ride - Ashfield168 spaces"` → `{name: "Ashfield", spaces: 168}`
- `"Park&Ride - Bella Vista482 spaces"` → `{name: "Bella Vista", spaces: 482}`

**注意**: 名称和数字之间没有空格，这是实际网页的格式。

### 2. API Server (`src/api.js`)

Express 服务器，提供 REST API 端点。

#### 端点实现

**健康检查** (`GET /health`):
```javascript
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'scraper-api' });
});
```

**爬取端点** (`GET /api/scrape/carpark-occupancy`):
```javascript
app.get('/api/scrape/carpark-occupancy', async (req, res) => {
  try {
    const data = await scrapeCarparkOccupancy();
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to scrape carpark data', 
      message: error.message 
    });
  }
});
```

#### CORS 配置

```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
```

## 数据流程

```
Client Request
    ↓
Express API Server (api.js)
    ↓
Scraper Module (scraper.js)
    ↓
Puppeteer Browser
    ↓
Transport NSW Website
    ↓
Extract Data (page.evaluate)
    ↓
Return JSON Response
```

## 错误处理

### 浏览器启动失败

- 检查 Puppeteer 是否正确安装
- 检查 Chromium 是否可用
- Docker 中需要安装系统依赖

### 页面加载超时

- 默认超时: 30 秒
- 可以调整 `page.setDefaultTimeout()`

### 数据提取失败

- 检查选择器是否正确
- 检查页面结构是否变化
- 查看控制台日志

## 性能考虑

### 爬取时间

- 页面加载: ~5-10 秒
- 数据提取: <1 秒
- 总时间: ~6-11 秒

### 资源使用

- 内存: ~100-200 MB（每个浏览器实例）
- CPU: 中等（主要在页面加载时）

### 优化建议

1. **连接池**: 复用浏览器实例（需要实现连接池）
2. **缓存**: 添加缓存机制，避免频繁爬取
3. **并发控制**: 限制同时爬取的请求数
4. **请求队列**: 实现请求队列，避免资源竞争

## 依赖项

### 运行时依赖

- `express`: Web 框架
- `puppeteer`: 无头浏览器

### 系统依赖（Docker）

- `chromium`: 浏览器引擎
- `nss`: 网络安全服务
- `freetype`: 字体渲染
- `harfbuzz`: 文本整形
- `ca-certificates`: SSL 证书

## 环境配置

### 开发环境

```bash
SCRAPER_PORT=3001
```

### 生产环境（Docker）

```bash
SCRAPER_PORT=3001
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

## 测试

### 手动测试

```bash
# 测试健康检查
curl http://localhost:3001/health

# 测试爬取端点
curl http://localhost:3001/api/scrape/carpark-occupancy
```

### 单元测试（待实现）

```javascript
import { scrapeCarparkOccupancy } from './scraper.js';

test('should scrape carpark data', async () => {
  const data = await scrapeCarparkOccupancy();
  expect(data).toBeDefined();
  expect(Object.keys(data).length).toBeGreaterThan(0);
});
```

## 监控和日志

### 日志输出

- `🕷️ Starting web scraper...`
- `📡 Navigating to Transport NSW website...`
- `⏳ Waiting for content to load...`
- `🔍 Extracting carpark data...`
- `✅ Successfully scraped X carparks from website`

### 错误日志

- `❌ Error scraping carpark data: [error message]`
- `⚠️ Button selector not found, continuing anyway...`

## 未来改进

### 短期

1. ✅ 修复正则表达式匹配问题
2. ⏳ 添加请求重试机制
3. ⏳ 添加请求超时处理
4. ⏳ 改进错误消息

### 中期

1. ⏳ 实现浏览器连接池
2. ⏳ 添加数据缓存（Redis）
3. ⏳ 实现请求队列
4. ⏳ 添加监控和指标（Prometheus）

### 长期

1. ⏳ 支持多个数据源
2. ⏳ 实现 WebSocket 实时推送
3. ⏳ 添加数据验证和清洗
4. ⏳ 实现分布式爬取

## 故障排除

### 问题: 爬取返回空数据

**原因**: 页面结构变化或选择器不正确

**解决**:
1. 检查页面 HTML 结构
2. 更新选择器或正则表达式
3. 增加等待时间

### 问题: Puppeteer 启动失败

**原因**: Chromium 未安装或路径不正确

**解决**:
1. 检查 `PUPPETEER_EXECUTABLE_PATH` 环境变量
2. Docker 中确保安装了系统依赖
3. 检查文件权限

### 问题: 页面加载超时

**原因**: 网络慢或页面加载慢

**解决**:
1. 增加超时时间
2. 检查网络连接
3. 使用 `waitUntil: 'domcontentloaded'` 替代 `networkidle2`

## 安全考虑

1. **输入验证**: 当前端点不需要输入，未来添加时需验证
2. **速率限制**: 建议添加速率限制，防止滥用
3. **错误信息**: 避免泄露敏感信息
4. **资源限制**: 限制并发请求数，防止资源耗尽

## 相关文档

- [Puppeteer API](https://pptr.dev/)
- [Express.js 文档](https://expressjs.com/)
- [Transport NSW 网站](https://transportnsw.info/)

