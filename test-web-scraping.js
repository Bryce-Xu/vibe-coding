#!/usr/bin/env node

/**
 * 测试脚本：验证网页爬取功能
 * 
 * 注意：这个脚本需要在 Node.js 环境中运行，因为浏览器环境有 CORS 限制
 * 
 * 使用方法: node test-web-scraping.js
 */

import https from 'https';

console.log("🧪 Testing Web Scraping Functionality...\n");
console.log("📡 Fetching data from Transport NSW website...\n");

const url = 'https://transportnsw.info/travel-info/ways-to-get-around/drive/parking/transport-parkride-car-parks';

https.get(url, (res) => {
  let html = '';

  res.on('data', (chunk) => {
    html += chunk;
  });

  res.on('end', () => {
    console.log(`✅ Successfully fetched HTML (${html.length} bytes)\n`);
    
    // Parse HTML to extract carpark data
    const carparkData = {};
    
    // Pattern: Park&Ride - {Name} {number} spaces
    const patterns = [
      /Park&Ride\s*-\s*([^0-9]+?)\s+(\d+)\s+spaces/g,
      /Park&Ride\s*-\s*([^<]+?)\s+(\d+)\s+spaces/g,
      /"Park&Ride\s*-\s*([^"]+?)"\s*[^0-9]*(\d+)\s+spaces/g
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const name = match[1].trim();
        const spaces = parseInt(match[2], 10);
        const normalizedName = name.replace(/\s+/g, ' ').trim();
        
        if (!carparkData[normalizedName] || carparkData[normalizedName].spaces === 0) {
          carparkData[normalizedName] = {
            name: normalizedName,
            spaces
          };
        }
      }
    }

    const carparkCount = Object.keys(carparkData).length;
    
    if (carparkCount > 0) {
      console.log(`✅ Successfully extracted ${carparkCount} carparks\n`);
      console.log("📊 Sample data (first 10 carparks):\n");
      
      const entries = Object.entries(carparkData).slice(0, 10);
      entries.forEach(([name, data]) => {
        console.log(`  - ${data.name}: ${data.spaces} spaces available`);
      });
      
      if (carparkCount > 10) {
        console.log(`\n  ... and ${carparkCount - 10} more carparks`);
      }
      
      console.log("\n✅ Web scraping test passed!");
      console.log("\n💡 Note: In browser environment, you may need to use a proxy or backend service due to CORS restrictions.");
    } else {
      console.log("⚠️  No carpark data found in HTML.");
      console.log("   The page structure may have changed, or the regex patterns need updating.");
      console.log("\n🔍 Debug: Searching for 'Park&Ride' in HTML...");
      const parkRideMatches = html.match(/Park&Ride/gi);
      if (parkRideMatches) {
        console.log(`   Found ${parkRideMatches.length} occurrences of 'Park&Ride'`);
      } else {
        console.log("   No occurrences of 'Park&Ride' found");
      }
    }
  });
}).on('error', (error) => {
  console.error("❌ Error fetching webpage:", error.message);
  console.error("\n可能的原因:");
  console.error("1. 网络连接问题");
  console.error("2. 网站暂时不可用");
  console.error("3. SSL/TLS 证书问题");
  process.exit(1);
});

