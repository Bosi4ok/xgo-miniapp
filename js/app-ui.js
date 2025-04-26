// app-ui.js - Единый файл для управления UI приложения
import { getUser, updateUser, incrementXP, getReferralCode, createCheckin, getLastCheckin } from './modules/database.js';

// Глобальная переменная для хранения данных текущего пользователя
let currentUser = null;

// Функция для получения Telegram ID пользователя
async function getTelegramUserId() {
  // Временное решение: используем фиксированный ID для тестирования
  // В реальном приложении нужно получать ID из Telegram Mini App API
  return '123456789';
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
}

// Функция для открытия модального окна
function openModal(modalId) {
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
    
    // Показываем модальное окно
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'block';
      modal.classList.add('active');
      console.log('Открыто модальное окно:', modalId);
      
      // Обновляем данные в модальном окне профиля
      if (modalId === 'profile-modal') {
        updateProfileModal();
      }
      
      // Генерируем реферальный код если открыто модальное окно рефералов
      if (modalId === 'referral-modal') {
        generateReferralCode();
      }
      
      // Обновляем состояние кнопки чекина
      if (modalId === 'checkin-modal') {
        updateCheckinButton();
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

// Функция для обновления данных в модальном окне профиля
async function updateProfileModal() {
  try {
    // Получаем ID пользователя
    const telegramId = await getTelegramUserId();
    
    // Получаем данные пользователя из базы данных
    const user = await getUser(telegramId);
    
    // Получаем реферальный код
    const referralCode = await getReferralCode(telegramId);
    
    // Получаем элементы UI
    const userNameModal = document.getElementById('user-name-modal');
    const totalXpModal = document.getElementById('total-xp-modal');
    const currentStreakModal = document.getElementById('current-streak-modal');
    const maxStreakModal = document.getElementById('max-streak-modal');
    const referralCodeElement = document.getElementById('profile-referral-code');
    
    // Обновляем UI
    if (userNameModal) {
      userNameModal.textContent = user.username || 'Player';
    }
    
    if (totalXpModal) {
      totalXpModal.textContent = (user.points || 0).toString();
    }
    
    if (currentStreakModal) {
      currentStreakModal.textContent = (user.current_streak || 0).toString();
    }
    
    if (maxStreakModal) {
      maxStreakModal.textContent = (user.max_streak || 0).toString();
    }
    
    if (referralCodeElement) {
      referralCodeElement.textContent = referralCode || 'NONE';
    }
    
    // Сохраняем данные пользователя в глобальную переменную для быстрого доступа
    currentUser = user;
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

// Инициализация приложения
async function initializeApp() {
  try {
    // Получаем ID пользователя
    const telegramId = await getTelegramUserId();
    
    // Получаем данные пользователя из базы данных или создаем нового пользователя
    const user = await getUser(telegramId);
    
    // Сохраняем данные пользователя в глобальную переменную
    currentUser = user;
    
    // Генерируем реферальный код, если не существует
    await generateReferralCode();
    
    // Обновляем UI с данными из базы
    const userName = document.getElementById('user-name');
    const totalXp = document.getElementById('xp-amount');
    const streakCount = document.getElementById('streak-count');
    const checkinStreak = document.getElementById('checkin-streak');
    
    if (userName) {
      userName.textContent = user.username || 'Player';
    }
    
    if (totalXp) {
      totalXp.textContent = (user.points || 0).toString();
    }
    
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

// Инициализируем приложение при загрузке страницы
window.addEventListener('load', async function() {
  try {
    // Показываем индикатор загрузки
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'block';
    }
    
    // Инициализируем приложение
    await initializeApp();
    
    // Скрываем индикатор загрузки
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
    
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
