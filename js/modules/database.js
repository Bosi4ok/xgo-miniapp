// Конфигурация и инициализация базы данных
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const SUPABASE_URL = 'https://msstnczyshmnhjcnzjlg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zc3RuY3p5c2htbmhqY256amxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMjI0MjUsImV4cCI6MjA2MDg5ODQyNX0.9Oa_ghFyX9qVquxokvLMSNRfQq7FzA6mQEvlsM2ZyRc';

// Конфигурация Supabase
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: { 'x-custom-header': 'telegram-mini-app' }
  }
});

// Кэш для запросов
const queryCache = new Map();
const CACHE_LIFETIME = 30000; // 30 секунд

// Функция для обработки запросов с таймаутом и кэшированием
async function withTimeout(promise, cacheKey = null, ms = 5000) {
  // Проверяем кэш
  if (cacheKey) {
    const cached = queryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_LIFETIME)) {
      return cached.data;
    }
  }

  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Время ожидания запроса истекло')), ms);
  });

  try {
    const result = await Promise.race([promise, timeout]);
    
    // Сохраняем в кэш
    if (cacheKey) {
      queryCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
    }

    return result;
  } catch (error) {
    // Если есть кэшированные данные, возвращаем их
    if (cacheKey) {
      const cached = queryCache.get(cacheKey);
      if (cached) {
        console.warn('Используем кэшированные данные из-за ошибки:', error);
        return cached.data;
      }
    }
    throw error;
  }
}

// Функции для работы с пользователями
const userCache = new Map();

export async function getUser(telegramId) {
  const userId = String(telegramId);
  const cacheKey = `user:${userId}`;

  try {
    const { data, error } = await withTimeout(
      supabaseClient
        .from('users')
        .select('*')
        .eq('telegram_id', userId)
        .single(),
      cacheKey
    );

    if (error && error.code === 'PGRST116') {
      // Пользователь не найден, создаем нового
      return await createUser(userId);
    } else if (error) {
      throw error;
    }

    // Обновляем кэш
    userCache.set(userId, data);
    return data;
  } catch (error) {
    console.error('Ошибка при получении пользователя:', error);
    
    // Проверяем локальный кэш
    const cachedUser = userCache.get(userId);
    if (cachedUser) {
      console.warn('Используем кэшированные данные пользователя');
      return cachedUser;
    }
    throw error;
  }
}

async function createUser(telegramId) {
  const userId = String(telegramId);
  
  try {
    const userData = {
      telegram_id: userId,
      points: 0,
      streak: 0,
      last_checkin: null,
      referral_code: null
    };

    const { data, error } = await withTimeout(
      supabaseClient
        .from('users')
        .insert(userData)
        .select()
        .single()
    );

    if (error) throw error;

    // Сохраняем в кэш
    userCache.set(userId, data);
    return data;
  } catch (error) {
    console.error('Ошибка при создании пользователя:', error);
    throw error;
  }
}

export async function updateUser(telegramId, updates) {
  const userId = String(telegramId);

  try {
    const { error } = await withTimeout(
      supabaseClient
        .from('users')
        .update(updates)
        .eq('telegram_id', userId)
    );

    if (error) throw error;

    // Обновляем кэш
    const cachedUser = userCache.get(userId);
    if (cachedUser) {
      userCache.set(userId, { ...cachedUser, ...updates });
    }
  } catch (error) {
    console.error('Ошибка при обновлении пользователя:', error);
    throw error;
  }
}

export async function incrementXP(userId, amount) {
  userId = String(userId);

  try {
    await withTimeout(
      supabaseClient.rpc('increment_xp', {
        user_id: userId,
        xp_amount: amount
      })
    );

    // Обновляем кэш
    const cachedUser = userCache.get(userId);
    if (cachedUser) {
      cachedUser.points = (cachedUser.points || 0) + amount;
      userCache.set(userId, cachedUser);
    }
  } catch (error) {
    console.error('Ошибка при начислении XP:', error);
    throw error;
  }
}

// Функции для работы с рефералами
export async function getReferralCode(telegramId) {
  try {
    const { data, error } = await withTimeout(
      supabaseClient
        .from('users')
        .select('referral_code')
        .eq('telegram_id', String(telegramId))
        .single()
    );

    if (error) throw error;
    return data?.referral_code;
  } catch (error) {
    console.error('Ошибка при получении реферального кода:', error);
    throw error;
  }
}

export async function checkReferralCode(code) {
  try {
    const { data, error } = await withTimeout(
      supabaseClient
        .from('users')
        .select('telegram_id, referral_code')
        .eq('referral_code', code)
        .single()
    );

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Ошибка при проверке реферального кода:', error);
    throw error;
  }
}

export async function createReferral(referrerId, referredId) {
  try {
    const { error } = await withTimeout(
      supabaseClient
        .from('referrals')
        .insert({
          referrer_id: String(referrerId),
          referred_id: String(referredId)
        })
    );

    if (error) throw error;
  } catch (error) {
    console.error('Ошибка при создании реферала:', error);
    throw error;
  }
}

export async function getReferralsCount(telegramId) {
  try {
    const { count, error } = await withTimeout(
      supabaseClient
        .from('referrals')
        .select('*', { count: 'exact' })
        .eq('referrer_id', String(telegramId))
    );

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Ошибка при получении количества рефералов:', error);
    throw error;
  }
}

// Функции для работы с чекинами
export async function createCheckin(userId, streak, xpEarned) {
  try {
    const { error } = await withTimeout(
      supabaseClient
        .from('checkins')
        .insert({
          user_id: String(userId),
          streak_count: streak,
          xp_earned: xpEarned
        })
    );

    if (error) throw error;
  } catch (error) {
    console.error('Ошибка при создании чекина:', error);
    throw error;
  }
}

export async function getLastCheckin(userId) {
  try {
    const { data, error } = await withTimeout(
      supabaseClient
        .from('users')
        .select('last_checkin')
        .eq('telegram_id', String(userId))
        .single()
    );

    if (error) throw error;
    return data?.last_checkin;
  } catch (error) {
    console.error('Ошибка при получении последнего чекина:', error);
    throw error;
  }
}
