import { supabaseClient } from '../supabase-config.js';
import { userCache } from './cache.js';

// Функция для получения данных пользователя из базы данных или кэша
// Принимает объект userData из Telegram.WebApp.initDataUnsafe.user
async function getUser(userData) {
  if (!userData || !userData.id) {
    console.error('getUser вызван без валидных userData:', userData);
    return null; // Или вернуть временного пользователя, если нужно
  }
  const userId = String(userData.id); // Получаем ID из userData
  const cacheKey = `user:${userId}`;

  console.log(`Запрос пользователя из базы данных по Telegram ID: ${userId}`);

  // Проверяем локальный кэш сначала
  const cachedUser = userCache.get(userId);
  if (cachedUser) {
    console.log('Найден пользователь в кэше:', cachedUser);
    return cachedUser;
  }

  console.log('Пользователь не найден в кэше, запрашиваем из Supabase...');

  try {
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('telegram_id', userId) // Ищем по telegram_id
      .maybeSingle(); // Возвращает null, если не найдено, без ошибки

    if (error) {
      // Обрабатываем только неожиданные ошибки, не 'не найдено'
      console.error('Ошибка Supabase при получении пользователя:', error);
      // Можно вернуть временного пользователя или null
      return null;
    }

    if (data) {
      console.log('Пользователь найден в Supabase:', data);
      userCache.set(userId, data); // Сохраняем в кэш
      return data;
    } else {
      // Пользователь не найден в Supabase, создаем нового
      console.log(`Пользователь с ID ${userId} не найден в Supabase, создаем нового...`);
      // Передаем полный объект userData в createUser
      return await createUser(userData);
    }

  } catch (error) {
    console.error(`Критическая ошибка при получении/создании пользователя ${userId}:`, error);
    // Возвращаем временного пользователя для отказоустойчивости
    const tempUser = {
      id: 'temp_' + Date.now(),
      telegram_id: userId,
      username: userData.username || `Temp_${userId.substring(0,4)}`,
      first_name: userData.first_name || 'Temp',
      last_name: userData.last_name || 'User',
      points: 0,
      current_streak: 0,
      max_streak: 0,
      last_checkin: null,
      referral_code: null,
      isTemporary: true
    };
    console.log('Создан временный пользователь из-за ошибки в getUser:', tempUser);
    return tempUser;
  }
}

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

async function createUser(userData) {
  const userId = String(userData.id); // Убедимся, что ID - строка
  const username = userData.username || `Player_${userId.substring(0, 4)}`; // Используем username или генерируем запасной вариант
  const firstName = userData.first_name || 'Unknown';
  const lastName = userData.last_name || '';

  console.log(`Создание нового пользователя: ID=${userId}, Username=${username}, Name=${firstName} ${lastName}`);

  try {
    const newUserRecord = {
      telegram_id: userId,
      username: username,
      first_name: firstName, // Добавили first_name
      last_name: lastName,   // Добавили last_name
      points: 0,
      current_streak: 0,
      max_streak: 0,
      last_checkin: null,
      referral_code: null // Генерацию referral_code можно добавить позже, если нужно
      // created_at обрабатывается базой данных автоматически
    };

    console.log('Данные для вставки:', newUserRecord);

    const { data, error } = await supabaseClient
      .from('users')
      .insert([newUserRecord]) // Используем собранный объект
      .select()
      .single(); // Ожидаем одну запись

    if (error) {
      console.error('Ошибка Supabase при создании пользователя:', error);
      // В случае ошибки можно вернуть временного пользователя или null/выбросить исключение
      return null; 
    }

    console.log('Пользователь успешно создан в Supabase:', data);
    userCache.set(userId, data); // Добавляем нового пользователя в кэш
    return data;

  } catch (error) {
    console.error('Критическая ошибка при создании пользователя:', error);
    // Можно вернуть временного пользователя для отказоустойчивости UI
    const tempUser = {
      id: 'temp_' + Date.now(), // Временный ID для UI
      telegram_id: userId,
      username: username, // Используем полученное/сгенерированное имя
      first_name: firstName,
      last_name: lastName,
      points: 0,
      current_streak: 0,
      max_streak: 0,
      last_checkin: null,
      referral_code: null,
      isTemporary: true // Флаг, что пользователь временный
    };
    console.log('Возвращен временный пользователь из-за ошибки:', tempUser);
    return tempUser;
  }
}

async function updateUser(telegramId, updates) {
  const userId = String(telegramId);
  console.log('Обновление пользователя:', userId, 'с данными:', updates);

  try {
    console.log('Отправляем запрос на обновление пользователя...');
    const { data, error } = await supabaseClient
      .from('users')
      .update(updates)
      .eq('telegram_id', userId)
      .select();

    if (error) {
      console.error('Ошибка при обновлении пользователя:', error);
      
      // Проверяем, существует ли пользователь
      console.log('Проверяем, существует ли пользователь...');
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('telegram_id', userId)
        .single();
      
      if (userError && userError.code !== 'PGRST116') { // Не ошибка "не найдено"
        console.error('Ошибка при проверке пользователя:', userError);
        throw userError;
      }
      
      if (!userData) {
        // Создаем нового пользователя
        console.log('Пользователь не найден, создаем нового...');
        const newUser = {
          telegram_id: userId,
          ...updates
        };
        
        const { error: insertError } = await supabaseClient
          .from('users')
          .insert([newUser]);
        
        if (insertError) {
          console.error('Ошибка при создании пользователя:', insertError);
          throw insertError;
        }
        console.log('Новый пользователь успешно создан');
      } else {
        throw error; // Если пользователь существует, но обновление не удалось
      }
    } else {
      console.log('Пользователь успешно обновлен:', data);
    }

    // Обновляем кэш
    const cachedUser = userCache.get(userId);
    if (cachedUser) {
      const updatedCachedUser = { ...cachedUser, ...updates };
      userCache.set(userId, updatedCachedUser);
      console.log('Кэш пользователя обновлен:', updatedCachedUser);
    }
    
    // Обновляем данные в localStorage
    try {
      if (updates.current_streak) {
        localStorage.setItem('user_streak_' + userId, updates.current_streak.toString());
        localStorage.setItem('streak', updates.current_streak.toString());
      }
      if (updates.last_checkin) {
        localStorage.setItem('last_checkin_' + userId, updates.last_checkin);
      }
      console.log('Данные пользователя обновлены в localStorage');
    } catch (localStorageError) {
      console.error('Ошибка при обновлении localStorage:', localStorageError);
    }
    
    return true;
  } catch (error) {
    console.error('Критическая ошибка при обновлении пользователя:', error);
    
    // Обновляем данные в localStorage даже при ошибке
    try {
      if (updates.current_streak) {
        localStorage.setItem('user_streak_' + userId, updates.current_streak.toString());
        localStorage.setItem('streak', updates.current_streak.toString());
      }
      if (updates.last_checkin) {
        localStorage.setItem('last_checkin_' + userId, updates.last_checkin);
      }
      console.log('Данные пользователя обновлены в localStorage после ошибки');
    } catch (localStorageError) {
      console.error('Ошибка при обновлении localStorage после ошибки:', localStorageError);
    }
    
    // Не выбрасываем ошибку, чтобы не прерывать выполнение функции
    return false;
  }
}

async function incrementXP(userId, amount) {
  userId = String(userId);
  console.log('Увеличение XP для пользователя:', userId, 'на', amount);
  console.log('Конфигурация Supabase:', {
    url: supabaseClient.supabaseUrl,
    headers: supabaseClient.headers
  });
  
  try {
    // Используем прямой запрос к таблице вместо RPC-функции
    console.log('Получаем текущие данные пользователя...');
    console.log('URL запроса:', `${supabaseClient.supabaseUrl}/rest/v1/users?telegram_id=eq.${userId}&select=points`);
    
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('points')
      .eq('telegram_id', userId)
      .single();
    
    console.log('Результат запроса данных пользователя:', userData, userError);
    
    if (userError && userError.code !== 'PGRST116') { // Не ошибка "не найдено"
      console.error('Ошибка при получении данных пользователя:', userError);
      throw userError;
    }
    
    const currentPoints = userData?.points || 0;
    const newPoints = currentPoints + amount;
    console.log('Текущие очки:', currentPoints, 'Новые очки:', newPoints);
    
    if (userData) {
      // Обновляем существующего пользователя
      console.log('Обновляем существующего пользователя...');
      const { error: updateError } = await supabaseClient
        .from('users')
        .update({ points: newPoints })
        .eq('telegram_id', userId);
      
      if (updateError) {
        console.error('Ошибка при обновлении пользователя:', updateError);
        throw updateError;
      }
      console.log('Пользователь успешно обновлен');
    } else {
      // Создаем нового пользователя
      console.log('Создаем нового пользователя...');
      const { error: insertError } = await supabaseClient
        .from('users')
        .insert([{ telegram_id: userId, points: amount }]);
      
      if (insertError) {
        console.error('Ошибка при создании пользователя:', insertError);
        throw insertError;
      }
      console.log('Новый пользователь успешно создан');
    }
    
    // Обновляем кэш
    const cachedUser = userCache.get(userId);
    if (cachedUser) {
      cachedUser.points = (cachedUser.points || 0) + amount;
      userCache.set(userId, cachedUser);
      console.log('Кэш пользователя обновлен:', cachedUser);
    }
    
    // Обновляем localStorage для синхронизации между устройствами
    try {
      // Получаем текущее значение XP из базы данных
      console.log('Получаем обновленные данные для localStorage...');
      const { data, error } = await supabaseClient
        .from('users')
        .select('points')
        .eq('telegram_id', userId)
        .single();
      
      console.log('Результат запроса для localStorage:', data, error);
      
      if (!error && data) {
        const totalXp = data.points || 0;
        console.log('Обновление totalXp в localStorage по ID:', userId, totalXp);
        
        // Сохраняем значение в localStorage с использованием ID пользователя
        localStorage.setItem('user_points_' + userId, totalXp.toString());
        
        // Также обновляем старый ключ для обратной совместимости
        localStorage.setItem('totalXp', totalXp.toString());
        console.log('localStorage успешно обновлен');
      } else {
        // Если не удалось получить данные из базы, используем локальное значение
        const currentLocalPoints = parseInt(localStorage.getItem('user_points_' + userId) || '0');
        const newLocalPoints = currentLocalPoints + amount;
        localStorage.setItem('user_points_' + userId, newLocalPoints.toString());
        localStorage.setItem('totalXp', newLocalPoints.toString());
        console.log('localStorage обновлен с локальными данными:', newLocalPoints);
      }
    } catch (localStorageError) {
      console.error('Ошибка при обновлении localStorage:', localStorageError);
      // Если произошла ошибка, обновляем localStorage с локальными данными
      const currentLocalPoints = parseInt(localStorage.getItem('user_points_' + userId) || '0');
      const newLocalPoints = currentLocalPoints + amount;
      localStorage.setItem('user_points_' + userId, newLocalPoints.toString());
      localStorage.setItem('totalXp', newLocalPoints.toString());
      console.log('localStorage обновлен с локальными данными после ошибки:', newLocalPoints);
    }
    
    return true;
  } catch (error) {
    console.error('Критическая ошибка при начислении XP:', error);
    
    // Даже при ошибке обновляем localStorage, чтобы пользователь видел изменения
    const currentLocalPoints = parseInt(localStorage.getItem('user_points_' + userId) || '0');
    const newLocalPoints = currentLocalPoints + amount;
    localStorage.setItem('user_points_' + userId, newLocalPoints.toString());
    localStorage.setItem('totalXp', newLocalPoints.toString());
    console.log('localStorage обновлен после критической ошибки:', newLocalPoints);
    
    // Не выбрасываем ошибку, чтобы не прерывать выполнение функции
    return false;
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
  console.log('Создание чекина для пользователя:', userId, 'стрик:', streak, 'XP:', xpEarned);

  try {
    console.log('Отправляем запрос на создание чекина...');
    console.log('URL Supabase:', supabaseClient.supabaseUrl);
    console.log('Данные для вставки:', {
      user_id: userId,
      streak_count: streak,
      xp_earned: xpEarned
    });
    
    const { data, error } = await supabaseClient
      .from('checkins')
      .insert({
        user_id: userId,
        streak_count: streak,
        xp_earned: xpEarned
      })
      .select();

    if (error) {
      console.error('Ошибка при создании чекина:', error);
      throw error;
    }

    console.log('Чекин успешно создан:', data);

    // Обновляем кэш последнего чекина
    const now = new Date().toISOString();
    checkinCache.set(userId, {
      lastCheckin: now,
      timestamp: Date.now()
    });
    console.log('Кэш последнего чекина обновлен');

    // Обновляем кэш пользователя
    const cachedUser = userCache.get(userId);
    if (cachedUser) {
      cachedUser.last_checkin = now;
      cachedUser.current_streak = streak;
      if ((cachedUser.max_streak || 0) < streak) {
        cachedUser.max_streak = streak;
      }
      userCache.set(userId, cachedUser);
      console.log('Кэш пользователя обновлен:', cachedUser);
    }

    // Сохраняем дату последнего чекина в localStorage
    try {
      localStorage.setItem('last_checkin_' + userId, now);
      localStorage.setItem('user_streak_' + userId, streak.toString());
      console.log('Данные чекина сохранены в localStorage');
    } catch (localStorageError) {
      console.error('Ошибка при сохранении данных чекина в localStorage:', localStorageError);
    }

    return true;
  } catch (error) {
    console.error('Критическая ошибка при создании чекина:', error);
    
    // Даже при ошибке сохраняем данные в localStorage
    try {
      const now = new Date().toISOString();
      localStorage.setItem('last_checkin_' + userId, now);
      localStorage.setItem('user_streak_' + userId, streak.toString());
      console.log('Данные чекина сохранены в localStorage после ошибки');
    } catch (localStorageError) {
      console.error('Ошибка при сохранении данных чекина в localStorage после ошибки:', localStorageError);
    }
    
    // Не выбрасываем ошибку, чтобы не прерывать выполнение функции
    return false;
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
