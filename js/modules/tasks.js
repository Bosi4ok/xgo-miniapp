import { supabaseClient } from './database.js';
import { showNotification, animateXP } from './ui.js';

// Загрузка статуса задач
export async function loadTasksStatus(userData) {
  try {
    const { data: user, error } = await supabaseClient
      .from('users')
      .select('completed_tasks')
      .eq('telegram_id', String(userData.id))
      .single();

    if (error) throw error;

    const completedTasks = user.completed_tasks || [];
    
    // Обновляем UI для каждой задачи
    if (completedTasks.includes('telegram')) {
      document.getElementById('telegram-task-status').textContent = '✅';
      document.querySelector('[onclick="verifyTask(\'telegram\')"]').disabled = true;
    }
    
    if (completedTasks.includes('twitter')) {
      document.getElementById('twitter-task-status').textContent = '✅';
      document.querySelector('[onclick="verifyTask(\'twitter\')"]').disabled = true;
    }
  } catch (error) {
    console.error('Ошибка при загрузке статуса задач:', error);
    showNotification('Ошибка при загрузке задач', 'error');
  }
}

// Проверка выполнения задачи
export async function verifyTask(taskType, userData) {
  const statusElement = document.getElementById(`${taskType}-task-status`);
  const button = document.querySelector(`[onclick="verifyTask('${taskType}')"]`);
  button.disabled = true;

  try {
    let isSubscribed = false;

    if (taskType === 'telegram') {
      try {
        const chatMember = await window.Telegram.WebApp.getChatMember('@xgo_pump');
        isSubscribed = ['member', 'administrator', 'creator'].includes(chatMember.status);
      } catch (e) {
        console.error('Ошибка проверки подписки в Telegram:', e);
        showNotification('Ошибка проверки подписки', 'error');
      }
    } else if (taskType === 'twitter') {
      // Для Twitter пока просто показываем сообщение о ручной проверке
      isSubscribed = true;
    }

    if (!isSubscribed) {
      statusElement.textContent = '❌';
      button.disabled = false;
      showNotification('Подписка не найдена', 'error');
      return;
    }

    // Получаем текущие данные пользователя
    const { data: user, error: fetchError } = await supabaseClient
      .from('users')
      .select('points, completed_tasks')
      .eq('telegram_id', String(userData.id))
      .single();

    if (fetchError) throw fetchError;

    const completedTasks = user.completed_tasks || [];
    
    // Проверяем, не выполнена ли задача уже
    if (completedTasks.includes(taskType)) {
      statusElement.textContent = '✅';
      showNotification('Задача уже выполнена', 'info');
      return;
    }

    // Добавляем задачу в список выполненных и обновляем очки
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({
        points: user.points + 10,
        completed_tasks: [...completedTasks, taskType]
      })
      .eq('telegram_id', String(userData.id));

    if (updateError) throw updateError;

    // Обновляем UI
    statusElement.textContent = '✅';
    document.getElementById('points-display-main').textContent = `${user.points + 10} XP`;
    showNotification('Задача выполнена! +10 XP', 'success');
    animateXP(10);

  } catch (error) {
    console.error(`Ошибка при проверке задачи ${taskType}:`, error);
    statusElement.textContent = '❌';
    button.disabled = false;
    showNotification('Произошла ошибка', 'error');
  }
}
