#!/bin/sh
set -e

echo "🚀 Starting ChessSlack frontend..."
echo "PORT: ${PORT:-5173}"
echo "VITE_API_URL: ${VITE_API_URL:-not set}"
echo "VITE_WS_URL: ${VITE_WS_URL:-not set}"

echo "Starting Vite preview server..."
exec vite preview --port ${PORT:-5173} --host 0.0.0.0
