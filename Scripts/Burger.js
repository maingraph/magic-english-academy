document.addEventListener('DOMContentLoaded', function() {
    const burger = document.getElementById('burger');
    const navLinks = document.getElementById('navLinks');
    const menuOverlay = document.getElementById('menuOverlay');
    const body = document.body;
    const html = document.documentElement;

    // Функция для закрытия меню
    const closeMenu = () => {
        navLinks.classList.remove('active');
        burger.classList.remove('active');
        menuOverlay.classList.remove('active');
        body.classList.remove('no-scroll');
        html.classList.remove('no-scroll');
    };

    // Переключение меню
    burger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        burger.classList.toggle('active');
        menuOverlay.classList.toggle('active');
        body.classList.toggle('no-scroll');
        html.classList.toggle('no-scroll');
    });

    // Закрытие при клике на оверлей
    menuOverlay.addEventListener('click', closeMenu);

    // Закрытие при клике на ссылки (только на мобильных)
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 1024) {
                closeMenu();
            }
        });
    });

    // Закрытие при нажатии Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navLinks.classList.contains('active')) {
            closeMenu();
        }
    });

    // Адаптация при изменении размера окна
    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024 && navLinks.classList.contains('active')) {
            closeMenu();
        }
    });
});

// Автоматическая анимация подарка
function startGiftAnimation() {
    const giftEmoji = document.querySelector('.gift-emoji');
    if (!giftEmoji) return;

    // Запускаем автоматическую анимацию
    let isAnimating = false;
    
    function triggerAnimation() {
        if (isAnimating) return;
        
        isAnimating = true;
        giftEmoji.style.animation = 'none';
        void giftEmoji.offsetWidth; // Trigger reflow
        giftEmoji.style.animation = 'gift-shake 0.5s ease-in-out 1';
        
        setTimeout(() => {
            isAnimating = false;
            // Возвращаем автоматическую анимацию через 5 сек
            setTimeout(() => {
                if (!isAnimating) {
                    giftEmoji.style.animation = 'gift-shake 5s infinite';
                    giftEmoji.style.animationDelay = '5s';
                }
            }, 5000);
        }, 500);
    }

    // Первый запуск
    setTimeout(triggerAnimation, 5000);
    
    // Интервал для повторения
    setInterval(triggerAnimation, 10000);
}

// Инициализация после загрузки страницы
document.addEventListener('DOMContentLoaded', function() {
    // Ваш существующий код бургер-меню...
    
    // Запускаем анимацию подарка
    startGiftAnimation();
});