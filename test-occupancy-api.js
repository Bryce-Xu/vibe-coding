#!/usr/bin/env node

/**
 * 测试脚本：验证 Transport NSW Occupancy API 访问
 * 使用方法: node test-occupancy-api.js
 */

const API_KEY = process.env.VITE_TFNSW_API_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJXTmFZVG1xNDlXUEdVQzBEYlVLcEpGRkNoY09mMk9pUzY5c0hfeTBOMW9FIiwiaWF0IjoxNzYzOTYyMDEyfQ.LdAIkdBLyjwTEECvBsEQ2VMgHcbc54BzDoymVUftAHY";
const OCCUPANCY_URL = "https://api.transport.nsw.gov.au/v1/carpark/occupancy";
const CARPARK_URL = "https://api.transport.nsw.gov.au/v1/carpark";

console.log("🔍 Testing Transport NSW API Access...\n");
console.log("=" .repeat(60));

// Test 1: Check carpark list endpoint
console.log("\n📋 Test 1: Carpark List Endpoint");
console.log("-".repeat(60));

fetch(CARPARK_URL, {
  method: 'GET',
  headers: {
    'Authorization': `apikey ${API_KEY}`,
    'Accept': 'application/json'
  }
})
.then(response => {
  console.log(`Status: ${response.status} ${response.statusText}`);
  if (response.ok) {
    return response.json().then(data => {
      const count = typeof data === 'object' ? Object.keys(data).length : (Array.isArray(data) ? data.length : 0);
      console.log(`✅ SUCCESS: Found ${count} carparks`);
      return true;
    });
  } else {
    return response.text().then(text => {
      console.log(`❌ FAILED: ${text.substring(0, 200)}`);
      return false;
    });
  }
})
.then(carparkSuccess => {
  // Test 2: Check occupancy endpoint
  console.log("\n📊 Test 2: Occupancy Endpoint");
  console.log("-".repeat(60));
  
  return fetch(OCCUPANCY_URL, {
    method: 'GET',
    headers: {
      'Authorization': `apikey ${API_KEY}`,
      'Accept': 'application/json'
    }
  })
  .then(response => {
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 429) {
      console.log("⚠️  RATE LIMIT EXCEEDED (429)");
      console.log("\n📝 Rate Limit Information:");
      console.log("   - Default Bronze Plan: 60,000 calls/day");
      console.log("   - Rate limit: 5 requests/second");
      console.log("   - Quota resets at AEST midnight");
      console.log("\n💡 The occupancy endpoint may have stricter limits");
      console.log("   Contact: OpenDataHelp@transport.nsw.gov.au");
      return false;
    }
    
    if (!response.ok) {
      return response.text().then(text => {
        try {
          const error = JSON.parse(text);
          if (error.ErrorDetails) {
            console.log(`❌ ERROR: ${error.ErrorDetails.Message}`);
            console.log(`   Transaction ID: ${error.ErrorDetails.TransactionId}`);
            console.log(`   Error Time: ${error.ErrorDetails.ErrorDateTime}`);
          } else {
            console.log(`❌ FAILED: ${text.substring(0, 200)}`);
          }
        } catch {
          console.log(`❌ FAILED: ${text.substring(0, 200)}`);
        }
        return false;
      });
    }
    
    return response.json().then(data => {
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        const count = Object.keys(data).length;
        console.log(`✅ SUCCESS: Found occupancy data for ${count} carparks`);
        console.log("\n📊 Sample data (first entry):");
        const firstKey = Object.keys(data)[0];
        console.log(JSON.stringify({ [firstKey]: data[firstKey] }, null, 2));
        return true;
      } else {
        console.log("⚠️  Empty response (no occupancy data)");
        return false;
      }
    });
  })
  .then(occupancySuccess => {
    console.log("\n" + "=".repeat(60));
    console.log("\n📊 Test Summary:");
    console.log(`   Carpark List: ${carparkSuccess ? '✅ Working' : '❌ Failed'}`);
    console.log(`   Occupancy Data: ${occupancySuccess ? '✅ Working' : '❌ Failed'}`);
    
    if (carparkSuccess && !occupancySuccess) {
      console.log("\n💡 Analysis:");
      console.log("   - Your API key CAN access the API");
      console.log("   - The occupancy endpoint has quota/rate limits");
      console.log("   - This is normal for free tier accounts");
      console.log("\n🔧 Solutions:");
      console.log("   1. Wait for quota reset (AEST midnight)");
      console.log("   2. Request higher quota: OpenDataHelp@transport.nsw.gov.au");
      console.log("   3. Implement caching to reduce API calls");
    } else if (carparkSuccess && occupancySuccess) {
      console.log("\n🎉 Great! Your API key can access occupancy data!");
    }
  });
})
.catch(error => {
  console.error("\n❌ Network Error:", error.message);
  console.error("\nPossible causes:");
  console.error("1. Network connection issue");
  console.error("2. API server temporarily unavailable");
  console.error("3. CORS issue (if running in browser)");
});

