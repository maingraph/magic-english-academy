document.addEventListener('DOMContentLoaded', function() {
    // Получаем все элементы чек-листа
    const checklistItems = document.querySelectorAll('.grammar-checklist-item');
    
    // Загружаем сохраненные состояния из localStorage
    checklistItems.forEach(item => {
        const topicId = item.getAttribute('data-topic-id');
        const checkbox = item.querySelector('input[type="checkbox"]');
        const itemText = item.querySelector('.item-text');
        
        // Проверяем сохраненное состояние
        if (localStorage.getItem(topicId) === 'completed') {
            checkbox.checked = true;
            item.classList.add('completed');
            itemText.style.textDecoration = 'line-through';
            itemText.style.color = '#858585';
        }
        
        // Добавляем обработчик изменения состояния
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                item.classList.add('completed');
                itemText.style.textDecoration = 'line-through';
                itemText.style.color = '#858585';
                localStorage.setItem(topicId, 'completed');
            } else {
                item.classList.remove('completed');
                itemText.style.textDecoration = 'none';
                itemText.style.color = '#5A5A5A';
                localStorage.removeItem(topicId);
            }
        });
    });
});