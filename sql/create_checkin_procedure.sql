-- u0421u043eu0437u0434u0430u043du0438u0435 u0445u0440u0430u043du0438u043cu043eu0439 u043fu0440u043eu0446u0435u0434u0443u0440u044b u0434u043bu044f u0441u043eu0437u0434u0430u043du0438u044f u0447u0435u043au0438u043du043eu0432

CREATE OR REPLACE FUNCTION create_checkin(p_user_id TEXT, p_streak_count INTEGER, p_xp_earned INTEGER)
RETURNS VOID AS $$
BEGIN
  -- u0412u0441u0442u0430u0432u043bu044fu0435u043c u0437u0430u043fu0438u0441u044c u0432 u0442u0430u0431u043bu0438u0446u0443 checkins
  INSERT INTO checkins (user_id, streak_count, xp_earned)
  VALUES (p_user_id, p_streak_count, p_xp_earned);
  
  -- u041eu0431u043du043eu0432u043bu044fu0435u043c u0434u0430u043du043du044bu0435 u043fu043eu043bu044cu0437u043eu0432u0430u0442u0435u043bu044f
  UPDATE users
  SET 
    last_checkin = TIMEZONE('utc', NOW()),
    current_streak = p_streak_count,
    max_streak = GREATEST(COALESCE(max_streak, 0), p_streak_count),
    points = COALESCE(points, 0) + p_xp_earned
  WHERE telegram_id = p_user_id;
  
  -- u0415u0441u043bu0438 u043fu043eu043bu044cu0437u043eu0432u0430u0442u0435u043bu044c u043du0435 u043du0430u0439u0434u0435u043d, u0441u043eu0437u0434u0430u0435u043c u043du043eu0432u043eu0433u043e
  IF NOT FOUND THEN
    INSERT INTO users (telegram_id, points, current_streak, max_streak, last_checkin)
    VALUES (p_user_id, p_xp_earned, p_streak_count, p_streak_count, TIMEZONE('utc', NOW()));
  END IF;
END;
$$ LANGUAGE plpgsql;
