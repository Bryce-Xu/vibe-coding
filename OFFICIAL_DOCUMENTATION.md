# Transport NSW Car Park API 官方文档信息

## 来源

[Transport NSW Open Data Hub - Car Park API](https://opendata.transport.nsw.gov.au/dataset/car-park-api)

## 关键信息

### API 功能

> "The Car Park API provides real time and historical occupancy of selected car parks. This API provides the occupancy for Transport Park&Ride car parks."

### 实时占用数据可用性

⚠️ **重要限制**: 目前只有**特定的 Sydney Metro 站点**报告实时占用数据：

1. **Tallawong**
2. **Bella Vista**
3. **Hills Showground**
4. **Cherrybrook**
5. **Kellyville**

> "The Sydney Metro stations for Tallawong, Bella Vista, Hills Showground, Cherrybrook and Kellyville are reporting real time occupancy levels."

### 未来计划

> "It is intended other car park occupancy data will be enabled via this API in the future."

这意味着：
- 其他停车场**目前没有**实时占用数据
- 只有上述 5 个 Metro 站点有实时数据
- 未来可能会添加更多站点

## 对应用的影响

### 当前情况

1. **停车场列表**: 可以获取所有停车场（43+ 个）
2. **实时占用数据**: 只有 5 个 Metro 站点有数据
3. **其他停车场**: 没有实时占用数据（这是 API 的限制，不是配额问题）

### 这意味着什么

- ✅ 你的 API key **可以**访问 occupancy 端点
- ⚠️ 但只有**5 个特定站点**有实时数据
- ⚠️ 其他 38+ 个停车场**没有**实时占用数据（API 本身不支持）

## 解决方案

### 1. 更新应用以处理部分数据

修改应用逻辑：
- 显示所有停车场列表
- 只对 5 个 Metro 站点显示实时占用数据
- 其他站点显示 "Data not available" 或类似提示

### 2. 识别 Metro 站点

需要识别这 5 个站点的 facility_id：
- Tallawong
- Bella Vista
- Hills Showground
- Cherrybrook
- Kellyville

### 3. 优化用户体验

- 明确标注哪些站点有实时数据
- 对其他站点提供其他信息（位置、名称等）
- 等待 API 添加更多站点的数据

## 验证步骤

1. **检查停车场列表**中是否包含这 5 个 Metro 站点
2. **测试 occupancy 端点**是否返回这 5 个站点的数据
3. **更新应用**以正确处理部分数据的情况

## 相关资源

- **官方页面**: https://opendata.transport.nsw.gov.au/dataset/car-park-api
- **API 文档**: 需要登录下载 "Car Park API Documentation"
- **最后更新**: September 2, 2025
- **维护者**: TfNSW Open Data Hub and Developer Portal
- **联系邮箱**: opendataprogram@transport.nsw.gov.au

## 重要发现

根据官方文档，**429 错误可能不是配额问题**，而是：

1. **数据可用性限制**: 只有 5 个站点有实时数据
2. **端点行为**: occupancy 端点可能只返回有数据的站点
3. **配额限制**: 仍然可能存在，但主要限制是数据可用性

## 下一步

1. ✅ 确认这 5 个 Metro 站点在停车场列表中
2. ✅ 测试 occupancy 端点是否返回这 5 个站点的数据
3. ✅ 更新应用以正确处理部分数据的情况
4. ✅ 添加 UI 提示，说明哪些站点有实时数据

