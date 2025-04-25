-- Сбрасываем last_checkin для всех пользователей
UPDATE users 
SET last_checkin = NULL;

-- Очищаем таблицу чекинов
TRUNCATE TABLE daily_checkins;

-- Сбрасываем текущие стрики (опционально)
UPDATE users 
SET current_streak = 0;
