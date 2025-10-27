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

# Verify dist folder has content
RUN ls -la dist && echo "Dist folder contents verified"

# Expose port (Railway will provide PORT env var)
EXPOSE 3000

# Set default PORT if not provided
ENV PORT=3000

# Start serve with verbose output
CMD ["sh", "-c", "echo 'Starting serve on port' $PORT && serve -s dist -l $PORT"]
