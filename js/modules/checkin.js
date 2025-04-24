import { getLastCheckin, createCheckin, incrementXP, updateUser } from './database.js';

// Проверка возможности чекина
export async function canCheckin(userData) {
  try {
    const lastCheckin = await getLastCheckin(userData.id);
    if (!lastCheckin) return true;

    const lastCheckinDate = new Date(lastCheckin);
    const now = new Date();

    // Проверяем, прошли ли сутки с последнего чекина
    return !isSameDay(lastCheckinDate, now);
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

  try {
    // Проверяем возможность чекина
    const canDoCheckin = await canCheckin(userData);
    if (!canDoCheckin) {
      return {
        success: false,
        message: 'Вы уже выполнили чекин сегодня'
      };
    }

    const now = new Date();
    const lastCheckin = await getLastCheckin(userData.id);
    const lastCheckinDate = lastCheckin ? new Date(lastCheckin) : null;

    // Вычисляем стрик
    let streak = 1;
    if (lastCheckinDate) {
      const daysDiff = getDaysDifference(lastCheckinDate, now);
      if (daysDiff === 1) {
        streak = (userData.streak || 0) + 1;
      }
    }

    // Вычисляем XP
    const baseXP = 10;
    const streakBonus = Math.min(streak - 1, 7) * 5;
    const totalXP = baseXP + streakBonus;

    // Выполняем все операции параллельно
    await Promise.all([
      createCheckin(userData.id, streak, totalXP),
      updateUser(userData.id, {
        last_checkin: now.toISOString(),
        streak: streak
      }),
      incrementXP(userData.id, totalXP)
    ]);

    return {
      success: true,
      message: `Чекин выполнен! +${totalXP} XP${streakBonus > 0 ? ` (включая бонус ${streakBonus} XP за серию ${streak} дней)` : ''}`,
      streak: streak,
      xp: totalXP
    };
  } catch (error) {
    console.error('Ошибка при выполнении чекина:', error);
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
