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
DROP TABLE IF EXISTS checkins CASCADE;
CREATE TABLE checkins (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL, -- Используем telegram_id вместо ссылки на id
    streak_count INTEGER NOT NULL,
    xp_earned INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Создаем таблицу для рефералов
DROP TABLE IF EXISTS referrals CASCADE;
CREATE TABLE referrals (
    id BIGSERIAL PRIMARY KEY,
    referrer_id TEXT NOT NULL, -- Telegram ID реферера
    referred_id TEXT NOT NULL, -- Telegram ID приглашенного пользователя
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Создаем хранимую процедуру для увеличения XP пользователя
CREATE OR REPLACE FUNCTION increment_xp(user_id TEXT, xp_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  -- Обновляем количество XP пользователя
  UPDATE users
  SET points = COALESCE(points, 0) + xp_amount
  WHERE telegram_id = user_id;
  
  -- Если пользователь не найден, создаем нового
  IF NOT FOUND THEN
    INSERT INTO users (telegram_id, points)
    VALUES (user_id, xp_amount);
  END IF;
END;
$$ LANGUAGE plpgsql;
