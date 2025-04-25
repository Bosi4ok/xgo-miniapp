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
        const ui = await moduleLoader.loadModule('ui');
        
        // Загружаем данные пользователя
        const userInfo = await database.getUser(userData.id);
        userData = { ...userData, ...userInfo };
        
        // Добавляем UI функции в глобальную область
        window.closeAllModals = ui.closeAllModals;
        window.showNotification = ui.showNotification;
        window.ui = ui; // Делаем ui доступным глобально

        // Настраиваем навигацию
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const screen = item.getAttribute('data-screen');
                
                // Убираем активный класс у всех элементов
                navItems.forEach(i => i.classList.remove('active'));
                
                // Добавляем активный класс выбранному
                item.classList.add('active');
                
                // Закрываем все модальные окна перед открытием нового
                window.closeAllModals();
                
                // Обрабатываем клик по экрану
                switch(screen) {
                    case 'home':
                        // Просто закрываем все модальные окна
                        break;
                    case 'checkin':
                        window.ui.showModal('checkin-modal');
                        break;
                    case 'tasks':
                        window.ui.showModal('tasks-modal');
                        break;
                    case 'referral':
                        window.ui.showModal('referral-modal');
                        break;
                    case 'profile':
                        // Добавим позже
                        break;
                }
            });
        });

        // Добавляем обработчик для клика по оверлею
        const modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    window.closeAllModals();
                }
            });
        }

        // Настраиваем обработчики событий
        await setupEventListeners();

    } catch (error) {
        console.error('Initialization error:', error);
        alert('Не удалось загрузить приложение: ' + error.message);
    }
}

// Настройка обработчиков событий
async function setupEventListeners() {
    try {
        // Загружаем необходимые модули
        const checkin = await moduleLoader.loadModule('checkin');
        const referral = await moduleLoader.loadModule('referral');

        // Обработчик для чекина
        const checkinButton = document.getElementById('checkinButton');
        if (checkinButton) {
            checkinButton.addEventListener('click', async () => {
                try {
                    const result = await checkin.performCheckin(userData);
                    if (result.success) {
                        window.ui.showNotification(result.message, 'success');
                        window.ui.animateXP(result.xp);
                        window.ui.updateCheckinUI(result.streak);
                        setTimeout(() => window.closeAllModals(), 2000); // Закрываем модальное окно через 2 секунды
                    } else {
                        window.ui.showNotification(result.message, 'error');
                    }
                } catch (error) {
                    console.error('Ошибка при выполнении чекина:', error);
                    window.ui.showNotification('Произошла ошибка при выполнении чекина', 'error');
                }
            });
        }

        // Обработчик для реферального кода
        const referralSubmit = document.getElementById('referral-submit');
        const referralInput = document.getElementById('referral-input');
        if (referralSubmit && referralInput) {
            referralSubmit.addEventListener('click', async () => {
                const code = referralInput.value.trim();
                if (!code) {
                    window.ui.showNotification('Введите реферальный код', 'error');
                    return;
                }

                try {
                    const result = await referral.checkReferralCode(code, userData.id);
                    if (result.success) {
                        window.ui.showNotification(result.message, 'success');
                        window.ui.updateReferralUI(result.code, result.referrals_count);
                        setTimeout(() => window.closeAllModals(), 1500);
                    } else {
                        window.ui.showNotification(result.message, 'error');
                    }
                } catch (error) {
                    console.error('Ошибка при проверке реферального кода:', error);
                    window.ui.showNotification('Произошла ошибка при проверке кода', 'error');
                }
            });

            // Добавляем обработчик нажатия Enter в поле ввода
            referralInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    referralSubmit.click();
                }
            });
        }

        // Загружаем данные пользователя
        const userNameElement = document.getElementById('user-name');
        if (userNameElement && userData) {
            userNameElement.textContent = userData.first_name || 'User';
        }

        // Загружаем реферальный код
        const referralCode = await referral.getReferralCode(userData.id);
        if (referralCode) {
            window.ui.updateReferralUI(referralCode.code, referralCode.referrals_count);
        }

        // Проверяем возможность чекина
        const canDoCheckin = await checkin.canCheckin(userData);
        if (checkinButton) {
            checkinButton.disabled = !canDoCheckin;
            checkinButton.textContent = canDoCheckin ? 'Получить награду' : 'Уже получено';
        }

    } catch (error) {
        console.error('Ошибка при настройке обработчиков событий:', error);
        window.ui.showNotification('Произошла ошибка при загрузке приложения', 'error');
    }
}

// Инициализация
// Запуск приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', initializeApp);
