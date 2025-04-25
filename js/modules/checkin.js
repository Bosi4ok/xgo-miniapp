import { getLastCheckin, createCheckin, incrementXP, updateUser } from './database.js';

// Кэш для чекина
let checkinCache = {};
const CHECKIN_CACHE_LIFETIME = 60000; // 1 минута

// Проверка возможности чекина
export async function canCheckin(userData) {
  const userId = String(userData.id);
  const now = Date.now();

  // Проверяем кэш
  if (checkinCache[userId] && (now - checkinCache[userId].timestamp < CHECKIN_CACHE_LIFETIME)) {
    return checkinCache[userId].canCheckin;
  }

  try {
    const lastCheckin = await getLastCheckin(userId);
    const canDoCheckin = !lastCheckin || !isSameDay(new Date(lastCheckin), new Date());

    // Обновляем кэш
    checkinCache[userId] = {
      canCheckin: canDoCheckin,
      timestamp: now
    };

    return canDoCheckin;
  } catch (error) {
    console.error('Ошибка при проверке возможности чекина:', error);
    return false;
  }
}

// Выполнение чекина
export async function performCheckin(userData) {
  if (!userData?.id) {
    console.error('Нет данных пользователя');
    return {
      success: false,
      message: 'Ошибка: нет данных пользователя'
    };
  }

  const userId = String(userData.id);

  try {
    // Проверяем возможность чекина из кэша
    const canDoCheckin = await canCheckin(userData);
    if (!canDoCheckin) {
      return {
        success: false,
        message: 'Вы уже выполнили чекин сегодня'
      };
    }

    const now = new Date();
    
    // Используем кэшированные данные для стрика
    let streak = 1;
    if (checkinCache[userId]?.lastCheckin) {
      const daysDiff = getDaysDifference(new Date(checkinCache[userId].lastCheckin), now);
      if (daysDiff === 1) {
        streak = (userData.current_streak || 0) + 1;
      }
    }

    // Вычисляем XP
    const baseXP = 10;
    const streakBonus = Math.min(streak - 1, 7) * 5;
    const totalXP = baseXP + streakBonus;

    // Обновляем кэш сразу
    checkinCache[userId] = {
      ...checkinCache[userId],
      canCheckin: false,
      lastCheckin: now.toISOString(),
      timestamp: Date.now()
    };

    // Выполняем все операции параллельно
    await Promise.all([
      createCheckin(userId, streak, totalXP),
      updateUser(userId, {
        last_checkin: now.toISOString(),
        current_streak: streak
      }),
      incrementXP(userId, totalXP)
    ]);

    return {
      success: true,
      message: `Чекин выполнен! +${totalXP} XP${streakBonus > 0 ? ` (включая бонус ${streakBonus} XP за серию ${streak} дней)` : ''}`,
      streak: streak,
      xp: totalXP
    };
  } catch (error) {
    console.error('Ошибка при выполнении чекина:', error);
    
    // Восстанавливаем кэш в случае ошибки
    if (checkinCache[userId]) {
      checkinCache[userId].canCheckin = true;
    }

    return {
      success: false,
      message: 'Произошла ошибка при выполнении чекина'
    };
  }
}

// Вспомогательные функции
function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

function getDaysDifference(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.round(Math.abs((date2 - date1) / oneDay));
  return diffDays;
}
