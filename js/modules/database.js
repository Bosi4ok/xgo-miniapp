import { supabaseClient } from '../../supabase-config.js';
import { CacheManager } from './cache.js';

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
  const cachedUser = CacheManager.get(cacheKey);
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
      CacheManager.set(cacheKey, data); // Сохраняем в кэш
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

async function createUser(userData) {
  const userId = String(userData.id); // Убедимся, что ID - строка
  const username = userData.username || `Player_${userId.substring(0, 4)}`; // Используем username или генерируем запасной вариант
  const firstName = userData.first_name || 'Unknown';
  const lastName = userData.last_name || '';
  const cacheKey = `user:${userId}`;

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
    CacheManager.set(cacheKey, data); // Добавляем нового пользователя в кэш
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

async function updateUser(userId, updates) {
  console.log(`Обновление пользователя ${userId} данными:`, updates);

  // Гарантируем, что userId - это строка
  let finalUserId = userId;
  if (typeof finalUserId === 'object' && finalUserId !== null && finalUserId.id) {
    finalUserId = String(finalUserId.id);
  } else {
    finalUserId = String(finalUserId);
  }

  if (!finalUserId) {
    console.error('updateUser: Не предоставлен ID пользователя.');
    return null;
  }

  // 1. Попытка обновить в базе данных
  let dbError = null;
  let updatedData = null;
  try {
    const { data, error } = await supabaseClient
      .from('users')
      .update(updates)
      .eq('telegram_id', finalUserId) // Используем исправленный ID
      .select()
      .single(); // Ожидаем одну запись

    if (error) {
      console.error('Ошибка при обновлении пользователя:', error);
      
      // Проверяем, существует ли пользователь
      console.log('Проверяем, существует ли пользователь...');
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('telegram_id', finalUserId)
        .single();
      
      if (userError && userError.code !== 'PGRST116') { // Не ошибка "не найдено"
        console.error('Ошибка при проверке пользователя:', userError);
        throw userError;
      }
      
      if (!userData) {
        // Создаем нового пользователя
        console.log('Пользователь не найден, создаем нового...');
        const newUser = {
          telegram_id: finalUserId,
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
      updatedData = data;
    }

    // Обновляем кэш
    const cacheKey = `user:${finalUserId}`;
    const cachedUser = CacheManager.get(cacheKey);
    if (cachedUser) {
      const updatedCachedUser = { ...cachedUser, ...updates };
      CacheManager.set(cacheKey, updatedCachedUser);
      console.log('Кэш пользователя обновлен:', updatedCachedUser);
    }
    
    // Обновляем данные в localStorage
    try {
      if (updates.current_streak) {
        localStorage.setItem('user_streak_' + finalUserId, updates.current_streak.toString());
        localStorage.setItem('streak', updates.current_streak.toString());
      }
      if (updates.last_checkin) {
        localStorage.setItem('last_checkin_' + finalUserId, updates.last_checkin);
      }
      console.log('Данные пользователя обновлены в localStorage');
    } catch (localStorageError) {
      console.error('Ошибка при обновлении localStorage:', localStorageError);
    }
    
    return updatedData;
  } catch (error) {
    console.error('Критическая ошибка при обновлении пользователя:', error);
    
    // Обновляем данные в localStorage даже при ошибке
    try {
      if (updates.current_streak) {
        localStorage.setItem('user_streak_' + finalUserId, updates.current_streak.toString());
        localStorage.setItem('streak', updates.current_streak.toString());
      }
      if (updates.last_checkin) {
        localStorage.setItem('last_checkin_' + finalUserId, updates.last_checkin);
      }
      console.log('Данные пользователя обновлены в localStorage после ошибки');
    } catch (localStorageError) {
      console.error('Ошибка при обновлении localStorage после ошибки:', localStorageError);
    }
    
    // Не выбрасываем ошибку, чтобы не прерывать выполнение функции
    return null;
  }
}

async function incrementXP(userId, amount) {
  console.log(`Начисление XP для пользователя ${userId}: ${amount}`);

  // Гарантируем, что userId - это строка
  let finalUserId = userId;
  if (typeof finalUserId === 'object' && finalUserId !== null && finalUserId.id) {
    finalUserId = String(finalUserId.id);
  } else {
    finalUserId = String(finalUserId);
  }

  if (!finalUserId || amount <= 0) {
    console.error('incrementXP: Неверные параметры.', { finalUserId, amount });
    return null;
  }

  // Получаем текущие очки (лучше из БД или кэша, если он надежен)
  // Избегаем гонки состояний, используя RPC или прямое обновление

  // Вариант 1: RPC (предпочтительно, если есть)
  try {
    console.log(`Вызов RPC increment_xp для пользователя ${finalUserId} на сумму ${amount}`);
    const { data, error } = await supabaseClient.rpc('increment_xp', { user_id_param: finalUserId, xp_amount: amount });

    if (error) {
      console.error('Ошибка RPC increment_xp:', error);
      // Фолбэк на ручное обновление
      return await incrementXpManual(finalUserId, amount);
    } else {
      console.log('RPC increment_xp успешно выполнен. Результат (новые очки?):', data);
      // RPC может возвращать новые очки или просто статус успеха
      // Обновим кэш/localStorage, если нужно
      const userData = await getUserData(finalUserId); // Получим свежие данные
      return { success: true, newPoints: userData?.points };
    }
  } catch (rpcError) {
    console.error('Исключение при вызове RPC increment_xp:', rpcError);
    return await incrementXpManual(finalUserId, amount);
  }
}

// Вспомогательная функция для ручного обновления XP (фолбэк)
async function incrementXpManual(userId, amount) {
  console.warn(`Выполнение ручного обновления XP для пользователя ${userId}`);
  try {
    // 1. Получаем текущие данные пользователя
    const currentUserData = await getUserData(userId); // Используем getUserData, который может использовать кэш
    if (!currentUserData) {
      console.error(`incrementXpManual: Не найден пользователь ${userId}`);
      return null;
    }
    const currentPoints = currentUserData.points || 0;
    const newPoints = currentPoints + amount;

    // 2. Обновляем пользователя
    const updatedUser = await updateUser(userId, { points: newPoints });
    if (updatedUser) {
      console.log(`Ручное обновление XP для ${userId} успешно. Новые очки: ${newPoints}`);
      // Обновляем кэш свежими данными
      CacheManager.set(`user_${userId}`, updatedUser, USER_CACHE_LIFETIME);
      return { success: true, newPoints: newPoints };
    } else {
      console.error(`incrementXpManual: Ошибка при обновлении очков для пользователя ${userId}`);
      return null;
    }
  } catch (error) {
    console.error(`incrementXpManual: Исключение при ручном обновлении XP для ${userId}:`, error);
    return null;
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
async function createCheckin(userId, streakCount, xpEarned) {
  console.log(`Создание чекина для пользователя: ${userId} стриk: ${streakCount}, XP: ${xpEarned}`);
  if (!userId) {
      console.error('createCheckin: userId не предоставлен.');
      return { success: false, error: 'User ID is required' };
  }
  const checkinData = {
    user_id: userId, // Убедимся, что используем именно ID
    streak_count: streakCount,
    xp_earned: xpEarned
  };
  try {
    console.log('Отправляем запрос на создание чекина...');
    console.log('URL Supabase:', supabaseClient.supabaseUrl);
    console.log('Данные для вставки:', checkinData);
    
    const { data, error } = await supabaseClient
      .from('checkins')
      .insert([checkinData])
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
    const cacheKey = `user:${userId}`;
    const cachedUser = CacheManager.get(cacheKey);
    if (cachedUser) {
      cachedUser.last_checkin = now;
      cachedUser.current_streak = streakCount;
      if ((cachedUser.max_streak || 0) < streakCount) {
        cachedUser.max_streak = streakCount;
      }
      CacheManager.set(cacheKey, cachedUser);
      console.log('Кэш пользователя обновлен:', cachedUser);
    }

    // Сохраняем дату последнего чекина в localStorage
    try {
      localStorage.setItem('last_checkin_' + userId, now);
      localStorage.setItem('user_streak_' + userId, streakCount.toString());
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
      localStorage.setItem('user_streak_' + userId, streakCount.toString());
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

async function performCheckin(userData) {
  console.log('Попытка выполнить чекин для пользователя:', userData);
  if (!userData || (!userData.telegram_id && !userData.id)) { // Проверяем оба варианта
    console.error('performCheckin: Недостаточно данных пользователя для чекина (отсутствует telegram_id или id).', userData);
    return { success: false, message: 'Недостаточно данных пользователя.' };
  }

  // Гарантируем, что userId - это строка
  let userId = userData.telegram_id || userData.id; // Берем telegram_id или id
  if (typeof userId === 'object' && userId !== null && userId.id) {
       userId = String(userId.id); // Извлекаем ID если userData.telegram_id был объектом {id: ...}
  } else {
       userId = String(userId); // Убеждаемся, что это строка
  }

  console.log(`Извлечен userId для чекина: ${userId}`);

  const now = new Date();
  // Данные пользователя могут быть неполными из кэша, получим актуальные из БД, если нужно
  let currentUserData = await getUserData(userId); // Получаем свежие данные
  if (!currentUserData) {
      console.error(`performCheckin: Не удалось получить актуальные данные для пользователя ${userId}`);
      // Можно попробовать использовать переданные userData, если они есть
      currentUserData = userData; 
      // Но лучше вернуть ошибку, если базовых данных нет
      if (!currentUserData.current_streak === undefined) { 
           return { success: false, message: 'Не удалось получить данные пользователя из БД.' };
      }
      console.warn(`Используются переданные данные для пользователя ${userId}, т.к. БД недоступны`);
  }

  const lastCheckinDate = currentUserData.last_checkin ? new Date(currentUserData.last_checkin) : null;

  // Проверяем, прошел ли день с последнего чекина
  if (lastCheckinDate && isSameDay(lastCheckinDate, now)) {
    console.log('Чекин уже выполнен сегодня.');
    return { success: false, message: 'Чекин уже выполнен сегодня.' };
  }

  // Проверяем, есть ли у пользователя реферальный код
  const referralCode = currentUserData.referral_code;
  if (referralCode) {
    console.log('Пользователь имеет реферальный код:', referralCode);
    // Проверяем, активен ли реферальный код
    const referralData = await checkReferralCode(referralCode);
    if (referralData) {
      console.log('Реферальный код активен:', referralData);
      // Обновляем данные пользователя
      const updatedUserData = await updateUser(userId, {
        referral_code: null // Сбрасываем реферальный код
      });
      if (!updatedUserData) {
        console.error('Ошибка при обновлении данных пользователя:', updatedUserData);
        return { success: false, message: 'Ошибка при обновлении данных пользователя.' };
      }
    } else {
      console.log('Реферальный код не найден или не активен.');
    }
  }

  // Выполняем чекин
  const streakCount = currentUserData.current_streak + 1;
  const xpEarned = calculateXpEarned(streakCount);
  console.log('Выполняем чекин для пользователя:', userId, 'стрик:', streakCount, 'XP:', xpEarned);

  // Создаем новую запись о чекине
  try {
    // Передаем ID пользователя, а не весь объект
    const checkinResult = await createCheckin(userId, streakCount, xpEarned);
    if (checkinResult.success) {
      console.log(`Чекин успешен для пользователя ${userId}. Стрик: ${streakCount}, XP: ${xpEarned}`);

      // Обновляем данные пользователя
      const updatedUserData = await updateUser(userId, {
        current_streak: streakCount,
        max_streak: Math.max(currentUserData.max_streak, streakCount),
        last_checkin: now.toISOString()
      });
      if (!updatedUserData) {
        console.error('Ошибка при обновлении данных пользователя:', updatedUserData);
        return { success: false, message: 'Ошибка при обновлении данных пользователя.' };
      }

      // Начисляем XP
      const xpResult = await incrementXP(userId, xpEarned); 
      if (xpResult && xpResult.newPoints !== undefined) {
        updatedUserData.points = xpResult.newPoints; // Обновляем очки в возвращаемом объекте
      } else {
        console.error('Ошибка при начислении XP, очки могут быть неактуальны');
        // Не возвращаем ошибку, но логируем
      }

      // Обновляем кэш и localStorage с финальными данными
      CacheManager.set(`user_${userId}`, updatedUserData, USER_CACHE_LIFETIME);
      try {
        localStorage.setItem('last_checkin_' + userId, now.toISOString());
        localStorage.setItem('user_streak_' + userId, streakCount.toString());
        // Сохраняем все данные пользователя в localStorage для консистентности?
        // localStorage.setItem('currentUserData', JSON.stringify(updatedUserData));
        console.log('LocalStorage обновлен после успешного чекина');
      } catch (e) { console.error('Ошибка обновления localStorage', e); }

      return { success: true, message: 'Чекин успешен.', user: updatedUserData }; // Возвращаем актуальные данные
    } else {
      // Ошибка при создании чекина в БД
      console.error(`Ошибка при создании записи чекина в БД для пользователя ${userId}.`);
      // Локальные данные НЕ обновляем, так как чекин не прошел
      // CacheManager.set(`user_${userId}`, currentUserData, USER_CACHE_LIFETIME); // Не обновляем кеш
      return { success: false, message: checkinResult.error || 'Ошибка записи чекина в БД.' };
    }
  } catch (error) {
    console.error(`Критическая ошибка в performCheckin для пользователя ${userId}:`, error);
    return { success: false, message: 'Критическая ошибка во время чекина.' };
  }
}

function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

function calculateXpEarned(streakCount) {
  // Формула начисления XP
  return streakCount * 10;
}
