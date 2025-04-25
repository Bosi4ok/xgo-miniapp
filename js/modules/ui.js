import { backgroundManager } from './background.js';

// Функции для работы с модальными окнами
export function closeAllModals() {
  const modals = ['referral-modal', 'checkin-modal', 'tasks-modal'];
  modals.forEach(modalId => {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
  });

  const overlay = document.getElementById('modal-overlay');
}

export function animateXP(amount) {
    const xpElement = document.getElementById('xp-amount');
    if (!xpElement) return;

    const currentXP = parseInt(xpElement.textContent) || 0;
    const targetXP = currentXP + amount;
    
    // Создаем анимацию
    const duration = 1000; // 1 секунда
    const start = performance.now();
    
    // Добавляем всплывающий индикатор
    const indicator = document.createElement('div');
    indicator.className = 'xp-indicator';
    indicator.textContent = `+${amount} XP`;
    document.body.appendChild(indicator);
    
    setTimeout(() => indicator.classList.add('show'), 10);
    
    function update(currentTime) {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentValue = Math.floor(currentXP + (amount * progress));
        xpElement.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            // Удаляем индикатор
            setTimeout(() => {
                indicator.classList.remove('show');
                setTimeout(() => indicator.remove(), 300);
            }, 1000);
        }
    }
    
    requestAnimationFrame(update);
}

export function updateCheckinUI(streak) {
    const streakElement = document.getElementById('streak-count');
    if (streakElement) {
        streakElement.textContent = streak;
        streakElement.classList.add('pulse');
        setTimeout(() => streakElement.classList.remove('pulse'), 1000);
    }
}

export function updateReferralUI(code, count) {
    const codeElement = document.getElementById('referral-code');
    const countElement = document.getElementById('referrals-count');
    
    if (codeElement) {
        codeElement.textContent = code;
    }
    
    if (countElement) {
        countElement.textContent = count;
    }
}

// Функции для работы с анимациями
// UI функции
export function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Добавляем класс для анимации
    setTimeout(() => notification.classList.add('show'), 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

export function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    const overlay = document.getElementById('modal-overlay');
    
    modals.forEach(modal => {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    });

    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById('modal-overlay');
    
    if (modal && overlay) {
        // Сначала показываем элементы
        modal.style.display = 'block';
        overlay.style.display = 'block';
        
        // Запускаем анимацию
        requestAnimationFrame(() => {
            modal.classList.add('show');
            overlay.classList.add('show');
        });
    }
}

export function animateXP(amount) {
    const xpElement = document.getElementById('xp-amount');
    if (!xpElement) return;

    const currentXP = parseInt(xpElement.textContent) || 0;
    const targetXP = currentXP + amount;
    
    // Создаем анимацию
    const duration = 1000; // 1 секунда
    const start = performance.now();
    
    // Добавляем всплывающий индикатор
    const indicator = document.createElement('div');
    indicator.className = 'xp-indicator';
    indicator.textContent = `+${amount} XP`;
    document.body.appendChild(indicator);
    
    requestAnimationFrame(() => indicator.classList.add('show'));
    
    function update(currentTime) {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentValue = Math.floor(currentXP + (amount * progress));
        xpElement.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            // Удаляем индикатор
            setTimeout(() => {
                indicator.classList.remove('show');
                setTimeout(() => indicator.remove(), 300);
            }, 1000);
        }
    }
    
    requestAnimationFrame(update);
}

export function updateCheckinUI(streak) {
    const streakElement = document.getElementById('streak-count');
    if (streakElement) {
        streakElement.textContent = streak;
        streakElement.classList.add('pulse');
        setTimeout(() => streakElement.classList.remove('pulse'), 1000);
    }
}

export function updateReferralUI(code, count) {
    const codeElement = document.getElementById('referral-code');
    const countElement = document.getElementById('referrals-count');
    
    if (codeElement) {
        codeElement.textContent = code;
        // Добавляем анимацию обновления
        codeElement.classList.add('pulse');
        setTimeout(() => codeElement.classList.remove('pulse'), 1000);
    }
    
    if (countElement) {
        countElement.textContent = count;
        // Добавляем анимацию обновления
        countElement.classList.add('pulse');
        setTimeout(() => countElement.classList.remove('pulse'), 1000);
    }
}
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
