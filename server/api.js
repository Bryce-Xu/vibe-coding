/**
 * Express API server for scraping endpoints and GraphQL proxy
 * This runs alongside Vite dev server or as a separate process
 * In production, this also serves static files
 */

import express from 'express';
import { scrapeCarparkOccupancy } from './scraper.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Read PORT from environment variable (required by deployment platform)
// Koyeb sets PORT at runtime, so we must honor it
const PORT = parseInt(process.env.PORT || '8000', 10);
const SCRAPER_PORT = parseInt(process.env.SCRAPER_PORT || '3001', 10);
const BASE_PATH =
  process.env.BASE_PATH ||
  (process.env.SERVICE_NAME ? `/${process.env.SERVICE_NAME}` : '');

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

// Normalize base path so the app can run under sub-paths like /nsw-park-ride-checker
if (BASE_PATH && BASE_PATH !== '/') {
  app.use((req, _res, next) => {
    if (req.url.startsWith(BASE_PATH)) {
      req.url = req.url.slice(BASE_PATH.length) || '/';
    }
    next();
  });
}

// API routes (must be before static file serving)
// Health check endpoints (for deployment platform)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'nsw-park-ride-checker', timestamp: new Date().toISOString() });
});

app.get('/', (req, res, next) => {
  // If this is a health check or API request, handle it
  if (req.path === '/' && req.query.health) {
    return res.json({ status: 'ok', service: 'nsw-park-ride-checker' });
  }
  // Otherwise, let static file handler deal with it
  next();
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
  
  // Check if dist directory exists
  if (!fs.existsSync(distPath)) {
    console.error(`❌ Error: dist directory not found at ${distPath}`);
    console.error('   Make sure the application was built before starting the server.');
    process.exit(1);
  }
  
  // Check if index.html exists
  const indexHtmlPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    console.error(`❌ Error: index.html not found at ${indexHtmlPath}`);
    process.exit(1);
  }
  
  app.use(express.static(distPath));
  
  const serveIndex = (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(indexHtmlPath);
  };
  
  // Handle client-side routing - serve index.html for all non-API routes
  app.get(/.*/, serveIndex);
  
  console.log(`📁 Serving static files from ${distPath}`);
}

// Start server if run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('api.js') ||
                     process.argv[1]?.endsWith('server/api.js');

if (isMainModule) {
  const serverPort = isProduction ? PORT : SCRAPER_PORT;
  
  // Add error handling for server startup
  const server = app.listen(serverPort, '0.0.0.0', () => {
    if (isProduction) {
      console.log(`🚀 Server running on http://0.0.0.0:${serverPort}`);
      console.log(`   - Static files: http://0.0.0.0:${serverPort}`);
      console.log(`   - API endpoints: http://0.0.0.0:${serverPort}/api/*`);
      console.log(`   - Health check: http://0.0.0.0:${serverPort}/health`);
    } else {
      console.log(`🚀 Scraper API server running on http://0.0.0.0:${serverPort}`);
    }
  });
  
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${serverPort} is already in use`);
    } else {
      console.error(`❌ Server error:`, error);
    }
    process.exit(1);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('📴 SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
}

export default app;

