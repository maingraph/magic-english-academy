// Progress Tracking System
class ProgressTracker {
    constructor() {
        this.initialize();
        this.loadProgress();
        this.setupEventListeners();
    }

    initialize() {
        // Структура тем по уровням (должна соответствовать вашим чек-листам)
        this.levelsStructure = {
            'A1': { total: 18, selector: '#grammar-checklist input[type="checkbox"]' },
            'A2': { total: 20, selector: '#grammar-checklist input[type="checkbox"]' },
            'B1': { total: 22, selector: '#grammar-checklist input[type="checkbox"]' },
            'B2': { total: 25, selector: '#grammar-checklist input[type="checkbox"]' },
            'C1': { total: 28, selector: '#grammar-checklist input[type="checkbox"]' }
        };

        this.motivationMessages = [
            { min: 0, max: 0, message: "Начните изучать темы, чтобы увидеть ваш прогресс!" },
            { min: 1, max: 20, message: "Отличное начало! Продолжайте в том же духе! 🚀" },
            { min: 21, max: 40, message: "Вы на правильном пути! Не останавливайтесь! 💪" },
            { min: 41, max: 60, message: "Отлично! Вы прошли больше половины пути! 🌟" },
            { min: 61, max: 80, message: "Потрясающе! Скоро вы достигнете своей цели! 🔥" },
            { min: 81, max: 99, message: "Почти у цели! Осталось совсем немного! 🎯" },
            { min: 100, max: 100, message: "Поздравляем! Вы полностью завершили уровень! 🎉" }
        ];
    }

    setupEventListeners() {
        // Слушаем изменения в localStorage
        window.addEventListener('storage', (e) => {
            if (e.key === 'englishProgress') {
                this.loadProgress();
            }
        });

        // Периодическая проверка обновлений прогресса
        setInterval(() => {
            this.checkProgressUpdates();
        }, 1000);
    }

    loadProgress() {
        const savedProgress = localStorage.getItem('englishProgress');
        if (savedProgress) {
            this.progress = JSON.parse(savedProgress);
        } else {
            this.progress = this.initializeProgressData();
            this.saveProgress();
        }
        
        this.calculateAndDisplayProgress();
    }

    initializeProgressData() {
        const progress = {
            levels: {},
            lastUpdated: new Date().toISOString()
        };

        Object.keys(this.levelsStructure).forEach(level => {
            progress.levels[level] = {
                completed: 0,
                total: this.levelsStructure[level].total
            };
        });

        return progress;
    }

    calculateAndDisplayProgress() {
        let totalCompleted = 0;
        let totalTopics = 0;

        // Рассчитываем прогресс для каждого уровня
        Object.keys(this.progress.levels).forEach(level => {
            const levelData = this.progress.levels[level];
            const percent = Math.round((levelData.completed / levelData.total) * 100);
            
            this.updateLevelProgress(level, percent);
            
            totalCompleted += levelData.completed;
            totalTopics += levelData.total;
        });

        // Общий прогресс
        const overallPercent = totalTopics > 0 ? Math.round((totalCompleted / totalTopics) * 100) : 0;
        this.updateOverallProgress(overallPercent);

        // Обновляем статистику
        this.updateStats(totalCompleted, totalTopics);

        // Обновляем мотивационное сообщение
        this.updateMotivationMessage(overallPercent);
    }

    updateLevelProgress(level, percent) {
        const progressBar = document.getElementById(`${level.toLowerCase()}-progress`);
        const percentElement = document.getElementById(`${level.toLowerCase()}-percent`);
        
        if (progressBar && percentElement) {
            progressBar.style.width = `${percent}%`;
            percentElement.textContent = `${percent}%`;
        }
    }

    updateOverallProgress(percent) {
        const overallProgress = document.getElementById('overall-progress');
        const progressText = document.getElementById('progress-text');
        
        if (overallProgress && progressText) {
            overallProgress.style.width = `${percent}%`;
            progressText.textContent = `${percent}%`;
        }
    }

    updateStats(completed, total) {
        document.getElementById('total-topics').textContent = total;
        document.getElementById('completed-topics').textContent = completed;
        document.getElementById('remaining-topics').textContent = total - completed;
    }

    updateMotivationMessage(percent) {
        const motivationElement = document.getElementById('motivation-text');
        const message = this.motivationMessages.find(m => percent >= m.min && percent <= m.max);
        
        if (motivationElement && message) {
            motivationElement.textContent = message.message;
        }
    }

    checkProgressUpdates() {
        // Проверяем актуальность данных
        const currentHash = this.calculateCurrentHash();
        if (this.lastHash !== currentHash) {
            this.lastHash = currentHash;
            this.loadProgress();
        }
    }

    calculateCurrentHash() {
        // Создаем хэш на основе текущего состояния чекбоксов
        let hash = '';
        Object.keys(this.levelsStructure).forEach(level => {
            const checkboxes = document.querySelectorAll(this.levelsStructure[level].selector);
            hash += Array.from(checkboxes).map(cb => cb.checked ? '1' : '0').join('');
        });
        return hash;
    }

    saveProgress() {
        localStorage.setItem('englishProgress', JSON.stringify(this.progress));
    }

    // Метод для обновления прогресса из других страниц
    updateFromCheckboxes() {
        Object.keys(this.levelsStructure).forEach(level => {
            const checkboxes = document.querySelectorAll(this.levelsStructure[level].selector);
            const completed = Array.from(checkboxes).filter(cb => cb.checked).length;
            
            if (this.progress.levels[level]) {
                this.progress.levels[level].completed = completed;
            }
        });
        
        this.progress.lastUpdated = new Date().toISOString();
        this.saveProgress();
        this.calculateAndDisplayProgress();
    }
}

// Глобальная функция для обновления прогресса при изменении чекбоксов
function setupCheckboxListeners() {
    // Находим все чекбоксы на странице
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (window.progressTracker) {
                window.progressTracker.updateFromCheckboxes();
            }
            
            // Сохраняем состояние чекбокса
            localStorage.setItem(`checkbox_${this.id}`, this.checked);
        });
        
        // Восстанавливаем состояние чекбокса
        const savedState = localStorage.getItem(`checkbox_${checkbox.id}`);
        if (savedState !== null) {
            checkbox.checked = savedState === 'true';
        }
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    window.progressTracker = new ProgressTracker();
    setupCheckboxListeners();
});

// Функция для использования на других страницах
function updateProgressFromExternal() {
    if (window.progressTracker) {
        window.progressTracker.updateFromCheckboxes();
    }
}