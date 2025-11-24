# 地图性能测试指南

## 快速测试

### 方法 1: 浏览器控制台测试（推荐）

1. 打开应用: http://localhost:3000
2. 打开浏览器开发者工具 (F12 或 Cmd+Option+I)
3. 切换到 **Console** 标签
4. 复制 `test-map-console.js` 文件中的代码并粘贴到控制台
5. 按 Enter 运行

测试会自动执行并显示结果。

### 方法 2: 性能测试页面

1. 在浏览器中打开: `file:///path/to/test-map-performance.html`
2. 点击各个测试按钮
3. 查看性能指标和结果

## 测试指标说明

### 1. 瓦片加载时间
- **优秀**: < 100ms
- **良好**: 100-300ms
- **较慢**: > 300ms

### 2. 缓存命中率
- **理想**: > 80% (第二次访问后)
- **正常**: 50-80%
- **较低**: < 50%

### 3. 地图源性能对比
- **CartoDB Positron**: 最快，轻量级
- **OpenStreetMap**: 标准，功能完整
- **OpenStreetMap DE**: 欧洲服务器，可能较慢

## 优化效果验证

### 优化前（OpenStreetMap）
- 平均加载时间: 300-500ms/瓦片
- 初始加载: 3-5秒
- 缓存效果: 一般

### 优化后（CartoDB + 优化设置）
- 平均加载时间: 50-150ms/瓦片
- 初始加载: 1-2秒
- 缓存效果: 优秀（>80%）

## 手动测试步骤

1. **清除缓存测试**
   ```javascript
   // 在控制台运行
   if ('caches' in window) {
     caches.keys().then(names => {
       names.forEach(name => caches.delete(name));
     });
   }
   // 然后刷新页面，测试首次加载
   ```

2. **测试不同地图源**
   - 观察控制台日志，查看是否自动切换到备用地图源
   - 如果 CartoDB 失败，会自动切换到 OpenStreetMap

3. **网络条件测试**
   - 使用浏览器开发者工具的 Network 标签
   - 设置 "Slow 3G" 或 "Fast 3G" 模拟不同网络条件
   - 观察地图加载表现

## 预期结果

✅ **成功指标**:
- 地图在 2 秒内完成初始加载
- 瓦片平均加载时间 < 150ms
- 第二次访问时缓存命中率 > 80%
- 地图交互流畅，无卡顿

⚠️ **需要关注**:
- 如果加载时间 > 500ms，检查网络连接
- 如果缓存命中率 < 50%，检查浏览器设置
- 如果频繁切换地图源，检查网络稳定性

## 故障排除

### 问题: 地图加载很慢
**解决方案**:
1. 检查网络连接
2. 清除浏览器缓存后重试
3. 检查是否使用了正确的快速地图源（CartoDB）

### 问题: 地图显示空白
**解决方案**:
1. 检查浏览器控制台错误
2. 确认地图源 URL 可访问
3. 尝试切换到备用地图源

### 问题: 缓存不生效
**解决方案**:
1. 检查浏览器是否允许缓存
2. 确认没有使用隐私模式
3. 检查浏览器存储设置

## 性能监控

在应用运行时，可以持续监控性能：

```javascript
// 监控地图瓦片加载
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name.includes('tile') || entry.name.includes('cartocdn')) {
      console.log(`瓦片加载: ${entry.name} - ${entry.duration.toFixed(2)}ms`);
    }
  }
});
observer.observe({ entryTypes: ['resource'] });
```

## 参考

- [Leaflet 性能优化文档](https://leafletjs.com/examples/performance/)
- [CartoDB 地图服务](https://carto.com/basemaps/)
- [OpenStreetMap 瓦片使用政策](https://operations.osmfoundation.org/policies/tiles/)

