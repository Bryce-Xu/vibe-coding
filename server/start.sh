#!/bin/sh
set -e  # Exit on error

# In production, Express server handles both static files and API endpoints
# Set NODE_ENV to production to enable static file serving
export NODE_ENV=production

# Ensure PORT is set (required by deployment platform)
if [ -z "$PORT" ]; then
  export PORT=8000
fi

# Start Express server (handles both API and static files)
echo "🚀 Starting Express server (API + static files)..."
echo "   PORT: $PORT"
echo "   NODE_ENV: $NODE_ENV"
echo "   Working directory: $(pwd)"
echo "   Node version: $(node --version)"

# Check if server/api.js exists
if [ ! -f "server/api.js" ]; then
  echo "❌ Error: server/api.js not found!"
  echo "   Current directory: $(pwd)"
  echo "   Files in current directory:"
  ls -la
  exit 1
fi

# Start the server
exec node server/api.js

