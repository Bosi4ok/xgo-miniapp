/**
 * Скрипт для создания анимированного фона с эффектом скорости света
 * и неоновым свечением персонажа
 */

// Настройки анимации
const SETTINGS = {
  // Настройки линий скорости
  speedLines: {
    count: 100,          // Количество линий
    minSpeed: 2,         // Минимальная скорость
    maxSpeed: 8,         // Максимальная скорость
    minLength: 20,       // Минимальная длина линии
    maxLength: 100,      // Максимальная длина линии
    color: '#8a2be2',    // Основной цвет линий (фиолетовый)
    altColor: '#ff0000', // Альтернативный цвет линий (красный)
    thickness: 2,        // Толщина линий
  },
  // Настройки неонового свечения
  neonGlow: {
    baseColor: '#ff0000',    // Основной цвет контура (красный)
    glowColor: '#ff3333',    // Цвет свечения
    pulseMin: 0.7,           // Минимальная интенсивность пульсации
    pulseMax: 1.0,           // Максимальная интенсивность пульсации
    pulseSpeed: 0.005,       // Скорость пульсации
    shadowBlur: 15,          // Размытие тени
    outlineWidth: 3,         // Толщина контура
  }
};

// Класс для управления анимацией фона
class AnimatedBackground {
  constructor(containerId, imageUrl) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Контейнер с ID ${containerId} не найден`);
      return;
    }
    
    // Создаем основной контейнер для анимации
    this.animationContainer = document.createElement('div');
    this.animationContainer.className = 'animation-container';
    this.container.appendChild(this.animationContainer);
    
    // Создаем canvas для эффекта скорости
    this.speedCanvas = document.createElement('canvas');
    this.speedCanvas.className = 'speed-canvas';
    this.animationContainer.appendChild(this.speedCanvas);
    this.speedCtx = this.speedCanvas.getContext('2d');
    
    // Создаем элемент для изображения с неоновым свечением
    this.characterContainer = document.createElement('div');
    this.characterContainer.className = 'character-container';
    this.animationContainer.appendChild(this.characterContainer);
    
    // Загружаем изображение персонажа
    this.characterImage = new Image();
    this.characterImage.src = imageUrl;
    this.characterImage.className = 'character-image';
    this.characterImage.onload = () => {
      this.characterContainer.appendChild(this.characterImage);
      
      // Создаем SVG-фильтр для неонового свечения
      this.createNeonFilter();
      
      // Инициализируем размеры canvas
      this.resizeCanvas();
      
      // Инициализируем линии скорости
      this.initSpeedLines();
      
      // Запускаем анимацию
      this.startAnimation();
    };
    
    // Добавляем обработчик изменения размера окна
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Добавляем стили
    this.addStyles();
  }
  
  // Добавляем необходимые стили
  addStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .animation-container {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background-color: #001a0e; /* Темно-зеленый фон */
      }
      
      .speed-canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
      }
      
      .character-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2;
      }
      
      .character-image {
        max-width: 80%;
        max-height: 80%;
        filter: url(#neon-glow);
        animation: pulse 2s infinite alternate;
      }
      
      @keyframes pulse {
        0% {
          filter: url(#neon-glow) brightness(${SETTINGS.neonGlow.pulseMin});
        }
        100% {
          filter: url(#neon-glow) brightness(${SETTINGS.neonGlow.pulseMax});
        }
      }
    `;
    document.head.appendChild(styleElement);
  }
  
  // Создаем SVG-фильтр для неонового свечения
  createNeonFilter() {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.style.zIndex = '-1';
    
    const defs = document.createElementNS(svgNS, 'defs');
    
    const filter = document.createElementNS(svgNS, 'filter');
    filter.setAttribute('id', 'neon-glow');
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');
    
    // Создаем эффект свечения
    const feGaussianBlur = document.createElementNS(svgNS, 'feGaussianBlur');
    feGaussianBlur.setAttribute('stdDeviation', SETTINGS.neonGlow.shadowBlur);
    feGaussianBlur.setAttribute('result', 'blur');
    
    const feFlood = document.createElementNS(svgNS, 'feFlood');
    feFlood.setAttribute('flood-color', SETTINGS.neonGlow.glowColor);
    feFlood.setAttribute('result', 'glow');
    
    const feComposite = document.createElementNS(svgNS, 'feComposite');
    feComposite.setAttribute('in', 'glow');
    feComposite.setAttribute('in2', 'blur');
    feComposite.setAttribute('operator', 'in');
    feComposite.setAttribute('result', 'coloredBlur');
    
    const feMerge = document.createElementNS(svgNS, 'feMerge');
    
    const feMergeNode1 = document.createElementNS(svgNS, 'feMergeNode');
    feMergeNode1.setAttribute('in', 'coloredBlur');
    
    const feMergeNode2 = document.createElementNS(svgNS, 'feMergeNode');
    feMergeNode2.setAttribute('in', 'SourceGraphic');
    
    feMerge.appendChild(feMergeNode1);
    feMerge.appendChild(feMergeNode2);
    
    filter.appendChild(feGaussianBlur);
    filter.appendChild(feFlood);
    filter.appendChild(feComposite);
    filter.appendChild(feMerge);
    
    defs.appendChild(filter);
    svg.appendChild(defs);
    
    document.body.appendChild(svg);
  }
  
  // Изменяем размеры canvas при изменении размера окна
  resizeCanvas() {
    const { width, height } = this.container.getBoundingClientRect();
    this.speedCanvas.width = width;
    this.speedCanvas.height = height;
    
    // Если линии скорости уже инициализированы, обновляем их позиции
    if (this.speedLines) {
      this.speedLines.forEach(line => {
        line.y = Math.random() * height;
      });
    }
  }
  
  // Инициализируем линии скорости
  initSpeedLines() {
    const { width, height } = this.speedCanvas;
    const { count, minSpeed, maxSpeed, minLength, maxLength } = SETTINGS.speedLines;
    
    this.speedLines = [];
    
    for (let i = 0; i < count; i++) {
      const useAltColor = Math.random() > 0.7; // 30% линий будут альтернативного цвета
      
      this.speedLines.push({
        x: Math.random() * width,
        y: Math.random() * height,
        length: minLength + Math.random() * (maxLength - minLength),
        speed: minSpeed + Math.random() * (maxSpeed - minSpeed),
        color: useAltColor ? SETTINGS.speedLines.altColor : SETTINGS.speedLines.color,
        alpha: 0.1 + Math.random() * 0.9 // Случайная прозрачность
      });
    }
  }
  
  // Обновляем позиции линий скорости
  updateSpeedLines() {
    const { width } = this.speedCanvas;
    
    this.speedLines.forEach(line => {
      line.x += line.speed;
      
      // Если линия вышла за пределы экрана, возвращаем ее в начало
      if (line.x > width) {
        line.x = -line.length;
      }
    });
  }
  
  // Рисуем линии скорости
  drawSpeedLines() {
    const { width, height } = this.speedCanvas;
    const ctx = this.speedCtx;
    
    // Очищаем canvas
    ctx.clearRect(0, 0, width, height);
    
    // Рисуем каждую линию
    this.speedLines.forEach(line => {
      ctx.beginPath();
      ctx.moveTo(line.x, line.y);
      ctx.lineTo(line.x + line.length, line.y);
      ctx.strokeStyle = line.color;
      ctx.globalAlpha = line.alpha;
      ctx.lineWidth = SETTINGS.speedLines.thickness;
      ctx.stroke();
    });
    
    // Сбрасываем прозрачность
    ctx.globalAlpha = 1;
  }
  
  // Основной цикл анимации
  animate() {
    // Обновляем позиции линий
    this.updateSpeedLines();
    
    // Рисуем линии
    this.drawSpeedLines();
    
    // Запрашиваем следующий кадр
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  
  // Запускаем анимацию
  startAnimation() {
    this.animate();
  }
  
  // Останавливаем анимацию
  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

// Экспортируем класс для использования в других модулях
export default AnimatedBackground;
