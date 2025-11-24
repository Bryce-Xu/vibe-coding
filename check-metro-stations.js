#!/usr/bin/env node

// 检查 Metro 站点是否在停车场列表中

import https from 'https';

const API_KEY = process.env.VITE_TFNSW_API_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJXTmFZVG1xNDlXUEdVQzBEYlVLcEpGRkNoY09mMk9pUzY5c0hfeTBOMW9FIiwiaWF0IjoxNzYzOTYyMDEyfQ.LdAIkdBLyjwTEECvBsEQ2VMgHcbc54BzDoymVUftAHY";

const metroStations = {
  'Tallawong': ['tallawong', 'tall'],
  'Bella Vista': ['bella vista', 'bella'],
  'Hills Showground': ['hills showground', 'showground'],
  'Cherrybrook': ['cherrybrook', 'cherry'],
  'Kellyville': ['kellyville', 'kelly']
};

const options = {
  hostname: 'api.transport.nsw.gov.au',
  path: '/v1/carpark',
  method: 'GET',
  headers: {
    'Authorization': `apikey ${API_KEY}`,
    'Accept': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const carparks = JSON.parse(data);
      
      console.log('🔍 Checking Metro Stations with Real-time Occupancy Data');
      console.log('='.repeat(60));
      console.log(`\nTotal carparks: ${Object.keys(carparks).length}\n`);
      
      const found = {};
      
      for (const [station, keywords] of Object.entries(metroStations)) {
        const matches = [];
        for (const [facilityId, facilityName] of Object.entries(carparks)) {
          const nameLower = String(facilityName).toLowerCase();
          if (keywords.some(kw => nameLower.includes(kw))) {
            matches.push({ id: facilityId, name: facilityName });
          }
        }
        
        if (matches.length > 0) {
          found[station] = matches;
          console.log(`✅ ${station}:`);
          matches.forEach(m => {
            console.log(`   ID: ${m.id} - ${m.name}`);
          });
        } else {
          console.log(`❌ ${station}: Not found`);
        }
      }
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`\nSummary:`);
      console.log(`  Metro stations found: ${Object.keys(found).length}/5`);
      console.log(`  Total carparks: ${Object.keys(carparks).length}`);
      
      if (Object.keys(found).length === 5) {
        console.log(`\n✅ All 5 Metro stations are in the list!`);
        console.log(`\n💡 These stations should have real-time occupancy data`);
        console.log(`   when the quota resets or higher quota is granted.`);
      }
      
    } catch (error) {
      console.error('Error parsing response:', error);
      console.log('Raw response:', data.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.end();

