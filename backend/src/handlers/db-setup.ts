import { APIGatewayProxyHandler } from 'aws-lambda';
import { query } from '../util/db';

// Migration: UUID → TEXT for users.id and all user_id foreign keys.
// Safe to run on both fresh and existing databases.
const MIGRATION_SQL = `
DO $$
BEGIN
    -- Only migrate if users.id is still uuid type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        -- Drop foreign key constraints first
        ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;
        ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_user_id_fkey;
        ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
        ALTER TABLE memories DROP CONSTRAINT IF EXISTS memories_user_id_fkey;
        ALTER TABLE reminders DROP CONSTRAINT IF EXISTS reminders_user_id_fkey;

        -- Alter column types
        ALTER TABLE users ALTER COLUMN id TYPE TEXT;
        ALTER TABLE conversations ALTER COLUMN user_id TYPE TEXT;
        ALTER TABLE jobs ALTER COLUMN user_id TYPE TEXT;
        ALTER TABLE transactions ALTER COLUMN user_id TYPE TEXT;
        ALTER TABLE memories ALTER COLUMN user_id TYPE TEXT;
        ALTER TABLE reminders ALTER COLUMN user_id TYPE TEXT;

        -- Re-add foreign key constraints
        ALTER TABLE conversations ADD CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        ALTER TABLE jobs ADD CONSTRAINT jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        ALTER TABLE transactions ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        ALTER TABLE memories ADD CONSTRAINT memories_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        ALTER TABLE reminders ADD CONSTRAINT reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

        RAISE NOTICE 'Migrated users.id and user_id columns from UUID to TEXT';
    END IF;
END $$;
`;

const SCHEMA_SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, -- Clerk user ID (e.g. "user_xxx")
    email VARCHAR(255) NOT NULL,
    credits_balance NUMERIC(10, 4) DEFAULT 0.0000,
    stripe_customer_id VARCHAR(255),
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT 'New Conversation',
    state JSONB DEFAULT '{}', -- Summary context
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    tokens_usage INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Jobs Table (The Polling Queue)
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL, -- Optional link
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
    type VARCHAR(50) NOT NULL DEFAULT 'CHAT',
    input_payload JSONB DEFAULT '{}',
    result_payload JSONB,
    worker_id VARCHAR(255), -- ECS Task ID
    locked_at TIMESTAMP WITH TIME ZONE, -- For race condition handling
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for polling speed
CREATE INDEX IF NOT EXISTS idx_jobs_status_pending ON jobs(status) WHERE status = 'PENDING';

-- 5. State Snapshots Table
CREATE TABLE IF NOT EXISTS state_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    s3_key VARCHAR(255) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Transactions Table (Credits History)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 4) NOT NULL, -- Positive for purchase, negative for usage
    type VARCHAR(50) NOT NULL CHECK (type IN ('PURCHASE', 'USAGE', 'FREE_TIER', 'REFUND')),
    description TEXT,
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for history queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, created_at DESC);

-- 7. Memories Table
CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL DEFAULT 'other'
        CHECK (category IN ('personal','health','travel','food','schedule','other')),
    fact TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed'
        CHECK (status IN ('pending','confirmed','rejected')),
    source_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    source_message_preview TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_memories_user_status ON memories(user_id, status);

-- 8. Reminders Table
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    schedule_kind VARCHAR(20) NOT NULL DEFAULT 'at'
        CHECK (schedule_kind IN ('at','every','cron')),
    next_fire_at TIMESTAMP WITH TIME ZONE NOT NULL,
    human_readable VARCHAR(255) NOT NULL,
    recurrence VARCHAR(20) NOT NULL DEFAULT 'one-time'
        CHECK (recurrence IN ('one-time','daily','weekly','monthly','custom')),
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','paused','completed','expired')),
    last_fired_at TIMESTAMP WITH TIME ZONE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reminders_user_status ON reminders(user_id, status);
`;

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        // Run migration first (safe on fresh DBs — the DO block checks column type)
        await query(MIGRATION_SQL);
        // Then ensure all tables exist with correct types
        await query(SCHEMA_SQL);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Database initialized successfully" }),
        };
    } catch (err: any) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message }),
        };
    }
};
