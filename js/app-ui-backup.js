// app-ui.js - Единый файл для управления UI приложения
import { getUser, updateUser, incrementXP, getReferralCode, createCheckin, getLastCheckin, getReferralsCount } from './modules/database.js';

// Глобальная переменная для хранения данных текущего пользователя
let currentUser = null;

// Функция для получения Telegram ID пользователя
// Улучшенная версия с поддержкой синхронизации между устройствами
// Приоритет получения ID: 1) Telegram WebApp, 2) localStorage, 3) фиксированный ID
async function getTelegramUserId() {
  try {
    console.log('Начало получения Telegram ID...');
    
    // Сначала проверяем, сохранен ли ID в localStorage
    // Это позволяет сохранять консистентность между сессиями
    const savedId = localStorage.getItem('telegram_user_id');
    if (savedId) {
      console.log('Найден сохраненный Telegram ID в localStorage:', savedId);
    }
    
    // Проверяем глобальный объект TelegramUserData
    if (window.TelegramUserData && window.TelegramUserData.isLoaded && window.TelegramUserData.id) {
      const telegramId = window.TelegramUserData.id.toString();
      console.log('Получен Telegram ID из глобального объекта TelegramUserData:', telegramId);
      
      // Сохраняем ID в localStorage
      localStorage.setItem('telegram_user_id', telegramId);
      
      // Если есть имя пользователя, сохраняем его
      if (window.TelegramUserData.first_name) {
        const fullName = `${window.TelegramUserData.first_name}${window.TelegramUserData.last_name ? ' ' + window.TelegramUserData.last_name : ''}`;
        console.log('Получено имя пользователя из TelegramUserData:', fullName);
        localStorage.setItem('telegram_user_name', fullName);
        
        // Обновляем имя пользователя в UI
        updateUserNameInUI(fullName);
      }
      
      return telegramId;
    }
    
    // Пытаемся получить ID из Telegram WebApp - самый надежный источник
    if (window.Telegram && window.Telegram.WebApp) {
      console.log('Telegram WebApp доступен');
      
      try {
        // Логируем данные для отладки
        console.log('initDataUnsafe:', JSON.stringify(window.Telegram.WebApp.initDataUnsafe));
      } catch (e) {
        console.log('Не удалось вывести initDataUnsafe:', e.message);
      }
      
      // Пытаемся получить данные пользователя из Telegram Web App API
      const user = window.Telegram.WebApp.initDataUnsafe?.user;
      if (user && user.id) {
        const telegramId = user.id.toString();
        console.log('Получен Telegram ID из WebApp:', telegramId);
        
        // Сохраняем имя пользователя, если оно есть
        if (user.first_name) {
          const userName = `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`;
          console.log('Получено имя пользователя из Telegram:', userName);
          localStorage.setItem('telegram_user_name', userName);
          
          // Обновляем имя пользователя в UI
          updateUserNameInUI(userName);
          
          // Обновляем имя пользователя в базе данных
          updateUser(telegramId, { username: userName });
        }
        
        // Сравниваем с сохраненным ID для выявления несоответствий
        // Это помогает обнаружить проблемы с синхронизацией между устройствами
        if (savedId && savedId !== telegramId) {
          console.warn('Обнаружено несоответствие ID! Сохраненный:', savedId, 'Текущий:', telegramId);
        }
        
        // Сохраняем ID в localStorage для использования в будущих сессиях
        localStorage.setItem('telegram_user_id', telegramId);
        return telegramId;
      } else {
        console.warn('Не удалось получить ID пользователя из Telegram WebApp');
      }
    } else {
      console.warn('Telegram WebApp недоступен');
    }
    
    // Если ID был сохранен ранее, используем его как запасной вариант
    // Это обеспечивает консистентность между сессиями, даже если Telegram WebApp недоступен
    if (savedId) {
      console.log('Используем сохраненный Telegram ID:', savedId);
      return savedId;
    }
    
    // В крайнем случае используем фиксированный ID для тестирования
    // Это нужно только для отладки и тестирования
    const FIXED_TEST_ID = '12345678';
    console.log('Используем фиксированный ID для тестирования:', FIXED_TEST_ID);
    localStorage.setItem('telegram_user_id', FIXED_TEST_ID);
    return FIXED_TEST_ID;
  } catch (error) {
    console.error('Ошибка при получении Telegram ID:', error);
    
    // Проверяем, есть ли сохраненный ID в случае ошибки
    const savedId = localStorage.getItem('telegram_user_id');
    if (savedId) {
      console.log('Используем сохраненный Telegram ID после ошибки:', savedId);
      return savedId;
    }
    
    // В случае ошибки возвращаем фиксированный ID как последнее средство
    const FIXED_TEST_ID = '12345678';
    localStorage.setItem('telegram_user_id', FIXED_TEST_ID);
    return FIXED_TEST_ID;
  }
}

// Функция для обновления имени пользователя во всех местах интерфейса
function updateUserNameInUI(userName) {
  try {
    console.log('Обновление имени пользователя в UI:', userName);
    
    // Обновляем имя в модальном окне профиля
    const userNameModal = document.getElementById('user-name-modal');
    if (userNameModal) {
      userNameModal.textContent = userName;
      console.log('Имя пользователя обновлено в модальном окне');
    }
    
    // Обновляем имя в основном интерфейсе
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
      userNameElement.textContent = userName;
      console.log('Имя пользователя обновлено в основном интерфейсе');
    }
    
    // Сохраняем имя в localStorage для будущих сессий
    localStorage.setItem('telegram_user_name', userName);
  } catch (error) {
    console.error('Ошибка при обновлении имени пользователя в UI:', error);
  }
}

// Функция для получения имени пользователя из Telegram
async function getTelegramUserName() {
  try {
    console.log('Начало получения имени пользователя из Telegram...');
    
    // Проверяем, есть ли сохраненное имя пользователя в localStorage
    const savedName = localStorage.getItem('telegram_user_name');
    if (savedName) {
      console.log('Найдено имя пользователя в localStorage:', savedName);
      return savedName;
    }
    
    // Проверяем доступность глобального объекта TelegramUserData
    console.log('window.TelegramUserData доступен:', !!window.TelegramUserData);
    console.log('window.TelegramUserData.isLoaded:', window.TelegramUserData?.isLoaded);
    
    // Проверяем, есть ли данные в глобальном объекте TelegramUserData
    if (window.TelegramUserData && window.TelegramUserData.isLoaded) {
      console.log('Используем данные из глобального объекта TelegramUserData');
      
      if (window.TelegramUserData.first_name) {
        const fullName = `${window.TelegramUserData.first_name}${window.TelegramUserData.last_name ? ' ' + window.TelegramUserData.last_name : ''}`;
        console.log('Получено имя пользователя из TelegramUserData:', fullName);
        localStorage.setItem('telegram_user_name', fullName);
        return fullName;
      }
    }
    
    // Пытаемся получить имя из Telegram WebApp напрямую
    console.log('Пробуем получить имя напрямую из Telegram WebApp');
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user) {
      const user = window.Telegram.WebApp.initDataUnsafe.user;
      console.log('Получен объект пользователя из Telegram WebApp:', user);
      
      if (user.first_name) {
        const userName = `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`;
        console.log('Получено имя пользователя из Telegram WebApp:', userName);
        localStorage.setItem('telegram_user_name', userName);
        return userName;
      }
    }
    
    // Если не удалось получить имя из Telegram, пытаемся получить ID и создать имя на его основе
    const telegramId = await getTelegramUserId();
    if (telegramId) {
      // Получаем пользователя из базы данных
      const user = await getUser(telegramId);
      if (user && user.username) {
        console.log('Получено имя пользователя из базы данных:', user.username);
        localStorage.setItem('telegram_user_name', user.username);
        return user.username;
      }
      
      // Создаем уникальное имя на основе ID
      const generatedName = 'User_' + telegramId.substring(0, 4);
      console.log('Сгенерировано имя пользователя на основе ID:', generatedName);
      
      // Сохраняем сгенерированное имя в localStorage и базе данных
      localStorage.setItem('telegram_user_name', generatedName);
      try {
        await updateUser(telegramId, { username: generatedName });
        console.log('Сгенерированное имя сохранено в базе данных');
      } catch (dbError) {
        console.error('Ошибка при сохранении имени в базе данных:', dbError);
      }
      
      return generatedName;
    }
    
    // Если все методы не сработали, генерируем случайное имя
    const randomName = 'User_' + Math.floor(Math.random() * 10000).toString();
    console.log('Сгенерировано случайное имя пользователя:', randomName);
    localStorage.setItem('telegram_user_name', randomName);
    return randomName;
  } catch (error) {
    console.error('Ошибка при получении имени пользователя:', error);
    
    // В случае ошибки генерируем случайное имя
    const fallbackName = 'User_' + Math.floor(Math.random() * 10000).toString();
    console.log('Сгенерировано запасное имя пользователя:', fallbackName);
    localStorage.setItem('telegram_user_name', fallbackName);
    return fallbackName;
  }
}

// Функция для переключения экранов
function switchScreen(screenId) {
  console.log('Переключение на экран:', screenId);
  
  // Если это домашний экран, просто закрываем все модальные окна
  if (screenId === 'home') {
    // Закрываем все модальные окна
    closeAllModals();
    
    // Обновляем активный элемент меню
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      if (item.dataset.screen === 'home') {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
    
    // Убедимся, что домашний экран виден
    const homeScreen = document.getElementById('home-screen');
    if (homeScreen) {
      // Убедимся, что все экраны скрыты
      const screens = document.querySelectorAll('.screen');
      screens.forEach(screen => {
        if (screen !== homeScreen) {
          screen.style.display = 'none';
          screen.classList.remove('active');
        }
      });
      
      // Показываем домашний экран
      homeScreen.style.display = 'block';
      homeScreen.classList.add('active');
    } else {
      console.error('Домашний экран не найден');
    }
  } else {
    console.log('Игнорируем переключение на экран:', screenId);
  }
}

// Функция для активации элемента меню
function activateNavItem(element) {
  // Убираем активный класс у всех элементов
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => item.classList.remove('active'));
  
  // Добавляем активный класс выбранному элементу
  element.classList.add('active');
  
  // Если это кнопка Home, закрываем все модальные окна
  const screen = element.getAttribute('data-screen');
  if (screen === 'home') {
    // Закрываем все модальные окна и показываем домашний экран
    closeAllModals();
    
    // Убедимся, что домашний экран виден
    const homeScreen = document.getElementById('home-screen');
    if (homeScreen) {
      // Убедимся, что все экраны скрыты
      const screens = document.querySelectorAll('.screen');
      screens.forEach(screen => {
        if (screen !== homeScreen) {
          screen.style.display = 'none';
          screen.classList.remove('active');
        }
      });
      
      // Показываем домашний экран
      homeScreen.style.display = 'block';
      homeScreen.classList.add('active');
    }
  }
}

// Функция для закрытия всех модальных окон
function closeAllModals() {
  // Закрываем все модальные окна
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    modal.classList.remove('active');
    modal.style.display = 'none';
  });
  
  // Скрываем оверлей
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    overlay.style.display = 'none';
  }
  
  // Сбрасываем активное состояние всех кнопок навигации
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.classList.remove('active');
  });
}

// Функция для открытия модального окна
async function openModal(modalId) {
  console.log('Попытка открыть модальное окно:', modalId);
  
  try {
    // Сначала закрываем все модальные окна
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      modal.style.display = 'none';
      modal.classList.remove('active');
    });
    
    // Показываем оверлей
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.style.display = 'block';
      overlay.classList.add('active');
    }
    
    // Показываем выбранное модальное окно
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'block';
      modal.classList.add('active');
      
      // Обновляем активный элемент навигации
      const navItems = document.querySelectorAll('.nav-item');
      navItems.forEach(item => {
        item.classList.remove('active');
      });
      
      // Подсвечиваем соответствующую кнопку в зависимости от открытого модального окна
      if (modalId === 'checkin-modal') {
        const checkinButton = document.querySelector('.nav-item[onclick*="checkin-modal"]');
        if (checkinButton) checkinButton.classList.add('active');
        await updateCheckinButton();
      } else if (modalId === 'tasks-modal') {
        const tasksButton = document.querySelector('.nav-item[onclick*="tasks-modal"]');
        if (tasksButton) tasksButton.classList.add('active');
      } else if (modalId === 'referral-modal') {
        const referralButton = document.querySelector('.nav-item[onclick*="referral-modal"]');
        if (referralButton) referralButton.classList.add('active');
      } else if (modalId === 'profile-modal') {
        const profileButton = document.querySelector('.nav-item[onclick*="profile-modal"]');
        if (profileButton) profileButton.classList.add('active');
        await updateProfileModal();
      }
    } else {
      console.error('Модальное окно не найдено:', modalId);
    }
  } catch (error) {
    console.error('Ошибка при открытии модального окна:', error);
  }
}

// Функция для генерации и отображения реферального кода
async function generateReferralCode() {
  try {
    // Получаем ID пользователя
    const telegramId = await getTelegramUserId();
    
    // Получаем реферальный код из базы данных
    let referralCode = await getReferralCode(telegramId);
    
    // Если кода нет, генерируем новый и сохраняем в базе данных
    if (!referralCode) {
      // Генерируем случайный код из 6 символов
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      referralCode = '';
      
      for (let i = 0; i < 6; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        referralCode += characters.charAt(randomIndex);
      }
      
      // Сохраняем в базе данных
      await updateUser(telegramId, { referral_code: referralCode });
      console.log('Создан новый реферальный код:', referralCode);
    }
    
    // Отображаем код в интерфейсе
    const referralCodeElement = document.getElementById('referral-code');
    if (referralCodeElement) {
      referralCodeElement.textContent = referralCode;
    }
  } catch (error) {
    console.error('Ошибка при генерации реферального кода:', error);
    
    // В случае ошибки показываем заглушку
    const referralCodeElement = document.getElementById('referral-code');
    if (referralCodeElement) {
      referralCodeElement.textContent = 'ERROR';
    }
  }
}

// Функция для обновления кнопки чекина
async function updateCheckinButton() {
  const checkinButton = document.getElementById('checkin-button');
  
  if (checkinButton) {
    try {
      // Получаем ID пользователя
      const telegramId = await getTelegramUserId();
      
      // Получаем дату последнего чекина из базы данных
      const lastCheckin = await getLastCheckin(telegramId);
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      
      // Проверяем, был ли уже чекин сегодня
      if (lastCheckin && new Date(lastCheckin) >= new Date(todayStart)) {
        // Если уже был чекин сегодня, делаем кнопку неактивной
        checkinButton.classList.add('disabled');
        checkinButton.textContent = 'Already Claimed Today';
        checkinButton.onclick = null;
      } else {
        // Если чекина не было, делаем кнопку активной
        checkinButton.classList.remove('disabled');
        checkinButton.textContent = 'Claim Daily Reward';
        checkinButton.onclick = claimDailyReward;
      }
    } catch (error) {
      console.error('Ошибка при обновлении кнопки чекина:', error);
      
      // В случае ошибки делаем кнопку активной
      checkinButton.classList.remove('disabled');
      checkinButton.textContent = 'Claim Daily Reward';
      checkinButton.onclick = claimDailyReward;
    }
  }
}

// Функция для получения ежедневной награды
async function claimDailyReward() {
  try {
    // Получаем ID пользователя
    const telegramId = await getTelegramUserId();
    
    // Получаем данные пользователя из базы данных
    const user = await getUser(telegramId);
    
    // Получаем дату последнего чекина
    const lastCheckin = user.last_checkin;
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    
    // Проверяем, был ли уже чекин сегодня
    if (lastCheckin && new Date(lastCheckin) >= new Date(todayStart)) {
      // Если уже был чекин сегодня, показываем сообщение
      showNotification('You have already claimed your daily reward today!', 'error');
      return;
    }
    
    // Рассчитываем награду
    let currentStreak = (user.current_streak || 0) + 1;
    const xpEarned = 10 * currentStreak; // XP зависит от длины стрика
    
    // Создаем запись о чекине в базе данных
    await createCheckin(telegramId, currentStreak, xpEarned);
    
    // Увеличиваем XP пользователя
    await incrementXP(telegramId, xpEarned);
    
    // Обновляем данные пользователя
    await updateUser(telegramId, {
      current_streak: currentStreak,
      max_streak: Math.max(currentStreak, user.max_streak || 0),
      last_checkin: new Date().toISOString()
    });
    
    // Обновляем UI
    const streakElement = document.getElementById('streak-count');
    const xpElement = document.getElementById('xp-amount');
    const checkinStreakElement = document.getElementById('checkin-streak');
    
    if (streakElement) {
      streakElement.textContent = currentStreak.toString();
    }
    
    if (xpElement) {
      xpElement.textContent = (user.points + xpEarned).toString();
    }
    
    if (checkinStreakElement) {
      checkinStreakElement.textContent = currentStreak.toString();
    }
    
    // Обновляем кнопку чекина
    await updateCheckinButton();
    
    // Показываем уведомление об успешном чекине
    showNotification(`Daily reward claimed! +${xpEarned} XP, Streak: ${currentStreak}`, 'success');
  } catch (error) {
    console.error('Ошибка при получении ежедневной награды:', error);
    showNotification('Error claiming daily reward. Please try again later.', 'error');
  }
}

// Функция для получения имени пользователя из базы данных Supabase
async function getUserNameFromDatabase(telegramId) {
  try {
    console.log('Получение имени пользователя из базы данных Supabase...');
    
    // Получаем данные пользователя из базы данных
    const user = await getUser(telegramId);
    console.log('Получены данные пользователя из базы данных:', user);
    
    // Проверяем, есть ли имя пользователя в базе данных
    if (user && user.username) {
      console.log('Найдено имя пользователя в базе данных:', user.username);
      
      // Сохраняем имя в localStorage для будущих сессий
      localStorage.setItem('telegram_user_name', user.username);
      
      // Обновляем имя пользователя в UI
      updateUserNameInUI(user.username);
      
      return user.username;
    }
    
    console.log('Имя пользователя не найдено в базе данных');
    return null;
  } catch (error) {
    console.error('Ошибка при получении имени пользователя из базы данных:', error);
    return null;
  }
}

// Функция для обновления данных в модальном окне профиля
async function updateProfileModal() {
  try {
    console.log('Обновление модального окна профиля...');
    
    // Получаем элемент с именем пользователя в модальном окне
    const userNameModalElement = document.getElementById('user-name-modal');
    if (!userNameModalElement) {
      console.error('Элемент с именем пользователя в модальном окне не найден');
      return;
    }
    
    // Проверяем, есть ли имя в localStorage
    let userName = localStorage.getItem('telegram_user_name');
    console.log('Имя пользователя из localStorage:', userName);
    
    // Если имя найдено в localStorage, используем его
    if (userName) {
      userNameModalElement.textContent = userName;
      console.log('Имя пользователя установлено из localStorage:', userName);
      return;
    }
    
    // Если имя не найдено в localStorage, пытаемся получить его из базы данных
    try {
      // Получаем ID пользователя
      const telegramId = await getTelegramUserId();
      console.log('Telegram ID для профиля:', telegramId);
      
      // Получаем данные пользователя из базы данных
      const user = await getUser(telegramId);
      console.log('Данные пользователя для профиля:', user);
      
      if (user && user.username) {
        userName = user.username;
        console.log('Найдено имя пользователя в базе данных:', userName);
        
        // Обновляем имя пользователя в UI
        userNameModalElement.textContent = userName;
        console.log('Имя пользователя обновлено в модальном окне:', userName);
        
        // Сохраняем имя в localStorage для будущих сессий
        localStorage.setItem('telegram_user_name', userName);
        return;
      }
    } catch (error) {
      console.error('Ошибка при получении данных пользователя:', error);
    }
    
    // Если имя не найдено ни в localStorage, ни в базе данных, устанавливаем имя по умолчанию
    userName = 'Артём';
    console.log('Устанавливаем имя пользователя по умолчанию:', userName);
    
    // Обновляем имя пользователя в UI
    userNameModalElement.textContent = userName;
    console.log('Имя пользователя обновлено в модальном окне:', userName);
    
    // Сохраняем имя в localStorage для будущих сессий
    localStorage.setItem('telegram_user_name', userName);
    
    // Пытаемся сохранить имя в базе данных
    try {
      const telegramId = await getTelegramUserId();
      if (telegramId) {
        await updateUser(telegramId, { username: userName });
        console.log('Имя пользователя сохранено в базе данных:', userName);
      }
    } catch (error) {
      console.error('Ошибка при сохранении имени пользователя в базе данных:', error);
    }
    
    // Получаем количество рефералов
    const referralsCount = await getReferralsCount(telegramId);
    console.log('Количество рефералов:', referralsCount);
    
    // Получаем элементы UI
    const userNameModal = document.getElementById('user-name-modal');
    const totalXpModal = document.getElementById('total-xp-modal');
    const referralsCountModal = document.getElementById('referrals-count-modal');
    
    // Обновляем UI
    // Обновляем имя пользователя с помощью функции updateUserNameInUI
    updateUserNameInUI(userName || user.username || 'Player');
    
    if (totalXpModal) {
      totalXpModal.textContent = (user.points || 0).toString();
    }
    
    if (referralsCountModal) {
      referralsCountModal.textContent = referralsCount.toString();
    }
    
    // Сохраняем данные пользователя в глобальную переменную для быстрого доступа
    currentUser = user;
    
    console.log('Модальное окно профиля успешно обновлено');
  } catch (error) {
    console.error('Ошибка при обновлении профиля:', error);
    
    // В случае ошибки показываем сообщение об ошибке
    const userNameModal = document.getElementById('user-name-modal');
    if (userNameModal) {
      userNameModal.textContent = 'Error loading profile';
    }
  }
}

// Функция для копирования текста
function handleCopy(text) {
  navigator.clipboard.writeText(text)
    .then(() => {
      const copyStatus = document.querySelector('.copy-status');
      if (copyStatus) {
        copyStatus.textContent = 'Copied!';
        setTimeout(() => {
          copyStatus.textContent = '';
        }, 2000);
      }
    })
    .catch(err => {
      console.error('Failed to copy: ', err);
    });
}

// Функция для сброса данных пользователя
async function resetUserData() {
  try {
    console.log('Сброс данных пользователя...');
    
    // Удаляем сохраненный Telegram ID из localStorage
    localStorage.removeItem('telegram_user_id');
    console.log('Удален Telegram ID из localStorage');
    
    // Показываем уведомление
    showNotification('User data reset successfully. Reloading...', 'success');
    
    // Перезагружаем страницу через 2 секунды
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  } catch (error) {
    console.error('Ошибка при сбросе данных пользователя:', error);
    showNotification('Error resetting user data. Please try again.', 'error');
  }
}

// Функция для обновления данных пользователя
async function refreshUserData() {
  try {
    console.log('Обновление данных пользователя...');
    
    // Получаем текущий Telegram ID
    const telegramId = await getTelegramUserId();
    console.log('Текущий Telegram ID:', telegramId);
    
    // Очищаем кэш и получаем свежие данные из базы
    localStorage.removeItem(`user:${telegramId}`);
    console.log('Очищен кэш пользователя');
    
    // Получаем свежие данные пользователя
    const user = await getUser(telegramId);
    console.log('Получены свежие данные пользователя:', user);
    
    // Обновляем глобальную переменную
    currentUser = user;
    
    // Обновляем модальное окно профиля
    await updateProfileModal();
    
    // Показываем уведомление
    showNotification('User data refreshed successfully', 'success');
  } catch (error) {
    console.error('Ошибка при обновлении данных пользователя:', error);
    showNotification('Error refreshing user data. Please try again.', 'error');
  }
}

// Функция для отображения информации о пользователе в консоли
function logUserInfo(user, telegramId) {
  console.group('Информация о пользователе:');
  console.log('Telegram ID:', telegramId);
  console.log('User ID in DB:', user.id);
  console.log('Username:', user.username);
  console.log('Points:', user.points);
  console.log('Current Streak:', user.current_streak);
  console.log('Max Streak:', user.max_streak);
  console.log('Last Checkin:', user.last_checkin);
  console.log('Referral Code:', user.referral_code);
  console.groupEnd();
}

// Функция для инициализации приложения
async function initializeApp() {
  try {
    console.log('Начало инициализации приложения...');
    
    // Получаем ID пользователя
    const telegramId = await getTelegramUserId();
    console.log('Получен Telegram ID:', telegramId);
    
    // Получаем данные пользователя из базы данных или создаем нового пользователя
    console.log('Запрашиваем данные пользователя из базы данных...');
    const user = await getUser(telegramId);
    console.log('Получены данные пользователя:', user);
    
    // Проверяем, что данные пользователя содержат правильный Telegram ID
    if (user.telegram_id !== String(telegramId)) {
      console.warn('Несоответствие Telegram ID! В базе:', user.telegram_id, 'Текущий:', telegramId);
      // Обновляем Telegram ID в базе данных
      await updateUser(telegramId, { telegram_id: String(telegramId) });
      console.log('Telegram ID обновлен в базе данных');
      // Получаем обновленные данные пользователя
      user = await getUser(telegramId);
    }
    
    // Выводим подробную информацию о пользователе
    logUserInfo(user, telegramId);
    
    // Сохраняем данные пользователя в глобальную переменную
    currentUser = user;
    
    // Генерируем реферальный код, если не существует
    await generateReferralCode();
    
    // Используем имя пользователя из базы данных, если оно есть
    let userName = null;
    
    if (user && user.username) {
      userName = user.username;
      console.log('Используем имя пользователя из базы данных:', userName);
      
      // Сохраняем имя в localStorage для будущих сессий
      localStorage.setItem('telegram_user_name', userName);
    } else {
      // Если имя не найдено в базе данных, создаем имя по умолчанию
      userName = 'Player_' + telegramId.substring(0, 4);
      console.log('Создаем имя пользователя по умолчанию:', userName);
      
      // Сохраняем имя в базе данных
      await updateUser(telegramId, { username: userName });
      console.log('Имя пользователя сохранено в базе данных:', userName);
      
      // Сохраняем имя в localStorage для будущих сессий
      localStorage.setItem('telegram_user_name', userName);
    }
    
    // Обновляем UI с данными из базы
    const totalXp = document.getElementById('xp-amount');
    const streakCount = document.getElementById('streak-count');
    const checkinStreak = document.getElementById('checkin-streak');
    
    // Обновляем имя пользователя в основном интерфейсе
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
      userNameElement.textContent = userName;
      console.log('Имя пользователя обновлено в основном интерфейсе:', userName);
    }
    
    // Обновляем имя пользователя в модальном окне профиля
    const userNameModal = document.getElementById('user-name-modal');
    if (userNameModal) {
      userNameModal.textContent = userName;
      console.log('Имя пользователя обновлено в модальном окне:', userName);
    }
    
    if (totalXp) {
      totalXp.textContent = (user.points || 0).toString();
    }
    
    // Обновляем модальное окно профиля
    await updateProfileModal();
    
    if (streakCount) {
      streakCount.textContent = (user.current_streak || 0).toString();
    }
    
    if (checkinStreak) {
      checkinStreak.textContent = (user.current_streak || 0).toString();
    }
    
    // Обновляем кнопку чекина
    await updateCheckinButton();
    
    // Обновляем модальное окно профиля
    await updateProfileModal();
    
    // Показываем домашний экран по умолчанию
    switchScreen('home');
    
    console.log('Приложение успешно инициализировано с данными из Supabase');
  } catch (error) {
    console.error('Ошибка при инициализации приложения:', error);
    
    // В случае ошибки показываем уведомление
    showNotification('Error loading user data. Please try again later.', 'error');
  }
}

// Функция для инициализации Telegram Web App
async function initializeTelegramWebApp() {
  return new Promise((resolve, reject) => {
    try {
      console.log('Инициализация Telegram Web App...');
      
      // Проверяем, доступен ли Telegram Web App API
      if (window.Telegram && window.Telegram.WebApp) {
        console.log('Telegram Web App API найден');
        
        // Устанавливаем цвета и другие параметры
        window.Telegram.WebApp.expand();
        
        // Получаем данные пользователя
        const user = window.Telegram.WebApp.initDataUnsafe?.user;
        if (user) {
          console.log('Пользователь Telegram:', user.id, user.username || 'без имени');
          
          // Сохраняем имя пользователя в localStorage
          if (user.first_name) {
            const fullName = `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`;
            localStorage.setItem('telegram_user_name', fullName);
            console.log('Имя пользователя сохранено в localStorage:', fullName);
            
            // Обновляем имя пользователя в UI
            const userNameModal = document.getElementById('user-name-modal');
            if (userNameModal) {
              userNameModal.textContent = fullName;
              console.log('Имя пользователя обновлено в модальном окне:', fullName);
            }
            
            const userNameElement = document.getElementById('user-name');
            if (userNameElement) {
              userNameElement.textContent = fullName;
              console.log('Имя пользователя обновлено в основном интерфейсе:', fullName);
            }
          }
        } else {
          console.warn('Данные пользователя Telegram не найдены');
        }
        
        resolve(window.Telegram.WebApp);
      } else {
        console.warn('Telegram Web App API не найден, используем веб-режим');
        resolve(null);
      }
    } catch (error) {
      console.error('Ошибка при инициализации Telegram Web App:', error);
      reject(error);
    }
  });
}

// Инициализируем приложение при загрузке страницы
window.addEventListener('load', async function() {
  try {
    // Показываем индикатор загрузки
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'block';
    }
    
    // Сначала инициализируем Telegram Web App
    await initializeTelegramWebApp();
    
    // Затем инициализируем основное приложение
    await initializeApp();
    
    // Обновляем кнопку чекина
    await updateCheckinButton();
    
    // Добавляем обработчики событий для кнопок в модальном окне профиля
    const resetUserDataButton = document.getElementById('reset-user-data');
    if (resetUserDataButton) {
      resetUserDataButton.addEventListener('click', resetUserData);
    }
    
    const refreshUserDataButton = document.getElementById('refresh-user-data');
    if (refreshUserDataButton) {
      refreshUserDataButton.addEventListener('click', refreshUserData);
    }
    
    // Скрываем индикатор загрузки
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
    
    // Показываем контент
    const appContent = document.getElementById('app-content');
    if (appContent) {
      appContent.style.display = 'block';
    }
    
    console.log('Приложение успешно инициализировано');
    
    // Добавляем обработчик клика на оверлей для закрытия модальных окон
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          closeAllModals();
        }
      });
    }
  } catch (error) {
    console.error('Ошибка при загрузке приложения:', error);
    
    // Скрываем индикатор загрузки в случае ошибки
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
    
    // Показываем уведомление об ошибке
    showNotification('Error loading application. Please try again later.', 'error');
  }
});

// Функция специально для кнопки Home
function homeButtonClick() {
  console.log('Нажата кнопка Home - только закрываем модальные окна');
  
  try {
    // Закрываем все модальные окна
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      modal.style.display = 'none';
    });
    
    // Скрываем оверлей
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
    
    // Обновляем активный элемент меню
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      if (item.dataset.screen === 'home') {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
    
    console.log('Модальные окна закрыты');
  } catch (error) {
    console.error('Ошибка при обработке кнопки Home:', error);
  }
}

// Экспортируем функции в глобальную область видимости
window.switchScreen = switchScreen;
window.activateNavItem = activateNavItem;
window.closeAllModals = closeAllModals;
window.openModal = openModal;
window.generateReferralCode = generateReferralCode;
window.handleCopy = handleCopy;
window.claimDailyReward = claimDailyReward;
window.updateProfileModal = updateProfileModal;
window.homeButtonClick = homeButtonClick;
