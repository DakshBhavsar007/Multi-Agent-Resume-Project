-- ============================================================================
-- Vishleshan — Auth Schema Migration
-- ============================================================================
-- Run against your PostgreSQL database:
--   psql -U postgres -d vishleshan -f migrations/001_auth_tables.sql
-- ============================================================================

-- 1) Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2) Users table
--    Represents the human identity behind one or more API keys.
--    In the existing Vishleshan schema this maps to "companies",
--    so this table is for reference/future use if you want a
--    dedicated lightweight users table alongside companies.
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT NOT NULL UNIQUE,
    name        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by email
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- 3) API Keys table (bcrypt-hashed keys)
--    key_hash stores the bcrypt hash of the raw "vsh_..." key.
--    The raw key is shown to the user exactly once on creation.
CREATE TABLE IF NOT EXISTS api_keys_hashed (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash      TEXT NOT NULL,
    label         TEXT DEFAULT 'Default Key',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at  TIMESTAMPTZ
);

-- Index for fast FK lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_hashed_user_id ON api_keys_hashed (user_id);

-- ============================================================================
-- Notes
-- ============================================================================
-- • The existing `companies` + `api_keys` tables remain untouched.
-- • The auth/routes.py endpoints currently use the existing Company + APIKey
--   models so that the new flow integrates seamlessly with the current system.
-- • If you later migrate to a separate `users` table, update the FK in
--   auth/routes.py from Company → users and APIKey → api_keys_hashed.
-- ============================================================================
