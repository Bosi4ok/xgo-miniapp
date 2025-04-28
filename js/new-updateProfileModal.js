// Новая функция для обновления данных в модальном окне профиля
async function updateProfileModal() {
  try {
    console.log('Обновление модального окна профиля...');
    
    // Получаем элемент с именем пользователя в модальном окне
    const userNameModalElement = document.getElementById('user-name-modal');
    if (!userNameModalElement) {
      console.error('Элемент с именем пользователя в модальном окне не найден');
      return;
    }
    
    // Получаем ID пользователя
    const telegramId = await getTelegramUserId();
    console.log('Telegram ID для профиля:', telegramId);
    
    // Получаем имя пользователя с помощью обновленной функции
    const userName = await getTelegramUserName();
    console.log('Получено имя пользователя для профиля:', userName);
    
    // Обновляем имя пользователя в модальном окне
    userNameModalElement.textContent = userName;
    console.log('Имя пользователя обновлено в модальном окне:', userName);
    
    // Получаем данные пользователя из базы данных
    const user = await getUser(telegramId);
    console.log('Данные пользователя для профиля:', user);
    
    // Получаем количество рефералов
    const referralsCount = await getReferralsCount(telegramId);
    console.log('Количество рефералов:', referralsCount);
    
    // Обновляем количество рефералов в модальном окне
    const referralsCountModal = document.getElementById('referrals-count-modal');
    if (referralsCountModal) {
      referralsCountModal.textContent = referralsCount.toString();
      console.log('Количество рефералов обновлено в модальном окне:', referralsCount);
    }
    
    // Обновляем XP в модальном окне
    const totalXpModal = document.getElementById('total-xp-modal');
    if (totalXpModal && user) {
      totalXpModal.textContent = (user.points || 0).toString();
      console.log('XP обновлено в модальном окне:', user.points || 0);
    }
    
    // Сохраняем данные пользователя в глобальную переменную для быстрого доступа
    currentUser = user;
    
    console.log('Модальное окно профиля успешно обновлено');
  } catch (error) {
    console.error('Ошибка при обновлении профиля:', error);
    
    // В случае ошибки пытаемся хотя бы отобразить имя пользователя из localStorage
    try {
      const savedName = localStorage.getItem('telegram_user_name');
      if (savedName) {
        const userNameModalElement = document.getElementById('user-name-modal');
        if (userNameModalElement) {
          userNameModalElement.textContent = savedName;
          console.log('Имя пользователя установлено из localStorage (в случае ошибки):', savedName);
        }
      }
    } catch (localStorageError) {
      console.error('Ошибка при получении имени из localStorage:', localStorageError);
    }
  }
}
