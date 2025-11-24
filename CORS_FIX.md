# CORS 问题解决方案

## 问题

Transport NSW API 不允许直接从浏览器调用（CORS 限制），导致在本地开发时出现 "Failed to fetch" 错误。

## 解决方案

### 开发环境（本地）

使用 **Vite 代理**来绕过 CORS 限制：

1. **配置**: `vite.config.ts` 中已配置代理
   - 所有 `/api/tfnsw/*` 请求会被代理到 `https://api.transport.nsw.gov.au`
   - 代理会自动添加 `Authorization` header（从环境变量读取）

2. **使用**: 代码会自动检测开发环境并使用代理
   - 开发环境：使用 `/api/tfnsw/v1/carpark`
   - 生产环境：直接使用 `https://api.transport.nsw.gov.au/v1/carpark`

### 生产环境（部署后）

部署后的应用通常不会有 CORS 问题，因为：
- 服务器端调用 API（不是浏览器直接调用）
- 或者部署平台配置了正确的 CORS 头

## 验证

### 1. 检查代理是否工作

访问：`http://localhost:3000/api/tfnsw/v1/carpark`

应该看到 JSON 数据（停车场列表）

### 2. 检查应用

1. 打开浏览器：`http://localhost:3000`
2. 打开开发者工具（F12）
3. 查看 Network 标签：
   - 应该看到对 `/api/tfnsw/v1/carpark` 的请求
   - 状态应该是 `200 OK`
4. 查看 Console：
   - 应该看到：`✅ Successfully loaded X carparks from Transport NSW API`

## 环境变量

确保 `.env.local` 包含：

```bash
VITE_TFNSW_API_KEY=your-api-key-here
```

代理会自动从环境变量读取 API key 并添加到请求头中。

## 故障排除

### 如果仍然看到错误

1. **重启开发服务器**：
   ```bash
   # 停止服务器 (Ctrl+C)
   npm run dev
   ```

2. **检查环境变量**：
   ```bash
   cat .env.local
   ```
   确保 `VITE_TFNSW_API_KEY` 存在且正确

3. **检查代理配置**：
   - 打开 `vite.config.ts`
   - 确认代理配置正确

4. **检查浏览器控制台**：
   - 查看 Network 标签中的请求
   - 检查请求 URL 是否为 `/api/tfnsw/v1/carpark`
   - 检查响应状态码

## 工作原理

```
浏览器请求: /api/tfnsw/v1/carpark
    ↓
Vite 代理服务器
    ↓
添加 Authorization header (从 .env.local)
    ↓
转发到: https://api.transport.nsw.gov.au/v1/carpark
    ↓
返回响应给浏览器
```

这样浏览器就不会遇到 CORS 问题，因为请求是同源的（都来自 localhost:3000）。

