# Transport NSW API 集成文档

## API 端点

### 1. 停车场列表端点
- **URL**: `https://api.transport.nsw.gov.au/v1/carpark`
- **方法**: `GET`
- **认证**: `Authorization: apikey <YOUR_API_KEY>`
- **返回格式**: 
  ```json
  {
    "486": "Park&Ride - Ashfield",
    "487": "Park&Ride - Kogarah",
    ...
  }
  ```
- **说明**: 返回所有可用的停车场，格式为 `{ facility_id: facility_name }`

### 2. 实时占用率端点
- **URL**: `https://api.transport.nsw.gov.au/v1/carpark/occupancy`
- **方法**: `GET`
- **认证**: `Authorization: apikey <YOUR_API_KEY>`
- **返回格式**: 包含每个停车场的实时占用数据
- **限制**: 
  - 此端点可能有**配额限制**或**速率限制**
  - 如果超出限制，会返回 429 错误或配额超限消息
  - 建议：实现优雅降级，在配额限制时仍显示停车场列表

## 当前实现

### 数据获取策略

1. **主要数据源**: `/v1/carpark` 端点
   - 始终尝试获取停车场列表
   - 这是主要数据源，通常不会有限制

2. **增强数据**: `/v1/carpark/occupancy` 端点
   - 尝试获取实时占用率数据
   - 如果失败（配额限制），应用会优雅降级
   - 仍显示停车场列表，但没有实时占用数据

### 错误处理

- **配额限制**: 如果 occupancy 端点返回配额错误，应用会：
  - 记录警告日志
  - 继续显示停车场列表（不带占用数据）
  - 显示友好的提示信息

- **网络错误**: 如果 API 调用失败：
  - 显示错误消息
  - 不显示任何数据（已移除 mock 数据回退）

## 数据格式

### 停车场对象结构
```typescript
interface Carpark {
  facility_id: string;      // 停车场 ID
  facility_name: string;     // 停车场名称
  latitude: string;          // 纬度（可能需要从其他来源获取）
  longitude: string;         // 经度（可能需要从其他来源获取）
  tsn: string;               // 车站代码（可能需要从名称中提取）
  park_id: string;           // 停车场 ID（通常与 facility_id 相同）
  zones: any[];              // 区域信息
  occupancy: {
    loop: string;            // 循环标识
    total: number;           // 总停车位数
    occupied: number;        // 已占用停车位数
    month: string;           // 月份
    time: string;            // 时间
  };
  spots_free?: number;       // 可用停车位数（计算得出）
}
```

## 已知限制

1. **坐标数据**: `/v1/carpark` 端点不返回坐标信息
   - 当前设置为 "0"
   - 可能需要：
     - 使用地理编码服务根据名称获取坐标
     - 或从其他数据源获取坐标

2. **车站代码 (TSN)**: 不包含在基础数据中
   - 可能需要从停车场名称中提取
   - 或从其他端点获取

3. **实时占用数据**: 
   - 受配额限制
   - 可能需要申请更高的配额限制
   - 或实现缓存机制以减少 API 调用

## 改进建议

1. **地理编码**: 集成地理编码服务（如 Google Geocoding API）来获取坐标
2. **数据缓存**: 实现客户端缓存以减少 API 调用
3. **配额管理**: 联系 Transport NSW 申请更高的配额限制
4. **备用数据源**: 考虑使用其他数据源作为备用

## API 配额申请

如果遇到配额限制，可以联系：
- **Email**: OpenDataHelp@transport.nsw.gov.au
- **说明**: 请求增加配额或速率限制

## 参考资源

- Transport NSW Open Data Portal: https://opendata.transport.nsw.gov.au/
- API 文档: 请访问 Transport NSW 开放数据门户获取最新文档

