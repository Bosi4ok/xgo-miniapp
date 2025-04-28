/**
 * Скрипт для оптимизации загрузки видео
 * Универсальный класс для работы с любым видео
 */

class VideoOptimizer {
  /**
   * Создает экземпляр оптимизатора видео
   * @param {Object} options - Настройки оптимизатора
   * @param {string} options.videoElement - ID элемента видео
   * @param {string} options.videoSource - Путь к видео файлу
   * @param {string} [options.posterSource] - Путь к постеру (если есть)
   * @param {string} [options.loadingPriority='auto'] - Приоритет загрузки ('high', 'auto', 'low')
   * @param {Function} [options.onReady] - Функция обратного вызова при готовности видео
   */
  constructor(options) {
    this.options = Object.assign({
      videoElement: null,
      videoSource: null,
      posterSource: null,
      loadingPriority: 'auto',
      onReady: null
    }, options);
    
    // Проверяем обязательные параметры
    if (!this.options.videoElement || !this.options.videoSource) {
      console.error('VideoOptimizer: Не указаны обязательные параметры videoElement или videoSource');
      return;
    }
    
    this.video = document.getElementById(this.options.videoElement);
    if (!this.video) {
      console.error(`VideoOptimizer: Элемент с ID ${this.options.videoElement} не найден`);
      return;
    }
    
    // Начинаем предварительную загрузку видео
    this.preloadVideo();
    
    // Инициализируем оптимизацию при загрузке DOM
    document.addEventListener('DOMContentLoaded', () => this.initialize());
    
    // Финальная оптимизация при полной загрузке страницы
    window.addEventListener('load', () => this.finalOptimization());
  }
  
  /**
   * Предварительная загрузка видео до загрузки DOM
   */
  preloadVideo() {
    // Используем Image для предварительной загрузки видео как бинарных данных
    const videoPreloader = new Image();
    videoPreloader.src = this.options.videoSource;
    console.log(`VideoOptimizer: Начата предварительная загрузка видео ${this.options.videoSource}`);
  }

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

/**
 * Финальная оптимизация видео после полной загрузки страницы
 */
function finalOptimization() {
  const video = document.getElementById('start-bg');
  if (!video) return;
  
  console.log('Запуск финальной оптимизации видео');
  
  // Проверяем состояние видео
  if (video.paused && video.readyState >= 3) { // HAVE_FUTURE_DATA или выше
    // Если видео загружено, но не воспроизводится, запускаем его
    console.log('Видео загружено, но не воспроизводится. Запускаем...');
    video.play().catch(e => console.error('Ошибка при запуске видео:', e));
  }
  
  // Оптимизация производительности
  optimizePerformance(video);
  
  // Отложенная загрузка других видео
  setTimeout(() => {
    const otherVideos = document.querySelectorAll('video:not(#start-bg)');
    console.log(`Начинаем загрузку ${otherVideos.length} других видео`);
    
    otherVideos.forEach((otherVideo, index) => {
      // Загружаем другие видео с задержкой
      setTimeout(() => {
        otherVideo.setAttribute('preload', 'metadata');
        console.log(`Начата загрузка метаданных для видео #${index + 1}`);
      }, index * 1000); // Загружаем каждое следующее видео с задержкой в 1 секунду
    });
  }, 3000); // Задержка в 3 секунды перед загрузкой других видео
}

/**
 * Оптимизирует производительность видео
 * @param {HTMLVideoElement} video - Элемент видео
 */
function optimizePerformance(video) {
  // Устанавливаем низкое качество воспроизведения для экономии ресурсов
  if ('playbackQuality' in video) {
    video.playbackQuality = 'low';
  }
  
  // Уменьшаем частоту обновления для экономии ресурсов
  if ('requestVideoFrameCallback' in video) {
    let lastFrameTime = 0;
    const frameInterval = 50; // Минимальный интервал между обработкой кадров (мс)
    
    const frameCallback = (now, metadata) => {
      if (now - lastFrameTime > frameInterval) {
        lastFrameTime = now;
        // Обработка кадра видео
      }
      video.requestVideoFrameCallback(frameCallback);
    };
    
    video.requestVideoFrameCallback(frameCallback);
  }
  
  // Устанавливаем низкий приоритет для видео после загрузки страницы
  if ('fetchPriority' in video) {
    video.fetchPriority = 'low';
  }
  
  console.log('Производительность видео оптимизирована');
}
