# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install serve to serve static files
RUN npm install -g serve

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Expose port (Railway will provide PORT env var)
EXPOSE 3000

# Start serve (use PORT env var if provided, otherwise default to 3000)
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]
