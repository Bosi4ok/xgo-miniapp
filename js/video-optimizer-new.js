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
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
    
    // Финальная оптимизация при полной загрузке страницы
    if (document.readyState === 'complete') {
      this.finalOptimization();
    } else {
      window.addEventListener('load', () => this.finalOptimization());
    }
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
   * Инициализация оптимизатора видео
   */
  initialize() {
    console.log(`VideoOptimizer: Инициализация для видео ${this.options.videoSource}`);
    
    // Устанавливаем источник видео
    if (!this.video.src) {
      const source = document.createElement('source');
      source.src = this.options.videoSource;
      source.type = this.getVideoMimeType(this.options.videoSource);
      this.video.appendChild(source);
    }
    
    // Проверяем, есть ли постер
    if (this.options.posterSource) {
      this.video.poster = this.options.posterSource;
    } else if (!this.video.hasAttribute('poster') || !this.video.poster) {
      console.log('VideoOptimizer: Создаем постер для видео из первого кадра...');
      this.createPosterFromVideo();
    }
    
    // Оптимизация загрузки видео
    this.video.addEventListener('canplaythrough', () => {
      console.log('VideoOptimizer: Видео полностью загружено и готово к воспроизведению');
      // Удаляем постер после загрузки видео для экономии памяти
      setTimeout(() => {
        this.video.removeAttribute('poster');
      }, 1000);
      
      // Вызываем callback если он задан
      if (typeof this.options.onReady === 'function') {
        this.options.onReady();
      }
    });
    
    // Обработка ошибок загрузки
    this.video.addEventListener('error', (e) => {
      console.error('VideoOptimizer: Ошибка при загрузке видео:', e);
      // В случае ошибки загрузки видео, показываем постер
      if (this.video.poster) {
        this.video.setAttribute('poster', this.video.poster);
      } else {
        this.createFallbackPoster();
      }
    });
    
    // Приоритетная загрузка видео
    if ('fetchPriority' in this.video) {
      this.video.fetchPriority = this.options.loadingPriority;
    }
    
    // Предварительная загрузка видео
    if ('preload' in this.video) {
      this.video.preload = 'auto';
    }
    
    // Отложенная загрузка других видео
    const otherVideos = document.querySelectorAll(`video:not(#${this.options.videoElement})`);
    otherVideos.forEach(otherVideo => {
      otherVideo.preload = 'none';
      otherVideo.setAttribute('loading', 'lazy');
    });
  }
  
  /**
   * Создает постер из первого кадра видео
   */
  createPosterFromVideo() {
    // Создаем временный canvas для захвата кадра
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Создаем временное видео для захвата кадра
    const tempVideo = document.createElement('video');
    tempVideo.src = this.options.videoSource;
    tempVideo.muted = true;
    tempVideo.playsInline = true;
    tempVideo.crossOrigin = 'anonymous';
    
    // Функция для захвата кадра
    const captureFrame = () => {
      // Устанавливаем размеры canvas равными размерам видео
      canvas.width = tempVideo.videoWidth || 640;
      canvas.height = tempVideo.videoHeight || 360;
      
      // Рисуем кадр на canvas
      context.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
      
      try {
        // Преобразуем canvas в Data URL
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        
        // Устанавливаем Data URL как постер для видео
        this.video.setAttribute('poster', dataURL);
        console.log('VideoOptimizer: Создан постер из первого кадра видео');
      } catch (e) {
        console.error('VideoOptimizer: Ошибка при создании постера:', e);
        this.createFallbackPoster(canvas, context);
      }
      
      // Останавливаем и удаляем временное видео
      tempVideo.pause();
      tempVideo.src = '';
      tempVideo.load();
    };
    
    // Обработчик события loadeddata для захвата кадра
    tempVideo.addEventListener('loadeddata', () => {
      tempVideo.currentTime = 0.1; // Устанавливаем время на 100мс для захвата первого кадра
    });
    
    // Обработчик события seeked для захвата кадра после установки времени
    tempVideo.addEventListener('seeked', captureFrame);
    
    // Обработчик ошибки
    tempVideo.addEventListener('error', () => {
      console.error('VideoOptimizer: Ошибка при загрузке видео для создания постера');
      this.createFallbackPoster(canvas, context);
    });
    
    // Запускаем загрузку видео
    tempVideo.load();
  }
  
  /**
   * Создает запасной постер с градиентом
   * @param {HTMLCanvasElement} [canvas] - Элемент canvas (если уже создан)
   * @param {CanvasRenderingContext2D} [context] - Контекст canvas (если уже создан)
   */
  createFallbackPoster(canvas, context) {
    // Создаем canvas если он не был передан
    if (!canvas) {
      canvas = document.createElement('canvas');
      context = canvas.getContext('2d');
    }
    
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
    this.video.setAttribute('poster', dataURL);
    console.log('VideoOptimizer: Создан запасной постер с градиентом');
  }
  
  /**
   * Финальная оптимизация видео после полной загрузки страницы
   */
  finalOptimization() {
    console.log('VideoOptimizer: Запуск финальной оптимизации видео');
    
    // Проверяем состояние видео
    if (this.video.paused && this.video.readyState >= 3) { // HAVE_FUTURE_DATA или выше
      // Если видео загружено, но не воспроизводится, запускаем его
      console.log('VideoOptimizer: Видео загружено, но не воспроизводится. Запускаем...');
      this.video.play().catch(e => console.error('VideoOptimizer: Ошибка при запуске видео:', e));
    }
    
    // Оптимизация производительности
    this.optimizePerformance();
  }
  
  /**
   * Оптимизирует производительность видео
   */
  optimizePerformance() {
    // Устанавливаем низкое качество воспроизведения для экономии ресурсов
    if ('playbackQuality' in this.video) {
      this.video.playbackQuality = 'low';
    }
    
    // Уменьшаем частоту обновления для экономии ресурсов
    if ('requestVideoFrameCallback' in this.video) {
      let lastFrameTime = 0;
      const frameInterval = 50; // Минимальный интервал между обработкой кадров (мс)
      
      const frameCallback = (now, metadata) => {
        if (now - lastFrameTime > frameInterval) {
          lastFrameTime = now;
          // Обработка кадра видео
        }
        this.video.requestVideoFrameCallback(frameCallback);
      };
      
      this.video.requestVideoFrameCallback(frameCallback);
    }
    
    // Устанавливаем низкий приоритет для видео после загрузки страницы
    if ('fetchPriority' in this.video) {
      this.video.fetchPriority = 'low';
    }
    
    console.log('VideoOptimizer: Производительность видео оптимизирована');
  }
  
  /**
   * Определяет MIME-тип видео по расширению файла
   * @param {string} url - URL видео файла
   * @returns {string} MIME-тип
   */
  getVideoMimeType(url) {
    const extension = url.split('.').pop().toLowerCase();
    const mimeTypes = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'ogg': 'video/ogg',
      'mov': 'video/quicktime',
      'm4v': 'video/mp4',
      'avi': 'video/x-msvideo',
      'wmv': 'video/x-ms-wmv'
    };
    
    return mimeTypes[extension] || 'video/mp4';
  }
}
