import { backgroundManager } from './background.js';

// Инициализация навигации
export function initNavigation() {
    console.log('Инициализация навигации...');
    const navItems = document.querySelectorAll('.nav-item');
    console.log('Найдено элементов навигации:', navItems.length);
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const screen = item.dataset.screen;
            console.log('Клик по навигации:', screen);
            switchScreen(screen);
            updateActiveNavItem(item);
        });
    });
}

// Переключение экранов
export function switchScreen(screenId) {
    console.log('Переключаем на экран:', screenId);
    
    // Проверяем наличие экранов
    const screens = document.querySelectorAll('.screen');
    console.log('Найдено экранов:', screens.length);
    
    // Проверяем наличие целевого экрана
    const targetScreen = document.getElementById(`${screenId}-screen`);
    if (!targetScreen) {
        console.error('Целевой экран не найден:', `${screenId}-screen`);
        return;
    }
    
    // Скрываем все экраны
    screens.forEach(screen => {
        const isTarget = screen.id === `${screenId}-screen`;
        console.log(`Экран ${screen.id}: ${isTarget ? 'показываем' : 'скрываем'}`);
        screen.style.display = isTarget ? 'block' : 'none';
        // Добавляем/убираем класс active
        if (isTarget) {
            screen.classList.add('active');
        } else {
            screen.classList.remove('active');
        }
    });
    
    // Обновляем активный пункт меню
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const isActive = item.dataset.screen === screenId;
        if (isActive) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Обновление активного элемента навигации
export function updateActiveNavItem(activeItem) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    activeItem.classList.add('active');
}

// Функции для обновления интерфейса
export function updatePointsDisplay(points) {
    const pointsElement = document.getElementById('points-display');
    if (pointsElement) {
        pointsElement.textContent = `🎯 Очки: ${points}`;
        pointsElement.classList.add('pulse');
        setTimeout(() => pointsElement.classList.remove('pulse'), 1000);
    }
}

export function updateUserInfo(name) {
    const userInfoElement = document.getElementById('user-info');
    if (userInfoElement) {
        userInfoElement.textContent = `👤 ${name}`;
    }
}

export function updateUserName(firstName, username) {
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        userNameElement.textContent = `${firstName} @${username}`;
    }
}

export function showError(message) {
    const userInfoElement = document.getElementById('user-info');
    if (userInfoElement) {
        userInfoElement.innerHTML = `⚠️ ${message}`;
    }
}

export function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    const container = document.getElementById('notification-container') || document.body;
    container.appendChild(notification);

    // Добавляем класс для анимации
    setTimeout(() => notification.classList.add('show'), 10);

    // Удаляем уведомление через 3 секунды
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Функции для работы с модальными окнами
export function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    const overlay = document.getElementById('modal-overlay');
    
    modals.forEach(modal => {
        modal.classList.remove('active');
    });

    if (overlay) {
        overlay.classList.remove('active');
    }
}

export function showModal(modalId) {
    console.log('Открываем модальное окно:', modalId);
    
    // Сначала закрываем все модальные окна
    closeAllModals();
    
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById('modal-overlay');
    
    if (!modal) {
        console.error('Модальное окно не найдено:', modalId);
        return;
    }
    
    if (!overlay) {
        console.error('Оверлей не найден');
        // Создаем оверлей
        const newOverlay = document.createElement('div');
        newOverlay.id = 'modal-overlay';
        newOverlay.className = 'modal-overlay';
        newOverlay.addEventListener('click', closeAllModals);
        document.body.appendChild(newOverlay);
    }
    
    // Добавляем классы для отображения
    modal.classList.add('active');
    overlay.classList.add('active');
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
