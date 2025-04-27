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
    
    // Сначала пытаемся получить ID пользователя Telegram
    const telegramId = await getTelegramUserId();
    console.log('Получен Telegram ID для получения имени:', telegramId);
    
    // Если ID получен, пытаемся получить данные из базы данных (приоритет #1)
    if (telegramId) {
      // Получаем пользователя из базы данных
      const user = await getUser(telegramId);
      if (user && user.username) {
        console.log('Получено имя пользователя из базы данных:', user.username);
        // Обновляем имя в localStorage для быстрого доступа на этом устройстве
        localStorage.setItem('telegram_user_name_' + telegramId, user.username);
        return user.username;
      }
      
      // Проверяем, есть ли сохраненное имя пользователя в localStorage для этого ID (приоритет #2)
      const savedName = localStorage.getItem('telegram_user_name_' + telegramId);
      if (savedName) {
        console.log('Найдено имя пользователя в localStorage для ID ' + telegramId + ':', savedName);
        
        // Сохраняем имя из localStorage в базу данных для синхронизации между устройствами
        try {
          await updateUser(telegramId, { username: savedName });
          console.log('Имя из localStorage сохранено в базу данных для синхронизации:', savedName);
        } catch (dbError) {
          console.error('Ошибка при сохранении имени в базе данных:', dbError);
        }
        
        return savedName;
      }
      
      // Пытаемся получить имя из Telegram WebApp напрямую (приоритет #3)
      console.log('Пробуем получить имя напрямую из Telegram WebApp');
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user) {
        const user = window.Telegram.WebApp.initDataUnsafe.user;
        console.log('Получен объект пользователя из Telegram WebApp:', user);
        
        if (user.first_name) {
          const userName = `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`;
          console.log('Получено имя пользователя из Telegram WebApp:', userName);
          
          // Сохраняем имя в localStorage и базе данных для синхронизации
          localStorage.setItem('telegram_user_name_' + telegramId, userName);
          
          try {
            await updateUser(telegramId, { username: userName });
            console.log('Имя из Telegram WebApp сохранено в базу данных для синхронизации:', userName);
          } catch (dbError) {
            console.error('Ошибка при сохранении имени в базе данных:', dbError);
          }
          
          return userName;
        }
      }
      
      // Проверяем доступность глобального объекта TelegramUserData (приоритет #4)
      console.log('window.TelegramUserData доступен:', !!window.TelegramUserData);
      console.log('window.TelegramUserData.isLoaded:', window.TelegramUserData?.isLoaded);
      
      if (window.TelegramUserData && window.TelegramUserData.isLoaded) {
        console.log('Используем данные из глобального объекта TelegramUserData');
        
        if (window.TelegramUserData.first_name) {
          const fullName = `${window.TelegramUserData.first_name}${window.TelegramUserData.last_name ? ' ' + window.TelegramUserData.last_name : ''}`;
          console.log('Получено имя пользователя из TelegramUserData:', fullName);
          
          // Сохраняем имя в localStorage и базе данных для синхронизации
          localStorage.setItem('telegram_user_name_' + telegramId, fullName);
          
          try {
            await updateUser(telegramId, { username: fullName });
            console.log('Имя из TelegramUserData сохранено в базу данных для синхронизации:', fullName);
          } catch (dbError) {
            console.error('Ошибка при сохранении имени в базе данных:', dbError);
          }
          
          return fullName;
        }
      }
      
      // Если не удалось получить имя из всех источников, создаем имя на основе ID (приоритет #5)
      // Создаем уникальное имя на основе ID
      const generatedName = 'User_' + telegramId.substring(0, 4);
      console.log('Сгенерировано имя пользователя на основе ID:', generatedName);
      
      // Сохраняем сгенерированное имя в localStorage и базе данных
      localStorage.setItem('telegram_user_name_' + telegramId, generatedName);
      
      try {
        await updateUser(telegramId, { username: generatedName });
        console.log('Сгенерированное имя сохранено в базе данных для синхронизации');
      } catch (dbError) {
        console.error('Ошибка при сохранении имени в базе данных:', dbError);
      }
      
      return generatedName;
    } else {
      // Если не удалось получить ID, используем старый подход с общим ключом localStorage
      console.warn('Не удалось получить Telegram ID, используем общий ключ localStorage');
      
      // Проверяем, есть ли сохраненное имя пользователя в общем localStorage
      const savedName = localStorage.getItem('telegram_user_name');
      if (savedName) {
        console.log('Найдено имя пользователя в общем localStorage:', savedName);
        return savedName;
      }
      
      // Пытаемся получить имя из Telegram WebApp напрямую
      console.log('Пробуем получить имя напрямую из Telegram WebApp (без ID)');
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
      
      // Если все методы не сработали, генерируем случайное имя
      const randomName = 'User_' + Math.floor(Math.random() * 10000).toString();
      console.log('Сгенерировано случайное имя пользователя:', randomName);
      localStorage.setItem('telegram_user_name', randomName);
      return randomName;
    }
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
        
        // Дополнительно обновляем имя пользователя в модальном окне профиля
        const userNameModal = document.getElementById('user-name-modal');
        if (userNameModal) {
          const savedName = localStorage.getItem('telegram_user_name');
          if (savedName) {
            userNameModal.textContent = savedName;
            console.log('Имя пользователя обновлено в модальном окне профиля при открытии:', savedName);
          } else {
            userNameModal.textContent = 'Артём';
            console.log('Имя пользователя установлено по умолчанию в модальном окне профиля');
          }
        }
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
    
    // Получаем обновленные данные пользователя из базы данных
    const updatedUser = await getUser(telegramId);
    console.log('Обновленные данные пользователя после чекина:', updatedUser);
    
    // Обновляем UI
    const streakElement = document.getElementById('streak-count');
    const xpElement = document.getElementById('xp-amount');
    const checkinStreakElement = document.getElementById('checkin-streak');
    
    if (streakElement) {
      streakElement.textContent = currentStreak.toString();
    }
    
    if (xpElement) {
      // Используем значение из базы данных
      xpElement.textContent = (updatedUser.points || 0).toString();
      
      // Сохраняем значение в localStorage с использованием ID пользователя
      localStorage.setItem('user_points_' + telegramId, (updatedUser.points || 0).toString());
      
      // Также обновляем старый ключ для обратной совместимости
      localStorage.setItem('totalXp', (updatedUser.points || 0).toString());
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
    
    // Получаем ID пользователя
    const telegramId = await getTelegramUserId();
    console.log('Telegram ID для профиля:', telegramId);
    
    // Получаем данные пользователя из базы данных
    const user = await getUser(telegramId);
    console.log('Данные пользователя для профиля:', user);
    
    // Используем данные из базы данных, которые идентифицируются по ID пользователя
    if (user) {
      // Отображаем имя пользователя из базы данных
      if (user.username) {
        userNameModalElement.textContent = user.username;
        console.log('Имя пользователя установлено из базы данных:', user.username);
        
        // Сохраняем имя в localStorage для быстрого доступа на этом устройстве
        localStorage.setItem('telegram_user_name_' + telegramId, user.username);
      } else {
        // Если имя не найдено в базе данных, создаем имя по умолчанию
        const defaultName = 'User_' + telegramId.substring(0, 4);
        userNameModalElement.textContent = defaultName;
        console.log('Имя пользователя установлено по умолчанию:', defaultName);
        
        // Сохраняем имя в базу данных для синхронизации между устройствами
        await updateUser(telegramId, { username: defaultName });
        console.log('Имя пользователя по умолчанию сохранено в базу данных:', defaultName);
        
        // Сохраняем имя в localStorage для быстрого доступа на этом устройстве
        localStorage.setItem('telegram_user_name_' + telegramId, defaultName);
      }
      
      // Также сохраняем очки (XP) и количество рефералов для синхронизации между устройствами
      if (user.points !== undefined) {
        localStorage.setItem('user_points_' + telegramId, user.points);
      }
    } else {
      console.error('Не удалось получить данные пользователя из базы данных');
      
      // Проверяем, есть ли сохраненное имя в localStorage для этого ID
      const savedName = localStorage.getItem('telegram_user_name_' + telegramId);
      if (savedName) {
        userNameModalElement.textContent = savedName;
        console.log('Имя пользователя установлено из localStorage:', savedName);
      } else {
        // Если имя не найдено нигде, используем имя по умолчанию
        const defaultName = 'User_' + telegramId.substring(0, 4);
        userNameModalElement.textContent = defaultName;
        console.log('Имя пользователя установлено по умолчанию (резервный вариант):', defaultName);
        
        // Сохраняем имя в localStorage для быстрого доступа на этом устройстве
        localStorage.setItem('telegram_user_name_' + telegramId, defaultName);
      }
    }
    
    // Получаем количество рефералов
    const referralsCount = await getReferralsCount(telegramId);
    console.log('Количество рефералов:', referralsCount);
    
    // Обновляем количество рефералов в модальном окне
    const referralsCountModal = document.getElementById('referrals-count-modal');
    if (referralsCountModal) {
      referralsCountModal.textContent = referralsCount.toString();
      console.log('Количество рефералов обновлено в модальном окне:', referralsCount);
    }
    
    // Получаем элемент с количеством XP в модальном окне
    const totalXpModal = document.getElementById('total-xp-modal');
    if (totalXpModal && user) {
      const userPoints = user.points || 0;
      totalXpModal.textContent = userPoints.toString();
      
      // Сохраняем значение в localStorage с использованием ID пользователя
      if (telegramId) {
        localStorage.setItem('user_points_' + telegramId, userPoints.toString());
        
        // Также обновляем старый ключ для обратной совместимости
        localStorage.setItem('totalXp', userPoints.toString());
        console.log('Обновлены значения XP в localStorage по ID:', telegramId, userPoints);
      }
    }
    console.log('XP обновлено в модальном окне:', user.points || 0);
    
    // Сохраняем данные пользователя в глобальную переменную для быстрого доступа
    currentUser = user;
    
    console.log('Модальное окно профиля успешно обновлено');
  } catch (error) {
    console.error('Ошибка при обновлении профиля:', error);
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
    
    // Получаем имя пользователя с помощью обновленной функции getTelegramUserName
    const userName = await getTelegramUserName();
    console.log('Получено имя пользователя для основного интерфейса:', userName);
    
    // Сохраняем имя в localStorage для будущих сессий
    localStorage.setItem('telegram_user_name', userName);
    
    // Обновляем имя пользователя в базе данных, если оно отличается
    if (user && user.username !== userName) {
      console.log('Обновляем имя пользователя в базе данных:', userName);
      await updateUser(telegramId, { username: userName });
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
    
    // Обновляем XP в интерфейсе и синхронизируем с localStorage
    if (totalXp) {
      const userPoints = user.points || 0;
      totalXp.textContent = userPoints.toString();
      console.log('XP обновлено в основном интерфейсе:', userPoints);
      
      // Сохраняем значение в localStorage с использованием ID пользователя
      localStorage.setItem('user_points_' + telegramId, userPoints.toString());
      
      // Также обновляем старый ключ для обратной совместимости
      localStorage.setItem('totalXp', userPoints.toString());
      console.log('Обновлены значения XP в localStorage по ID:', telegramId, userPoints);
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

// Функция для получения ежедневной награды, доступная из HTML
window.claimDailyRewardInDb = async function() {
  try {
    // Получаем ID пользователя
    const telegramId = await getTelegramUserId();
    if (!telegramId) {
      console.error('Не удалось получить Telegram ID для чекина');
      return false;
    }
    
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
      return false;
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
    
    // Получаем обновленные данные пользователя из базы данных
    const updatedUser = await getUser(telegramId);
    console.log('Обновленные данные пользователя после чекина:', updatedUser);
    
    // Обновляем UI
    const streakElement = document.getElementById('streak-count');
    const xpElement = document.getElementById('xp-amount');
    const checkinStreakElement = document.getElementById('checkin-streak');
    
    if (streakElement) {
      streakElement.textContent = currentStreak.toString();
    }
    
    if (xpElement) {
      // Используем значение из базы данных
      xpElement.textContent = (updatedUser.points || 0).toString();
      
      // Сохраняем значение в localStorage с использованием ID пользователя
      localStorage.setItem('user_points_' + telegramId, (updatedUser.points || 0).toString());
      localStorage.setItem('user_streak_' + telegramId, currentStreak.toString());
      
      // Также обновляем старый ключ для обратной совместимости
      localStorage.setItem('totalXp', (updatedUser.points || 0).toString());
      localStorage.setItem('streak', currentStreak.toString());
    }
    
    if (checkinStreakElement) {
      checkinStreakElement.textContent = currentStreak.toString();
    }
    
    // Обновляем кнопку чекина
    await updateCheckinButton();
    
    // Показываем уведомление об успешном чекине
    showNotification(`Daily reward claimed! +${xpEarned} XP, Streak: ${currentStreak}`, 'success');
    
    return true;
  } catch (error) {
    console.error('Ошибка при получении ежедневной награды:', error);
    showNotification('Error claiming daily reward. Please try again later.', 'error');
    return false;
  }
};

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
window.claimDailyRewardInDb = claimDailyRewardInDb;
