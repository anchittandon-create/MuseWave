# Multi-stage production Dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm ci --only=development

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Stage 2: Python dependencies
FROM python:3.11-slim AS python-builder

WORKDIR /app

# Install Python dependencies
COPY backend/python/requirements.txt ./
RUN pip install --no-cache-dir --target /python-deps -r requirements.txt

# Stage 3: Runtime
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    ffmpeg \
    fluidsynth \
    python3 \
    py3-pip \
    tini

WORKDIR /app

# Copy Node.js app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Copy Python dependencies
COPY --from=python-builder /python-deps /usr/local/lib/python3.11/site-packages
COPY backend/python ./python

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create directories for outputs
RUN mkdir -p /app/outputs /app/public /app/temp && \
    chown -R nodejs:nodejs /app

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health/live', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Expose port
EXPOSE 3000

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "dist/server.js"]
