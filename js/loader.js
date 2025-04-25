// Асинхронная загрузка модулей
export async function loadModules() {
    try {
        // Загружаем базовые модули сразу
        const [database, ui] = await Promise.all([
            import('./modules/database.js'),
            import('./modules/ui.js')
        ]);

        // Проверяем соединение с базой данных
        const { supabaseClient } = database;
        const { data, error } = await supabaseClient.from('users').select('count').limit(1);
        if (error) throw error;
        
        // Инициализируем UI компоненты
        const { closeAllModals, showNotification } = ui;
        window.closeAllModals = closeAllModals;
        window.showNotification = showNotification;

        // Остальные модули загружаем по мере необходимости
        const modulePromises = {
            checkin: () => import('./modules/checkin.js'),
            profile: () => import('./modules/profile.js'),
            referral: () => import('./modules/referral.js'),
            tasks: () => import('./modules/tasks.js')
        };

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
