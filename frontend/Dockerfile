# ============================================
# Frontend Dockerfile - Production Optimized
# Multi-stage build for minimal final image
# ============================================

# Stage 1: Dependencies
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

# Copy dependencies and source
COPY --from=dependencies /app/node_modules /app/node_modules
COPY . .

# Build application with required environment variables
ARG NEXT_PUBLIC_API_URL=http://localhost:5000/api
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

RUN npm run build

# Stage 3: Production Runtime
FROM node:18-alpine

WORKDIR /app

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built dependencies and application
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules /app/node_modules
COPY --from=builder --chown=nodejs:nodejs /app/public /app/public
COPY --from=builder --chown=nodejs:nodejs /app/.next /app/.next
COPY --from=builder --chown=nodejs:nodejs /app/next.config.js /app/
COPY --from=builder --chown=nodejs:nodejs /app/package.json /app/

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

# Start the application
CMD ["npm", "start"]
