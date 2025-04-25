CREATE OR REPLACE FUNCTION perform_checkin(
  user_telegram_id TEXT,
  xp_to_earn INTEGER,
  new_streak INTEGER,
  new_max_streak INTEGER,
  checkin_time TIMESTAMPTZ
) RETURNS JSONB AS $$
DECLARE
  user_record RECORD;
  today_start TIMESTAMPTZ;
BEGIN
  -- Получаем начало текущего дня
  today_start := date_trunc('day', NOW());
  
  -- Получаем данные пользователя и блокируем запись
  SELECT * INTO user_record
  FROM users
  WHERE telegram_id = user_telegram_id
  FOR UPDATE;
  
  -- Проверяем, не было ли уже чекина сегодня
  IF user_record.last_checkin >= today_start THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Already checked in today'
    );
  END IF;
  
  -- Обновляем данные пользователя
  UPDATE users
  SET 
    points = points + xp_to_earn,
    current_streak = new_streak,
    max_streak = new_max_streak,
    last_checkin = checkin_time
  WHERE telegram_id = user_telegram_id;
  
  -- Создаем запись о чекине
  INSERT INTO daily_checkins (user_id, xp_earned, streak)
  VALUES (user_record.id, xp_to_earn, new_streak);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Checkin successful'
  );
END;
$$ LANGUAGE plpgsql;
