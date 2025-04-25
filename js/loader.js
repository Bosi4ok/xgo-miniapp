import { checkSupabaseConnection } from './modules/supabase-check.js';

// Кэш загруженных модулей
const loadedModules = new Map();

// Список модулей и их зависимостей
const moduleConfig = {
    database: {
        path: './modules/database.js',
        dependencies: [],
        required: true
    },
    ui: {
        path: './modules/ui.js',
        dependencies: ['database'],
        required: true
    },
    checkin: {
        path: './modules/checkin.js',
        dependencies: ['database', 'ui'],
        required: false
    },
    profile: {
        path: './modules/profile.js',
        dependencies: ['database', 'ui'],
        required: false
    },
    referral: {
        path: './modules/referral.js',
        dependencies: ['database', 'ui'],
        required: false
    },
    tasks: {
        path: './modules/tasks.js',
        dependencies: ['database', 'ui'],
        required: false
    }
};

// Функция для загрузки модуля и его зависимостей
async function loadModuleWithDependencies(moduleName, loadedDeps = new Set()) {
    // Проверяем кэш
    if (loadedModules.has(moduleName)) {
        console.log(`Модуль ${moduleName} уже загружен`);
        return loadedModules.get(moduleName);
    }

    const config = moduleConfig[moduleName];
    if (!config) {
        throw new Error(`Модуль ${moduleName} не найден`);
    }

    // Загружаем зависимости
    for (const dep of config.dependencies) {
        if (!loadedDeps.has(dep)) {
            console.log(`Загрузка зависимости ${dep} для модуля ${moduleName}`);
            await loadModuleWithDependencies(dep, loadedDeps);
            loadedDeps.add(dep);
        }
    }

    try {
        console.log(`Загрузка модуля ${moduleName}...`);
        const module = await import(config.path);
        loadedModules.set(moduleName, module);
        console.log(`Модуль ${moduleName} успешно загружен`);
        return module;
    } catch (error) {
        console.error(`Ошибка при загрузке модуля ${moduleName}:`, error);
        if (config.required) {
            throw error;
        }
        return null;
    }
}

// Основная функция загрузки модулей
export async function loadModules() {
    try {
        console.log('Начинаем загрузку модулей...');
        
        // Проверяем подключение к Supabase
        console.log('Проверка подключения к Supabase...');
        await checkSupabaseConnection();
        console.log('Подключение к Supabase успешно');

        // Загружаем все модули
        const modules = {};
        for (const [name, config] of Object.entries(moduleConfig)) {
            const module = await loadModuleWithDependencies(name);
            if (module) {
                modules[name] = module;
            }
        }

        console.log('Все модули успешно загружены');
        return modules;
    } catch (error) {
        console.error('Ошибка при инициализации модулей:', error);
        throw error;
    }
}
