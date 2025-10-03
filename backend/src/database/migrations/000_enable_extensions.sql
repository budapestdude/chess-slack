-- Migration: Enable PostgreSQL Extensions
-- Description: Enable required PostgreSQL extensions for UUID generation
-- Created: 2025-10-03

-- Enable UUID extension for uuid_generate_v4() function
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for additional crypto functions (optional but useful)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
