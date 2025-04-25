// Модуль для управления фоновыми видео
class BackgroundManager {
    constructor() {
        this.startBg = document.getElementById('start-bg');
        this.checkinBg = document.getElementById('checkin-bg');
        this.currentBg = 'start';
        this.isLoading = false;
    }

    async switchTo(type) {
        if (this.isLoading || this.currentBg === type) return;
        this.isLoading = true;

        try {
            const targetVideo = type === 'start' ? this.startBg : this.checkinBg;
            const currentVideo = type === 'start' ? this.checkinBg : this.startBg;

            // Предзагрузка видео если оно еще не загружено
            if (targetVideo.readyState < 3) {
                await new Promise((resolve) => {
                    targetVideo.load();
                    targetVideo.oncanplay = resolve;
                });
            }

            // Плавное переключение
            targetVideo.style.opacity = '0';
            targetVideo.style.display = 'block';
            
            await targetVideo.play();
            
            // Анимация перехода
            requestAnimationFrame(() => {
                targetVideo.style.opacity = '1';
                if (currentVideo) {
                    currentVideo.style.opacity = '0';
                    setTimeout(() => {
                        currentVideo.style.display = 'none';
                        currentVideo.pause();
                    }, 300);
                }
            });

            this.currentBg = type;
        } catch (error) {
            console.error('Error switching background:', error);
        } finally {
            this.isLoading = false;
        }
    }

    // Предзагрузка всех фонов
    async preloadAll() {
        const videos = [this.startBg, this.checkinBg];
        
        for (const video of videos) {
            if (!video) continue;
            
            // Устанавливаем низкий приоритет загрузки
            video.preload = "metadata";
            
            // Загружаем только метаданные сначала
            await new Promise((resolve) => {
                if (video.readyState >= 1) {
                    resolve();
                } else {
                    video.onloadedmetadata = resolve;
                }
            });
        }
    }
}

// Создаем и экспортируем единственный экземпляр
export const backgroundManager = new BackgroundManager();
