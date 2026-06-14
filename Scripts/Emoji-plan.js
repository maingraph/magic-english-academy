document.addEventListener('DOMContentLoaded', function() {
    // Уникальные эмодзи для каждого уровня
    const levelEmojis = [
        '📚',    // A1 - книги (начальный уровень)
        '📝',    // A2 - записная книжка
        '🌍',    // B1 - глобус (интермедиат)
        '🎓',    // B2 - выпускная шапочка
        '🚀'     // C1 - ракета (продвинутый)
    ];
    
    // Получаем все карточки уровней
    const levelBlocks = document.querySelectorAll('.level-block');
    
    // Добавляем эмодзи к каждой карточке
    levelBlocks.forEach((block, index) => {
        // Создаем элемент для эмодзи
        const emoji = document.createElement('div');
        emoji.className = 'level-emoji';
        emoji.textContent = levelEmojis[index];
        
        // Добавляем эмодзи в карточку
        block.insertBefore(emoji, block.firstChild);
        
        // Добавляем небольшой случайный элемент к анимации
        const randomDelay = Math.random() * 0.5;
        emoji.style.animationDelay = `${randomDelay}s`;
    });
});