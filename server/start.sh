#!/bin/sh

# In production, Express server handles both static files and API endpoints
# Set NODE_ENV to production to enable static file serving
export NODE_ENV=production

# Start Express server (handles both API and static files)
echo "🚀 Starting Express server (API + static files)..."
exec node server/api.js

