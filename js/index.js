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
        const { getUser } = database;
        
        // Загружаем данные пользователя
        await getUser(userData.id);

        // Инициализируем UI
        const ui = await moduleLoader.loadModule('ui');
        const { closeAllModals, showNotification } = ui;
        
        // Добавляем UI функции в глобальную область
        window.closeAllModals = closeAllModals;
        window.showNotification = showNotification;

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
        const [checkin, referral, ui] = await Promise.all([
            moduleLoader.loadModule('checkin'),
            moduleLoader.loadModule('referral'),
            moduleLoader.loadModule('ui')
        ]);

        const { performCheckin } = checkin;
        const { getReferralCode, applyReferralCode } = referral;
        const { showNotification, animateXP, updateCheckinUI } = ui;

        // Обработчик чекина
        document.getElementById('checkinButton')?.addEventListener('click', async () => {
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
                showNotification('Ошибка при выполнении чекина', 'error');
            }
        });

        // Обработчики рефералов
        document.getElementById('referralButton')?.addEventListener('click', async () => {
            try {
                const code = await getReferralCode(userData);
                showNotification(`Ваш реферальный код: ${code}`, 'info');
            } catch (error) {
                showNotification('Ошибка при получении кода', 'error');
            }
        });

        document.getElementById('applyReferralButton')?.addEventListener('click', async () => {
            const code = prompt('Введите реферальный код:');
            if (!code) return;

            try {
                const result = await applyReferralCode(userData, code);
                if (result.success) {
                    showNotification(result.message, 'success');
                    animateXP(20);
                } else {
                    showNotification(result.message, 'error');
                }
            } catch (error) {
                showNotification('Ошибка при применении кода', 'error');
            }
        });
    } catch (error) {
        console.error('Error setting up event listeners:', error);
        showNotification('Ошибка при инициализации приложения', 'error');
    }
}

// Инициализация
// Запуск приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', initializeApp);
