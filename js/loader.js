// Асинхронная загрузка модулей
export async function loadModules() {
    try {
        // Загружаем базовые модули сразу
        const modulePromises = {
            database: () => import('./modules/database.js'),
            ui: () => import('./modules/ui.js'),
            checkin: () => import('./modules/checkin.js'),
            profile: () => import('./modules/profile.js'),
            referral: () => import('./modules/referral.js'),
            tasks: () => import('./modules/tasks.js')
        };

        // Проверяем соединение с базой данных
        const database = await modulePromises.database();
        const { supabaseClient } = database;
        const { data, error } = await supabaseClient.from('users').select('count').limit(1);
        if (error) throw error;
        
        // Инициализируем UI компоненты
        const ui = await modulePromises.ui();
        const { closeAllModals, showNotification } = ui;
        window.closeAllModals = closeAllModals;
        window.showNotification = showNotification;

        // Возвращаем функцию для ленивой загрузки модулей
        return {
            loadModule: async (moduleName) => {
                if (modulePromises[moduleName]) {
                    const module = await modulePromises[moduleName]();
                    return module;
                }
                throw new Error(`Module ${moduleName} not found`);
            }
        };
    } catch (error) {
        console.error('Error loading modules:', error);
        throw error;
    }
}
