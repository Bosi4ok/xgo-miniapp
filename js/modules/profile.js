import { supabaseClient } from '../../supabase-config.js';
import { showNotification } from './ui.js';

// Кэш данных профиля
let profileCache = null;
let lastUpdateTime = 0;
const CACHE_LIFETIME = 30000; // 30 секунд

// Загрузка данных профиля
export async function loadProfile(userData) {
  const now = Date.now();

  // Используем кэшированные данные, если они есть и не устарели
  if (profileCache && (now - lastUpdateTime < CACHE_LIFETIME)) {
    updateUI(profileCache);
    return profileCache;
  }

  try {
    const { data: user, error } = await supabaseClient
      .from('users')
      .select('points, streak, last_checkin, completed_tasks')
      .eq('telegram_id', String(userData.id))
      .single();

    if (error) throw error;

    // Обновляем кэш и время последнего обновления
    profileCache = user;
    lastUpdateTime = now;

    // Обновляем UI
    updateUI(user);

    return user;
  } catch (error) {
    console.error('Ошибка при загрузке профиля:', error);
    if (!profileCache) {
      showNotification('Ошибка при загрузке данных профиля', 'error');
    }
    return profileCache || null;
  }
}

// Обновление UI
function updateUI(user) {
  if (!user) return;

  // Обновляем отображение XP
  const pointsDisplay = document.getElementById('points-display-main');
  if (pointsDisplay) {
    pointsDisplay.textContent = `${user.points || 0} XP`;
  }

  // Обновляем отображение стрика
  const streakDisplay = document.getElementById('streak-count');
  if (streakDisplay) {
    streakDisplay.textContent = user.streak || 0;
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
