document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.login-form');
    const errorMessage = document.getElementById('error-message');
    
    // Единые учетные данные
    const CORRECT_USERNAME = 'X8J2D91ENG';
    const CORRECT_PASSWORD = '7m#Rz9@KpW';
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        if (username === CORRECT_USERNAME && password === CORRECT_PASSWORD) {
            errorMessage.style.display = 'none';
            window.location.href = 'Main-Page.html';
        } else {
            errorMessage.textContent = 'Неверный логин или пароль. Попробуйте снова.';
            errorMessage.style.display = 'block';
            errorMessage.classList.add('shake');
            setTimeout(() => errorMessage.classList.remove('shake'), 500);
        }
    });
    
    // Анимация эмодзи (оставлено как украшение интерфейса)
    const emojis = document.querySelectorAll('.floating-emoji');
    emojis.forEach(emoji => {
        const duration = Math.random() * 20 + 10;
        emoji.style.animationDuration = `${duration}s`;
    });
});