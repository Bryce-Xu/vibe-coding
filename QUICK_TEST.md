# 快速测试指南

## 在浏览器中测试修复

### 步骤 1: 打开应用
访问: http://localhost:3000

### 步骤 2: 打开浏览器控制台
- 按 `F12` 或 `Cmd+Option+I` (Mac)
- 切换到 **Console** 标签

### 步骤 3: 运行测试脚本
复制 `test-fixes.js` 文件的内容并粘贴到控制台，按 Enter 运行

或者直接运行以下命令：

```javascript
// 快速验证修复
async function quickTest() {
  console.log('🧪 快速测试修复...\n');
  
  // Test 1: 检查 GraphQL API
  try {
    const res = await fetch('https://transportnsw.info/api/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({query: "query{result:widgets{pnrLocations{name spots occupancy}}}"})
    });
    const data = await res.json();
    const locations = data?.data?.result?.widgets?.pnrLocations || [];
    
    console.log(`✅ API 返回 ${locations.length} 个停车场`);
    
    // 检查是否有 historical 标记
    const hasHistorical = locations.some(l => 
      l.name && (l.name.includes('(historical only)') || l.name.includes('(historical)'))
    );
    console.log(hasHistorical ? '❌ API 包含 historical 标记' : '✅ API 无 historical 标记');
    
    // 检查数据
    const withData = locations.filter(l => (l.spots || 0) + (l.occupancy || 0) > 0);
    console.log(`✅ ${withData.length}/${locations.length} 个停车场有数据\n`);
  } catch (e) {
    console.log(`❌ API 测试失败: ${e.message}\n`);
  }
  
  // Test 2: 检查页面中的 historical 标记
  const historicalText = Array.from(document.querySelectorAll('*'))
    .some(el => {
      const text = el.textContent || '';
      return text.includes('(historical only)') || text.includes('(historical)');
    });
  console.log(historicalText ? '❌ 页面中发现 historical 标记' : '✅ 页面中无 historical 标记');
  
  // Test 3: 检查时间戳显示
  const timeElements = Array.from(document.querySelectorAll('*'))
    .filter(el => {
      const text = el.textContent || '';
      return /\d{1,2}:\d{2}/.test(text); // Match HH:MM format
    });
  console.log(`✅ 找到 ${timeElements.length} 个可能的时间戳元素`);
  
  // Test 4: 检查坐标
  const mapMarkers = document.querySelectorAll('.leaflet-marker-icon, [class*="marker"]');
  console.log(`✅ 地图上显示 ${mapMarkers.length} 个标记`);
  
  console.log('\n✅ 测试完成！');
}

quickTest();
```

## 手动检查清单

### ✅ 修复 1: "(historical only)" 标记已移除
- [ ] 检查列表视图中的停车场名称
- [ ] 检查地图上的标记
- [ ] 检查详情卡片
- [ ] 检查最近位置覆盖层

**预期结果**: 所有位置都不应显示 "(historical only)" 或 "(historical)"

### ✅ 修复 2: Last Update 时间戳显示
- [ ] 打开一个有数据的停车场详情
- [ ] 检查 "Last Update" 字段
- [ ] 检查列表视图中的时间戳（如果有数据）

**预期结果**: 
- 有数据的停车场显示时间（格式: HH:MM，如 "14:30"）
- 无数据的停车场显示 "N/A"

### ✅ 修复 3: 坐标正确
- [ ] 检查地图上的标记位置
- [ ] 检查距离显示（不应是 15193.4km）
- [ ] 检查详情卡片中的导航功能

**预期结果**:
- 所有停车场都有有效坐标
- 距离显示合理（通常在几公里内）
- 地图标记位置正确

### ✅ 修复 4: 无数据情况处理
- [ ] 查看没有数据的停车场
- [ ] 检查显示的信息

**预期结果**:
- 显示 "No data" 或类似提示
- 区分支持实时数据的 Metro 站和其他位置
- 有清晰的视觉区分

## 预期行为

### 正常情况
1. **页面加载**: 
   - 显示所有停车场
   - 有数据的显示可用车位和时间戳
   - 无数据的显示 "No data"

2. **地图显示**:
   - 所有停车场都有标记
   - 标记颜色根据可用性变化（绿/橙/红）
   - 距离计算正确

3. **详情卡片**:
   - 显示停车场名称（无 historical 标记）
   - 显示容量和可用车位
   - 显示最后更新时间
   - 显示车站代码（如果有）

## 常见问题

### Q: 仍然看到 "(historical only)"
**A**: 刷新页面 (Ctrl+R 或 Cmd+R)，确保加载最新代码

### Q: 没有看到时间戳
**A**: 
- 确保停车场有数据（total > 0）
- 检查浏览器控制台是否有错误
- 确认 GraphQL API 调用成功

### Q: 距离显示不正确
**A**:
- 检查用户位置是否已获取
- 确认坐标映射文件包含该停车场
- 检查浏览器控制台是否有坐标相关错误

### Q: 地图不显示
**A**:
- 检查网络连接
- 查看浏览器控制台错误
- 确认地图源可访问

## 报告问题

如果发现问题，请提供：
1. 浏览器控制台错误信息
2. 网络请求详情（Network 标签）
3. 具体哪个功能不正常
4. 截图（如果有）

