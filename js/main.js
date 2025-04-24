import { supabase } from './modules/supabase.js';
import { ensureReferralCode, applyReferralCode, updateReferralsCount } from './modules/referral.js';
import { performCheckin } from './modules/checkin.js';
import { closeAllModals, showNotification, updateReferralUI, updateCheckinUI, animateXP } from './modules/ui.js';
import { loadTasksStatus, verifyTask, openTasksModal } from './modules/tasks.js';
import { loadProfile, openProfileModal, setupMobileAdaptation } from './modules/profile.js';

// Глобальные переменные
let userData = null;
let userPoints = 0;
let referralCode = null;

// Функции для открытия модальных окон
function openCheckinModal() {
  closeAllModals();
  document.getElementById('checkin-modal').style.display = 'block';
  document.getElementById('modal-overlay').style.display = 'block';
  document.getElementById('start-bg').style.display = 'none';
  document.getElementById('checkin-bg').style.display = 'block';
}

function copyReferralCode() {
  const codeElement = document.getElementById('referral-code');
  if (codeElement) {
    navigator.clipboard.writeText(codeElement.textContent)
      .then(() => showNotification('Код скопирован!', 'success'))
      .catch(() => showNotification('Не удалось скопировать код', 'error'));
  }
}

// Экспортируем функции в глобальную область видимости
Object.assign(window, {
  // Модальные окна
  closeCheckinModal: closeAllModals,
  closeReferralModal: closeAllModals,
  closeTasksModal: closeAllModals,
  openCheckinModal,
  openReferralModal,
  openTasksModal: () => {
    closeAllModals();
    document.getElementById('tasks-modal').style.display = 'block';
    document.getElementById('modal-overlay').style.display = 'block';
  },
  // Обработчики событий
  handleCheckin,
  handleReferralCode,
  copyReferralCode,
  applyReferralCode,
  verifyTask: (taskType) => verifyTask(taskType, userData),
  openProfileModal
});

// Инициализация при загрузке
window.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('Initializing Telegram Web App...');
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      throw new Error('Telegram WebApp is not available');
    }

    tg.ready();
    userData = tg.initDataUnsafe?.user;
    if (!userData) {
      throw new Error('User data is null');
    }

    // Настраиваем адаптацию под мобильные устройства
    setupMobileAdaptation();

    // Загружаем данные профиля
    await loadProfile(userData);

    console.log('Инициализация успешна:', { userData });
  } catch (error) {
    console.error('Ошибка при инициализации:', error);
    document.body.innerHTML = `<div style="padding: 20px; color: red;">
      ⚠️ Ошибка: ${error.message}
    </div>`;
  }
});

// Обработчик чекина
async function handleCheckin() {
  try {
    const result = await performCheckin(userData);
    if (result.success) {
      showNotification(result.message, 'success');
      updateCheckinUI(result.streak);
      animateXP(result.xp);
    } else {
      showNotification(result.message, 'error');
    }
  } catch (error) {
    console.error('Ошибка при выполнении чекина:', error);
    showNotification('Произошла ошибка при выполнении чекина', 'error');
  }
}

// Обработчик открытия реферального окна
async function openReferralModal() {
  closeAllModals();
  document.getElementById('referral-modal').style.display = 'block';
  document.getElementById('modal-overlay').style.display = 'block';
  
  try {
    const referralCode = await ensureReferralCode(userData);
    await updateReferralsCount(userData);
    updateReferralUI(referralCode);
  } catch (error) {
    console.error('Ошибка при открытии реферального окна:', error);
    showNotification('Произошла ошибка при загрузке данных', 'error');
  }
}

// Обработчик применения реферального кода
async function handleReferralCode() {
  const codeInput = document.getElementById('referral-input');
  const code = codeInput.value.trim();
  
  if (!code) {
    showNotification('Введите реферальный код', 'error');
    return;
  }
  
  try {
    const result = await applyReferralCode(userData, code);
    showNotification(result.message, result.success ? 'success' : 'error');
    
    if (result.success) {
      codeInput.value = '';
      animateXP(20);
      await loadProfile(userData); // Обновляем данные профиля
    }
  } catch (error) {
    console.error('Ошибка при применении реферального кода:', error);
    showNotification('Произошла ошибка при применении кода', 'error');
  }
}

// Обработчик открытия окна задач
function handleTasksModal() {
  closeAllModals();
  openTasksModal();
  loadTasksStatus(userData);
}

// Обработчик открытия профиля
function handleProfileModal() {
  closeAllModals();
  openProfileModal(userData);
}
