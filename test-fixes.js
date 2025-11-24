/**
 * Test script to verify all UI fixes
 * Run this in browser console after opening http://localhost:3000
 */

console.log('🧪 开始测试 UI 修复...\n');

// Test 1: Check if "(historical only)" is removed
function testHistoricalMarkerRemoval() {
  console.log('📋 Test 1: 检查 "(historical only)" 标记是否已移除');
  
  const carparks = window.__TEST_CARPARKS || [];
  const issues = [];
  
  carparks.forEach(carpark => {
    if (carpark.facility_name && 
        (carpark.facility_name.includes('(historical only)') || 
         carpark.facility_name.includes('(historical)'))) {
      issues.push(carpark.facility_name);
    }
  });
  
  if (issues.length === 0) {
    console.log('✅ 通过: 没有发现 "(historical only)" 标记');
  } else {
    console.log(`❌ 失败: 发现 ${issues.length} 个仍包含标记的停车场:`);
    issues.forEach(name => console.log(`   - ${name}`));
  }
  console.log('');
}

// Test 2: Check if timestamps are present
function testTimestamps() {
  console.log('⏰ Test 2: 检查时间戳是否显示');
  
  const carparks = window.__TEST_CARPARKS || [];
  const withData = carparks.filter(c => c.occupancy.total > 0);
  const withTimestamps = withData.filter(c => c.occupancy.time && c.occupancy.time.trim() !== '');
  
  console.log(`   总停车场数: ${carparks.length}`);
  console.log(`   有数据的停车场: ${withData.length}`);
  console.log(`   有时间戳的停车场: ${withTimestamps.length}`);
  
  if (withData.length > 0 && withTimestamps.length === withData.length) {
    console.log('✅ 通过: 所有有数据的停车场都有时间戳');
    console.log(`   示例时间戳: ${withTimestamps[0]?.occupancy.time}`);
  } else if (withTimestamps.length > 0) {
    console.log(`⚠️  部分通过: ${withTimestamps.length}/${withData.length} 有数据且有时间戳`);
  } else {
    console.log('❌ 失败: 没有找到时间戳');
  }
  console.log('');
}

// Test 3: Check coordinates
function testCoordinates() {
  console.log('📍 Test 3: 检查坐标是否正确');
  
  const carparks = window.__TEST_CARPARKS || [];
  const invalidCoords = carparks.filter(c => 
    c.latitude === '0' || 
    c.longitude === '0' || 
    c.latitude === '' || 
    c.longitude === ''
  );
  
  console.log(`   总停车场数: ${carparks.length}`);
  console.log(`   无效坐标数: ${invalidCoords.length}`);
  
  if (invalidCoords.length === 0) {
    console.log('✅ 通过: 所有停车场都有有效坐标');
  } else {
    console.log(`⚠️  警告: ${invalidCoords.length} 个停车场坐标无效:`);
    invalidCoords.slice(0, 5).forEach(c => {
      console.log(`   - ${c.facility_name}: lat=${c.latitude}, lng=${c.longitude}`);
    });
  }
  
  // Check if coordinates are in Sydney area
  const sydneyBounds = {
    minLat: -34.5,
    maxLat: -33.0,
    minLng: 150.0,
    maxLng: 152.0
  };
  
  const validCoords = carparks.filter(c => {
    const lat = parseFloat(c.latitude);
    const lng = parseFloat(c.longitude);
    return lat >= sydneyBounds.minLat && lat <= sydneyBounds.maxLat &&
           lng >= sydneyBounds.minLng && lng <= sydneyBounds.maxLng;
  });
  
  console.log(`   悉尼范围内的坐标: ${validCoords.length}/${carparks.length}`);
  console.log('');
}

// Test 4: Check data availability
function testDataAvailability() {
  console.log('📊 Test 4: 检查数据可用性');
  
  const carparks = window.__TEST_CARPARKS || [];
  const withData = carparks.filter(c => c.occupancy.total > 0);
  const withoutData = carparks.filter(c => c.occupancy.total === 0);
  
  console.log(`   总停车场数: ${carparks.length}`);
  console.log(`   有数据的停车场: ${withData.length} (${Math.round(withData.length/carparks.length*100)}%)`);
  console.log(`   无数据的停车场: ${withoutData.length} (${Math.round(withoutData.length/carparks.length*100)}%)`);
  
  if (withData.length > 0) {
    console.log('✅ 通过: 至少有一些停车场有数据');
    console.log(`   示例数据:`);
    withData.slice(0, 3).forEach(c => {
      console.log(`   - ${c.facility_name}: ${c.spots_free || 0}/${c.occupancy.total} 空闲`);
    });
  } else {
    console.log('❌ 失败: 没有停车场有数据');
  }
  console.log('');
}

// Test 5: Check UI elements
function testUIElements() {
  console.log('🎨 Test 5: 检查 UI 元素');
  
  // Check if detail card shows timestamp
  const detailCard = document.querySelector('[class*="DetailCard"]') || 
                     document.querySelector('[class*="detail"]');
  
  // Check for timestamp in list items
  const listItems = document.querySelectorAll('[class*="carpark"], [class*="parking"]');
  const itemsWithTime = Array.from(listItems).filter(item => {
    const text = item.textContent || '';
    return /\d{1,2}:\d{2}/.test(text); // Match time format HH:MM
  });
  
  console.log(`   列表项数量: ${listItems.length}`);
  console.log(`   显示时间戳的项: ${itemsWithTime.length}`);
  
  // Check for "historical" text in DOM
  const historicalElements = Array.from(document.querySelectorAll('*')).filter(el => {
    const text = el.textContent || '';
    return text.includes('(historical only)') || text.includes('(historical)');
  });
  
  if (historicalElements.length === 0) {
    console.log('✅ 通过: UI 中没有发现 "(historical only)" 文本');
  } else {
    console.log(`❌ 失败: 发现 ${historicalElements.length} 个元素仍包含 "(historical only)"`);
  }
  console.log('');
}

// Test 6: Test GraphQL API response
async function testGraphQLAPI() {
  console.log('🌐 Test 6: 测试 GraphQL API 响应');
  
  try {
    const response = await fetch('https://transportnsw.info/api/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'NSW-Park-Ride-Checker/1.0'
      },
      body: JSON.stringify({
        query: "query{result:widgets{pnrLocations{name spots occupancy}}}"
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const locations = data?.data?.result?.widgets?.pnrLocations || [];
    
    console.log(`   API 返回停车场数: ${locations.length}`);
    
    // Check for historical markers in API response
    const withHistorical = locations.filter(l => 
      l.name && (l.name.includes('(historical only)') || l.name.includes('(historical)'))
    );
    
    if (withHistorical.length > 0) {
      console.log(`⚠️  API 返回 ${withHistorical.length} 个包含 "(historical only)" 的停车场`);
      console.log(`   这些将在客户端被清理`);
    } else {
      console.log('✅ API 响应中没有 "(historical only)" 标记');
    }
    
    // Check data availability
    const withData = locations.filter(l => (l.spots || 0) + (l.occupancy || 0) > 0);
    console.log(`   有数据的停车场: ${withData.length}/${locations.length}`);
    
  } catch (error) {
    console.log(`❌ API 测试失败: ${error.message}`);
  }
  console.log('');
}

// Main test function
async function runAllTests() {
  console.log('═══════════════════════════════════════════');
  console.log('      🧪 UI 修复验证测试');
  console.log('═══════════════════════════════════════════\n');
  
  // Try to get carparks from React state (if accessible)
  // This is a workaround - in real scenario, we'd need to expose state
  try {
    // Check if we can access carparks from DOM or global state
    const appElement = document.querySelector('[data-testid="app"]') || document.body;
    
    // Try to find carpark data in the page
    const carparkNames = Array.from(document.querySelectorAll('h3, h4')).map(el => el.textContent).filter(Boolean);
    console.log(`📝 在页面中找到 ${carparkNames.length} 个可能的停车场名称\n`);
  } catch (error) {
    console.log('⚠️  无法从页面提取数据，将跳过部分测试\n');
  }
  
  testHistoricalMarkerRemoval();
  testTimestamps();
  testCoordinates();
  testDataAvailability();
  testUIElements();
  await testGraphQLAPI();
  
  console.log('═══════════════════════════════════════════');
  console.log('✅ 所有测试完成！');
  console.log('═══════════════════════════════════════════\n');
  
  console.log('💡 提示:');
  console.log('   - 刷新页面查看最新数据');
  console.log('   - 检查浏览器控制台是否有错误');
  console.log('   - 查看网络标签页确认 API 调用成功\n');
}

// Export for manual use
window.testUIFixes = runAllTests;
window.__TEST_HELPERS = {
  testHistoricalMarkerRemoval,
  testTimestamps,
  testCoordinates,
  testDataAvailability,
  testUIElements,
  testGraphQLAPI
};

// Auto-run if in browser
if (typeof window !== 'undefined') {
  runAllTests();
}

