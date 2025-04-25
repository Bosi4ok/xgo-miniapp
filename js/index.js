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
        
        // Загружаем данные пользователя
        await database.getUser(userData.id);

        // Инициализируем UI
        const ui = await moduleLoader.loadModule('ui');
        
        // Добавляем UI функции в глобальную область
        window.closeAllModals = ui.closeAllModals;
        window.showNotification = ui.showNotification;

        // Настраиваем обработчики событий
        setupEventListeners();

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

        // Обработчик чекина
        document.getElementById('checkinButton')?.addEventListener('click', async () => {
            try {
                const result = await checkin.performCheckin(userData);
                if (result.success) {
                    window.showNotification(result.message, 'success');
                    checkin.updateCheckinUI(result.streak);
                    ui.animateXP(result.xp);
                } else {
                    window.showNotification(result.message, 'error');
                }
            } catch (error) {
                console.error('Ошибка при выполнении чекина:', error);
                window.showNotification('Ошибка при выполнении чекина', 'error');
            }
        });

        // Обработчики рефералов
        document.getElementById('referralButton')?.addEventListener('click', async () => {
            try {
                const code = await referral.ensureReferralCode(userData);
                window.showNotification(`Ваш реферальный код: ${code}`, 'info');
            } catch (error) {
                console.error('Ошибка при получении кода:', error);
                window.showNotification('Ошибка при получении кода', 'error');
            }
        });

        document.getElementById('applyReferralButton')?.addEventListener('click', async () => {
            const code = prompt('Введите реферальный код:');
            if (!code) return;

            try {
                const result = await referral.applyReferralCode(userData, code);
                if (result.success) {
                    window.showNotification(result.message, 'success');
                    ui.animateXP(20);
                } else {
                    window.showNotification(result.message, 'error');
                }
            } catch (error) {
                console.error('Ошибка при применении кода:', error);
                window.showNotification('Ошибка при применении кода', 'error');
            }
        });
    } catch (error) {
        console.error('Error setting up event listeners:', error);
        window.showNotification('Ошибка при инициализации приложения', 'error');
    }
}

// Инициализация
// Запуск приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', initializeApp);
