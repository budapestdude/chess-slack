#!/bin/sh
set -e

echo "Running database migrations..."
npm run migrate:prod

echo "Starting server..."
node dist/index.js
