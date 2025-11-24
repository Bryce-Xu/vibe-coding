# Occupancy 数据不可用 - 故障排除指南

## 当前状态

你看到 "Real-time occupancy data unavailable. Click to refresh." 提示，说明：

✅ **停车场列表已成功加载** - 基础数据正常  
⚠️ **Occupancy 数据不可用** - 实时占用数据无法获取

## 可能的原因

### 1. API 配额限制（最常见）

Transport NSW API 对 `/v1/carpark/occupancy` 端点有配额限制：

- **症状**: 返回 "Your API quota or rate limit has been exceeded"
- **原因**: 免费 API key 的配额较低
- **解决**: 
  - 等待配额重置（通常每小时或每天）
  - 点击 "Refresh Occupancy" 按钮重试
  - 申请更高配额（见下方）

### 2. 网络问题

- **症状**: 网络错误或超时
- **解决**: 检查网络连接，刷新页面

### 3. API 服务暂时不可用

- **症状**: 500 错误或服务不可用
- **解决**: 等待一段时间后重试

## 解决方案

### 方案 1: 等待并重试（最简单）

1. **等待 10-30 分钟**让配额重置
2. **点击 "Refresh Occupancy" 按钮**
3. 如果成功，会看到停车位数显示

### 方案 2: 申请更高配额（推荐用于生产环境）

发送邮件到 Transport NSW：

**收件人**: `OpenDataHelp@transport.nsw.gov.au`

**主题**: Request for Higher API Quota - Carpark Occupancy Endpoint

**邮件内容**:
```
Dear Transport NSW Open Data Team,

I am developing a Park & Ride availability application that requires 
real-time occupancy data from the /v1/carpark/occupancy endpoint.

Currently, I am experiencing quota limitations that prevent my 
application from displaying real-time parking availability to users.

Could you please:
1. Increase the quota/rate limit for the carpark/occupancy endpoint
2. Provide information about the current quota limits
3. Suggest best practices for using this endpoint

My API Key: [Your API Key]
Application: NSW Park & Ride Checker
Use Case: Real-time parking availability display for commuters

Thank you for your assistance.

Best regards,
[Your Name]
```

### 方案 3: 实现缓存机制（技术方案）

减少 API 调用频率：

1. **客户端缓存**: 缓存 occupancy 数据 5-10 分钟
2. **批量更新**: 只在用户需要时更新
3. **智能刷新**: 根据数据重要性选择性更新

### 方案 4: 使用备用数据源

如果可能，考虑：

1. **其他 API**: 查找是否有其他数据源
2. **静态数据**: 使用历史数据作为参考
3. **用户报告**: 允许用户报告可用停车位

## 验证步骤

### 检查配额状态

在浏览器控制台（F12）运行：

```javascript
// 测试 occupancy 端点
fetch('/api/tfnsw/v1/carpark/occupancy', {
  headers: { 'Accept': 'application/json' }
})
.then(r => r.json())
.then(data => {
  if (data.ErrorDetails) {
    console.log('错误:', data.ErrorDetails.Message);
  } else {
    console.log('成功! 数据:', Object.keys(data).length, '个停车场');
  }
})
.catch(err => console.error('网络错误:', err));
```

### 检查日志

查看浏览器控制台：

- ✅ `✅ Successfully loaded occupancy data` - 成功
- ⚠️ `⚠️ Occupancy API quota exceeded` - 配额用尽
- ⚠️ `⚠️ Failed to fetch occupancy data` - 其他错误

## 当前功能

即使 occupancy 数据不可用，应用仍然：

✅ **显示所有停车场列表**  
✅ **支持搜索和筛选**  
✅ **显示地图视图**  
✅ **显示列表视图**  
✅ **支持排序**  

只是不显示实时的停车位数。

## 最佳实践

1. **不要频繁刷新**: 避免过于频繁地点击 "Refresh Occupancy"
2. **监控配额**: 记录 API 调用次数
3. **优雅降级**: 应用已实现，即使没有 occupancy 数据也能正常工作
4. **用户提示**: 清楚告知用户数据状态

## 联系支持

如果问题持续存在：

- **Transport NSW**: OpenDataHelp@transport.nsw.gov.au
- **API 文档**: https://opendata.transport.nsw.gov.au/
- **GitHub Issues**: 如果是代码问题，可以在项目仓库创建 issue

## 临时解决方案

在等待配额重置期间，你可以：

1. **使用停车场列表**: 虽然看不到实时占用，但可以看到所有可用位置
2. **手动检查**: 访问 Transport NSW 网站查看特定停车场
3. **计划访问**: 使用列表规划你的行程

---

**提示**: 配额通常会在固定时间重置（例如每小时整点或每天午夜）。建议在配额重置后立即尝试获取数据。

