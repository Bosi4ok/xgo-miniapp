import { loadModules } from './loader.js';

// Глобальные переменные
let userData = null;
let moduleLoader = null;

// Функция для показа ошибки
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '50%';
    errorDiv.style.left = '50%';
    errorDiv.style.transform = 'translate(-50%, -50%)';
    errorDiv.style.background = 'rgba(255, 0, 0, 0.9)';
    errorDiv.style.color = 'white';
    errorDiv.style.padding = '20px';
    errorDiv.style.borderRadius = '10px';
    errorDiv.style.textAlign = 'center';
    errorDiv.style.zIndex = '9999';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
}

// Инициализация приложения
async function initializeApp() {
    try {
        console.log('Начинаем инициализацию...');

        // Ждем загрузки DOM
        await new Promise(resolve => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                document.addEventListener('DOMContentLoaded', resolve);
            }
        });
        console.log('DOM загружен');
        
        // Ждем загрузки Telegram Web App
        console.log('Ожидаем загрузки WebApp...');
        const tg = await window.TelegramWebAppLoaded;
        console.log('WebApp загружен');

        // Инициализируем WebApp
        console.log('Вызываем ready()...');
        tg.ready();

        // Получаем данные пользователя
        console.log('Получаем данные пользователя...');
        userData = tg.initDataUnsafe?.user;
        if (!userData) {
            throw new Error('Не удалось получить данные пользователя');
        }
        console.log('Данные пользователя:', userData);

        // Загружаем базовые модули
        try {
            moduleLoader = await loadModules();
        } catch (error) {
            throw new Error('Не удалось загрузить модули: ' + error.message);
        }

        // Загружаем и инициализируем основные модули
        let database, ui;
        try {
            database = await moduleLoader.loadModule('database');
            ui = await moduleLoader.loadModule('ui');
            if (!database || !ui) {
                throw new Error('Не удалось загрузить основные модули');
            }
        } catch (error) {
            throw new Error('Ошибка загрузки модулей: ' + error.message);
        }
        
        // Загружаем данные пользователя
        try {
            const userInfo = await database.getUser(userData.id);
            if (!userInfo) {
                throw new Error('Не удалось получить данные пользователя из базы данных');
            }
            userData = { ...userData, ...userInfo };
            
            // Обновляем UI
            console.log('Обновляем UI с данными пользователя:', userData);
            ui.updatePointsDisplay(userData.points || 0);
            ui.updateUserInfo(userData.first_name || 'User');
            
            // Обновляем элемент XP
            const xpElement = document.getElementById('xp-amount');
            if (xpElement) {
                xpElement.textContent = userData.points || 0;
            }
        } catch (error) {
            console.error('Ошибка при работе с базой данных:', error);
            throw new Error('Ошибка при работе с базой данных: ' + error.message);
        }
        
        // Добавляем UI функции в глобальную область
        try {
            window.ui = ui;
            window.closeAllModals = ui.closeAllModals;
            window.showNotification = ui.showNotification;
            window.showModal = ui.showModal;

            // Закрываем все модальные окна при старте
            ui.closeAllModals();
        } catch (error) {
            throw new Error('Ошибка инициализации UI: ' + error.message);
        }

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
                ui.closeAllModals();
                
                // Обрабатываем клик по экрану
                switch(screen) {
                    case 'home':
                        // Просто закрываем все модальные окна
                        break;
                    case 'checkin':
                        ui.showModal('checkin-modal');
                        break;
                    case 'tasks':
                        ui.showModal('tasks-modal');
                        break;
                    case 'referral':
                        ui.showModal('referral-modal');
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

        // Делаем модули доступными глобально
        window.checkin = checkin;
        window.referral = referral;

        // Обработчик для чекина
        const checkinButton = document.getElementById('checkinButton');
        if (checkinButton) {
            checkinButton.addEventListener('click', async () => {
                try {
                    const result = await checkin.performCheckin(userData);
                    if (result.success) {
                        ui.showNotification(result.message, 'success');
                        ui.animateXP(result.xp);
                        ui.updateCheckinUI(result.streak);
                        setTimeout(() => ui.closeAllModals(), 2000);
                    } else {
                        ui.showNotification(result.message, 'error');
                    }
                } catch (error) {
                    console.error('Ошибка при выполнении чекина:', error);
                    ui.showNotification('Произошла ошибка при выполнении чекина', 'error');
                }
            });
        }

        // Обработчик для реферального кода
        const referralSubmit = document.getElementById('referral-submit');
        const referralInput = document.getElementById('referral-input');
        if (referralSubmit && referralInput) {
            referralSubmit.addEventListener('click', async () => {
                const code = referralInput.value.trim().toUpperCase();
                if (!code) {
                    ui.showNotification('Введите реферальный код', 'error');
                    return;
                }

                try {
                    const result = await referral.checkReferralCode(code, userData.id);
                    if (result.success) {
                        ui.showNotification(result.message, 'success');
                        ui.updateReferralUI(result.code, result.referrals_count);
                        setTimeout(() => ui.closeAllModals(), 1500);
                    } else {
                        ui.showNotification(result.message, 'error');
                    }
                } catch (error) {
                    console.error('Ошибка при проверке реферального кода:', error);
                    ui.showNotification('Произошла ошибка при проверке кода', 'error');
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
        const stats = await referral.getReferralStats(userData.id);
        if (stats) {
            window.ui.updateReferralUI(stats.code, stats.referrals_count);
        }

        // Проверяем возможность чекина
        const canDoCheckin = await checkin.canCheckin(userData);
        if (checkinButton) {
            checkinButton.disabled = !canDoCheckin;
            checkinButton.textContent = canDoCheckin ? 'Получить награду' : 'Уже получено';
        }

    } catch (error) {
        console.error('Ошибка при настройке обработчиков событий:', error);
        window.showNotification('Произошла ошибка при загрузке приложения', 'error');
    }
}

// Функция проверки задания
window.verifyTask = async function(taskType) {
    try {
        if (!window.ui) {
            throw new Error('UI модуль не инициализирован');
        }
        const tasks = await moduleLoader.loadModule('tasks');
        const result = await tasks.verifyTask(taskType, userData);
        if (result.success) {
            window.ui.showNotification(result.message, 'success');
            window.ui.updatePointsDisplay(result.points);
            document.getElementById(`${taskType}-task-status`).innerHTML = '✅';
        } else {
            window.ui.showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка при проверке задания:', error);
        if (window.ui) {
            window.ui.showNotification('Произошла ошибка при проверке задания', 'error');
        } else {
            alert('Произошла ошибка при проверке задания');
        }
    }
};

// Инициализация
// Запуск приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, что мы в Telegram
    if (!window.Telegram && !window.location.href.includes('telegram.org')) {
        showError('Это приложение можно открыть только в Telegram');
        return;
    }

    initializeApp().catch(error => {
        console.error('Ошибка инициализации:', error);
        showError(error.message);
    });
});
