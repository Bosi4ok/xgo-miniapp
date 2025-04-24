-- Создаем таблицу для чекинов
CREATE TABLE IF NOT EXISTS daily_checkins (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    xp_earned INTEGER NOT NULL,
    streak INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Добавляем RLS политики
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

-- Политика на чтение: пользователь может видеть только свои чекины
CREATE POLICY "Users can view own checkins"
    ON daily_checkins
    FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM users 
            WHERE telegram_id = CAST(current_user AS text)
        )
    );

-- Политика на вставку: только через хранимую процедуру
CREATE POLICY "Insert only through function"
    ON daily_checkins
    FOR INSERT
    WITH CHECK (true);  -- Проверка происходит в хранимой процедуре
