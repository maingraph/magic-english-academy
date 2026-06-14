// Добавьте в Modal.js
document.addEventListener('DOMContentLoaded', function() {
    // Аккордеон для домашнего задания
    const homeworkItems = document.querySelectorAll('.homework-item');
    
    homeworkItems.forEach(item => {
        const question = item.querySelector('.homework-question');
        
        question.addEventListener('click', function() {
            // Закрываем все остальные
            homeworkItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                    otherItem.querySelector('.homework-answer').style.display = 'none';
                }
            });
            
            // Переключаем текущий
            item.classList.toggle('active');
            const answer = item.querySelector('.homework-answer');
            
            if (item.classList.contains('active')) {
                answer.style.display = 'block';
            } else {
                answer.style.display = 'none';
            }
        });
    });
});

// Course-code.js
// Добавляем в начало файла
import { notionLinks } from './links.js';

// Или если используете обычный script tag:
// <script src="Scripts/links.js"></script>