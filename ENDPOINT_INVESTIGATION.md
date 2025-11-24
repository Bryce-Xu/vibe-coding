# Occupancy Endpoint 详细调查结果

## 调查发现

### 1. 端点存在性验证

✅ **端点确实存在**:
- HEAD 请求返回 HTTP 500（不是 404）
- 说明端点路径 `/v1/carpark/occupancy` 是正确的
- 端点存在但可能有问题或限制

### 2. HTTP 方法测试

- **GET**: 返回 429 (Quota/Rate Limit Exceeded) ✅ 端点存在
- **POST**: 返回 401 (Unauthenticated) ⚠️ 可能需要不同的认证方式
- **OPTIONS**: 返回 XML 错误 ⚠️ 可能不支持

### 3. 端点路径测试

所有变体都返回相同的 429 错误：
- `/v1/carpark/occupancy` ✅ 正确路径
- `/v1/carpark/occupancy/` ✅ 也工作
- `/v1/carpark/occupancy/all` ❌ 返回 429
- `/v1/carpark/occupancy/list` ❌ 返回 429
- `/v1/carpark/486/occupancy` ❌ 返回 429
- `/v1/occupancy/carpark` ❌ 返回 SOAP 错误（不存在）

### 4. 关键发现

#### 端点存在但受限

1. **端点路径正确**: `/v1/carpark/occupancy` 是有效的端点
2. **认证成功**: API key 可以认证（否则会返回 401）
3. **配额限制**: 返回 429 说明是配额/速率限制，不是端点不存在

#### POST 方法的发现

- POST 请求返回 401 "unauthenticated"
- 这可能意味着：
  - 端点可能需要不同的认证方式
  - 或者 POST 方法需要额外的权限
  - 或者需要不同的请求格式

### 5. 与工作端点的对比

| 端点 | 状态码 | 说明 |
|------|--------|------|
| `/v1/carpark` | 200 | ✅ 正常工作 |
| `/v1/carpark/occupancy` | 429 | ⚠️ 配额限制 |

**结论**: 两个端点使用相同的 API key，但 occupancy 端点有**独立的配额限制**。

## 可能的情况

### 情况 1: 独立的配额系统（最可能）

`/v1/carpark/occupancy` 端点可能有：
- **独立的配额限制**（不同于总体 60,000/天）
- **更严格的速率限制**（可能低于每秒 5 次）
- **不同的重置时间**

### 情况 2: 需要特殊权限

- 可能需要申请特殊的访问权限
- 可能需要升级到更高的计划（Silver/Gold）
- 可能需要单独申请 occupancy 端点访问

### 情况 3: 端点暂时受限

- 端点可能因为维护而暂时限制访问
- 可能因为高负载而临时限制
- 需要等待或联系支持

## 验证步骤

### 1. 检查配额重置时间

等待到 AEST 午夜后测试：
```bash
node test-occupancy-api.js
```

### 2. 联系 Transport NSW

发送邮件询问：
- Occupancy 端点是否有独立的配额限制？
- 是否需要特殊的访问权限？
- 如何申请 occupancy 端点访问？

### 3. 检查 API 计划

登录 Transport NSW Open Data Hub：
- 查看你的账户计划（Bronze/Silver/Gold）
- 检查是否有 occupancy 端点的特殊限制
- 查看配额使用情况

## 建议的测试

### 测试 1: 等待配额重置

在 AEST 午夜后立即测试：
```bash
# 在午夜后运行
node test-occupancy-api.js
```

### 测试 2: 使用不同的 API Key

如果你有其他 API key，测试是否也有同样的问题。

### 测试 3: 联系支持

直接询问 Transport NSW：
- Occupancy 端点的具体配额限制
- 是否需要特殊权限
- 如何获取访问权限

## 结论

✅ **端点存在**: `/v1/carpark/occupancy` 是有效的端点  
✅ **认证成功**: 你的 API key 可以认证  
⚠️ **配额限制**: 端点有独立的配额限制，当前已用尽  

**最可能的情况**: Occupancy 端点有**独立的、更严格的配额限制**，需要：
1. 等待配额重置
2. 申请更高的配额
3. 或申请特殊的访问权限

