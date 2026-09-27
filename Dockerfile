# Multi-Stage Dockerfile for Full-Stack St. Jude Hospital Queue System
# Node.js + Express + Vite React 19 SPA

# Step 1: Build Frontend and Dependencies
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* bun.lock* ./

# Install all dependencies (including devDependencies for build & typescript)
RUN npm install

# Copy source code
COPY . .

# Build the production React SPA to /app/dist
RUN npm run build

# Step 2: Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package.json ./
RUN npm install --omit=dev

# Copy built frontend assets and server files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Expose server port
EXPOSE 3000

# Run production server using tsx
CMD ["npx", "tsx", "server.ts"]
