// app-ui.js - Единый файл для управления UI приложения

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
  // Сначала закрываем все модальные окна
  closeAllModals();
  
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
}

// Функция для генерации и отображения реферального кода
function generateReferralCode() {
  const referralCodeElement = document.getElementById('referral-code');
  
  // Проверяем, есть ли уже реферальный код в localStorage
  let referralCode = localStorage.getItem('referralCode');
  
  // Если кода нет, генерируем новый
  if (!referralCode) {
    // Генерируем случайный 8-символьный код
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    referralCode = '';
    for (let i = 0; i < 8; i++) {
      referralCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // Сохраняем в localStorage
    localStorage.setItem('referralCode', referralCode);
  }
  
  // Отображаем код
  if (referralCodeElement) {
    referralCodeElement.textContent = referralCode;
  }
}

// Функция для обновления кнопки чекина
function updateCheckinButton() {
  const button = document.getElementById('checkin-button');
  if (button) {
    // Включаем кнопку по умолчанию
    button.disabled = false;
    
    // Проверяем, была ли уже получена награда сегодня
    const lastClaimDate = localStorage.getItem('lastClaimDate');
    const today = new Date().toDateString();
    
    if (lastClaimDate === today) {
      button.disabled = true;
      button.textContent = 'CLAIMED';
    } else {
      button.disabled = false;
      button.textContent = 'CLAIM REWARD';
    }
  }
}

// Функция для получения ежедневной награды
function claimDailyReward() {
  const button = document.getElementById('checkin-button');
  const streakElement = document.getElementById('checkin-streak');
  const xpAmount = document.getElementById('xp-amount');
  
  // Проверяем, была ли уже получена награда сегодня
  const lastClaimDate = localStorage.getItem('lastClaimDate');
  const today = new Date().toDateString();
  
  if (lastClaimDate === today) {
    // Уже получена сегодня
    if (button) {
      button.disabled = true;
      button.textContent = 'CLAIMED';
    }
    return;
  }
  
  // Получаем текущий стрик или инициализируем как 0
  let currentStreak = parseInt(localStorage.getItem('streak') || '0');
  let totalXp = parseInt(localStorage.getItem('totalXp') || '0');
  
  // Увеличиваем стрик и XP
  currentStreak += 1;
  totalXp += 10;
  
  // Обновляем localStorage
  localStorage.setItem('streak', currentStreak.toString());
  localStorage.setItem('totalXp', totalXp.toString());
  localStorage.setItem('lastClaimDate', today);
  
  // Обновляем UI
  if (streakElement) {
    streakElement.textContent = currentStreak.toString();
  }
  
  if (xpAmount) {
    xpAmount.textContent = totalXp.toString();
  }
  
  // Отключаем кнопку после получения
  if (button) {
    button.disabled = true;
    button.textContent = 'CLAIMED';
  }
  
  // Обновляем данные профиля
  updateProfileModal();
}

// Функция для обновления данных в модальном окне профиля
function updateProfileModal() {
  // Получаем данные из основного профиля
  const userName = document.getElementById('user-name');
  const totalXp = document.getElementById('xp-amount');
  const currentStreak = document.getElementById('streak-count');
  
  // Обновляем данные в модальном окне
  const userNameModal = document.getElementById('user-name-modal');
  const totalXpModal = document.getElementById('total-xp-modal');
  const currentStreakModal = document.getElementById('current-streak-modal');
  const maxStreakModal = document.getElementById('max-streak-modal');
  
  // Получаем имя пользователя из localStorage или используем значение по умолчанию
  const storedUsername = localStorage.getItem('username') || 'Player';
  
  if (userNameModal) {
    userNameModal.textContent = storedUsername;
  }
  
  if (userName) {
    userName.textContent = storedUsername;
  }
  
  if (totalXpModal && totalXp) {
    totalXpModal.textContent = totalXp.textContent || '0';
  }
  
  if (currentStreakModal && currentStreak) {
    currentStreakModal.textContent = currentStreak.textContent || '0';
  }
  
  if (maxStreakModal && currentStreak) {
    // Для примера используем текущий стрик как максимальный
    maxStreakModal.textContent = currentStreak.textContent || '0';
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
function initializeApp() {
  // Устанавливаем имя пользователя по умолчанию, если не установлено
  if (!localStorage.getItem('username')) {
    localStorage.setItem('username', 'Player');
  }
  
  // Инициализируем XP и стрик, если не установлены
  if (!localStorage.getItem('totalXp')) {
    localStorage.setItem('totalXp', '0');
  }
  
  if (!localStorage.getItem('streak')) {
    localStorage.setItem('streak', '0');
  }
  
  // Генерируем реферальный код, если не существует
  generateReferralCode();
  
  // Обновляем UI с сохраненными значениями
  const userName = document.getElementById('user-name');
  const totalXp = document.getElementById('xp-amount');
  const streakCount = document.getElementById('streak-count');
  const checkinStreak = document.getElementById('checkin-streak');
  
  if (userName) {
    userName.textContent = localStorage.getItem('username');
  }
  
  if (totalXp) {
    totalXp.textContent = localStorage.getItem('totalXp');
  }
  
  if (streakCount) {
    streakCount.textContent = localStorage.getItem('streak');
  }
  
  if (checkinStreak) {
    checkinStreak.textContent = localStorage.getItem('streak');
  }
  
  // Обновляем кнопку чекина
  updateCheckinButton();
  
  // Показываем домашний экран по умолчанию
  switchScreen('home');
}

// Инициализируем приложение при загрузке страницы
window.addEventListener('load', function() {
  initializeApp();
  
  // Добавляем обработчик клика на оверлей для закрытия модальных окон
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        closeAllModals();
      }
    });
  }
});

// Экспортируем функции в глобальную область видимости
window.switchScreen = switchScreen;
window.activateNavItem = activateNavItem;
window.closeAllModals = closeAllModals;
window.openModal = openModal;
window.generateReferralCode = generateReferralCode;
window.handleCopy = handleCopy;
window.claimDailyReward = claimDailyReward;
window.updateProfileModal = updateProfileModal;
