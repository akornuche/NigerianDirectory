# ============================================
# Backend Dockerfile - Production Optimized
# Multi-stage build with minimal final image
# ============================================

# Stage 1: Dependencies
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps && \
    npm cache clean --force

# Stage 2: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Stage 3: Production Runtime
FROM node:18-alpine

WORKDIR /app

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built dependencies from stage 1
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules /app/node_modules

# Copy source code
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Expose port (adjust based on environment variable in production)
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
# Use node directly instead of npm start for better signal handling
CMD ["node", "server.js"]
