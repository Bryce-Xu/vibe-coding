/**
 * 地图性能测试脚本
 * 在浏览器控制台中运行此脚本来测试地图优化效果
 * 
 * 使用方法：
 * 1. 打开应用 http://localhost:3000
 * 2. 打开浏览器开发者工具 (F12)
 * 3. 切换到 Console 标签
 * 4. 复制粘贴此脚本并运行
 */

console.log('🗺️ 开始地图性能测试...\n');

// 测试地图瓦片加载性能
async function testMapPerformance() {
  const results = {
    tileLoadTimes: [],
    cacheHits: 0,
    errors: 0,
    totalTiles: 0
  };

  // 检测当前使用的地图源
  const mapContainer = document.querySelector('.leaflet-container');
  if (!mapContainer) {
    console.error('❌ 未找到地图容器');
    return;
  }

  // 监听瓦片加载事件
  const tiles = mapContainer.querySelectorAll('img.leaflet-tile');
  console.log(`📊 检测到 ${tiles.length} 个已加载的瓦片`);

  // 测试瓦片加载时间
  const testTiles = Array.from(tiles).slice(0, 10); // 测试前10个瓦片
  
  for (const tile of testTiles) {
    const startTime = performance.now();
    
    // 检查是否来自缓存
    const isCached = tile.complete && tile.naturalWidth > 0;
    
    if (isCached) {
      results.cacheHits++;
    }
    
    // 等待加载完成
    await new Promise((resolve) => {
      if (tile.complete) {
        resolve();
      } else {
        tile.onload = resolve;
        tile.onerror = resolve;
      }
    });
    
    const loadTime = performance.now() - startTime;
    results.tileLoadTimes.push(loadTime);
    results.totalTiles++;
  }

  // 计算统计数据
  const avgLoadTime = results.tileLoadTimes.reduce((a, b) => a + b, 0) / results.tileLoadTimes.length;
  const minLoadTime = Math.min(...results.tileLoadTimes);
  const maxLoadTime = Math.max(...results.tileLoadTimes);
  const cacheRate = (results.cacheHits / results.totalTiles) * 100;

  console.log('\n📈 性能测试结果:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 测试瓦片数量: ${results.totalTiles}`);
  console.log(`⚡ 平均加载时间: ${avgLoadTime.toFixed(2)}ms`);
  console.log(`🚀 最快加载时间: ${minLoadTime.toFixed(2)}ms`);
  console.log(`🐌 最慢加载时间: ${maxLoadTime.toFixed(2)}ms`);
  console.log(`💾 缓存命中率: ${cacheRate.toFixed(1)}%`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 性能评估
  if (avgLoadTime < 100) {
    console.log('🎉 优秀！地图加载速度很快');
  } else if (avgLoadTime < 300) {
    console.log('✅ 良好！地图加载速度正常');
  } else {
    console.log('⚠️ 较慢！建议检查网络连接或切换到其他地图源');
  }

  return results;
}

// 测试网络请求性能
async function testNetworkPerformance() {
  console.log('🌐 测试网络请求性能...\n');
  
  const mapSources = [
    {
      name: 'CartoDB Positron',
      url: 'https://a.basemaps.cartocdn.com/light_all/11/1024/682.png'
    },
    {
      name: 'OpenStreetMap',
      url: 'https://a.tile.openstreetmap.org/11/1024/682.png'
    }
  ];

  for (const source of mapSources) {
    const startTime = performance.now();
    try {
      const response = await fetch(source.url, { method: 'HEAD' });
      const loadTime = performance.now() - startTime;
      
      const status = response.status === 200 ? '✅' : '❌';
      const cacheStatus = response.headers.get('x-cache') || 
                         (response.status === 304 ? '缓存' : '未缓存');
      
      console.log(`${status} ${source.name}: ${loadTime.toFixed(2)}ms (${cacheStatus})`);
    } catch (error) {
      console.log(`❌ ${source.name}: 请求失败 - ${error.message}`);
    }
  }
  
  console.log('');
}

// 检查地图优化设置
function checkMapOptimizations() {
  console.log('🔍 检查地图优化设置...\n');
  
  const mapContainer = document.querySelector('.leaflet-container');
  if (!mapContainer) {
    console.error('❌ 未找到地图容器');
    return;
  }

  const checks = [
    {
      name: 'Canvas 渲染器',
      check: () => {
        const canvas = mapContainer.querySelector('canvas');
        return canvas !== null;
      }
    },
    {
      name: '地图源 (CartoDB)',
      check: () => {
        const tiles = mapContainer.querySelectorAll('img.leaflet-tile');
        if (tiles.length === 0) return false;
        const firstTile = tiles[0];
        return firstTile.src.includes('cartocdn.com');
      }
    },
    {
      name: '缩放级别限制',
      check: () => {
        // 检查地图是否设置了合理的缩放级别
        const map = window.L?.map?.getMap?.(mapContainer);
        if (!map) return null;
        return map.getMinZoom() >= 9 && map.getMaxZoom() <= 18;
      }
    }
  ];

  checks.forEach(({ name, check }) => {
    const result = check();
    const icon = result === true ? '✅' : result === false ? '❌' : '⚠️';
    const status = result === true ? '已启用' : result === false ? '未启用' : '无法检测';
    console.log(`${icon} ${name}: ${status}`);
  });
  
  console.log('');
}

// 运行所有测试
async function runAllTests() {
  console.log('═══════════════════════════════════════════');
  console.log('      🗺️  地图性能测试套件');
  console.log('═══════════════════════════════════════════\n');
  
  checkMapOptimizations();
  await testNetworkPerformance();
  await testMapPerformance();
  
  console.log('✅ 所有测试完成！');
}

// 自动运行测试
runAllTests();

// 导出函数供手动调用
window.testMapPerformance = testMapPerformance;
window.testNetworkPerformance = testNetworkPerformance;
window.checkMapOptimizations = checkMapOptimizations;
window.runAllTests = runAllTests;

console.log('\n💡 提示: 可以手动调用以下函数:');
console.log('  - testMapPerformance() - 测试地图瓦片加载');
console.log('  - testNetworkPerformance() - 测试网络请求');
console.log('  - checkMapOptimizations() - 检查优化设置');
console.log('  - runAllTests() - 运行所有测试\n');

