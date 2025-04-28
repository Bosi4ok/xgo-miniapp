// Функция для получения имени пользователя из Telegram
async function getTelegramUserName() {
  try {
    console.log('Начало получения имени пользователя из Telegram...');
    
    // Проверяем, есть ли данные в глобальном объекте TelegramUserData
    if (window.TelegramUserData && window.TelegramUserData.isLoaded) {
      console.log('Используем данные из глобального объекта TelegramUserData');
      
      if (window.TelegramUserData.first_name) {
        const fullName = `${window.TelegramUserData.first_name}${window.TelegramUserData.last_name ? ' ' + window.TelegramUserData.last_name : ''}`;
        console.log('Получено имя пользователя из TelegramUserData:', fullName);
        return fullName;
      }
    }
    
    // Проверяем, есть ли имя в localStorage
    const savedName = localStorage.getItem('telegram_user_name');
    if (savedName) {
      console.log('Найдено имя пользователя в localStorage:', savedName);
      return savedName;
    }
    
    // Пытаемся получить имя из Telegram WebApp напрямую
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user) {
      const user = window.Telegram.WebApp.initDataUnsafe.user;
      console.log('Получен объект пользователя из Telegram WebApp:', user);
      
      if (user.first_name) {
        const userName = `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`;
        console.log('Получено имя пользователя из Telegram WebApp:', userName);
        localStorage.setItem('telegram_user_name', userName);
        return userName;
      }
    }
    
    // Если не удалось получить имя, возвращаем значение по умолчанию
    console.log('Не удалось получить имя пользователя, возвращаем значение по умолчанию');
    return 'Player';
  } catch (error) {
    console.error('Ошибка при получении имени пользователя:', error);
    return 'Player';
  }
}
