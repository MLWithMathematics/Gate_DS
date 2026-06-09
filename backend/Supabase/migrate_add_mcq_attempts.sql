-- ============================================================
-- Migration: Add user_mcq_attempts table
-- Run this in your Supabase SQL Editor to fix MCQ sync
-- ============================================================

-- Create the table
CREATE TABLE IF NOT EXISTS user_mcq_attempts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mcq_id      TEXT NOT NULL,
    correct     BOOLEAN NOT NULL DEFAULT false,
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, mcq_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_mcq_attempts_user ON user_mcq_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_mcq_attempts_mcq ON user_mcq_attempts(user_id, mcq_id);

-- Enable RLS
ALTER TABLE user_mcq_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies (safe to re-run — uses IF NOT EXISTS pattern via DO block)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_mcq_attempts' AND policyname = 'Users can view own mcq attempts') THEN
        CREATE POLICY "Users can view own mcq attempts" ON user_mcq_attempts
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_mcq_attempts' AND policyname = 'Users can insert own mcq attempts') THEN
        CREATE POLICY "Users can insert own mcq attempts" ON user_mcq_attempts
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_mcq_attempts' AND policyname = 'Users can update own mcq attempts') THEN
        CREATE POLICY "Users can update own mcq attempts" ON user_mcq_attempts
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Done! Your MCQ attempts table is ready.
