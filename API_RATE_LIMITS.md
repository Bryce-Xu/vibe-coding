# Transport NSW API Rate Limits & Quota Information

## 官方配额信息

根据 Transport NSW Open Data 官方文档：

### 默认配额（Bronze Plan）

- **每日配额**: 60,000 次 API 调用
- **速率限制**: 每秒最多 5 次请求
- **重置时间**: 澳大利亚东部标准时间（AEST）午夜（00:00）

### 端点特定限制

⚠️ **重要**: `/v1/carpark/occupancy` 端点可能有**更严格的限制**

根据用户报告：
- 该端点可能在达到总体配额之前就达到限制
- 首次请求可能成功，但后续请求会返回配额错误
- 这可能是为了保护实时数据端点不被过度使用

## 当前状态验证

### 你的 API Key 状态

✅ **可以访问 API**: 
- `/v1/carpark` 端点正常工作
- API key 认证成功

⚠️ **Occupancy 端点受限**:
- `/v1/carpark/occupancy` 返回 429 (Too Many Requests)
- 配额或速率限制已超出

## 配额重置时间

配额在 **AEST 午夜（00:00）** 重置。

当前时间（如果接近午夜）：
- 等待到午夜后重试
- 或者等待 24 小时后重试

## 解决方案

### 1. 等待配额重置

- **时间**: 等待到 AEST 午夜（00:00）
- **验证**: 使用测试脚本 `node test-occupancy-api.js`
- **操作**: 在应用中使用 "Refresh Occupancy" 按钮

### 2. 申请更高配额（推荐）

发送邮件到 Transport NSW：

**收件人**: `OpenDataHelp@transport.nsw.gov.au`

**主题**: Request for Higher Quota - Carpark Occupancy Endpoint

**邮件内容**:
```
Dear Transport NSW Open Data Team,

I am developing a Park & Ride availability application that requires 
frequent access to the /v1/carpark/occupancy endpoint for real-time 
parking availability.

Current Situation:
- My API key can access /v1/carpark endpoint successfully
- However, /v1/carpark/occupancy endpoint returns 429 errors
- This prevents my application from displaying real-time occupancy data

Request:
1. Increase quota/rate limit specifically for /v1/carpark/occupancy endpoint
2. Clarify the specific limits for this endpoint (if different from general quota)
3. Provide guidance on best practices for using this endpoint

My API Key: [Your API Key]
Application: NSW Park & Ride Checker
Use Case: Real-time parking availability display for commuters
Expected Usage: [e.g., 100-500 requests per day]

Thank you for your assistance.

Best regards,
[Your Name]
```

### 3. 优化 API 使用

减少 API 调用频率：

1. **实现缓存**:
   - 缓存 occupancy 数据 5-10 分钟
   - 只在用户明确请求时刷新

2. **批量请求**:
   - 如果支持，批量获取多个停车场的 occupancy
   - 减少请求次数

3. **智能刷新**:
   - 只在用户需要时刷新
   - 避免自动轮询

4. **使用 WebSocket**（如果可用）:
   - 实时推送更新
   - 减少轮询请求

## 测试你的 API Key

运行测试脚本：

```bash
node test-occupancy-api.js
```

这会测试：
1. ✅ Carpark list endpoint（应该成功）
2. ⚠️ Occupancy endpoint（可能受限）

## 验证配额重置

在 AEST 午夜后：

1. **运行测试脚本**:
   ```bash
   node test-occupancy-api.js
   ```

2. **在应用中刷新**:
   - 点击 "Refresh Occupancy" 按钮
   - 查看是否成功获取数据

3. **检查控制台**:
   - 查看浏览器控制台日志
   - 应该看到 "✅ Successfully loaded occupancy data"

## 监控配额使用

Transport NSW **不提供**直接查询配额使用情况的方法。

建议：
1. **自行记录**: 跟踪你的 API 调用次数
2. **实现日志**: 记录每次 API 调用
3. **设置警报**: 当接近限制时提醒

## 相关资源

- **官方文档**: https://opendata.transport.nsw.gov.au/developers/api-basics
- **支持邮箱**: OpenDataHelp@transport.nsw.gov.au
- **论坛**: https://opendataforum.transport.nsw.gov.au/

## 总结

✅ **你的 API Key 是有效的** - 可以访问基础端点  
⚠️ **Occupancy 端点受限** - 这是配额限制，不是 key 问题  
💡 **解决方案** - 等待重置或申请更高配额

