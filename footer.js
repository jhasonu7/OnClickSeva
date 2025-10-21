// footer.js

document.addEventListener('DOMContentLoaded', () => {
    // A single, powerful event listener for the whole page
    document.addEventListener('click', (e) => {
        const target = e.target;

        // --- SECTION 1: Handlers for opening full-screen modals from the footer ---
        const openAction = target.closest('[data-action]');
        if (openAction) {
            const action = openAction.dataset.action;
            if (action === 'open-about-us') {
                e.preventDefault();
                window.location.hash = '#/about-us';
                return;
            }
            if (action === 'open-privacy-policy') {
                e.preventDefault();
                window.location.hash = '#/privacy-policy';
                return;
            }
            if (action === 'open-terms-conditions') {
                e.preventDefault();
                window.location.hash = '#/terms-conditions';
                return;
            }
            // This is the new handler for your FAQ link!
            if (action === 'open-faq') {
                e.preventDefault();
                window.location.hash = '#/faq';
                return;
            }
            if (action === 'open-customer-support') {
    e.preventDefault();
    window.location.hash = '#/customer-support';
    return;
}

// footer.js -> inside the main 'click' event listener

// Add this new block
if (action === 'open-how-it-works') {
    e.preventDefault();
    window.location.hash = '#/how-it-works';
    return;
}

if (action === 'open-careers') {
    e.preventDefault();
    window.location.hash = '#/careers';
    return;
}

        }
        
        // --- SECTION 2: Handler for closing ANY full-screen modal ---
        // This is now cleaner and handles all your modals in one place.
        if (target.closest('#close-about-modal, #close-privacy-modal, #close-terms-modal, #close-faq-modal, #close-support-modal, #close-how-it-works-modal, #close-careers-modal')) {
            history.back();
            return;
        }

        // --- SECTION 3: Language Switching Logic (Consolidated) ---
        if (target.matches('#lang-en-btn, #lang-hi-btn')) {
            const isEnglish = target.id === 'lang-en-btn';
            document.getElementById('lang-en-btn').classList.toggle('active', isEnglish);
            document.getElementById('lang-hi-btn').classList.toggle('active', !isEnglish);
            document.getElementById('privacy-content-en').classList.toggle('active', isEnglish);
            document.getElementById('privacy-content-hi').classList.toggle('active', !isEnglish);
            return;
        }
        if (target.matches('#terms-lang-en-btn, #terms-lang-hi-btn')) {
            const isEnglish = target.id === 'terms-lang-en-btn';
            document.getElementById('terms-lang-en-btn').classList.toggle('active', isEnglish);
            document.getElementById('terms-lang-hi-btn').classList.toggle('active', !isEnglish);
            document.getElementById('terms-content-en').classList.toggle('active', isEnglish);
            document.getElementById('terms-content-hi').classList.toggle('active', !isEnglish);
            return;
        }

        // --- SECTION 4: Handlers for clicks INSIDE any active Full-Screen Modal ---
        const aboutModal = document.getElementById('about-us-modal');
        const privacyModal = document.getElementById('privacy-policy-modal');
        const termsModal = document.getElementById('terms-conditions-modal');
        const faqModal = document.getElementById('faq-modal');

        // A cleaner way to find which modal, if any, is currently active
        const activeModal = [aboutModal, privacyModal, termsModal, faqModal].find(
            modal => modal && modal.style.display === 'flex'
        );

        if (activeModal) {
            // Use generic selectors that work inside any of the four modals
            const profileIcon = activeModal.querySelector('.option-item.profile');
            const profileDropdown = activeModal.querySelector('.profile-dropdown');
            const loginBtn = activeModal.querySelector('.about-header-login-btn');
            const logoutBtn = activeModal.querySelector('.profile-dropdown a[id*="logout-btn"]');
            const navLink = target.closest('.about-nav-link');

            // Handle toggling the profile dropdown
            if (profileIcon && profileIcon.contains(target)) {
                if (profileDropdown) profileDropdown.classList.toggle('hidden');
                return;
            }

            // Close dropdown if clicking elsewhere within the modal
            if (profileDropdown && !profileDropdown.classList.contains('hidden') && !profileDropdown.contains(target)) {
                profileDropdown.classList.add('hidden');
            }

            // Handle "Login / Sign up" button
            if (loginBtn && loginBtn.contains(target)) {
                e.preventDefault();
                window.location.replace(window.location.origin + window.location.pathname);
                return;
            }

            // Handle "Logout" button
            if (logoutBtn && logoutBtn.contains(target)) {
                e.preventDefault();
                localStorage.clear();
                window.location.replace(window.location.origin + window.location.pathname);
                return;
            }

            // Handle navigation links in dropdown ("My Bookings", "Help")
            if (navLink && navLink.dataset.targetHash) {
                e.preventDefault();
                window.location.hash = navLink.dataset.targetHash;
                if (profileDropdown) profileDropdown.classList.add('hidden');
                return;
            }
        }
    });

    // --- SECTION 5: Scroll Animation Logic for "About Us" page ---
    const aboutModalForObserver = document.getElementById('about-us-modal');
    if (aboutModalForObserver) {
        const animatedSections = document.querySelectorAll('#about-us-modal .fade-in-section');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, {
            root: aboutModalForObserver, // Observe scrolling within the modal
            threshold: 0.1
        });
        animatedSections.forEach(section => {
            observer.observe(section);
        });
    }
});