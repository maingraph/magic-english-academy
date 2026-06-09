document.addEventListener('DOMContentLoaded', function() {
    const checkOverflow = () => {
        if (document.documentElement.scrollWidth > window.innerWidth) {
        console.warn('Есть элементы за пределами экрана:', 
            Array.from(document.querySelectorAll('*'))
            .filter(el => el.offsetLeft + el.offsetWidth > window.innerWidth)
        );
        }
    };
    window.addEventListener('resize', checkOverflow);
    checkOverflow();
});