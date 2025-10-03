FROM node:22-alpine

WORKDIR /app

# Install Python and build tools for node-gyp (required by isolated-vm)
RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm install

COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Copy SQL migration files to dist directory
RUN mkdir -p dist/database/migrations && \
    cp -r src/database/migrations/*.sql dist/database/migrations/ 2>/dev/null || true

EXPOSE 3001

CMD ["sh", "-c", "npm run migrate:prod && npm start"]