// Конфигурация и инициализация базы данных
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_KEY';

export const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Функции для работы с пользователями
export async function getUser(telegramId) {
  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('telegram_id', String(telegramId))
    .single();

  if (error) throw error;
  return data;
}

export async function updateUser(telegramId, updates) {
  const { error } = await supabaseClient
    .from('users')
    .update(updates)
    .eq('telegram_id', String(telegramId));

  if (error) throw error;
}

export async function incrementXP(userId, amount) {
  await supabaseClient.rpc('increment_xp', {
    user_id: String(userId),
    xp_amount: amount
  });
}

// Функции для работы с рефералами
export async function getReferralCode(telegramId) {
  const { data, error } = await supabaseClient
    .from('users')
    .select('referral_code')
    .eq('telegram_id', String(telegramId))
    .single();

  if (error) throw error;
  return data?.referral_code;
}

export async function checkReferralCode(code) {
  const { data, error } = await supabaseClient
    .from('users')
    .select('telegram_id, referral_code')
    .eq('referral_code', code)
    .single();

  if (error) throw error;
  return data;
}

export async function createReferral(referrerId, referredId) {
  const { error } = await supabaseClient
    .from('referrals')
    .insert({
      referrer_id: String(referrerId),
      referred_id: String(referredId)
    });

  if (error) throw error;
}

export async function getReferralsCount(telegramId) {
  const { count, error } = await supabaseClient
    .from('referrals')
    .select('*', { count: 'exact' })
    .eq('referrer_id', String(telegramId));

  if (error) throw error;
  return count || 0;
}

// Функции для работы с чекинами
export async function createCheckin(userId, streak, xpEarned) {
  const { error } = await supabaseClient
    .from('checkins')
    .insert({
      user_id: String(userId),
      streak_count: streak,
      xp_earned: xpEarned
    });

  if (error) throw error;
}

export async function getLastCheckin(userId) {
  const { data, error } = await supabaseClient
    .from('users')
    .select('last_checkin')
    .eq('telegram_id', String(userId))
    .single();

  if (error) throw error;
  return data?.last_checkin;
}
