-- ============================================================
-- GATE DS Platform — Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor to set up all tables
-- ============================================================

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    avatar      TEXT,
    streak      INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    xp          INTEGER DEFAULT 0,
    level       INTEGER DEFAULT 1,
    total_correct   INTEGER DEFAULT 0,
    total_attempted INTEGER DEFAULT 0,
    weekly_xp       INTEGER DEFAULT 0,
    week_start      DATE DEFAULT (DATE_TRUNC('week', CURRENT_DATE)::DATE),
    last_active_date DATE,
    weak_subjects TEXT[] DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_total_score ON users(total_score DESC);
CREATE INDEX idx_users_weekly_xp ON users(weekly_xp DESC);

-- ============================================================
-- MCQs TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS mcqs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject     TEXT NOT NULL,
    topic       TEXT NOT NULL,
    question    TEXT NOT NULL,
    options     JSONB NOT NULL,       -- [{id, text, latex?}]
    answer      TEXT NOT NULL,        -- option id: 'a'|'b'|'c'|'d'
    explanation TEXT NOT NULL,
    difficulty  TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    source_type TEXT NOT NULL CHECK (source_type IN ('PYQ', 'Generated', 'Custom')),
    year        INTEGER,
    tags        TEXT[] DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mcqs_subject ON mcqs(subject);
CREATE INDEX idx_mcqs_topic ON mcqs(topic);
CREATE INDEX idx_mcqs_difficulty ON mcqs(difficulty);
CREATE INDEX idx_mcqs_source_type ON mcqs(source_type);
CREATE INDEX idx_mcqs_subject_topic ON mcqs(subject, topic);

-- ============================================================
-- SYLLABUS CHUNKS TABLE (for RAG / pgvector)
-- ============================================================
CREATE TABLE IF NOT EXISTS syllabus_chunks (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject     TEXT NOT NULL,
    topic       TEXT NOT NULL,
    content     TEXT NOT NULL,
    subtopics   TEXT[] DEFAULT '{}',
    embedding   vector(384),          -- all-MiniLM-L6-v2 = 384 dims
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_syllabus_subject ON syllabus_chunks(subject);
CREATE INDEX idx_syllabus_topic ON syllabus_chunks(topic);

-- IVFFlat index for fast approximate nearest neighbor search
CREATE INDEX idx_syllabus_embedding
    ON syllabus_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- ============================================================
-- CHAT CACHE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_cache (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_hash  TEXT UNIQUE NOT NULL,
    response    TEXT NOT NULL,
    hit_count   INTEGER DEFAULT 1,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX idx_cache_query_hash ON chat_cache(query_hash);
CREATE INDEX idx_cache_expires ON chat_cache(expires_at);

-- Auto-cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM chat_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PROGRESS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS progress (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject     TEXT NOT NULL,
    topic       TEXT NOT NULL,
    accuracy    FLOAT DEFAULT 0,
    attempts    INTEGER DEFAULT 0,
    last_attempt TIMESTAMPTZ DEFAULT NOW(),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, subject, topic)
);

CREATE INDEX idx_progress_user_id ON progress(user_id);
CREATE INDEX idx_progress_subject ON progress(user_id, subject);
CREATE INDEX idx_progress_accuracy ON progress(user_id, accuracy);

-- ============================================================
-- MOCK TESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS mock_tests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_id         TEXT,
    score           INTEGER NOT NULL,
    total           INTEGER NOT NULL,
    accuracy        FLOAT NOT NULL,
    duration        INTEGER,          -- seconds taken
    weak_areas      TEXT[] DEFAULT '{}',
    subject_breakdown JSONB DEFAULT '{}',
    xp_earned       INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mock_tests_user_id ON mock_tests(user_id);
CREATE INDEX idx_mock_tests_created_at ON mock_tests(created_at DESC);

-- ============================================================
-- BOOKMARKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS bookmarks (
    id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mcq_id   UUID NOT NULL REFERENCES mcqs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, mcq_id)
);

CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);

-- ============================================================
-- USER MCQ ATTEMPTS TABLE (tracks per-question attempts per user)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_mcq_attempts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mcq_id      TEXT NOT NULL,
    correct     BOOLEAN NOT NULL DEFAULT false,
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, mcq_id)
);

CREATE INDEX idx_mcq_attempts_user ON user_mcq_attempts(user_id);
CREATE INDEX idx_mcq_attempts_mcq ON user_mcq_attempts(user_id, mcq_id);

-- ============================================================
-- DAILY CHALLENGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_challenges (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date        DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
    mcq_ids     UUID[] NOT NULL,
    subject     TEXT,
    difficulty  TEXT,
    xp_reward   INTEGER DEFAULT 50,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STUDY PLANS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS study_plans (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_date       DATE,
    plan_text       TEXT,
    daily_tasks     JSONB DEFAULT '[]',
    weekly_goals    TEXT[] DEFAULT '{}',
    ai_recommendations TEXT[] DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- pgvector SIMILARITY SEARCH FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION match_syllabus_chunks(
    query_embedding vector(384),
    match_count INT DEFAULT 5,
    filter_subject TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    subject TEXT,
    topic TEXT,
    content TEXT,
    subtopics TEXT[],
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sc.id,
        sc.subject,
        sc.topic,
        sc.content,
        sc.subtopics,
        1 - (sc.embedding <=> query_embedding) AS similarity
    FROM syllabus_chunks sc
    WHERE
        (filter_subject IS NULL OR sc.subject = filter_subject)
        AND sc.embedding IS NOT NULL
    ORDER BY sc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mcq_attempts ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Progress policies
CREATE POLICY "Users can view own progress" ON progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON progress
    FOR UPDATE USING (auth.uid() = user_id);

-- Mock tests policies
CREATE POLICY "Users can view own test results" ON mock_tests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test results" ON mock_tests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- MCQ attempts policies
CREATE POLICY "Users can view own mcq attempts" ON user_mcq_attempts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mcq attempts" ON user_mcq_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mcq attempts" ON user_mcq_attempts
    FOR UPDATE USING (auth.uid() = user_id);

-- MCQs are public
ALTER TABLE mcqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "MCQs are publicly readable" ON mcqs
    FOR SELECT USING (true);

-- Syllabus chunks are public
ALTER TABLE syllabus_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Syllabus chunks are publicly readable" ON syllabus_chunks
    FOR SELECT USING (true);

-- Chat cache is publicly readable
ALTER TABLE chat_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cache is publicly readable" ON chat_cache
    FOR SELECT USING (true);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER study_plans_updated_at
    BEFORE UPDATE ON study_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SAMPLE DATA — Insert seed MCQs
-- ============================================================
INSERT INTO mcqs (subject, topic, question, options, answer, explanation, difficulty, source_type, year, tags)
VALUES
(
    'Machine Learning', 'SVM',
    'In Support Vector Machines, what maximizes the margin between classes?',
    '[{"id":"a","text":"Hyperplane"},{"id":"b","text":"Maximum Margin Hyperplane"},{"id":"c","text":"Kernel Function"},{"id":"d","text":"Support Vector"}]',
    'b',
    'The Maximum Margin Hyperplane (MMH) maximizes the distance (margin) between the two classes.',
    'Medium', 'PYQ', 2023, ARRAY['SVM','Classification']
),
(
    'Deep Learning', 'Neural Networks',
    'Which activation function is most responsible for the vanishing gradient problem?',
    '[{"id":"a","text":"ReLU"},{"id":"b","text":"Leaky ReLU"},{"id":"c","text":"Sigmoid"},{"id":"d","text":"Softmax"}]',
    'c',
    'Sigmoid derivative is at most 0.25, causing gradients to shrink exponentially through deep layers.',
    'Medium', 'PYQ', 2024, ARRAY['Backpropagation','Activation Functions']
),
(
    'Statistics', 'Hypothesis Testing',
    'Rejecting a true null hypothesis is called:',
    '[{"id":"a","text":"Type II Error"},{"id":"b","text":"Statistical Power"},{"id":"c","text":"Type I Error"},{"id":"d","text":"p-value"}]',
    'c',
    'Type I Error (α) is rejecting a null hypothesis that is actually true.',
    'Easy', 'PYQ', 2022, ARRAY['Hypothesis Testing','Errors']
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Done! Your GATE DS database is ready.
-- ============================================================
