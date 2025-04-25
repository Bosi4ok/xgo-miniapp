import { checkSupabaseConnection } from './modules/supabase-check.js';

// Асинхронная загрузка модулей
export async function loadModules() {
    try {
        // Проверяем подключение к Supabase
        await checkSupabaseConnection();
        // Определяем все доступные модули
        const modules = {
            database: './modules/database.js',
            ui: './modules/ui.js',
            checkin: './modules/checkin.js',
            profile: './modules/profile.js',
            referral: './modules/referral.js',
            tasks: './modules/tasks.js'
        };

        // Кэш загруженных модулей
        const loadedModules = new Map();

        // Функция для загрузки модуля
        const loadModule = async (moduleName) => {
            try {
                // Проверяем кэш
                if (loadedModules.has(moduleName)) {
                    return loadedModules.get(moduleName);
                }

                // Проверяем существование модуля
                if (!modules[moduleName]) {
                    throw new Error(`Module ${moduleName} not found`);
                }

                // Загружаем модуль
                const module = await import(modules[moduleName]);
                
                // Кэшируем модуль
                loadedModules.set(moduleName, module);
                
                return module;
            } catch (error) {
                console.error(`Error loading module ${moduleName}:`, error);
                throw error;
            }
        };

        // Загружаем и проверяем database модуль
        const database = await loadModule('database');
        if (!database) {
            throw new Error('Не удалось загрузить database модуль');
        }

        // Возвращаем интерфейс для загрузки модулей
        return { loadModule };
    } catch (error) {
        console.error('Error initializing modules:', error);
        throw error;
    }
}
