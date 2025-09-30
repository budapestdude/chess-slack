#!/bin/bash

# Test Database Setup Script for ChessSlack Backend
# This script creates and initializes the test database

set -e  # Exit on error

echo "🔧 ChessSlack Test Database Setup"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database name
DB_NAME="chessslack_test"
DB_USER="${POSTGRES_USER:-postgres}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

# Check if PostgreSQL is running
echo "1. Checking PostgreSQL connection..."
if psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} PostgreSQL is running"
else
    echo -e "${RED}✗${NC} PostgreSQL is not running or not accessible"
    echo ""
    echo "Please start PostgreSQL first:"
    echo "  macOS (Homebrew):   brew services start postgresql"
    echo "  Linux (systemd):    sudo systemctl start postgresql"
    echo "  Docker:             docker-compose up -d postgres"
    exit 1
fi

# Check if database exists
echo ""
echo "2. Checking if test database exists..."
if psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${YELLOW}⚠${NC} Database '$DB_NAME' already exists"
    read -p "Do you want to recreate it? This will delete all existing data! (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Dropping existing database..."
        dropdb -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" "$DB_NAME"
        echo -e "${GREEN}✓${NC} Dropped existing database"

        echo "Creating database..."
        createdb -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" "$DB_NAME"
        echo -e "${GREEN}✓${NC} Created database '$DB_NAME'"
    else
        echo "Skipping database recreation"
    fi
else
    echo "Creating database..."
    createdb -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" "$DB_NAME"
    echo -e "${GREEN}✓${NC} Created database '$DB_NAME'"
fi

# Run migrations
echo ""
echo "3. Running migrations..."
TEST_DATABASE_URL="postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME" npm run migrate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Migrations completed successfully"
else
    echo -e "${RED}✗${NC} Migration failed"
    exit 1
fi

# Verify schema
echo ""
echo "4. Verifying schema..."
TABLE_COUNT=$(psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")
TABLE_COUNT=$(echo "$TABLE_COUNT" | tr -d ' ')

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Schema verified ($TABLE_COUNT tables created)"
else
    echo -e "${RED}✗${NC} No tables found. Something went wrong."
    exit 1
fi

# Success
echo ""
echo -e "${GREEN}=================================="
echo "✓ Test database setup complete!"
echo "==================================${NC}"
echo ""
echo "You can now run the integration tests:"
echo "  npm test -- --testPathPattern=integration"
echo ""
echo "Database details:"
echo "  Name:     $DB_NAME"
echo "  Host:     $DB_HOST"
echo "  Port:     $DB_PORT"
echo "  User:     $DB_USER"
echo "  Tables:   $TABLE_COUNT"
echo ""