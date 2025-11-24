# Multi-stage build for Vite + React app with scraper service
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application with environment variables
# Vite will use VITE_ prefixed env vars during build
# Koyeb injects env_vars as environment variables during build
# Note: Environment variables from env_vars will be available during build
ENV VITE_TFNSW_API_KEY=${VITE_TFNSW_API_KEY}

RUN npm run build

# Production stage - serve static files + scraper API
FROM node:20-alpine

WORKDIR /app

# Install dependencies for Puppeteer and runtime
# Note: Alpine Linux requires additional packages for Chromium
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install serve and production dependencies
RUN npm install -g serve

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy server files
COPY server ./server

# Expose port (single port as per deployment guidelines)
# PORT will be set by deployment platform
EXPOSE 8000

# Start server
# Express server handles both API and static files
CMD ["sh", "server/start.sh"]

