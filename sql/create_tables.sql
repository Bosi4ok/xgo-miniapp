-- Пересоздаем таблицу users с правильной структурой
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    telegram_id TEXT NOT NULL UNIQUE,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    points INTEGER DEFAULT 0,
    referral_code TEXT UNIQUE,
    referred_by BIGINT REFERENCES users(id),
    current_streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    last_checkin TIMESTAMP WITH TIME ZONE
);

-- Создаем таблицу для чекинов
DROP TABLE IF EXISTS daily_checkins CASCADE;
CREATE TABLE daily_checkins (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    xp_earned INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
