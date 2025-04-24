// Функции для работы с модальными окнами
export function closeAllModals() {
  const modals = ['referral-modal', 'checkin-modal', 'tasks-modal'];
  modals.forEach(modalId => {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
  });

  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.style.display = 'none';

  // Управляем видимостью фоновых видео
  const startBg = document.getElementById('start-bg');
  const checkinBg = document.getElementById('checkin-bg');
  
  if (startBg) startBg.style.display = 'block';
  if (checkinBg) checkinBg.style.display = 'none';
}

// Функции для работы с уведомлениями
export function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Анимация появления
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  // Автоматическое скрытие
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// Функции для работы с интерфейсом реферальной системы
export function updateReferralUI(code, referralsCount) {
  const codeElement = document.getElementById('referral-code');
  const countElement = document.getElementById('referrals-count');
  
  if (code) {
    codeElement.textContent = code;
  } else {
    codeElement.textContent = 'Ошибка загрузки кода';
  }
  
  if (typeof referralsCount === 'number') {
    countElement.textContent = referralsCount;
  }
}

// Функции для работы с интерфейсом чекина
export function updateCheckinUI(streak) {
  const streakElement = document.getElementById('streak-count');
  if (streakElement && typeof streak === 'number') {
    streakElement.textContent = streak;
  }
}

// Функции для работы с анимациями
export function animateXP(amount) {
  const xpAnimation = document.createElement('div');
  xpAnimation.className = 'xp-animation';
  xpAnimation.textContent = `+${amount} XP`;
  
  document.body.appendChild(xpAnimation);
  
  setTimeout(() => {
    xpAnimation.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    xpAnimation.classList.remove('show');
    setTimeout(() => {
      xpAnimation.remove();
    }, 300);
  }, 2000);
}

// Функции для обработки копирования
export async function handleCopy(text) {
  try {
    await navigator.clipboard.writeText(text);
    showNotification('Скопировано!', 'success');
  } catch (error) {
    console.error('Ошибка при копировании:', error);
    showNotification('Ошибка при копировании', 'error');
  }
}
