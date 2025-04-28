/**
 * Скрипт для инициализации видео-фона с оптимизацией загрузки
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('Инициализация оптимизатора видео-фона');
  
  // Инициализация оптимизатора видео
  const videoOptimizer = new VideoOptimizer({
    videoElement: 'start-bg',
    videoSource: 'assets/background.mp4',
    loadingPriority: 'high',
    onReady: function() {
      console.log('Видео-фон готов к воспроизведению');
      // Добавляем эффект неонового свечения для персонажа
      addNeonGlowEffect();
    }
  });
});

/**
 * Добавляет эффект неонового свечения для элементов на странице
 */
function addNeonGlowEffect() {
  // Добавляем SVG-фильтр для неонового свечения
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.style.top = '-9999px';
  
  const defs = document.createElementNS(svgNS, 'defs');
  
  // Создаем фильтр для красного неонового свечения
  const redGlowFilter = document.createElementNS(svgNS, 'filter');
  redGlowFilter.setAttribute('id', 'red-glow');
  redGlowFilter.setAttribute('x', '-50%');
  redGlowFilter.setAttribute('y', '-50%');
  redGlowFilter.setAttribute('width', '200%');
  redGlowFilter.setAttribute('height', '200%');
  
  const redGlowBlur = document.createElementNS(svgNS, 'feGaussianBlur');
  redGlowBlur.setAttribute('in', 'SourceGraphic');
  redGlowBlur.setAttribute('stdDeviation', '10');
  redGlowBlur.setAttribute('result', 'blur');
  
  const redGlowFlood = document.createElementNS(svgNS, 'feFlood');
  redGlowFlood.setAttribute('flood-color', '#ff0000');
  redGlowFlood.setAttribute('flood-opacity', '0.7');
  redGlowFlood.setAttribute('result', 'glow');
  
  const redGlowComposite = document.createElementNS(svgNS, 'feComposite');
  redGlowComposite.setAttribute('in', 'glow');
  redGlowComposite.setAttribute('in2', 'blur');
  redGlowComposite.setAttribute('operator', 'in');
  redGlowComposite.setAttribute('result', 'coloredBlur');
  
  const redGlowMerge = document.createElementNS(svgNS, 'feMerge');
  
  const redGlowMergeNode1 = document.createElementNS(svgNS, 'feMergeNode');
  redGlowMergeNode1.setAttribute('in', 'coloredBlur');
  
  const redGlowMergeNode2 = document.createElementNS(svgNS, 'feMergeNode');
  redGlowMergeNode2.setAttribute('in', 'SourceGraphic');
  
  redGlowMerge.appendChild(redGlowMergeNode1);
  redGlowMerge.appendChild(redGlowMergeNode2);
  
  redGlowFilter.appendChild(redGlowBlur);
  redGlowFilter.appendChild(redGlowFlood);
  redGlowFilter.appendChild(redGlowComposite);
  redGlowFilter.appendChild(redGlowMerge);
  
  defs.appendChild(redGlowFilter);
  
  // Создаем фильтр для золотистого неонового свечения
  const goldGlowFilter = document.createElementNS(svgNS, 'filter');
  goldGlowFilter.setAttribute('id', 'gold-glow');
  goldGlowFilter.setAttribute('x', '-50%');
  goldGlowFilter.setAttribute('y', '-50%');
  goldGlowFilter.setAttribute('width', '200%');
  goldGlowFilter.setAttribute('height', '200%');
  
  const goldGlowBlur = document.createElementNS(svgNS, 'feGaussianBlur');
  goldGlowBlur.setAttribute('in', 'SourceGraphic');
  goldGlowBlur.setAttribute('stdDeviation', '5');
  goldGlowBlur.setAttribute('result', 'blur');
  
  const goldGlowFlood = document.createElementNS(svgNS, 'feFlood');
  goldGlowFlood.setAttribute('flood-color', '#e0a868');
  goldGlowFlood.setAttribute('flood-opacity', '0.7');
  goldGlowFlood.setAttribute('result', 'glow');
  
  const goldGlowComposite = document.createElementNS(svgNS, 'feComposite');
  goldGlowComposite.setAttribute('in', 'glow');
  goldGlowComposite.setAttribute('in2', 'blur');
  goldGlowComposite.setAttribute('operator', 'in');
  goldGlowComposite.setAttribute('result', 'coloredBlur');
  
  const goldGlowMerge = document.createElementNS(svgNS, 'feMerge');
  
  const goldGlowMergeNode1 = document.createElementNS(svgNS, 'feMergeNode');
  goldGlowMergeNode1.setAttribute('in', 'coloredBlur');
  
  const goldGlowMergeNode2 = document.createElementNS(svgNS, 'feMergeNode');
  goldGlowMergeNode2.setAttribute('in', 'SourceGraphic');
  
  goldGlowMerge.appendChild(goldGlowMergeNode1);
  goldGlowMerge.appendChild(goldGlowMergeNode2);
  
  goldGlowFilter.appendChild(goldGlowBlur);
  goldGlowFilter.appendChild(goldGlowFlood);
  goldGlowFilter.appendChild(goldGlowComposite);
  goldGlowFilter.appendChild(goldGlowMerge);
  
  defs.appendChild(goldGlowFilter);
  
  svg.appendChild(defs);
  document.body.appendChild(svg);
  
  // Применяем эффекты к элементам
  const buttons = document.querySelectorAll('.action-button, .checkin-button');
  buttons.forEach(button => {
    button.style.filter = 'url(#red-glow)';
    button.style.animation = 'pulse 2s infinite alternate';
  });
  
  const titles = document.querySelectorAll('.section-title, .modal-title');
  titles.forEach(title => {
    title.style.filter = 'url(#gold-glow)';
  });
  
  // Добавляем стили для анимации пульсации
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0% {
        filter: drop-shadow(0 0 5px rgba(255, 0, 0, 0.5)) url(#red-glow);
      }
      100% {
        filter: drop-shadow(0 0 15px rgba(255, 0, 0, 1)) url(#red-glow);
      }
    }
  `;
  document.head.appendChild(style);
}
