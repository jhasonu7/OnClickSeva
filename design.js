
    document.addEventListener('DOMContentLoaded', function() {
        const navMobile = document.querySelector('.nav-mobile');
        const heroSection = document.querySelector('.hero-section'); // Assuming you have a hero section
        let heroSectionHeight = heroSection ? heroSection.offsetHeight : 0;

        // If you don't have a specific hero section, you can define a scroll threshold
        const scrollThreshold = 100; // Example: 100 pixels from the top

        window.addEventListener('scroll', function() {
            if (window.scrollY > (heroSectionHeight || scrollThreshold)) {
                navMobile.classList.add('nav-mobile-fixed');
            } else {
                navMobile.classList.remove('nav-mobile-fixed');
            }
        });
    });
