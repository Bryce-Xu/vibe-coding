# CORS 问题解决方案

## 问题

Transport NSW GraphQL API (`https://transportnsw.info/api/graphql`) 不允许直接从浏览器调用（CORS 限制），导致在生产环境中出现 `strict-origin-when-cross-origin` 错误。

## 解决方案

### 开发环境（本地）

使用 **Vite 代理**来绕过 CORS 限制：

1. **配置**: `vite.config.ts` 中已配置代理
   - 所有 `/api/graphql` 请求会被代理到 `https://transportnsw.info/api/graphql`
   - 所有 `/api/tfnsw/*` 请求会被代理到 `https://api.transport.nsw.gov.au`
   - 代理会自动添加必要的 headers

2. **使用**: 代码会自动使用代理
   - 开发环境：使用 `/api/graphql`（Vite 代理）
   - 生产环境：使用 `/api/graphql`（Express 服务器代理）

### 生产环境（部署后）

使用 **Express 服务器代理**来绕过 CORS 限制：

1. **架构变更**: Express 服务器现在同时提供：
   - API 端点（包括 GraphQL 代理）
   - 静态文件服务

2. **GraphQL 代理**: `server/api.js` 中添加了 `/api/graphql` 端点
   - 接收前端的 GraphQL 请求
   - 转发到 `https://transportnsw.info/api/graphql`
   - 返回响应给前端

3. **统一端口**: 所有请求都通过同一个端口（8000）处理
   - 前端应用：`http://your-domain.com/`
   - API 端点：`http://your-domain.com/api/graphql`
   - 静态文件：由 Express 自动提供

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

### 开发环境
```
浏览器请求: /api/graphql
    ↓
Vite 代理服务器 (localhost:3000)
    ↓
转发到: https://transportnsw.info/api/graphql
    ↓
返回响应给浏览器
```

### 生产环境
```
浏览器请求: /api/graphql
    ↓
Express 服务器 (端口 8000)
    ↓
转发到: https://transportnsw.info/api/graphql
    ↓
返回响应给浏览器
```

这样浏览器就不会遇到 CORS 问题，因为请求是同源的（都来自同一个域名）。

## 代码更改

1. **`server/api.js`**: 
   - 添加了 `/api/graphql` POST 端点
   - 添加了静态文件服务功能（生产环境）
   - 更新了 CORS 配置以支持 POST 请求

2. **`server/start.sh`**: 
   - 简化了启动脚本，只启动 Express 服务器
   - Express 服务器现在同时处理 API 和静态文件

3. **`services/tfnswService.ts`**: 
   - 移除了生产环境直接调用 GraphQL API 的代码
   - 现在统一使用 `/api/graphql` 代理端点

