-- ============================================================
-- Migration: Fix Leaderboard — Add accuracy, streak, weekly XP
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Add accuracy tracking columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_correct INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_attempted INTEGER DEFAULT 0;

-- Add weekly leaderboard columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_xp INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS week_start DATE DEFAULT (DATE_TRUNC('week', CURRENT_DATE)::DATE);

-- Add streak tracking column
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_date DATE;

-- Index for weekly leaderboard queries
CREATE INDEX IF NOT EXISTS idx_users_weekly_xp ON users(weekly_xp DESC);

-- ============================================================
-- Backfill accuracy from existing user_mcq_attempts data
-- (if you already have attempt records)
-- ============================================================
UPDATE users u SET
    total_correct = COALESCE(stats.correct_count, 0),
    total_attempted = COALESCE(stats.attempt_count, 0)
FROM (
    SELECT
        user_id,
        COUNT(*) AS attempt_count,
        COUNT(*) FILTER (WHERE correct = true) AS correct_count
    FROM user_mcq_attempts
    GROUP BY user_id
) stats
WHERE u.id = stats.user_id;

-- Done! Your leaderboard columns are ready.
