# Multi-stage build for Vite + React app
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

# Production stage - serve static files
FROM node:20-alpine

WORKDIR /app

# Install serve to serve static files
RUN npm install -g serve

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Expose port (PORT will be set at runtime by Koyeb)
EXPOSE 8000

# Start application using PORT environment variable
# Use shell form (sh -c) to ensure environment variable expansion
CMD sh -c "serve -s dist -l ${PORT:-8000}"

