# Scraper Service 架构文档

## 系统架构

```
┌─────────────────┐
│   Client App    │
│  (Frontend)     │
└────────┬────────┘
         │ HTTP Request
         │ GET /api/scrape/carpark-occupancy
         ▼
┌─────────────────┐
│  Express API    │
│   (api.js)      │
└────────┬────────┘
         │
         │ scrapeCarparkOccupancy()
         ▼
┌─────────────────┐
│  Scraper Module │
│  (scraper.js)   │
└────────┬────────┘
         │
         │ Puppeteer
         ▼
┌─────────────────┐
│  Puppeteer      │
│  Browser        │
└────────┬────────┘
         │
         │ HTTP Request
         ▼
┌─────────────────┐
│ Transport NSW   │
│   Website       │
└─────────────────┘
```

## 组件说明

### 1. Express API Server (`api.js`)

**职责**:
- 接收 HTTP 请求
- 调用 Scraper Module
- 返回 JSON 响应
- 处理错误

**端口**: 3001 (可配置)

**端点**:
- `GET /health` - 健康检查
- `GET /api/scrape/carpark-occupancy` - 爬取数据

### 2. Scraper Module (`scraper.js`)

**职责**:
- 管理 Puppeteer 浏览器实例
- 导航到目标网页
- 提取数据
- 清理资源

**导出函数**:
- `scrapeCarparkOccupancy()` - 主爬取函数

### 3. Puppeteer Browser

**职责**:
- 渲染网页
- 执行 JavaScript
- 提供 DOM API

**配置**:
- Headless 模式
- 无沙箱（Docker 需要）
- 禁用 GPU 加速

## 数据流

### 请求流程

```
1. Client → GET /api/scrape/carpark-occupancy
2. Express → 调用 scrapeCarparkOccupancy()
3. Scraper → 启动 Puppeteer 浏览器
4. Puppeteer → 导航到 Transport NSW 网站
5. Puppeteer → 等待页面加载完成
6. Puppeteer → 执行 page.evaluate() 提取数据
7. Scraper → 返回数据对象
8. Express → 返回 JSON 响应
9. Client → 接收数据
```

### 数据格式

**输入**: 无（GET 请求）

**输出**:
```json
{
  "Ashfield": {
    "name": "Ashfield",
    "spaces": 168
  },
  "Bella Vista": {
    "name": "Bella Vista",
    "spaces": 487
  }
}
```

## 错误处理

### 错误类型

1. **浏览器启动失败**
   - 原因: Chromium 未安装或路径错误
   - 处理: 抛出错误，返回 500

2. **页面加载超时**
   - 原因: 网络慢或页面加载慢
   - 处理: 抛出错误，返回 500

3. **数据提取失败**
   - 原因: 页面结构变化
   - 处理: 返回空对象或部分数据

### 错误响应格式

```json
{
  "error": "Failed to scrape carpark data",
  "message": "Error details..."
}
```

## 性能特性

### 响应时间

- **平均**: 6-11 秒
- **页面加载**: 5-10 秒
- **数据提取**: <1 秒

### 资源使用

- **内存**: ~100-200 MB/请求
- **CPU**: 中等（主要在页面加载时）
- **网络**: ~2-5 MB/请求

### 并发处理

- **当前**: 每个请求启动新的浏览器实例
- **限制**: 受服务器资源限制
- **建议**: 实现连接池或请求队列

## 扩展性

### 水平扩展

- 可以部署多个实例
- 使用负载均衡分发请求
- 无状态设计，易于扩展

### 垂直扩展

- 增加服务器资源
- 优化 Puppeteer 配置
- 实现浏览器连接池

## 安全性

### 当前措施

- CORS 配置（允许所有来源）
- 无用户输入验证（不需要）
- 错误信息不泄露敏感信息

### 建议改进

- 添加速率限制
- 添加身份验证（如果需要）
- 限制 CORS 来源
- 添加请求日志

## 监控

### 关键指标

- 请求数量
- 响应时间
- 错误率
- 内存使用
- CPU 使用

### 日志

- 请求日志
- 错误日志
- 性能日志

## 部署选项

### 1. 独立 Docker 容器

```bash
docker run -p 3001:3001 scraper-service
```

### 2. Kubernetes Deployment

```yaml
deployment + service
```

### 3. Serverless (未来)

- AWS Lambda
- Google Cloud Functions
- Azure Functions

## 依赖关系

### 运行时依赖

- Node.js >= 18.0.0
- Chromium (通过 Puppeteer)

### 外部依赖

- Transport NSW 网站（目标网站）
- 网络连接

## 故障恢复

### 自动恢复

- 浏览器崩溃: 自动重启
- 页面加载失败: 抛出错误，由调用方处理

### 手动恢复

- 检查日志
- 重启服务
- 检查网络连接

## 未来架构改进

### 短期

1. 浏览器连接池
2. 请求队列
3. 缓存层（Redis）

### 中期

1. 分布式爬取
2. 数据验证和清洗
3. 监控和告警

### 长期

1. 微服务架构
2. 事件驱动架构
3. 流式处理

