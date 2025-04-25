import { supabase } from '../../supabase-config.js';
import { CacheManager } from './cache.js';

// Используем supabase клиент из конфига
const supabaseClient = supabase;

// Экспортируем все необходимые функции и объекты
export { 
  supabaseClient,
  getUser,
  updateUser,
  incrementXP,
  getReferralCode,
  checkReferralCode,
  createReferral,
  getReferralsCount,
  createCheckin,
  getLastCheckin
};

// Оптимизированная функция для запросов с кэшированием
async function withTimeout(promise, cacheKey = null, ms = 5000) {
  if (cacheKey) {
    const cached = CacheManager.get(cacheKey);
    if (cached) return cached;
  }

  try {
    const result = await Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Время ожидания запроса истекло')), ms)
      )
    ]);

    if (cacheKey && result) {
      CacheManager.set(cacheKey, result);
    }

    return result;
  } catch (error) {
    console.error(`Database error (${cacheKey}):`, error);
    
    if (cacheKey) {
      const cached = CacheManager.get(cacheKey);
      if (cached) {
        console.warn(`Using cached data for ${cacheKey}`);
        return cached;
      }
    }
    
    throw error;
  }
}

// Функции для работы с пользователями
const userCache = new Map();

async function getUser(telegramId) {
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

async function updateUser(telegramId, updates) {
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

async function incrementXP(userId, amount) {
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

// Кэш для реферальных кодов
const referralCache = new Map();
const referralCountCache = new Map();

// Функции для работы с рефералами
async function getReferralCode(telegramId) {
  const userId = String(telegramId);
  const cacheKey = `referral:${userId}`;

  // Проверяем кэш
  const cachedCode = referralCache.get(userId);
  if (cachedCode) {
    return cachedCode;
  }

  try {
    const { data, error } = await withTimeout(
      supabaseClient
        .from('users')
        .select('referral_code')
        .eq('telegram_id', userId)
        .single(),
      cacheKey
    );

    if (error) throw error;

    // Сохраняем в кэш
    const code = data?.referral_code;
    if (code) {
      referralCache.set(userId, code);
    }

    return code;
  } catch (error) {
    console.error('Ошибка при получении реферального кода:', error);
    throw error;
  }
}

async function checkReferralCode(code) {
  const cacheKey = `check:${code}`;

  try {
    const { data, error } = await withTimeout(
      supabaseClient
        .from('users')
        .select('telegram_id, referral_code')
        .eq('referral_code', code)
        .single(),
      cacheKey
    );

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Ошибка при проверке реферального кода:', error);
    throw error;
  }
}

async function createReferral(referrerId, referredId) {
  referrerId = String(referrerId);
  referredId = String(referredId);

  try {
    const { error } = await withTimeout(
      supabaseClient
        .from('referrals')
        .insert({
          referrer_id: referrerId,
          referred_id: referredId
        })
    );

    if (error) throw error;

    // Очищаем кэш счетчика рефералов
    referralCountCache.delete(referrerId);
  } catch (error) {
    console.error('Ошибка при создании реферала:', error);
    throw error;
  }
}

async function getReferralsCount(telegramId) {
  const userId = String(telegramId);

  // Проверяем кэш
  const cachedCount = referralCountCache.get(userId);
  if (typeof cachedCount === 'number') {
    return cachedCount;
  }

  try {
    const { count, error } = await withTimeout(
      supabaseClient
        .from('referrals')
        .select('*', { count: 'exact' })
        .eq('referrer_id', userId),
      `count:${userId}`
    );

    if (error) throw error;

    // Сохраняем в кэш
    const finalCount = count || 0;
    referralCountCache.set(userId, finalCount);

    return finalCount;
  } catch (error) {
    console.error('Ошибка при получении количества рефералов:', error);
    throw error;
  }
}

// Кэш для чекинов
const checkinCache = new Map();
const CHECKIN_CACHE_LIFETIME = 60000; // 1 минута

// Функции для работы с чекинами
async function createCheckin(userId, streak, xpEarned) {
  userId = String(userId);

  try {
    const { error } = await withTimeout(
      supabaseClient
        .from('checkins')
        .insert({
          user_id: userId,
          streak_count: streak,
          xp_earned: xpEarned
        })
    );

    if (error) throw error;

    // Обновляем кэш последнего чекина
    const now = new Date().toISOString();
    checkinCache.set(userId, {
      lastCheckin: now,
      timestamp: Date.now()
    });

    // Обновляем кэш пользователя
    const cachedUser = userCache.get(userId);
    if (cachedUser) {
      cachedUser.last_checkin = now;
      cachedUser.streak = streak;
      userCache.set(userId, cachedUser);
    }
  } catch (error) {
    console.error('Ошибка при создании чекина:', error);
    throw error;
  }
}

async function getLastCheckin(userId) {
  userId = String(userId);

  // Проверяем кэш
  const cached = checkinCache.get(userId);
  if (cached && (Date.now() - cached.timestamp < CHECKIN_CACHE_LIFETIME)) {
    return cached.lastCheckin;
  }

  try {
    const { data, error } = await withTimeout(
      supabaseClient
        .from('users')
        .select('last_checkin')
        .eq('telegram_id', userId)
        .single(),
      `checkin:${userId}`
    );

    if (error) throw error;

    // Сохраняем в кэш
    const lastCheckin = data?.last_checkin;
    if (lastCheckin) {
      checkinCache.set(userId, {
        lastCheckin,
        timestamp: Date.now()
      });
    }

    return lastCheckin;
  } catch (error) {
    console.error('Ошибка при получении последнего чекина:', error);
    
    // Возвращаем кэшированные данные в случае ошибки
    if (cached) {
      console.warn('Используем кэшированные данные чекина');
      return cached.lastCheckin;
    }
    
    throw error;
  }
}
