import { supabase } from '../../supabase-config.js';

// Функция для проверки соединения с Supabase
export async function checkSupabaseConnection() {
    try {
        const { data, error } = await supabase.from('users').select('count').limit(1);
        if (error) {
            throw error;
        }
        return true;
    } catch (error) {
        console.error('Ошибка подключения к Supabase:', error);
        throw new Error('Не удалось подключиться к базе данных. Проверьте подключение к интернету.');
    }
}
