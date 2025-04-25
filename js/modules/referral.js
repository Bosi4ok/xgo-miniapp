import { checkReferralCode, createReferral, incrementXP, getReferralsCount, updateUser } from './database.js';

// Генерация реферального кода
function generateReferralCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const codeLength = 8;
  let code = '';
  
  for (let i = 0; i < codeLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }
  
  return code;
}

// Получение или создание реферального кода
export async function ensureReferralCode(userData) {
  if (!userData?.id) {
    console.error('Нет данных пользователя');
    throw new Error('Нет данных пользователя');
  }

  try {
    // Сначала проверяем существующий код
    const existingCode = await getReferralCode(userData.id);
    if (existingCode) {
      return existingCode;
    }

    // Генерируем новый код
    const newCode = generateReferralCode();

    // Проверяем уникальность
    try {
      await checkReferralCode(newCode);
      // Если код существует, генерируем новый
      return await ensureReferralCode(userData);
    } catch (error) {
      if (!error.message?.includes('not found')) {
        throw error;
      }
    }

    // Сохраняем новый код
    await updateUser(userData.id, { referral_code: newCode });
    return newCode;
  } catch (error) {
    console.error('Ошибка при создании реферального кода:', error);
    throw error;
  }
}

// Применение реферального кода
export async function applyReferralCode(userData, code) {
  try {
    // Проверяем валидность кода
    const referrer = await checkReferralCode(code);
    if (!referrer) {
      return { success: false, message: 'Неверный реферальный код' };
    }

    // Проверяем, не пытается ли пользователь использовать свой код
    if (referrer.telegram_id === String(userData.id)) {
      return { success: false, message: 'Нельзя использовать свой реферальный код' };
    }

    // Проверяем, не использовал ли пользователь уже реферальный код
    const referrals = await getReferralsCount(userData.id);
    if (referrals > 0) {
      return { success: false, message: 'Вы уже использовали реферальный код' };
    }

    // Создаем запись о реферале
    await createReferral(referrer.telegram_id, userData.id);

    // Начисляем XP
    await incrementXP(referrer.telegram_id, 50); // реферер получает 50 XP
    await incrementXP(userData.id, 20); // новый пользователь получает 20 XP

    return { 
      success: true, 
      message: 'Реферальный код успешно применен! Вы получили 20 XP'
    };
  } catch (error) {
    console.error('Ошибка при применении реферального кода:', error);
    return { 
      success: false, 
      message: 'Произошла ошибка при применении кода'
    };
  }
}

// Обновление счетчика рефералов
export async function updateReferralsCount(userData) {
  try {
    const count = await getReferralsCount(userData.id);
    document.getElementById('referrals-count').textContent = count;
  } catch (error) {
    console.error('Ошибка при обновлении счетчика рефералов:', error);
  }
}
