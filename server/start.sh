#!/bin/sh

# Start scraper API in background
echo "🚀 Starting scraper API server..."
node server/api.js &
SCRAPER_PID=$!

# Wait a moment for scraper to start
sleep 2

# Start static file server
echo "🚀 Starting static file server..."
exec serve -s dist -l ${PORT:-8000}

# Cleanup on exit
trap "kill $SCRAPER_PID" EXIT

