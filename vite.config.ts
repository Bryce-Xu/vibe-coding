import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          // Proxy scraper API requests to local backend service
          '/api/scrape': {
            target: `http://localhost:${process.env.SCRAPER_PORT || 3001}`,
            changeOrigin: true,
          },
          // Proxy GraphQL API requests to avoid CORS issues in development
          '/api/graphql': {
            target: 'https://transportnsw.info',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/graphql/, '/api/graphql'),
            configure: (proxy, _options) => {
              proxy.on('proxyReq', (proxyReq, req, _res) => {
                proxyReq.setHeader('content-type', 'application/json');
                proxyReq.setHeader('user-agent', 'NSW-Park-Ride-Checker/1.0');
              });
            },
          },
          // Proxy API requests to avoid CORS issues in development
          '/api/tfnsw': {
            target: 'https://api.transport.nsw.gov.au',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/tfnsw/, ''),
            configure: (proxy, _options) => {
              proxy.on('proxyReq', (proxyReq, req, _res) => {
                // Add API key from environment variable
                const apiKey = env.VITE_TFNSW_API_KEY;
                if (apiKey) {
                  proxyReq.setHeader('Authorization', `apikey ${apiKey}`);
                }
                proxyReq.setHeader('Accept', 'application/json');
              });
            },
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
