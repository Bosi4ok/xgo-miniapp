import { backgroundManager } from './background.js';

// Инициализация навигации
export function initNavigation() {
    console.log('Инициализация навигации...');
    
    // Показываем начальный экран
    const initialScreen = document.querySelector('.screen');
    if (initialScreen) {
        initialScreen.classList.add('active');
        initialScreen.style.transform = 'translateX(0)';
        initialScreen.style.visibility = 'visible';
        initialScreen.style.opacity = '1';
    }
    
    // Инициализируем обработчики кликов
    const navItems = document.querySelectorAll('.nav-item');
    console.log('Найдено элементов навигации:', navItems.length);
    
    navItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation(); // Предотвращаем всплытие
            
            const screen = item.dataset.screen;
            if (!screen) {
                console.error('Не найден data-screen атрибут:', item);
                return;
            }
            
            console.log('Клик по навигации:', screen);

            // Обрабатываем клики по кнопкам
            switch (screen) {
                case 'checkin':
                    // Показываем экран чекина
                    const checkinButton = document.getElementById('checkin-button');
                    if (checkinButton) {
                        const checkin = await import('./checkin.js');
                        const canDoCheckin = await checkin.canCheckin(window.userData);
                        checkinButton.disabled = !canDoCheckin;
                        checkinButton.textContent = canDoCheckin ? 'Получить награду' : 'Уже получено';
                    }
                    break;

                case 'tasks':
                    // Показываем экран заданий
                    const tasks = await import('./tasks.js');
                    await tasks.loadTasks();
                    break;

                case 'referral':
                    // Показываем экран реферальной системы
                    const referral = await import('./referral.js');
                    const stats = await referral.getReferralStats(window.userData.id);
                    if (stats) {
                        updateReferralUI(stats.code, stats.referrals_count);
                    }
                    break;
            }

            // Переключаем экран
            switchScreen(screen);
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
        if (screen !== targetScreen) {
            screen.style.transform = 'translateX(100%)';
            screen.style.visibility = 'hidden';
            screen.style.opacity = '0';
            screen.classList.remove('active');
        }
    });

    // Показываем целевой экран
    targetScreen.style.visibility = 'visible';
    targetScreen.style.opacity = '1';
    targetScreen.style.transform = 'translateX(0)';
    targetScreen.classList.add('active');
    
    // Обновляем активный пункт меню
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const isActive = item.dataset.screen === screenId;
        item.classList.toggle('active', isActive);
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
    console.log('Закрываем все модальные окна');
    const modals = document.querySelectorAll('.modal');
    const overlay = document.getElementById('modal-overlay');
    
    console.log('Найдено модальных окон:', modals.length);
    
    // Скрываем все модальные окна
    modals.forEach(modal => {
        modal.classList.remove('active');
        modal.style.display = 'none';
    });

    // Скрываем оверлей
    if (overlay) {
        overlay.classList.remove('active');
        overlay.style.display = 'none';
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
    
    console.log('Найдено модальное окно:', modal);
    
    // Проверяем наличие оверлея
    if (!overlay) {
        console.error('Оверлей не найден');
        return;
    }
    
    // Добавляем обработчик клика на оверлей
    if (!overlay.hasEventListener) {
        overlay.addEventListener('click', function() {
            closeAllModals();
        });
        overlay.hasEventListener = true;
    }
    
    // Показываем модальное окно и оверлей
    modal.style.display = 'block';
    overlay.style.display = 'block';
    
    // Добавляем активный класс
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
