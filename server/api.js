/**
 * Express API server for scraping endpoints and GraphQL proxy
 * This runs alongside Vite dev server or as a separate process
 * In production, this also serves static files
 */

import express from 'express';
import { scrapeCarparkOccupancy } from './scraper.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;
const SCRAPER_PORT = process.env.SCRAPER_PORT || 3001;

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// API routes (must be before static file serving)
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'scraper-api' });
});

// Scrape carpark occupancy data
app.get('/api/scrape/carpark-occupancy', async (req, res) => {
  try {
    console.log('📥 Received scrape request');
    const data = await scrapeCarparkOccupancy();
    res.json(data);
  } catch (error) {
    console.error('❌ Scrape error:', error);
    res.status(500).json({ 
      error: 'Failed to scrape carpark data', 
      message: error.message 
    });
  }
});

// GraphQL proxy endpoint to avoid CORS issues in production
app.post('/api/graphql', async (req, res) => {
  try {
    console.log('📥 Received GraphQL proxy request');
    const graphqlUrl = 'https://transportnsw.info/api/graphql';
    
    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'NSW-Park-Ride-Checker/1.0'
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`❌ GraphQL API error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ 
        error: `GraphQL API error: ${response.status} ${response.statusText}`,
        details: errorText 
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('❌ GraphQL proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to proxy GraphQL request', 
      message: error.message 
    });
  }
});

// Serve static files in production (when PORT is set to main port)
// This must be after API routes
const isProduction = process.env.NODE_ENV === 'production' || process.env.PORT;
if (isProduction) {
  // Serve static files from dist directory
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  
  // Handle client-side routing - serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    // Skip API routes (shouldn't reach here for API routes, but just in case)
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
  
  console.log(`📁 Serving static files from ${distPath}`);
}

// Start server if run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('api.js') ||
                     process.argv[1]?.endsWith('server/api.js');

if (isMainModule) {
  const serverPort = isProduction ? PORT : SCRAPER_PORT;
  app.listen(serverPort, '0.0.0.0', () => {
    if (isProduction) {
      console.log(`🚀 Server running on http://0.0.0.0:${serverPort}`);
      console.log(`   - Static files: http://0.0.0.0:${serverPort}`);
      console.log(`   - API endpoints: http://0.0.0.0:${serverPort}/api/*`);
    } else {
      console.log(`🚀 Scraper API server running on http://0.0.0.0:${serverPort}`);
    }
  });
}

export default app;

