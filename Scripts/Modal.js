// Modal.js - исправленная версия для всех уровней
document.addEventListener('DOMContentLoaded', function() {
    // Получаем элементы модального окна для Notion
    const notionModal = document.getElementById('notionLinkModal');
    const notionOverlay = document.getElementById('notionModalOverlay');
    const notionLink = document.getElementById('modalNotionLink');
    const modalCancelLink = document.getElementById('modalCancelLink');
    const modalTopicTitle = document.getElementById('modalTopicTitle');
    const modalTopicText = document.getElementById('modalTopicText');
    
    // Функция для определения категории по topicId
    function getCategoryByTopicId(topicId) {
        // Проверяем skills категории
        if (topicId.includes('writing') || topicId.includes('listening') || topicId.includes('reading')) {
            return 'skills';
        }
        
        // Проверяем grammar категории (для всех уровней)
        if (topicId.includes('grammar') || 
            topicId.includes('present-') || 
            topicId.includes('past-') || 
            topicId.includes('future-') ||
            topicId.includes('plural') ||
            topicId.includes('modal-') ||
            topicId.includes('conditionals') ||
            topicId.includes('passive') ||
            topicId.includes('reported') ||
            topicId.includes('gerund') ||
            topicId.includes('linking') ||
            topicId.includes('adverbs') ||
            topicId.includes('questions') ||
            topicId.includes('too-') ||
            topicId.includes('modall-') ||
            topicId.includes('few-') ||
            topicId.includes('indefinite') ||
            topicId.includes('phrasal') ||
            topicId.includes('verb-') ||
            topicId.includes('pronouns') ||
            topicId.includes('articles') ||
            topicId.includes('demonstrative') ||
            topicId.includes('there-') ||
            topicId.includes('numbers') ||
            topicId.includes('have-') ||
            topicId.includes('can-') ||
            topicId.includes('simple-') ||
            topicId.includes('prepositions') ||
            topicId.includes('possessive') ||
            topicId.includes('imperative') ||
            topicId.includes('word-') ||
            topicId.includes('tete-') ||
            topicId.includes('ttt-') ||
            topicId.includes('tttt-') ||
            topicId.includes('ttttt-') ||
            topicId.includes('ee-') ||
            topicId.includes('eee-') ||
            topicId.includes('eeee-') ||
            topicId.includes('comparison') ||
            topicId.includes('perfect-') ||
            topicId.includes('continuous') ||
            topicId.includes('if-') ||
            topicId.includes('unless') ||
            topicId.includes('wish') ||
            topicId.includes('relative') ||
            topicId.includes('participle') ||
            topicId.includes('cleft') ||
            topicId.includes('emphasis') ||
            topicId.includes('inversion') ||
            topicId.includes('fronting') ||
            topicId.includes('parallelism') ||
            topicId.includes('narrative') ||
            topicId.includes('ellipsis') ||
            topicId.includes('indirect')) {
            return 'grammar';
        }
        
        // Все остальное - vocabulary
        return 'vocabulary';
    }
    
    // Функция для получения правильного уровня из текущей страницы
    function getCurrentLevel() {
        // 1. Сначала проверяем глобальную переменную (если установлена в HTML)
        if (window.currentLevel) {
            return window.currentLevel;
        }
        
        // 2. Проверяем URL страницы или название файла
        const pathname = window.location.pathname;
        const filename = pathname.split('/').pop().toLowerCase();
        
        console.log('Определяем уровень. Файл:', filename);
        
        // Проверяем все возможные уровни
        if (filename.includes('plan-a1')) return 'A1';
        if (filename.includes('plan-a2')) return 'A2';
        if (filename.includes('plan-b1')) return 'B1';
        if (filename.includes('plan-b2')) return 'B2';
        if (filename.includes('plan-c1')) return 'C1';
        
        // Для страницы Plan.html (главной страницы с выбором уровня)
        if (filename.includes('plan.html') || filename === 'plan.html') {
            // На главной странице плана не должно быть модальных окон
            console.warn('На странице Plan.html нет конкретного уровня');
            return 'A1'; // Возвращаем A1 по умолчанию для совместимости
        }
        
        // 3. Проверяем заголовок страницы
        const title = document.title.toLowerCase();
        if (title.includes('a2') || title.includes('pre-intermediate')) return 'A2';
        if (title.includes('b1') || title.includes('intermediate')) return 'B1';
        if (title.includes('b2') || title.includes('upper-intermediate')) return 'B2';
        if (title.includes('c1') || title.includes('advanced')) return 'C1';
        
        // 4. Проверяем контент на странице
        const h1 = document.querySelector('h1, .title, .level-title, .block-2 .title');
        if (h1) {
            const h1Text = h1.textContent.toLowerCase();
            if (h1Text.includes('a2') || h1Text.includes('pre-intermediate')) return 'A2';
            if (h1Text.includes('b1') || h1Text.includes('intermediate')) return 'B1';
            if (h1Text.includes('b2') || h1Text.includes('upper-intermediate')) return 'B2';
            if (h1Text.includes('c1') || h1Text.includes('advanced')) return 'C1';
        }
        
        // 5. По умолчанию A1 (для совместимости со старым кодом)
        console.warn('Уровень не определен, используется A1 по умолчанию');
        return 'A1';
    }
    
    // === Функции для блокировки скролла ===
    function disableScroll() {
        // Просто добавляем класс к body
        document.body.classList.add('no-scroll');
    }
    
    function enableScroll() {
        // Просто убираем класс с body
        document.body.classList.remove('no-scroll');
    }
    // === Конец функций для блокировки скролла ===
    
    // Функция для открытия уведомления с ссылкой на Notion
    function openNotionModal(topicId, topicTitle) {
        // Блокируем скролл
        disableScroll();
        
        // Определяем текущий уровень
        const level = getCurrentLevel();
        console.log('Открываем модальное окно для уровня:', level, 'тема:', topicId);
        
        // Определяем категорию
        const category = getCategoryByTopicId(topicId);
        
        // Получаем ссылку из базы данных
        let notionUrl = '';
        let topicText = '';
        
        // Проверяем, есть ли ссылка для данного уровня и темы
        if (notionLinks && notionLinks[level] && notionLinks[level][category] && notionLinks[level][category][topicId]) {
            notionUrl = notionLinks[level][category][topicId];
            topicText = 'Материал доступен в Notion';
        } else {
            console.warn('Ссылка не найдена для:', { level, category, topicId });
        }
        
        // Если ссылка отсутствует или пустая
        if (!notionUrl || notionUrl.trim() === '') {
            modalTopicTitle.textContent = 'Материал в разработке';
            modalTopicText.textContent = 'Материал для этой темы пока готовится. Скоро он будет доступен!';
            notionLink.style.display = 'none';
            notionLink.href = '#';
        } else {
            modalTopicTitle.textContent = topicTitle;
            modalTopicText.textContent = topicText;
            notionLink.style.display = 'inline-block';
            notionLink.href = notionUrl;
            
            // Добавляем атрибут уровня для аналитики
            notionLink.setAttribute('data-level', level);
            notionLink.setAttribute('data-topic', topicId);
        }
        
        // Показываем модальное окно
        notionModal.classList.add('active');
        notionOverlay.classList.add('active');
    }
    
    // Функция для закрытия уведомления
    function closeNotionModal() {
        // Сначала скрываем модальное окно
        notionModal.classList.remove('active');
        notionOverlay.classList.remove('active');
        
        // Ждем завершения анимации (300ms) и восстанавливаем скролл
        setTimeout(() => {
            enableScroll();
        }, 300);
    }
    
    // Обработчики для закрытия модального окна
    modalCancelLink.addEventListener('click', function(e) {
        e.preventDefault();
        closeNotionModal();
    });
    
    notionOverlay.addEventListener('click', closeNotionModal);
    
    // ESC для закрытия
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && notionModal.classList.contains('active')) {
            closeNotionModal();
        }
    });
    
    // Обновляем обработчики кнопок "Посмотреть"
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            const topicId = this.closest('.grammar-checklist-item').getAttribute('data-topic-id');
            const topicTitle = this.closest('.grammar-checklist-item').querySelector('.item-text').textContent;
            
            // Открываем уведомление с ссылкой на Notion
            openNotionModal(topicId, topicTitle);
        });
    });
    
    // Для отладки: выводим информацию о загруженном уровне
    console.log('Modal.js загружен. Определенный уровень:', getCurrentLevel());
});