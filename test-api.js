#!/usr/bin/env node

/**
 * 测试脚本：验证 Transport NSW API 调用
 * 使用方法: node test-api.js
 */

const API_KEY = process.env.VITE_TFNSW_API_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJXTmFZVG1xNDlXUEdVQzBEYlVLcEpGRkNoY09mMk9pUzY5c0hfeTBOMW9FIiwiaWF0IjoxNzYzOTYyMDEyfQ.LdAIkdBLyjwTEECvBsEQ2VMgHcbc54BzDoymVUftAHY";
const API_URL = "https://api.transport.nsw.gov.au/v1/carpark";

console.log("🧪 Testing Transport NSW API...\n");
console.log(`API URL: ${API_URL}`);
console.log(`API Key: ${API_KEY.substring(0, 20)}...\n`);

fetch(API_URL, {
  method: 'GET',
  headers: {
    'Authorization': `apikey ${API_KEY}`,
    'Accept': 'application/json'
  }
})
.then(response => {
  console.log(`📡 Response Status: ${response.status} ${response.statusText}`);
  
  if (!response.ok) {
    return response.text().then(text => {
      console.error(`❌ API Error: ${text}`);
      process.exit(1);
    });
  }
  
  return response.json();
})
.then(data => {
  console.log("✅ API Call Successful!\n");
  
  // 检查数据结构
  if (Array.isArray(data)) {
    console.log(`📊 Found ${data.length} carparks`);
    if (data.length > 0) {
      console.log("\n示例数据（第一个）:");
      console.log(JSON.stringify(data[0], null, 2));
    }
  } else if (typeof data === 'object' && data !== null) {
    const keys = Object.keys(data);
    console.log(`📊 Found ${keys.length} carparks (object format)`);
    if (keys.length > 0) {
      console.log("\n示例数据（第一个）:");
      console.log(JSON.stringify(data[keys[0]], null, 2));
    }
  } else {
    console.log("⚠️  Unexpected data format:", typeof data);
    console.log(JSON.stringify(data, null, 2));
  }
  
  console.log("\n✅ API 测试通过！应用应该能够正常使用真实数据。");
})
.catch(error => {
  console.error("❌ Network Error:", error.message);
  console.error("\n可能的原因:");
  console.error("1. 网络连接问题");
  console.error("2. API key 无效或过期");
  console.error("3. API 服务器暂时不可用");
  process.exit(1);
});

