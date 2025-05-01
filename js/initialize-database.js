// Скрипт для инициализации базы данных

import { supabaseClient } from '../supabase-config.js'; // Правильный импорт

// Функция для инициализации базы данных
async function initializeDatabase() {
  console.log('Проверяем инициализацию базы данных...');

  if (!supabaseClient) {
    console.error('Клиент Supabase не инициализирован!');
    return false;
  }

  try {
    console.log('Пытаюсь получить доступ к таблице users...');
    const { data, error, count } = await supabaseClient
      .from('users')
      .select('id', { count: 'exact', head: true }); // Просто проверяем доступ, head:true не загружает данные

    if (error) {
      console.error('Ошибка при проверке доступа к таблице users:', error);
      // Можно добавить обработку, если таблица недоступна
      // Например, показать сообщение пользователю
      return false; // Обозначаем, что инициализация (проверка) не удалась
    } else {
      console.log('База данных доступна (таблица users найдена).');
      return true; // Инициализация (проверка) успешна
    }

  } catch (catchError) {
    console.error('Критическая ошибка при проверке инициализации базы данных:', catchError);
    return false;
  }
}

// Экспортируем функцию явно, если она будет импортироваться в других модулях
export { initializeDatabase };