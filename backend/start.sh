#!/bin/sh
set -e

echo "Running database migrations..."
npm run migrate:prod

echo "Starting server..."
echo "Node version: $(node --version)"
echo "Environment: ${NODE_ENV:-not set}"
echo "PORT: ${PORT:-not set}"
echo "DATABASE_URL: ${DATABASE_URL:+set (hidden)}"

echo "Executing: node dist/index.js"
exec node dist/index.js
