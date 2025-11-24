/**
 * Express API server for scraping endpoints
 * This runs alongside Vite dev server or as a separate process
 */

import express from 'express';
import { scrapeCarparkOccupancy } from './scraper.js';

const app = express();
const PORT = process.env.SCRAPER_PORT || 3001;

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

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

// Start server if run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('api.js') ||
                     process.argv[1]?.endsWith('scraper-service/src/api.js');

if (isMainModule) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Scraper API server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;

