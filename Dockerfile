# 🐳 Multi-Stage Docker Build for Multi-Agent System
# Optimized for production deployment with security and performance

# ==================== BUILD STAGE ====================
FROM node:18-alpine AS builder

# Install security updates and build dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    python3 \
    make \
    g++ && \
    rm -rf /var/cache/apk/*

# Create app directory with proper permissions
WORKDIR /app
RUN chown -R node:node /app

# Switch to non-root user early
USER node

# Copy package files for better caching
COPY --chown=node:node package*.json ./

# Install dependencies with security audit
RUN npm ci --only=production && \
    npm audit --audit-level=moderate && \
    npm cache clean --force

# Copy application source code
COPY --chown=node:node . .

# Remove development files and sensitive information
RUN rm -rf tests/ docs/ .github/ .git/ *.md .gitignore

# ==================== PRODUCTION STAGE ====================
FROM node:18-alpine AS production

# Install security updates and runtime dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl && \
    rm -rf /var/cache/apk/*

# Create app directory and user
WORKDIR /app
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Copy from builder stage
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/src ./src
COPY --from=builder --chown=node:node /app/config ./config
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/package*.json ./

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose application port
EXPOSE 3000

# Configure production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV LOG_LEVEL=info

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "src/main.js"]

# ==================== METADATA ====================
LABEL maintainer="Multi-Agent System <agents@example.com>"
LABEL description="Production-ready multi-agent system with API and frontend"
LABEL version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/Nicolas6910/mini-test-agents"
LABEL org.opencontainers.image.documentation="https://github.com/Nicolas6910/mini-test-agents#readme"