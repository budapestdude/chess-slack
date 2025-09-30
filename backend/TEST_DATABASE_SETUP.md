# Test Database Setup Guide

This document explains how to set up and run the integration tests for the ChessSlack backend.

## Prerequisites

You need a PostgreSQL server running on your local machine.

## Quick Setup

Run these commands to set up the test database:

```bash
# 1. Create the test database
createdb chessslack_test

# 2. Run migrations on the test database
TEST_DATABASE_URL=postgresql://localhost:5432/chessslack_test npm run migrate

# 3. Run the tests
npm test -- --testPathPattern=integration
```

## Alternative: Manual Setup

If the quick setup doesn't work, you can set up the database manually:

### 1. Create Test Database

```bash
# Using createdb
createdb chessslack_test

# OR using psql
psql -U postgres -c "CREATE DATABASE chessslack_test;"
```

### 2. Apply Schema

```bash
# Option A: Using the migrate script
TEST_DATABASE_URL=postgresql://localhost:5432/chessslack_test npm run migrate

# Option B: Manually with psql
psql -U postgres -d chessslack_test -f src/database/schema.sql
```

### 3. Verify Setup

```bash
# Connect to test database
psql -d chessslack_test

# List tables (should show users, workspaces, channels, messages, etc.)
\dt

# Exit
\q
```

## Environment Variables

The tests use the following environment variables:

- `DATABASE_URL`: Set to `postgresql://localhost:5432/chessslack_test` by default in test setup
- `TEST_DATABASE_URL`: Override this if your test database has a different connection string
- `JWT_SECRET`: Automatically set to a test value
- `NODE_ENV`: Automatically set to `test`

You can create a `.env.test` file if you need custom settings:

```env
TEST_DATABASE_URL=postgresql://your-username:your-password@localhost:5432/chessslack_test
```

## Test Database Management

### Clean the Test Database

The test suite automatically cleans up after each test, but if you want to manually clean the database:

```bash
# Connect to the database
psql -d chessslack_test

# Delete all data
DELETE FROM message_reactions;
DELETE FROM pinned_messages;
DELETE FROM attachments;
DELETE FROM files;
DELETE FROM messages;
DELETE FROM chess_positions;
DELETE FROM chess_games;
DELETE FROM tournament_players;
DELETE FROM tournaments;
DELETE FROM chess_sites;
DELETE FROM player_ratings;
DELETE FROM dm_group_members;
DELETE FROM dm_groups;
DELETE FROM channel_members;
DELETE FROM channels;
DELETE FROM workspace_members;
DELETE FROM workspaces;
DELETE FROM sessions;
DELETE FROM user_presence;
DELETE FROM notifications;
DELETE FROM users;
```

### Reset the Test Database

To completely reset the test database (drop all tables and recreate):

```bash
# Drop and recreate the database
dropdb chessslack_test
createdb chessslack_test

# Reapply schema
TEST_DATABASE_URL=postgresql://localhost:5432/chessslack_test npm run migrate
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Only Integration Tests

```bash
npm test -- --testPathPattern=integration
```

### Run Only Unit Tests

```bash
npm test -- --testPathPattern=unit
```

### Run Specific Test File

```bash
npm test -- src/__tests__/integration/auth.test.ts
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

## Troubleshooting

### Error: "database 'chessslack_test' does not exist"

**Solution:** Create the database:
```bash
createdb chessslack_test
```

### Error: "relation 'users' does not exist"

**Solution:** Run migrations:
```bash
TEST_DATABASE_URL=postgresql://localhost:5432/chessslack_test npm run migrate
```

### Error: "password authentication failed"

**Solution:** Check your PostgreSQL credentials. You may need to:
1. Set the `TEST_DATABASE_URL` environment variable with correct credentials
2. Update your `pg_hba.conf` to allow local connections
3. Create a PostgreSQL user with appropriate permissions

### Error: "ECONNREFUSED"

**Solution:** PostgreSQL is not running. Start it:
```bash
# macOS (Homebrew)
brew services start postgresql

# Linux (systemd)
sudo systemctl start postgresql

# Or check if it's running
psql -U postgres -c "SELECT 1"
```

### Tests are slow or timing out

**Solution:**
1. Check your PostgreSQL connection settings
2. Ensure you're using a local database (not remote)
3. Increase the timeout in `jest.config.js` if needed

## Test Database vs Production Database

The test database is completely separate from your production/development database:

- **Production/Dev**: `chessslack` (from your main `.env` file)
- **Test**: `chessslack_test` (automatically set by test setup)

Tests will NEVER touch your production or development data.

## CI/CD Considerations

If you're setting up CI/CD, you'll need to:

1. Install PostgreSQL in your CI environment
2. Create the test database
3. Run migrations
4. Run tests

Example GitHub Actions workflow:

```yaml
- name: Set up PostgreSQL
  run: |
    sudo systemctl start postgresql.service
    sudo -u postgres createdb chessslack_test

- name: Run migrations
  env:
    TEST_DATABASE_URL: postgresql://postgres@localhost:5432/chessslack_test
  run: npm run migrate

- name: Run tests
  run: npm test
```

## Additional Notes

- The test database uses the same schema as production
- Tests run in transactions where possible to maintain isolation
- Integration tests create their own test data
- Each test suite cleans up its data after running
- The database connection pool is properly closed after all tests complete