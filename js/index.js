import { loadModules } from './loader.js';

// Глобальные переменные
let userData = null;
let moduleLoader = null;

// Инициализация приложения
async function initializeApp() {
    try {
        // Инициализация Telegram
        const tg = window.Telegram?.WebApp;
        if (!tg) {
            throw new Error('Это приложение можно открыть только в Telegram');
        }

        tg.ready();
        userData = tg.initDataUnsafe?.user;
        if (!userData) {
            throw new Error('Не удалось получить данные пользователя');
        }

        // Загружаем базовые модули
        moduleLoader = await loadModules();

        // Загружаем и инициализируем основные модули
        const database = await moduleLoader.loadModule('database');
        await database.initUser(userData);

        // Инициализируем UI
        const ui = await moduleLoader.loadModule('ui');
        ui.init();

        // Настраиваем обработчики событий
        setupEventListeners();

    } catch (error) {
        console.error('Initialization error:', error);
        alert('Не удалось загрузить приложение: ' + error.message);
    }
}

// Настройка обработчиков событий
async function setupEventListeners() {
    try {
        // Загружаем необходимые модули
        const [checkin, referral] = await Promise.all([
            moduleLoader.loadModule('checkin'),
            moduleLoader.loadModule('referral')
        ]);

        // Обработчик чекина
        document.getElementById('checkinButton')?.addEventListener('click', async () => {
            try {
                const result = await checkin.performCheckin(userData);
                showModal('Успех!', `Вы получили ${result.xpEarned} XP! Ваш текущий стрик: ${result.newStreak}`);
            } catch (error) {
                showModal('Ошибка', error.message);
            }
        });

        // Обработчики рефералов
        document.getElementById('referralButton')?.addEventListener('click', async () => {
            try {
                const code = await referral.getReferralCode(userData);
                showModal('Ваш реферальный код', code);
            } catch (error) {
                showModal('Ошибка', error.message);
            }
        });

        document.getElementById('applyReferralButton')?.addEventListener('click', async () => {
            const code = prompt('Введите реферальный код:');
            if (!code) return;

            try {
                const result = await referral.applyReferralCode(code, userData);
                showModal('Успех!', `Вы получили ${result.xpEarned} XP за использование реферального кода!`);
            } catch (error) {
                showModal('Ошибка', error.message);
            }
        });

        // Обработчики модального окна
        document.querySelector('.close')?.addEventListener('click', hideModal);
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('modal');
            if (event.target === modal) {
                hideModal();
            }
        });
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

// База данных
async function withTimeout(promise, cacheKey = null, ms = 5000) {
  if (cacheKey) {
    const cached = getCache(cacheKey);
    if (cached) return cached;
  }

  try {
    const result = await Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);
    if (cacheKey) setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Database error:', error);
    if (cacheKey) {
      const cached = getCache(cacheKey);
      if (cached) return cached;
    }
    throw error;
  }
}

// Основные функции
async function initUser() {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('users')
        .select('*')
        .eq('telegram_id', String(userData.id))
        .single(),
      'user'
    );

    if (error) {
      if (error.code === 'PGRST116') {
        return await createUser();
      }
      throw error;
    }

    dbUser = data;
    return data;
  } catch (error) {
    console.error('Init user error:', error);
    throw error;
  }
}

async function createUser() {
  const { data, error } = await withTimeout(
    supabase
      .from('users')
      .insert({
        telegram_id: String(userData.id),
        points: 0,
        streak: 0,
        last_checkin: null
      })
      .select()
      .single()
  );

  if (error) throw error;
  dbUser = data;
  return data;
}

async function updateUser(updates) {
  const { error } = await withTimeout(
    supabase
      .from('users')
      .update(updates)
      .eq('telegram_id', String(userData.id))
  );

  if (error) throw error;
  Object.assign(dbUser, updates);
  setCache('user', dbUser);
}

// Чекины
async function performCheckin() {
  const now = new Date();
  const lastCheckin = dbUser.last_checkin ? new Date(dbUser.last_checkin) : null;
  
  // Проверяем, можно ли выполнить чекин
  if (lastCheckin) {
    const lastCheckinDay = lastCheckin.toDateString();
    const todayString = now.toDateString();
    
    if (lastCheckinDay === todayString) {
      throw new Error('Вы уже выполнили чекин сегодня');
    }
  }

  // Вычисляем стрик
  let newStreak = 1;
  if (lastCheckin) {
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    if (lastCheckin.toDateString() === oneDayAgo.toDateString()) {
      newStreak = dbUser.streak + 1;
    }
  }

  // Вычисляем награду
  const baseXP = 100;
  const streakBonus = Math.min(newStreak * 10, 100);
  const totalXP = baseXP + streakBonus;

  // Обновляем данные одним запросом
  await withTimeout(
    supabase.rpc('perform_checkin', {
      user_id: String(userData.id),
      new_streak: newStreak,
      xp_amount: totalXP
    })
  );

  // Обновляем локальные данные
  dbUser.streak = newStreak;
  dbUser.points = (dbUser.points || 0) + totalXP;
  dbUser.last_checkin = now.toISOString();
  setCache('user', dbUser);

  return {
    success: true,
    xpEarned: totalXP,
    newStreak,
    totalPoints: dbUser.points
  };
}

// Рефералы
async function getReferralCode() {
  if (!dbUser.referral_code) {
    const code = generateReferralCode();
    await updateUser({ referral_code: code });
  }
  return dbUser.referral_code;
}

function generateReferralCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function applyReferralCode(code) {
  // Проверяем код
  const { data: referrer, error } = await withTimeout(
    supabase
      .from('users')
      .select('telegram_id')
      .eq('referral_code', code)
      .single()
  );

  if (error || !referrer) {
    throw new Error('Неверный реферальный код');
  }

  if (referrer.telegram_id === String(userData.id)) {
    throw new Error('Нельзя использовать свой собственный код');
  }

  // Создаем реферал и начисляем XP одним запросом
  const { error: refError } = await withTimeout(
    supabase.rpc('apply_referral', {
      referrer_id: referrer.telegram_id,
      referred_id: String(userData.id)
    })
  );

  if (refError) throw refError;

  // Обновляем кэш
  dbUser.points = (dbUser.points || 0) + 100;
  setCache('user', dbUser);

  return {
    success: true,
    xpEarned: 100,
    totalPoints: dbUser.points
  };
}

// UI функции
function showModal(title, content) {
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const modalContent = document.getElementById('modalContent');
  
  modalTitle.textContent = title;
  modalContent.textContent = content;
  modal.style.display = 'block';
}

function hideModal() {
  const modal = document.getElementById('modal');
  modal.style.display = 'none';
}

// Обработчики событий
document.getElementById('checkinButton')?.addEventListener('click', async () => {
  try {
    const result = await performCheckin();
    showModal('Успех!', `Вы получили ${result.xpEarned} XP! Ваш текущий стрик: ${result.newStreak}`);
  } catch (error) {
    showModal('Ошибка', error.message);
  }
});

document.getElementById('referralButton')?.addEventListener('click', async () => {
  try {
    const code = await getReferralCode();
    showModal('Ваш реферальный код', code);
  } catch (error) {
    showModal('Ошибка', error.message);
  }
});

document.getElementById('applyReferralButton')?.addEventListener('click', async () => {
  const code = prompt('Введите реферальный код:');
  if (!code) return;

  try {
    const result = await applyReferralCode(code);
    showModal('Успех!', `Вы получили ${result.xpEarned} XP за использование реферального кода!`);
  } catch (error) {
    showModal('Ошибка', error.message);
  }
});

// Инициализация
// Запуск приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', initializeApp);
