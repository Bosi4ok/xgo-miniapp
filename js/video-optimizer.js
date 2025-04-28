/**
 * Скрипт для оптимизации загрузки видео
 */

document.addEventListener('DOMContentLoaded', function() {
  // Оптимизация видео стиль1.mp4
  optimizeBackgroundVideo();
});

/**
 * Оптимизирует загрузку фонового видео
 */
function optimizeBackgroundVideo() {
  const video = document.getElementById('start-bg');
  if (!video) return;
  
  // Проверяем, есть ли постер
  if (!video.hasAttribute('poster') || !video.poster) {
    console.log('Создаем постер для видео из первого кадра...');
    createPosterFromVideo(video);
  }
  
  // Оптимизация загрузки видео
  video.addEventListener('canplaythrough', function() {
    console.log('Видео полностью загружено и готово к воспроизведению');
    // Удаляем постер после загрузки видео для экономии памяти
    setTimeout(() => {
      video.removeAttribute('poster');
    }, 1000);
  });
  
  // Обработка ошибок загрузки
  video.addEventListener('error', function(e) {
    console.error('Ошибка при загрузке видео:', e);
    // В случае ошибки загрузки видео, показываем постер
    if (video.poster) {
      video.setAttribute('poster', video.poster);
    }
  });
  
  // Приоритетная загрузка видео
  if ('fetchPriority' in video) {
    video.fetchPriority = 'high';
  }
  
  // Предварительная загрузка видео
  if ('preload' in video) {
    video.preload = 'auto';
  }
  
  // Отложенная загрузка других видео
  const otherVideos = document.querySelectorAll('video:not(#start-bg)');
  otherVideos.forEach(otherVideo => {
    otherVideo.preload = 'none';
    otherVideo.setAttribute('loading', 'lazy');
  });
}

/**
 * Создает постер из первого кадра видео
 * @param {HTMLVideoElement} video - Элемент видео
 */
function createPosterFromVideo(video) {
  // Создаем временный canvas для захвата кадра
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  // Функция для захвата кадра
  const captureFrame = () => {
    // Устанавливаем размеры canvas равными размерам видео
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    
    // Рисуем кадр на canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      // Преобразуем canvas в Data URL
      const dataURL = canvas.toDataURL('image/jpeg', 0.8);
      
      // Устанавливаем Data URL как постер для видео
      video.setAttribute('poster', dataURL);
      console.log('Постер успешно создан из первого кадра видео');
    } catch (e) {
      console.error('Ошибка при создании постера:', e);
    }
  };
  
  // Если видео уже загружено, захватываем кадр
  if (video.readyState >= 2) { // HAVE_CURRENT_DATA или выше
    captureFrame();
  } else {
    // Иначе ждем загрузки метаданных
    video.addEventListener('loadeddata', captureFrame, { once: true });
    
    // Устанавливаем таймаут на случай, если видео не загрузится
    setTimeout(() => {
      if (!video.poster) {
        console.log('Таймаут при создании постера, используем запасной вариант');
        // Используем запасной вариант - создаем простой цветной постер
        createFallbackPoster(video, canvas, context);
      }
    }, 3000);
  }
}

/**
 * Создает запасной постер с градиентом
 * @param {HTMLVideoElement} video - Элемент видео
 * @param {HTMLCanvasElement} canvas - Элемент canvas
 * @param {CanvasRenderingContext2D} context - Контекст canvas
 */
function createFallbackPoster(video, canvas, context) {
  // Устанавливаем размеры canvas
  canvas.width = 640;
  canvas.height = 360;
  
  // Создаем градиент
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#000000');
  gradient.addColorStop(1, '#333333');
  
  // Заполняем canvas градиентом
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Преобразуем canvas в Data URL
  const dataURL = canvas.toDataURL('image/jpeg', 0.9);
  
  // Устанавливаем Data URL как постер для видео
  video.setAttribute('poster', dataURL);
  console.log('Создан запасной постер с градиентом');
}
