# 本地验证指南

## 环境变量配置

确保 `.env.local` 文件包含：

```bash
VITE_TFNSW_API_KEY=your-api-key-here
```

## 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动。

## 验证真实数据

### 1. 检查浏览器控制台

打开浏览器开发者工具（F12），查看 Console 标签：

- ✅ **成功**: 应该看到 API 调用成功，没有错误
- ❌ **失败**: 如果看到 CORS 错误或 API 错误，说明：
  - API key 可能无效
  - 或者 Transport NSW API 不允许浏览器直接调用（CORS 限制）

### 2. 检查网络请求

在浏览器开发者工具的 Network 标签中：

1. 刷新页面
2. 查找对 `api.transport.nsw.gov.au` 的请求
3. 检查请求状态：
   - `200 OK`: API 调用成功
   - `401 Unauthorized`: API key 无效
   - `403 Forbidden` 或 CORS 错误: 浏览器被阻止调用 API

### 3. 验证数据

- **真实数据特征**:
  - 数据量通常比 5 个 mock 数据点多
  - 停车位数量是实时更新的
  - 没有 "Using Demo Data" 警告

- **错误情况**:
  - 如果看到红色错误提示框，说明 API 调用失败
  - 错误信息会显示具体的失败原因

### 4. 测试 API 调用

可以直接在浏览器控制台测试：

```javascript
// 检查环境变量是否正确加载
console.log('API Key:', import.meta.env.VITE_TFNSW_API_KEY);

// 测试 API 调用
fetch('https://api.transport.nsw.gov.au/v1/carpark', {
  headers: {
    'Authorization': `Bearer ${import.meta.env.VITE_TFNSW_API_KEY}`,
    'Accept': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log('API Response:', data))
.catch(err => console.error('API Error:', err));
```

## 常见问题

### CORS 错误

如果遇到 CORS 错误，这是因为 Transport NSW API 可能不允许直接从浏览器调用。解决方案：

1. **使用代理服务器**: 创建一个后端代理来转发 API 请求
2. **部署后测试**: 部署后的应用可能不会有 CORS 问题（取决于服务器配置）

### API Key 无效

- 检查 `.env.local` 文件中的 key 是否正确
- 确保重启了开发服务器（环境变量更改后需要重启）
- 检查 API key 是否过期

### 环境变量未加载

Vite 需要以 `VITE_` 开头的环境变量才能在客户端代码中使用。确保：
- 变量名是 `VITE_TFNSW_API_KEY`（不是 `TFNSW_API_KEY`）
- 重启开发服务器

## 预期行为

✅ **成功使用真实数据**:
- 页面加载时显示真实的停车位数据
- 没有错误提示
- 数据会定期更新（点击刷新按钮）

❌ **API 失败**:
- 显示红色错误提示框
- 错误信息说明失败原因
- 不会显示任何停车位数据（因为我们移除了 mock 数据回退）

