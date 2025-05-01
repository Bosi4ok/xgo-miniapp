import { supabase } from '../supabase-config.js';

// Функции для работы с пользователями
export async function getUser(telegramId) {
  console.log('Получение пользователя с ID:', telegramId);
  try {
    // Всегда преобразуем telegramId в строку
    const telegramIdStr = String(telegramId);
    console.log('Запрос пользователя с telegram_id (строка):', telegramIdStr);
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramIdStr)
      .single();
    
    if (error) {
      console.error('Ошибка при получении пользователя:', error);
      console.error('Код ошибки:', error.code);
      console.error('Сообщение ошибки:', error.message);
      console.error('Детали ошибки:', error.details);
      return null;
    }
    
    console.log('Получен пользователь:', data);
    return data;
  } catch (error) {
    console.error('Критическая ошибка при получении пользователя:', error);
    return null;
  }
}

export async function createUser(userData) {
  console.log('Создание нового пользователя:', userData);
  try {
    // Убедимся, что telegram_id передан как строка
    const userDataWithStringId = {
      ...userData,
      telegram_id: String(userData.telegram_id)
    };
    
    console.log('Отправка данных для создания пользователя (с telegram_id как строкой):', userDataWithStringId);
    
    const { data, error } = await supabase
      .from('users')
      .insert([userDataWithStringId])
      .select();
    
    if (error) {
      console.error('Ошибка при создании пользователя:', error);
      console.error('Код ошибки:', error.code);
      console.error('Сообщение ошибки:', error.message);
      console.error('Детали ошибки:', error.details);
      return null;
    }
    
    console.log('Пользователь успешно создан:', data);
    return data[0];
  } catch (error) {
    console.error('Критическая ошибка при создании пользователя:', error);
    return null;
  }
}

export async function updateUser(telegramId, updates) {
  console.log('Обновление пользователя с ID:', telegramId, 'Обновления:', updates);
  try {
    // Всегда преобразуем telegramId в строку
    const telegramIdStr = String(telegramId);
    console.log('Обновление пользователя с telegram_id (строка):', telegramIdStr);
    
    // Проверяем, есть ли в обновлениях telegram_id, и если есть, преобразуем его в строку
    const updatesWithStringId = { ...updates };
    if (updatesWithStringId.telegram_id !== undefined) {
      updatesWithStringId.telegram_id = String(updatesWithStringId.telegram_id);
    }
    
    console.log('Отправка данных для обновления пользователя:', updatesWithStringId);
    
    const { data, error } = await supabase
      .from('users')
      .update(updatesWithStringId)
      .eq('telegram_id', telegramIdStr)
      .select();
    
    if (error) {
      console.error('Ошибка при обновлении пользователя:', error);
      console.error('Код ошибки:', error.code);
      console.error('Сообщение ошибки:', error.message);
      console.error('Детали ошибки:', error.details);
      return null;
    }
    
    console.log('Пользователь успешно обновлен:', data);
    return data[0];
  } catch (error) {
    console.error('Критическая ошибка при обновлении пользователя:', error);
    return null;
  }
}

export async function incrementUserXP(telegramId, amount) {
  console.log('Увеличение XP для пользователя:', telegramId, 'на', amount);
  try {
    // Сначала получаем пользователя
    const user = await getUser(telegramId);
    
    if (user) {
      // Если пользователь существует, обновляем его XP
      const currentPoints = user.points || 0;
      const newPoints = currentPoints + amount;
      
      return await updateUser(telegramId, { points: newPoints });
    } else {
      // Если пользователь не существует, создаем нового
      return await createUser({
        telegram_id: telegramId,
        points: amount,
        current_streak: 0,
        max_streak: 0
      });
    }
  } catch (error) {
    console.error('Критическая ошибка при увеличении XP:', error);
    return null;
  }
}

// Функции для работы с чекинами
export async function createCheckin(userId, streak, xpEarned) {
  console.log('Создание чекина для пользователя:', userId, 'стрик:', streak, 'XP:', xpEarned);
  try {
    // Всегда преобразуем userId в строку
    const userIdStr = String(userId);
    console.log('Создание чекина для пользователя (строка):', userIdStr);
    
    // Убедимся, что streak и xpEarned являются числами
    const streakNum = Number(streak);
    const xpEarnedNum = Number(xpEarned);
    
    console.log('Отправка данных для создания чекина:', {
      user_id: userIdStr,
      streak_count: streakNum,
      xp_earned: xpEarnedNum
    });
    
    const { data, error } = await supabase
      .from('checkins')
      .insert({
        user_id: userIdStr,
        streak_count: streakNum,
        xp_earned: xpEarnedNum
      })
      .select();
    
    if (error) {
      console.error('Ошибка при создании чекина:', error);
      console.error('Код ошибки:', error.code);
      console.error('Сообщение ошибки:', error.message);
      console.error('Детали ошибки:', error.details);
      
      // Пробуем использовать RPC вместо прямого INSERT
      console.log('Попытка использовать RPC для создания чекина...');
      try {
        const { error: rpcError } = await supabase.rpc('create_checkin', {
          p_user_id: userIdStr,
          p_streak_count: streakNum,
          p_xp_earned: xpEarnedNum
        });
        
        if (rpcError) {
          console.error('Ошибка RPC при создании чекина:', rpcError);
          return null;
        }
      } catch (rpcError) {
        console.error('Критическая ошибка RPC при создании чекина:', rpcError);
      }
      
      return null;
    }
    
    console.log('Чекин успешно создан:', data);
    
    // Обновляем данные пользователя
    const now = new Date().toISOString();
    // Получаем текущие данные пользователя
    const user = await getUser(userIdStr);
    
    // Также обновляем XP пользователя
    console.log('Обновление данных пользователя после чекина...');
    
    // Сначала пробуем использовать RPC для увеличения XP
    try {
      console.log('Вызов RPC increment_xp...');
      const { error: xpError } = await supabase.rpc('increment_xp', {
        user_id: userIdStr,
        xp_amount: xpEarnedNum
      });
      
      if (xpError) {
        console.error('Ошибка RPC при увеличении XP:', xpError);
      } else {
        console.log('XP успешно увеличен через RPC');
      }
    } catch (xpError) {
      console.error('Критическая ошибка RPC при увеличении XP:', xpError);
    }
    
    // Обновляем остальные данные пользователя
    const updateResult = await updateUser(userIdStr, {
      last_checkin: now,
      current_streak: streakNum,
      max_streak: Math.max(streakNum, user?.max_streak || 0)
    });
    
    console.log('Результат обновления пользователя:', updateResult);
    
    return data[0];
  } catch (error) {
    console.error('Критическая ошибка при создании чекина:', error);
    return null;
  }
}

// Функция для проверки подключения к Supabase
export async function testSupabaseConnection() {
  console.log('Тестирование подключения к Supabase...');
  console.log('URL:', supabase.supabaseUrl);
  console.log('Ключ:', supabase.supabaseKey ? 'Установлен' : 'Не установлен');
  
  try {
    // Пробуем выполнить простой запрос
    const { data, error } = await supabase
      .from('users')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.error('Ошибка при тестировании подключения:', error);
      return {
        success: false,
        error: error
      };
    }
    
    console.log('Подключение успешно. Количество пользователей:', data);
    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('Критическая ошибка при тестировании подключения:', error);
    return {
      success: false,
      error: error
    };
  }
}

/**
 * Проверяет существование таблиц в Supabase
 * @returns {Promise<Object>} Результат проверки таблиц
 */
export async function checkTables() {
  console.log('Проверка существования таблиц в Supabase...');
  
  try {
    const tables = {};
    
    // Проверяем таблицу users
    const usersResult = await supabase.from('users').select('count(*)').limit(1);
    tables.users = {
      exists: !usersResult.error,
      error: usersResult.error ? usersResult.error.message : null
    };
    
    // Проверяем таблицу checkins
    const checkinsResult = await supabase.from('checkins').select('count(*)').limit(1);
    tables.checkins = {
      exists: !checkinsResult.error,
      error: checkinsResult.error ? checkinsResult.error.message : null
    };
    
    // Проверяем таблицу referrals
    const referralsResult = await supabase.from('referrals').select('count(*)').limit(1);
    tables.referrals = {
      exists: !referralsResult.error,
      error: referralsResult.error ? referralsResult.error.message : null
    };
    
    // Проверяем функцию increment_xp
    try {
      const rpcResult = await supabase.rpc('increment_xp', { user_id: 'test', xp_amount: 1 });
      tables.increment_xp = {
        exists: !rpcResult.error,
        error: rpcResult.error ? rpcResult.error.message : null
      };
    } catch (e) {
      tables.increment_xp = {
        exists: false,
        error: e.message || 'Ошибка при вызове RPC'
      };
    }
    
    console.log('Результаты проверки таблиц:', tables);
    return {
      success: true,
      tables: tables
    };
  } catch (error) {
    console.error('Критическая ошибка при проверке таблиц:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
