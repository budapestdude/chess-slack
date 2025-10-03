FROM node:22-alpine

WORKDIR /app

# Install Python and build tools for node-gyp (required by isolated-vm)
RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3001

CMD ["sh", "-c", "npm run migrate:prod && npm start"]