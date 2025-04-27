-- Хранимая процедура для увеличения XP пользователя
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
