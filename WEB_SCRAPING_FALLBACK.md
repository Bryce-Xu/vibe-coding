# Web Scraping Fallback 功能说明

## 概述

当 Transport NSW API 的 occupancy 端点遇到配额限制时，应用现在会自动尝试从 Transport NSW 官方网站爬取实时占用数据作为备用方案。

## 数据来源

**官方网站**: https://transportnsw.info/travel-info/ways-to-get-around/drive/parking/transport-parkride-car-parks

该网站显示所有 Park&Ride 停车场的实时可用停车位数。

## 工作原理

1. **主要数据源**: Transport NSW API (`/v1/carpark/occupancy`)
   - 如果 API 可用且未超出配额，优先使用 API 数据
   - API 数据包含更完整的信息（总停车位数、已占用数等）

2. **备用数据源**: 网页爬取
   - 当 API 配额限制或失败时自动启用
   - 从网页 HTML 中提取实时可用停车位数
   - 通过名称匹配将数据与停车场列表关联

## 实现细节

### 文件结构

- `services/webScrapingService.ts` - 网页爬取服务
  - `scrapeCarparkOccupancy()` - 爬取网页数据
  - `matchScrapedData()` - 匹配爬取数据与停车场列表

- `services/tfnswService.ts` - 更新以支持备用数据源
  - 自动在 API 失败时尝试网页爬取

### 数据匹配逻辑

网页爬取服务使用以下策略匹配数据：

1. **精确匹配**: 尝试精确匹配停车场名称
2. **模糊匹配**: 如果精确匹配失败，使用模糊匹配算法
   - 忽略大小写
   - 忽略多余空格
   - 检查名称是否包含对方的关键词
   - 确保至少 50% 的单词匹配

### 数据格式转换

网页只显示**可用停车位数**，而 API 提供**总停车位数**和**已占用数**。

转换逻辑：
- `spots_free` = 网页显示的可用停车位数
- `total` = 保留现有值（如果有），否则估算（可用数 × 2）
- `occupied` = `total - spots_free`

## 限制和注意事项

### CORS 限制

⚠️ **重要**: 由于浏览器的 CORS 策略，直接从浏览器访问 Transport NSW 网站可能会失败。

**解决方案**:

1. **开发环境**: 使用 Vite 代理（需要配置）
2. **生产环境**: 
   - 使用后端代理服务
   - 或使用 CORS 代理服务（如 `https://cors-anywhere.herokuapp.com/`）
   - 或部署自己的后端服务来爬取数据

### 数据准确性

- 网页数据是实时的，但只包含可用停车位数
- 总停车位数需要估算，可能不够准确
- 名称匹配可能不完美，某些停车场可能无法匹配

### 网页结构变化

如果 Transport NSW 网站更新了 HTML 结构，爬取功能可能需要更新正则表达式模式。

## 使用方法

### 自动启用

功能已自动集成到 `fetchCarparkData()` 函数中：

```typescript
// 自动尝试 API，失败时使用网页爬取
const { data } = await fetchCarparkData();
```

### 手动刷新

手动刷新 occupancy 数据时也会自动尝试网页爬取：

```typescript
// 在 App.tsx 中点击 "Refresh Occupancy" 按钮
const occupancyData = await fetchOccupancyDataOnly();
```

## 配置代理（推荐用于生产环境）

### 选项 1: Vite 代理配置

在 `vite.config.ts` 中添加：

```typescript
proxy: {
  '/api/scrape': {
    target: 'https://transportnsw.info',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/scrape/, ''),
  }
}
```

### 选项 2: 后端代理服务

创建一个简单的 Node.js/Express 服务：

```javascript
// server.js
const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.get('/api/scrape/carpark-occupancy', async (req, res) => {
  try {
    const response = await fetch('https://transportnsw.info/travel-info/ways-to-get-around/drive/parking/transport-parkride-car-parks');
    const html = await response.text();
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001);
```

然后在 `webScrapingService.ts` 中使用：

```typescript
const scrapedData = await scrapeCarparkOccupancy(true); // useProxy = true
```

## 测试

运行测试脚本验证功能：

```bash
# 测试网页爬取功能（需要 Node.js 环境）
node test-web-scraping.js
```

## 故障排除

### 问题: CORS 错误

**症状**: 控制台显示 CORS 错误

**解决方案**:
1. 使用后端代理服务
2. 或配置 Vite 代理
3. 或使用 CORS 代理服务

### 问题: 无法匹配停车场

**症状**: 某些停车场没有 occupancy 数据

**解决方案**:
1. 检查停车场名称是否与网页上的名称匹配
2. 更新 `matchScrapedData()` 函数中的匹配逻辑
3. 检查网页 HTML 结构是否变化

### 问题: 数据不准确

**症状**: 显示的停车位数与实际情况不符

**说明**: 
- 网页只显示可用停车位数，总停车位数是估算的
- 这是网页爬取的固有限制
- 建议优先使用 API 数据（如果可用）

## 未来改进

1. **后端服务**: 创建专用的后端服务来处理网页爬取
2. **缓存机制**: 实现数据缓存以减少请求频率
3. **更好的匹配**: 改进名称匹配算法
4. **数据验证**: 添加数据验证和错误处理
5. **GraphQL API**: 如果找到正确的 GraphQL 查询，直接使用 API

## 相关文件

- `services/webScrapingService.ts` - 网页爬取实现
- `services/tfnswService.ts` - API 服务（已集成备用方案）
- `vite.config.ts` - Vite 配置（可添加代理）
- `WEB_SCRAPING_FALLBACK.md` - 本文档

## 参考

- Transport NSW 网站: https://transportnsw.info/travel-info/ways-to-get-around/drive/parking/transport-parkride-car-parks
- Transport NSW API 文档: https://opendata.transport.nsw.gov.au/dataset/car-park-api

