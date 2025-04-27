import { supabase as supabaseClient } from '../../supabase-config.js';
import { CacheManager } from './cache.js';

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

  console.log('Запрос пользователя из базы данных по Telegram ID:', userId);

  // Проверяем локальный кэш сначала
  const cachedUser = userCache.get(userId);
  if (cachedUser) {
    console.log('Найден пользователь в кэше:', cachedUser);
    return cachedUser;
  }

  try {
    console.log('Запрос к Supabase для получения пользователя...');
    
    const { data, error } = await withTimeout(
      supabaseClient
        .from('users')
        .select('*')
        .eq('telegram_id', userId)
        .single(),
      cacheKey
    );

    if (error) {
      console.log('Ошибка при запросе пользователя:', error);
      
      if (error.code === 'PGRST116') {
        console.log('Пользователь не найден, создаем нового...');
        // Пользователь не найден, создаем нового
        return await createUser(userId);
      } else {
        throw error;
      }
    }

    console.log('Пользователь найден в базе данных:', data);
    
    // Обновляем кэш
    userCache.set(userId, data);
    return data;
  } catch (error) {
    console.error('Критическая ошибка при получении пользователя:', error);
    
    // Создаем временного пользователя в случае критической ошибки
    const tempUser = {
      telegram_id: userId,
      username: 'Temp User',
      points: 0,
      current_streak: 0,
      max_streak: 0,
      last_checkin: null,
      referral_code: null,
      id: 'temp_' + Date.now()
    };
    
    console.log('Создан временный пользователь:', tempUser);
    return tempUser;
  }
}

async function createUser(telegramId) {
  const userId = String(telegramId);
  
  console.log('Создание нового пользователя с Telegram ID:', userId);
  
  try {
    const userData = {
      telegram_id: userId,
      username: 'Player_' + userId.substring(0, 4),
      points: 0,
      current_streak: 0,
      max_streak: 0,
      last_checkin: null,
      referral_code: null
    };

    console.log('Отправка данных для создания пользователя:', userData);
    
    const { data, error } = await withTimeout(
      supabaseClient
        .from('users')
        .insert(userData)
        .select()
        .single()
    );

    if (error) {
      console.error('Ошибка при создании пользователя в базе данных:', error);
      throw error;
    }

    console.log('Пользователь успешно создан в базе данных:', data);
    
    // Сохраняем в кэш
    userCache.set(userId, data);
    return data;
  } catch (error) {
    console.error('Критическая ошибка при создании пользователя:', error);
    
    // Создаем временного пользователя в случае критической ошибки
    const tempUser = {
      telegram_id: userId,
      username: 'Temp_' + userId.substring(0, 4),
      points: 0,
      current_streak: 0,
      max_streak: 0,
      last_checkin: null,
      referral_code: null,
      id: 'temp_' + Date.now()
    };
    
    console.log('Создан временный пользователь из-за ошибки:', tempUser);
    return tempUser;
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
    
    // Обновляем localStorage для синхронизации между устройствами
    try {
      // Получаем текущее значение XP из базы данных
      const { data, error } = await withTimeout(
        supabaseClient
          .from('users')
          .select('points')
          .eq('telegram_id', userId)
          .single()
      );
      
      if (!error && data) {
        const totalXp = data.points || 0;
        console.log('Обновление totalXp в localStorage по ID:', userId, totalXp);
        
        // Сохраняем значение в localStorage с использованием ID пользователя
        localStorage.setItem('user_points_' + userId, totalXp.toString());
        
        // Также обновляем старый ключ для обратной совместимости
        localStorage.setItem('totalXp', totalXp.toString());
      }
    } catch (localStorageError) {
      console.error('Ошибка при обновлении localStorage:', localStorageError);
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
      cachedUser.current_streak = streak;
      if ((cachedUser.max_streak || 0) < streak) {
        cachedUser.max_streak = streak;
      }
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
