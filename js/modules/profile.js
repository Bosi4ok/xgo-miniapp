import { supabaseClient } from './database.js';
import { showNotification } from './ui.js';

// Загрузка данных профиля
export async function loadProfile(userData) {
  try {
    const { data: user, error } = await supabaseClient
      .from('users')
      .select('points, streak, last_checkin, completed_tasks')
      .eq('telegram_id', String(userData.id))
      .single();

    if (error) throw error;

    // Обновляем отображение XP
    document.getElementById('points-display-main').textContent = `${user.points || 0} XP`;

    // Обновляем отображение стрика
    if (document.getElementById('streak-count')) {
      document.getElementById('streak-count').textContent = user.streak || 0;
    }

    return user;
  } catch (error) {
    console.error('Ошибка при загрузке профиля:', error);
    showNotification('Ошибка при загрузке данных профиля', 'error');
    return null;
  }
}

// Открытие модального окна профиля
export function openProfileModal(userData) {
  document.getElementById('profile-modal').style.display = 'block';
  document.getElementById('modal-overlay').style.display = 'block';
  
  // Загружаем актуальные данные
  loadProfile(userData);
}

// Адаптация под мобильные устройства
export function setupMobileAdaptation() {
  const tg = window.Telegram.WebApp;
  if (tg?.isExpanded) {
    document.documentElement.style.fontSize = tg.viewportHeight / 50 + 'px';
  }
}
