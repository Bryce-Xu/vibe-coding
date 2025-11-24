# 如何获取实时 Occupancy 数据

## 当前情况

Transport NSW API 的 `/v1/carpark/occupancy` 端点存在**配额限制**。当配额用尽时，会返回错误：
```
Your API quota or rate limit has been exceeded.
```

## 解决方案

### 1. 自动获取（已实现）

应用会在加载停车场列表时**自动尝试**获取 occupancy 数据：

- ✅ **成功**: 如果配额可用，会自动加载并显示实时占用数据
- ⚠️ **失败**: 如果配额用尽，会显示停车场列表（不带占用数据）

### 2. 手动刷新（已实现）

如果初始加载时 occupancy 数据不可用，你可以：

1. **点击 "Refresh Occupancy" 按钮**
   - 位于页面顶部的蓝色提示框中
   - 会重新尝试获取 occupancy 数据
   - 如果配额已重置，可以成功获取

2. **等待配额重置**
   - API 配额通常会定期重置（例如每小时或每天）
   - 等待一段时间后再次尝试

### 3. 申请更高配额（推荐）

联系 Transport NSW 申请更高的配额限制：

- **Email**: `OpenDataHelp@transport.nsw.gov.au`
- **说明**: 请求增加 `/v1/carpark/occupancy` 端点的配额或速率限制
- **理由**: 你的应用需要实时显示停车位占用数据

## 技术实现

### 重试机制

代码已实现智能重试：

- **自动重试**: 如果遇到配额错误，会等待 2 秒后重试（最多 2 次）
- **网络错误重试**: 如果是网络错误，也会自动重试

### 数据合并

当成功获取 occupancy 数据后：

1. 数据会与停车场列表合并
2. 每个停车场会显示：
   - 总停车位数 (`total`)
   - 已占用停车位数 (`occupied`)
   - 可用停车位数 (`spots_free`)

## 验证 Occupancy 数据

### 检查数据是否加载成功

1. **打开浏览器控制台** (F12)
2. **查看日志**:
   - ✅ `✅ Successfully loaded occupancy data for X carparks` - 成功
   - ⚠️ `⚠️ Occupancy API quota exceeded` - 配额用尽
   - ℹ️ `ℹ️ Occupancy data not available` - 数据不可用

3. **检查 UI**:
   - 如果看到停车位数显示（例如 "150 Free"），说明数据已加载
   - 如果只显示停车场名称，说明 occupancy 数据不可用

### 测试 API 端点

可以直接测试 occupancy 端点：

```bash
# 通过代理（开发环境）
curl http://localhost:3000/api/tfnsw/v1/carpark/occupancy

# 直接调用（需要 API key）
curl -H "Authorization: apikey YOUR_API_KEY" \
     https://api.transport.nsw.gov.au/v1/carpark/occupancy
```

## 配额管理建议

1. **减少请求频率**:
   - 不要过于频繁地刷新 occupancy 数据
   - 考虑实现客户端缓存（例如缓存 5-10 分钟）

2. **按需获取**:
   - 只在用户需要时获取 occupancy 数据
   - 使用手动刷新按钮而不是自动轮询

3. **申请更高配额**:
   - 如果应用需要频繁更新，联系 Transport NSW 申请更高配额

## 当前限制

- **配额限制**: 每个 API key 有请求次数限制
- **速率限制**: 可能有每秒/每分钟的请求限制
- **数据格式**: occupancy 端点返回的数据格式可能与预期不同

## 未来改进

1. **实现缓存**: 缓存 occupancy 数据以减少 API 调用
2. **批量获取**: 如果支持，按 facility_id 批量获取
3. **WebSocket**: 如果 API 支持，使用 WebSocket 获取实时更新
4. **备用数据源**: 考虑使用其他数据源作为备用

## 相关文件

- `services/tfnswService.ts` - API 调用逻辑
- `App.tsx` - UI 和手动刷新功能
- `API_DOCUMENTATION.md` - API 端点文档

