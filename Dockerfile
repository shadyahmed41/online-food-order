# Stage 1: Build NestJS Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy configuration and package files
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma

# Install dependencies
WORKDIR /app/backend
RUN npm install

# Copy backend source code
COPY backend/ ./

# Generate Prisma Client and build application
RUN npx prisma generate
RUN npm run build

# Stage 2: Production Run
FROM node:20-alpine

WORKDIR /app

# Copy built application and production dependencies from builder
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/backend/prisma ./backend/prisma

WORKDIR /app/backend

# Expose port 7860 (Hugging Face Spaces default container port)
EXPOSE 7860
ENV PORT=7860
ENV HOST=0.0.0.0

CMD ["node", "dist/main.js"]
