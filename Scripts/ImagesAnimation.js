document.addEventListener('DOMContentLoaded', function() {
    // Анимация плавающих картинок
    const floatingImages = document.querySelectorAll('.floating-image');
    
    floatingImages.forEach((img, index) => {
        // Устанавливаем задержку для каждой картинки
        const delay = 300 + index * 300;
        
        setTimeout(() => {
            img.style.animation = `float 18s infinite ease-in-out`;
            img.style.opacity = '0.9';
            img.style.transform = 'scale(1)';
        }, delay);
        
        // Плавное изменение положения каждые 20 секунд
        setInterval(() => {
            const randomX = (Math.random() - 0.5) * 60;
            const randomY = (Math.random() - 0.5) * 40;
            const randomRotate = (Math.random() - 0.5) * 15;
            
            img.style.transform = `translate(${randomX}px, ${randomY}px) rotate(${randomRotate}deg) scale(1)`;
        }, 20000);
    });
    
    // Анимация при скролле
    window.addEventListener('scroll', function() {
        floatingImages.forEach(img => {
            const imgPosition = img.getBoundingClientRect().top;
            const screenPosition = window.innerHeight / 1.3;
            
            if (imgPosition < screenPosition) {
                img.style.opacity = '0.9';
                img.style.transform = 'scale(1)';
            }
        });
    });
    
    // Интерактивность для картинок под формой
    const bottomImages = document.querySelectorAll('.bottom-image');
    bottomImages.forEach(img => {
        img.addEventListener('mouseenter', () => {
            img.style.transform = 'translateY(-8px)';
            img.style.filter = 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))';
        });
        
        img.addEventListener('mouseleave', () => {
            img.style.transform = 'translateY(0)';
            img.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))';
        });
    });
});