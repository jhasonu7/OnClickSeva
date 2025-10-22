// script.js

// BASE URL for your API
const API_BASE_URL = 'https://ocs-backend-iogo.onrender.com';
const OPENCAGE_API_KEY = 'f83ce70d0c2d46579bdc734ecadc8c5a';

// Global cart object
let cart = {}; // Stores serviceId: { service, quantity }
let allServices = [];
let savedLocations = []; // New array for saved locations
let recentLocations = []; // New array for recent locations
let locationSearchTimeout;
let activeCartCategory = null;
let socket = null;
let bookingType = 'SCHEDULED';
let currentUserProfile = null;
let currentJobToRate = null;
let ratingModal = null;
let stars = null;
let mobileNavButtons = [];

let currentBookingCategory = null;
let lastOpenedBookingModal = { serviceId: null, category: null };
let currentServiceInPopup = { id: null, category: null }; // Ensure this exists, it might be there already.
let lastOpenedServiceDetailPopup = { serviceId: null, category: null }; // <-- ADD THIS LINE
let mainPageScrollPosition = 0;
// script.js

// Add this with your other global variables
let currentServiceForAddons = null;
let currentServiceInBookingModal = null;
// script.js

let allGroupedServices = {};
function isUserLoggedIn() {
    return !!localStorage.getItem('onclickseva_customer_token');
}
function updateMobileCartCountDisplay() {
    const mobileCartBadge = document.getElementById('mobile-cart-count-badge');
    if (mobileCartBadge) {
        let totalItemsInCart = 0;
        Object.values(cart).forEach(categoryContent => {
            if (categoryContent) {
                totalItemsInCart += Object.keys(categoryContent).length;
            }
        });
        mobileCartBadge.textContent = totalItemsInCart;
        mobileCartBadge.style.display = totalItemsInCart > 0 ? 'block' : 'none';
    }
}
function updateMobileNavActiveState() {
    if (!mobileNavButtons.length) {
        mobileNavButtons = document.querySelectorAll('.mobile-nav-btn');
    }

    const hash = window.location.hash || '#home';

    // Remove active class from all buttons
    mobileNavButtons.forEach(btn => btn.classList.remove('active'));

    // Add active class to the correct button
    if (hash.startsWith('#home')) {
        document.querySelector('.mobile-nav-btn[data-action="go-home"]')?.classList.add('active');
    } else if (hash.startsWith('#/my-bookings')) {
        document.querySelector('.mobile-nav-btn[data-action="open-bookings"]')?.classList.add('active');
    } else if (hash.startsWith('#/cart')) {
        document.querySelector('.mobile-nav-btn[data-action="open-cart"]')?.classList.add('active');

    }
     else if (hash.startsWith('#/rewards')) {
        document.querySelector('.mobile-nav-btn[data-action="open-rewards"]')?.classList.add('active');
    }

   else if (hash.startsWith('#/account') || hash.startsWith('#/help') || hash.startsWith('#/rate')) {
        // Now 'Account' is active for the account page, help, and rating
        document.querySelector('.mobile-nav-btn[data-action="open-account"]')?.classList.add('active');
    }
}
// Add these three new functions anywhere in your script
function openAddonSelectionPopup(service) {
    currentServiceForAddons = service;
    const modal = document.getElementById('addon-selection-modal');

    // --- START: New code to populate the header ---
    const headerImage = modal.querySelector('[data-bind="addon-header-image"]');
    const headerName = modal.querySelector('[data-bind="addon-header-name"]');
    const addButton = document.getElementById('addon-header-add-btn');
    const pickerWrapper = document.getElementById('addon-header-qty-picker');

    headerImage.src = service.image_src;
    headerName.textContent = service.name;
    addButton.dataset.serviceId = service._id;
    pickerWrapper.dataset.serviceId = service._id;

    // Add a title to the body
    const container = document.getElementById('addon-list-container');
    container.innerHTML = '<h3>Frequently Added Together</h3>'; // Add title

    // Render the add-on items below the title
    renderAddonPopupContent(service);
    // --- END: New code ---

    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    syncAddonPopupHeaderUI(service); // Sync the header button state
}

// REPLACE this function in script.js

function closeAddonSelectionPopup() {
    history.back(); // The navigation handler will do the work of hiding the modal
}
function renderAddonPopupContent(service) {
    const container = document.getElementById('addon-list-container');
    const template = document.getElementById('addon-popup-item-template');
    // Clear only addon items, not the title
    container.querySelectorAll('.addon-popup-item').forEach(item => item.remove());

    const mainCartItem = cart[activeCartCategory]?.[service._id];

    service.addOns.forEach(addon => {
        const clone = document.importNode(template.content, true);
        clone.querySelector('[data-bind="addon-name"]').textContent = addon.name;
        clone.querySelector('[data-bind="addon-desc"]').textContent = addon.description;
        clone.querySelector('[data-bind="addon-price"]').textContent = `₹${addon.price}`;

        const actionsContainer = clone.querySelector('.addon-actions-container');
        const addonInCart = mainCartItem?.addOns?.find(a => a.name === addon.name);
        const quantity = addonInCart ? addonInCart.quantity : 0;

        let actionHtml;
        if (quantity > 0) {
            actionHtml = `
                <div class="quantity-picker">
                    <button class="decrease-addon-qty-btn" data-name="${addon.name}" data-price="${addon.price}">-</button>
                    <span>${quantity}</span>
                    <button class="increase-addon-qty-btn" data-name="${addon.name}" data-price="${addon.price}">+</button>
                </div>`;
        } else {
            actionHtml = `<button class="addon-add-btn" data-name="${addon.name}" data-price="${addon.price}">Add</button>`;
        }
        actionsContainer.innerHTML = actionHtml;
        container.appendChild(clone);
    });
}
// ADD THIS NEW FUNCTION AT THE TOP OF THE SCRIPT
async function fetchAllServicesForSearch() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/services/all`);
        if (!response.ok) throw new Error('Network response was not ok for all services.');
        const services = await response.json();

        // This is the crucial step: populate the global array with the complete dataset.
        allServices = services;
        console.log(`Successfully fetched ${allServices.length} total services for search.`);

    } catch (error) {
        console.error('Error fetching all services for search:', error);
        // The app can still function, but search might be limited.
    }
}




// FIND AND MODIFY THE `fetchAndRenderServices` FUNCTION
async function fetchAndRenderServices(category, container) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/services/${category}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const services = await response.json();

        // 🛑 REMOVE THE FOLLOWING TWO LINES TO PREVENT OVERWRITING THE FULL DATASET
        // const servicesWithCategory = services.map(s => ({ ...s, category }));
        // allServices.push(...servicesWithCategory);

        renderServiceCards(container, services, category);

    } catch (error) {
        console.error('Error fetching services:', error);
        container.innerHTML = `<p>Error loading services.</p>`;
    }
}
// --- AFTER (The corrected code) ---
function closeAllPopups() {
    const mainContent = document.getElementById('main-content');
    const header = document.querySelector('header');
    const overlay = document.getElementById('overlay');

    // Hide full-page views only
    document.getElementById('checkout-page').classList.add('hidden');
    document.getElementById('help-center-section').classList.add('hidden');
    document.getElementById('booking-details-popup').classList.add('hidden');

    // Reset modals that should NEVER overlap and should be explicitly closed
    document.getElementById('my-bookings-modal').style.display = 'none';
    document.getElementById('rating-modal').style.display = 'none';
    const locationModal = document.getElementById('location-modal');
    locationModal.style.display = 'none';
    locationModal.classList.add('hidden');
    document.getElementById('slot-selection-modal').style.display = 'none';
    document.getElementById('payment-modal').style.display = 'none';
    document.getElementById('booking-confirmation-modal').style.display = 'none';
    document.getElementById('booking-details-modal').style.display = 'none';
    document.getElementById('booking-details-modal').classList.remove('modal-shifted');
    document.getElementById('service-deep-details-modal').style.display = 'none';
    document.getElementById('service-deep-details-modal').classList.remove('shifted-view');
    document.getElementById('header-add-to-cart-btn').classList.add('hidden');
    document.getElementById('about-us-modal').style.display = 'none';

    document.getElementById('privacy-policy-modal').style.display = 'none';
    document.getElementById('terms-conditions-modal').style.display = 'none';
    document.getElementById('faq-modal').style.display = 'none';
    document.getElementById('customer-support-modal').style.display = 'none';
    document.getElementById('how-it-works-modal').style.display = 'none';
    document.getElementById('careers-modal').style.display = 'none';
    document.getElementById('rewards-modal').style.display = 'none';
    document.getElementById('account-modal').style.display = 'none';
    document.getElementById('addon-selection-modal').style.display = 'none';
    document.getElementById('search-modal').style.display = 'none';
    document.getElementById('search-modal').style.height = '';
    // Explicitly hide the cart sidebar and full cart modal
      document.getElementById('cartSidebar').classList.remove('active');
    document.getElementById('yourCartModal').classList.add('hidden');


}


function resetHistoryToHome() {
    history.replaceState(null, '', window.location.pathname + '#home');
}

// script.js

function showConfirmationPopup(bookedItems, totalAmount, savingsAmount) {
    const confirmationModal = document.getElementById('booking-confirmation-modal');
    const savingsMessage = document.getElementById('savings-message');
    const goToHomeBtn = document.getElementById('confirmation-go-home');
    const goToBookingsBtn = document.getElementById('confirmation-go-bookings');

    // --- NEW: Get references to the dynamic summary elements ---
    const summaryItemsContainer = document.getElementById('confirmation-summary-items');
    const totalAmountElement = document.getElementById('confirmation-total-amount');

    if (!confirmationModal || !summaryItemsContainer || !totalAmountElement) {
        console.error('Confirmation modal elements not found!');
        window.location.hash = '#/my-bookings'; // Fallback
        return;
    }

    // --- NEW: Dynamically build the order summary ---
    let summaryHtml = '';
    bookedItems.forEach(item => {
        // Main service row
        summaryHtml += `
            <div class="summary-row" style="display: flex; justify-content: space-between; padding: 5px 0;">
                <span>${item.name} (x${item.quantity})</span>
                <span>₹${(item.price * item.quantity).toFixed(0)}</span>
            </div>
        `;

        // Add-on rows for this item
        if (item.addOns && item.addOns.length > 0) {
            item.addOns.forEach(addOn => {
                summaryHtml += `
                    <div class="summary-row" style="font-size: 0.85rem; color: #555; padding-left: 15px; display: flex; justify-content: space-between; padding: 3px 0 3px 15px;">
                        <span>+ ${addOn.name} (x${addOn.quantity})</span>
                        <span>₹${(addOn.price * addOn.quantity).toFixed(0)}</span>
                    </div>
                `;
            });
        }
    });

    // Inject the generated HTML into the DOM
    summaryItemsContainer.innerHTML = summaryHtml;
    totalAmountElement.textContent = `₹${totalAmount.toFixed(0)}`;
    // --- END: New dynamic logic ---

    // This part remains the same
    if (savingsAmount > 0) {
        savingsMessage.textContent = `You saved ₹${savingsAmount.toFixed(0)} on this order!`;
        savingsMessage.classList.remove('hidden');
    } else {
        savingsMessage.classList.add('hidden');
    }

    confirmationModal.classList.remove('hidden');
    confirmationModal.style.display = 'flex';
    toggleBodyScroll('disable');

    goToHomeBtn.onclick = () => {
        history.replaceState(null, '', '#home');
        handleNavigation();
    };
    goToBookingsBtn.onclick = () => {
        window.location.hash = '#/my-bookings';
    };
}
function handleNavigation() {
    const hash = window.location.hash;

    const mainContent = document.getElementById('main-content');
    const header = document.querySelector('header');
    const footer = document.querySelector('#main-app-container .site-footer-rich');
    const bookingModal = document.getElementById('booking-details-modal');
    const deepDetailsModal = document.getElementById('service-deep-details-modal');
    const wasBookingModalVisible = bookingModal && bookingModal.style.display === 'flex';
    const wasDeepDetailsModalVisible = deepDetailsModal && deepDetailsModal.style.display === 'flex';

    // This now only closes popups without showing the main app
    closeAllPopups();

    let shouldShowOverlay = false;
    let shouldDisableScroll = false;
    let isFullScreenView = false; // --- NEW: Flag to control main app visibility

    if (hash.startsWith('#/checkout')) { // Catches both #/checkout and #/checkout/details
        isFullScreenView = true;
        showCheckoutPage(); // This function now only makes the page visible

        // Now, apply the correct step class based on the full hash
        const flowContainer = document.getElementById('checkout-flow-container');
        if (flowContainer) {
            if (hash === '#/checkout/details') {
                flowContainer.classList.add('step-2');
            } else {
                // This handles the default #/checkout case
                flowContainer.classList.remove('step-2');
            }
        }

        shouldShowOverlay = false; // Checkout doesn't need an overlay
        shouldDisableScroll = true;
    }

    else if (hash === '#/search') {
    isFullScreenView = true;
    openSearchModal();
    shouldDisableScroll = true;
}

    else if (hash === '#/help') {
        isFullScreenView = true;
        openHelpCenter();
        shouldDisableScroll = true;
    } else if (hash.startsWith('#/help/')) {
        isFullScreenView = true;
        const subPage = hash.split('/')[2];
        showHelpSubPage(subPage + '-page');
        shouldDisableScroll = true;
    } else if (hash.startsWith('#/my-bookings')) {
        isFullScreenView = true; // Both list and details hide the main app
        const parts = hash.split('/');
        if (parts.length === 3) {
            const bookingDetailsPage = document.getElementById('booking-details-popup');
            bookingDetailsPage.classList.remove('hidden');
            renderBookingDetails(parts[2]);
            shouldDisableScroll = true;
            shouldShowOverlay = false;
        } else {
            openMyBookingsModal();
            //
            shouldDisableScroll = true;
        }
    } else if (hash.startsWith('#/rate?jobId=')) {
        isFullScreenView = true;
        const params = new URLSearchParams(hash.substring(hash.indexOf('?')));
        const jobId = params.get('jobId');
        openRatingModal(jobId);
        //
        shouldDisableScroll = true;
    }
    else if (hash === '#/about-us') {
        isFullScreenView = true;
        openAboutModal(); // We will create this function next
        //
        shouldDisableScroll = true;
        // ▲▲▲ END OF NEW BLOCK ▲▲▲

    }
    else if (hash === '#/privacy-policy') {
        isFullScreenView = true;
        openPrivacyPolicyModal();
        //
        shouldDisableScroll = true;
        // ▲▲▲ END OF NEW BLOCK ▲▲▲

    }

    else if (hash === '#/terms-conditions') {
        isFullScreenView = true;
        openTermsConditionsModal(); // We will create this function next
        //
        shouldDisableScroll = true;
    }

    else if (hash === '#/faq') {
        isFullScreenView = true;
        openFaqModal();
        //
        shouldDisableScroll = true;
    }
    else if (hash === '#/customer-support') {
        isFullScreenView = true;
        openCustomerSupportModal();
        //
        shouldDisableScroll = true;
    }

    else if (hash === '#/how-it-works') {
        isFullScreenView = true;
        openHowItWorksModal();
        //
        shouldDisableScroll = true;
    }
    else if (hash === '#/careers') {
        isFullScreenView = true;
        openCareersModal();
        //
        shouldDisableScroll = true;
    }

    else if (hash === '#/rewards') {
        isFullScreenView = true;
        openRewardsModal();
        shouldDisableScroll = true;
    }
    else if (hash === '#/account') {
        isFullScreenView = true;
        openAccountModal();
        shouldDisableScroll = true;
    }

    else if (hash.startsWith('#/addons?serviceId=')) {
        isFullScreenView = true;
        const params = new URLSearchParams(hash.substring(hash.indexOf('?')));
        const serviceId = params.get('serviceId');
        const service = allServices.find(s => s._id === serviceId);
        if (service) {
            renderAndShowAddonPopup(service);
        }
        shouldDisableScroll = true;
    }

    else if (hash === '#/cart' || hash === '#/location' || hash === '#/select-slot' || hash === '#/payment' || hash === '#/confirmation' || hash.startsWith('#/booking?serviceId=') || hash.startsWith('#/details?serviceId=')) {
        isFullScreenView = true; // All these are full-screen views or modals
        // The original logic for these routes is fine, so we just group them
        if (hash === '#/select-slot' || hash === '#/payment') {
            // ✅ THE FIX IS HERE: This line keeps the checkout page visible as the background.
            document.getElementById('checkout-page').classList.remove('hidden');
        }
        if (hash === '#/cart') openYourCartModal();
        if (hash === '#/location') openLocationModal();
        if (hash === '#/select-slot') openSlotModal();
        if (hash === '#/payment') openPaymentModal();
        if (hash === '#/confirmation') openConfirmationModal();
        // script.js -> inside handleNavigation()

        if (hash.startsWith('#/booking?serviceId=') || hash.startsWith('#/details?serviceId=')) {
            const params = new URLSearchParams(hash.substring(hash.indexOf('?')));
            const serviceId = params.get('serviceId');
            const service = allServices.find(s => s._id === serviceId);

            if (service) {
                // Decide which main popup to show
                if (hash.startsWith('#/details')) {
                    openServiceDetailsPopup(serviceId, service.category);
                } else {
                    showBookingDetailsModal(serviceId, service.category);
                }

                // Check if the cart sidebar should also be opened
                if (params.get('cart') === 'open') {
                    openCartSidebar(); // This function will now be simpler
                }
            }
  // --- START: CORRECTED SIDEBAR LOGIC ---
const servicesSidebar = document.getElementById('services-sidebar');
const cartSidebar = document.getElementById('cartSidebar');
const overlay = document.getElementById('overlay');

const isMobile = window.innerWidth <= 768;
const shouldOpenServices = params.get('sidebar') === 'open';
const shouldOpenCart = params.get('cart') === 'open';

if (isMobile) {
    // Step 1: Independently set the state for the services sidebar
    if (shouldOpenServices) {
        servicesSidebar.classList.add('active');
    } else {
        servicesSidebar.classList.remove('active');
    }

    // Step 2: Independently set the state for the cart sidebar
    if (shouldOpenCart) {
        cartSidebar.classList.add('active');
    } else {
        cartSidebar.classList.remove('active');
    }

    // Step 3: Set the overlay state based on EITHER sidebar being open
    if (shouldOpenServices || shouldOpenCart) {
        overlay.classList.add('active');
        overlay.style.zIndex = '2999';
    } else {
        overlay.classList.remove('active');
        overlay.style.zIndex = '';
    }
}
// --- END: CORRECTED SIDEBAR LOGIC ---
    shouldShowOverlay = window.innerWidth > 768;
    shouldDisableScroll = true;
        }

        if (hash.startsWith('#/details?serviceId=')) {
            const serviceId = new URLSearchParams(hash.substring(hash.indexOf('?'))).get('serviceId');
            const service = allServices.find(s => s._id === serviceId);
            if (service) openServiceDetailsPopup(serviceId, service.category);
        }
       
        shouldDisableScroll = true;
    }

    // script.js (inside handleNavigation function)

    // --- REPLACE the existing '#/cart-sidebar' block with this one ---
    if (hash === '#/cart-sidebar') {
        isFullScreenView = true;
        openCartSidebar(); // This makes the sidebar UI visible
        //
        shouldDisableScroll = true;

        // --- START OF FIX ---
        // This new logic correctly decides what appears BEHIND the cart sidebar.

        // Case 1: The booking modal was already visible, so we just shift it over.
       if (wasBookingModalVisible) {
    bookingModal.style.display = 'flex';
    // This check ensures the modal only shrinks on screens wider than 768px.
    if (window.innerWidth > 768) {
        bookingModal.classList.add('modal-shifted');
    }
}
        // Case 2 (THE FIX): We're coming back from another page (like checkout).
        // We check our new variable to see if the booking modal was the last context.
        else if (lastOpenedBookingModal.serviceId) {
            // Re-open the booking modal using its saved state.
            showBookingDetailsModal(lastOpenedBookingModal.serviceId, lastOpenedBookingModal.category);
            // We must also apply the 'shifted' class because the cart sidebar is open.
            bookingModal.classList.add('modal-shifted');
        }
        // Case 3: The fallback for restoring the other type of popup.
        else if (currentServiceInPopup && currentServiceInPopup.id) {
            openServiceDetailsPopup(currentServiceInPopup.id, currentServiceInPopup.category);
        }
        // --- END OF FIX ---
    }
   // script.js

    if (isFullScreenView) {
        if (mainContent) mainContent.classList.add('hidden');
        if (header) header.classList.add('hidden');
        if (footer) footer.classList.add('hidden'); // <-- ADD THIS LINE
    } 
    else {
        // This is the default case for "#home" or an empty hash
        if (mainContent) mainContent.classList.remove('hidden');
        if (header) header.classList.remove('hidden');
        if (footer) footer.classList.remove('hidden');
       // ... inside the else block of handleNavigation()

        // --- START OF FIX: INSTANT SCROLL RESTORATION ---
        // 1. Temporarily disable the smooth scrolling animation.
        document.documentElement.style.scrollBehavior = 'auto';

        // 2. Instantly jump to the saved scroll position.
        requestAnimationFrame(() => {
            window.scrollTo(0, mainPageScrollPosition);

            // 3. Re-enable smooth scrolling for all future user actions after a tiny delay.
            setTimeout(() => {
                document.documentElement.style.scrollBehavior = 'smooth';
            }, 50); 
        });
        // --- END OF FIX ---
    }

 // Apply overlay and scroll settings
const overlay = document.getElementById('overlay');
const servicesSidebar = document.getElementById('services-sidebar');
const cartSidebar = document.getElementById('cartSidebar'); // <-- Add this line


if ((!servicesSidebar || !servicesSidebar.classList.contains('active')) &&
    (!cartSidebar || !cartSidebar.classList.contains('active'))) {
    
    if (shouldShowOverlay) {
        if (overlay) overlay.classList.add('active');
    } else {
        if (overlay) overlay.classList.remove('active');
    }
}

if (shouldDisableScroll) {
    toggleBodyScroll('disable');
} else {
    toggleBodyScroll('enable');
}

}
// script.js - ADD THIS NEW HELPER FUNCTION
function formatNumberForCard(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num;
}
function formatNumber(num) {
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num;
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

/**
 * A wrapper for the native fetch function that automatically adds the
 * JWT Authorization header if a token exists in localStorage.
 * @param {string} url The URL to fetch.
 * @param {object} options The options object for the fetch call.
 * @returns {Promise<Response>} The fetch promise.
 */
async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('onclickseva_customer_token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, { ...options, headers });
}


function showMainApp() {
    const loginPage = document.getElementById('login-page-container');
    const mainApp = document.getElementById('main-app-container');

    if (loginPage && mainApp) {
        loginPage.classList.add('hidden');
        mainApp.classList.remove('hidden');
        window.scrollTo(0, 0);
    } else {
        console.error("Could not find login or main app containers to switch views.");
    }
}
// script.js - REPLACE with this corrected function

function initiateJobTracking(jobId) {
    // 1. Initialize the socket only if it doesn't exist
    if (!socket) {
        socket = io(API_BASE_URL);

        // 2. Set up listeners ONCE after initialization
        socket.on('connect', () => {
            console.log('Socket connected to server.');
            // Note: We'll emit the tracking event right after connecting below
        });

        socket.on('partner-assigned', (data) => {
            console.log('Partner has been assigned!', data);

            // CORRECTED: This is the ONLY function call needed here.
            // It handles refreshing the UI with the latest data from the server.
            handleRealtimeBookingUpdate();

            // REMOVED: The old updateBookingInLocalStorage() call.
            // REMOVED: The redundant renderMyBookingsList() call.
        });
    }

    // 3. If the socket is already connected, emit the tracking event immediately.
    //    If it's not connected yet, the 'connect' event listener will handle it.
    if (socket.connected) {
        console.log(`Emitting customer-tracking-job for Job ID: ${jobId}`);
        socket.emit('customer-tracking-job', jobId);
    } else {
        // If not connected, wait for the 'connect' event to fire, then emit.
        socket.once('connect', () => {
            console.log(`Emitting customer-tracking-job for Job ID: ${jobId} after connection.`);
            socket.emit('customer-tracking-job', jobId);
        });
    }
}

// script.js - REPLACE this function

// Renamed for clarity. This function's job is to react to a socket event.
function handleRealtimeBookingUpdate() {
    console.log("Real-time update received, refreshing bookings list...");

    // REMOVED: All logic that touches localStorage.

    const bookingsModal = document.getElementById('my-bookings-modal');
    // If the "My Bookings" modal is currently open, refresh its content
    if (bookingsModal && !bookingsModal.classList.contains('hidden')) {
        renderMyBookingsList();
    }
}



// --- Utility Functions ---
function toggleBodyScroll(state) {
    if (state === 'disable') {
        document.body.classList.add('modal-open');
    } else {
        document.body.classList.remove('modal-open');
    }
}
function updateLocationDisplay(locationText) {
    const locationDisplay = document.getElementById('location-display');
    if (locationDisplay) {
        // This now sets the full, untruncated address text.
        locationDisplay.textContent = locationText; 
    }
}

// SCRIPT.JS - REPLACE THIS FUNCTION

function saveLocationToLocalStorage(location) {
    // --- SAVED LOCATIONS LOGIC ---
    // 1. REMOVE the old item if it exists, so we don't have duplicates.
    savedLocations = savedLocations.filter(loc => loc.address !== location.address);
    // 2. ADD the new/selected item to the front of the array.
    savedLocations.unshift(location);
    // 3. LIMIT the array to the last 5 saved locations.
    if (savedLocations.length > 5) {
        savedLocations = savedLocations.slice(0, 5);
    }
    // 4. SAVE to local storage.
    localStorage.setItem('onclickseva_saved_locations', JSON.stringify(savedLocations));

    // --- RECENT LOCATIONS LOGIC (this part was already correct) ---
    // 1. REMOVE the old item if it exists.
    recentLocations = recentLocations.filter(loc => loc.address !== location.address);
    // 2. ADD to the front of the array.
    recentLocations.unshift(location);
    // 3. LIMIT the array.
    if (recentLocations.length > 5) {
        recentLocations = recentLocations.slice(0, 5);
    }
    // 4. SAVE to local storage.
    localStorage.setItem('onclickseva_recent_locations', JSON.stringify(recentLocations));
}

function loadLocationsFromLocalStorage() {
    const saved = localStorage.getItem('onclickseva_saved_locations');
    if (saved) {
        savedLocations = JSON.parse(saved);
    }

    const recent = localStorage.getItem('onclickseva_recent_locations');
    if (recent) {
        recentLocations = JSON.parse(recent);
    }

    // Set initial display to the latest saved/recent location
    if (savedLocations.length > 0) {
        updateLocationDisplay(savedLocations[0].address);
    } else if (recentLocations.length > 0) {
        updateLocationDisplay(recentLocations[0].address);
    }
}

function loadLocation() {
    const savedLocation = localStorage.getItem('onclickseva_location');
    if (savedLocation) {
        updateLocationDisplay(savedLocation);
    }
}
// SCRIPT.JS - ADD THIS NEW FUNCTION

async function getRealLocation() {
    const useLocationBtn = document.querySelector('.use-current-location-btn');
    // script.js - inside getRealLocation

    const locationInput = document.getElementById('location-search-input'); // <-- This is the correct ID

    // 1. Check if the browser supports Geolocation
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }

    // 2. Provide feedback to the user that something is happening
    useLocationBtn.disabled = true;
    useLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching location...';

    // 3. This function runs if we successfully get the coordinates
    const success = async (position) => {
        const { latitude, longitude } = position.coords;

        // 4. Use your API key to ask OpenCage for the address
        const apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${OPENCAGE_API_KEY}`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Failed to fetch address from API');

            const data = await response.json();

            if (data.results && data.results.length > 0) {
                // 5. Display the formatted address in the input box
                const address = data.results[0].formatted;
                locationInput.value = address; // Put the address in the input box
                document.getElementById('add-new-address-btn').classList.remove('hidden'); // Show the add button
                document.getElementById('confirm-selected-location-btn').classList.add('hidden'); // Hide confirm button initially
            } else {
                alert("Could not find a valid address for your location.");
            }
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            alert('Could not fetch your address. Please enter it manually.');
        } finally {
            // 6. Reset the button's appearance
            useLocationBtn.disabled = false;
            useLocationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Use my current location';
        }
    };

    // This function runs if there's an error (e.g., user denies permission)
    const error = () => {
        alert("Unable to retrieve your location. Please ensure location services are enabled and permission is granted.");
        useLocationBtn.disabled = false;
        useLocationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Use my current location';
    };

    // 7. Ask the browser for the user's location
    navigator.geolocation.getCurrentPosition(success, error);
}

// SCRIPT.JS - ADD THIS NEW FUNCTION

async function fetchLocationSuggestions(query) {
    const searchResultsContainer = document.getElementById('location-search-results');
    if (!query) {
        searchResultsContainer.classList.add('hidden');
        return;
    }

    const apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${OPENCAGE_API_KEY}&limit=5&countrycode=in`; // Limit to 5 results, prioritize India

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch location suggestions');
        const data = await response.json();

        searchResultsContainer.innerHTML = ''; // Clear previous results

        if (data.results && data.results.length > 0) {
            data.results.forEach(result => {
                const address = result.formatted;
                const name = result.components.city || result.components.town || result.components.village || result.formatted.split(',')[0];
                const description = result.formatted; // Use full formatted for description

                const div = document.createElement('div');
                div.className = 'location-result-item';
                div.dataset.address = address; // Store full address
                div.innerHTML = `
                    <div class="icon"><i class="fas fa-map-marker-alt"></i></div>
                    <div class="details">
                        <div class="name">${name}</div>
                        <div class="description">${description}</div>
                    </div>
                `;
                searchResultsContainer.appendChild(div);
            });
            searchResultsContainer.classList.remove('hidden');
        } else {
            searchResultsContainer.classList.add('hidden');
            // Optionally show a "No results found" message
            // searchResultsContainer.innerHTML = '<div class="location-result-item">No results found</div>';
        }
    } catch (error) {
        console.error('Location suggestion error:', error);
        searchResultsContainer.classList.add('hidden');
    }
}
// SCRIPT.JS - ADD THESE NEW FUNCTIONS

function renderLocations(containerId, locations, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    if (locations.length === 0) {
        container.closest('.location-section').classList.add('hidden');
        return;
    } else {
        container.closest('.location-section').classList.remove('hidden');
    }

    locations.forEach(loc => {
        const div = document.createElement('div');
        div.className = 'location-item';
        div.dataset.address = loc.address;
        div.dataset.type = type; // 'saved' or 'recent'
        div.innerHTML = `
            <div class="icon">
                ${type === 'saved' ? '<i class="fas fa-home"></i>' : '<i class="fas fa-history"></i>'}
            </div>
            <div class="details">
                <div class="title">${loc.title || (type === 'saved' ? 'Home' : 'Recent Location')}</div>
                <div class="address">${loc.address}</div>
            </div>
        `;
        container.appendChild(div);
    });
}
// ADD THIS NEW FUNCTION
function renderLocationModalSkeleton() {
    const body = document.querySelector('#location-modal .location-modal-body');
    if (!body) return;

    body.innerHTML = `
        <div class="skeleton skeleton-btn" style="height: 50px; margin-bottom: 20px; border-radius: 8px;"></div>

        <div class="location-section">
            <div class="skeleton skeleton-title" style="width: 30%; height: 1rem; margin-bottom: 15px;"></div>
            <div class="skeleton-location-item">
                <div class="skeleton skeleton-icon" style="width: 40px; height: 40px;"></div>
                <div class="skeleton-location-details">
                    <div class="skeleton skeleton-text" style="width: 40%; height: 1rem;"></div>
                    <div class="skeleton skeleton-text" style="width: 80%; height: 0.8rem; margin-bottom: 0;"></div>
                </div>
            </div>
            <div class="skeleton-location-item">
                <div class="skeleton skeleton-icon" style="width: 40px; height: 40px;"></div>
                <div class="skeleton-location-details">
                    <div class="skeleton skeleton-text" style="width: 30%; height: 1rem;"></div>
                    <div class="skeleton skeleton-text" style="width: 70%; height: 0.8rem; margin-bottom: 0;"></div>
                </div>
            </div>
        </div>
    `;
}
// REPLACE the old, broken populateLocationModal function with this one

function populateLocationModal() {
    // 1. Find the main container that was overwritten by the skeleton.
    const modalBody = document.querySelector('#location-modal .location-modal-body');
    if (!modalBody) return;

    // 2. Rebuild the entire HTML structure that the skeleton wiped out.
    // This ensures all buttons and containers exist before we try to access them.
    modalBody.innerHTML = `
        <div class="use-current-location-btn" id="use-current-location-btn">
            <i class="fas fa-crosshairs"></i>
            <span>Use current location</span>
        </div>

        <div class="location-section hidden" id="saved-locations-section">
            <h4>Saved</h4>
            <div id="saved-locations-list"></div>
        </div>

        <div class="location-section hidden" id="recent-locations-section">
            <h4>Recents</h4>
            <div id="recent-locations-list"></div>
        </div>

        <button class="add-new-address-btn hidden" id="add-new-address-btn">Add New Address</button>
        <button class="confirm-selected-location-btn hidden" id="confirm-selected-location-btn">Confirm Location</button>
    `;

    // 3. Now that the structure is back, populate the lists within it.
    renderLocations('saved-locations-list', savedLocations, 'saved');
    renderLocations('recent-locations-list', recentLocations, 'recent');

    // 4. We can now safely reset the other UI elements.
    const locationSearchInput = document.getElementById('location-search-input');
    if (locationSearchInput) locationSearchInput.value = '';

    const clearLocationSearchBtn = document.getElementById('clear-location-search');
    if (clearLocationSearchBtn) clearLocationSearchBtn.classList.add('hidden');

    // 5. IMPORTANT: Re-attach event listeners to the newly created buttons,
    // as the old ones were destroyed along with the original elements.
    const useCurrentLocationBtn = document.getElementById('use-current-location-btn');
    if (useCurrentLocationBtn) {
        useCurrentLocationBtn.addEventListener('click', getRealLocation);
    }

    const addNewAddressBtn = document.getElementById('add-new-address-btn');
    if (addNewAddressBtn) {
        addNewAddressBtn.addEventListener('click', async () => {
            const newAddress = locationSearchInput.value.trim();
            if (newAddress) {
                const newLocation = { address: newAddress, title: 'Home' };
                try {
                    const response = await authenticatedFetch(`${API_BASE_URL}/api/customer/addresses`, {
                        method: 'POST',
                        body: JSON.stringify(newLocation)
                    });
                    if (!response.ok) throw new Error("Server failed to save new address.");

                    saveLocationToLocalStorage(newLocation);
                    updateLocationDisplay(newAddress);
                    updateCheckoutAddress();
                    closeLocationModal();
                } catch (error) {
                    console.error("Failed to save new address to server:", error);
                    alert("Could not save your new address. Please try again.");
                }
            } else {
                alert("Please enter an address in the search box to add.");
            }
        });
    }

    const confirmSelectedLocationBtn = document.getElementById('confirm-selected-location-btn');
    if (confirmSelectedLocationBtn) {
        confirmSelectedLocationBtn.addEventListener('click', async () => {
            const selectedAddress = locationSearchInput.value.trim();
            if (selectedAddress) {
                const newLocation = { address: selectedAddress, title: 'Home' };
                try {
                    const response = await authenticatedFetch(`${API_BASE_URL}/api/customer/addresses`, {
                        method: 'POST',
                        body: JSON.stringify(newLocation)
                    });
                    if (!response.ok) throw new Error("Server failed to save address.");

                    saveLocationToLocalStorage(newLocation);
                    updateLocationDisplay(selectedAddress);
                    updateCheckoutAddress();
                    closeLocationModal();
                } catch (error) {
                    console.error("Failed to save address to server:", error);
                    alert("Could not save your address. Please try again.");
                }
            } else {
                alert('Please select or enter a location.');
            }
        });
    }
}
function openLocationModal() {
    const locationModal = document.getElementById('location-modal');
    if (locationModal) {
        // --- FIX: Remove the 'hidden' class to make the modal visible ---
        locationModal.classList.remove('hidden');

        renderLocationModalSkeleton();
        locationModal.style.display = 'flex';
        setTimeout(() => {
            populateLocationModal();
        }, 50);
    }
}
// script.js -> REPLACE the function above with this one

function closeLocationModal() {

    history.back();
}
// --- Cart Functions ---
function saveCart() {
    localStorage.setItem('onclickseva_cart', JSON.stringify(cart));
}

// script.js -> REPLACE this function

function loadCart() {
    const savedCart = localStorage.getItem('onclickseva_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        // Only render the cart if there's an active category to show
        if (activeCartCategory) {
            renderCart(activeCartCategory);
        }
    }
}
function syncAddonPopupHeaderUI(service) {
    if (!service) return;

    const addButton = document.getElementById('addon-header-add-btn');
    const pickerWrapper = document.getElementById('addon-header-qty-picker');
    const quantityDisplay = document.getElementById('addon-header-qty-display');

    if (!addButton || !pickerWrapper || !quantityDisplay) return;

    const cartItem = cart[activeCartCategory]?.[service._id];
    const quantity = cartItem ? cartItem.quantity : 0;

    if (quantity > 0) {
        addButton.classList.add('hidden');
        pickerWrapper.classList.remove('hidden');
        quantityDisplay.textContent = quantity;
    } else {
        addButton.classList.remove('hidden');
        pickerWrapper.classList.add('hidden');
    }
}
// REPLACE this entire function in script.js

// REPLACE this entire function in script.js

async function addToCart(serviceId, category, quantity = 1) {
    if (!category) {
        console.error("addToCart was called without a category.");
        return;
    }

    const isNewItem = !(cart[category]?.[serviceId]);
    const newQuantity = (cart[category]?.[serviceId]?.quantity || 0) + quantity;

    // --- Step 1: Update the local cart state immediately ---
    if (cart[category]?.[serviceId]) {
        cart[category][serviceId].quantity = newQuantity;
    } else {
        try {
            // NOTE: This fetch MUST be awaited because we need the service details to proceed.
            const serviceResponse = await fetch(`${API_BASE_URL}/api/services/single/${serviceId}`);
            if (!serviceResponse.ok) throw new Error("Service details not found");
            const service = await serviceResponse.json();
            if (!cart[category]) cart[category] = {};
            cart[category][serviceId] = {
                service: service,
                quantity: newQuantity,
                addOns: []
            };
        } catch (error) {
            console.error("Could not add new item to local cart:", error);
            alert("Sorry, we could not find the details for that service.");
            return;
        }
    }

    // --- Step 2: Update the UI INSTANTLY ---
    saveCart();
    
    if (isNewItem) {
        const service = cart[category][serviceId].service;
        const toastMessage = `${service.name} added to cart`;
        const hasAddons = service.addOns && service.addOns.length > 0;
        if (hasAddons) {
            const addonPopupCallback = () => { window.location.hash = `#/addons?serviceId=${serviceId}`; };
            showAddToCartToast(toastMessage, addonPopupCallback);
        } else {
            showAddToCartToast(toastMessage);
        }
    }
    
    renderCart(category);
    updateCartCountDisplay();
    updateMobileCartCountDisplay();
    syncModalUI(serviceId); 

    // --- Step 3: If logged in, sync with the server in the BACKGROUND ---
    if (isUserLoggedIn()) {
        // We REMOVED 'await' here so the UI doesn't wait for the server.
        authenticatedFetch(`${API_BASE_URL}/api/customer/cart`, {
            method: 'POST',
            body: JSON.stringify({ serviceId, category, quantity: newQuantity })
        }).catch(error => {
            // Optional: Handle a failed sync. For now, we just log it.
            console.warn('Background cart sync failed:', error);
        });
    }
}

async function removeFromCart(serviceId, category) {
    await updateCartQuantity(serviceId, category, 0); // Removing is just setting quantity to 0
}

// REPLACE this entire function in script.js

async function updateCartQuantity(serviceId, category, newQuantity) {
    
    // --- Step 1: Update local state immediately ---
    if (cart[category]?.[serviceId]) {
        if (newQuantity <= 0) {
            delete cart[category][serviceId];
            if (Object.keys(cart[category]).length === 0) {
                delete cart[category];
            }
        } else {
            cart[category][serviceId].quantity = newQuantity;
        }
    } else if (newQuantity > 0) {
        // This is a special case for adding an item from 0. Let addToCart handle it.
        await addToCart(serviceId, category, newQuantity);
        return;
    }

    // --- Step 2: Update UI INSTANTLY ---
    saveCart();
    renderCart(category);
    syncModalUI(serviceId);
    updateCartCountDisplay();
    updateMobileCartCountDisplay();

    // --- Step 3: If logged in, sync with server in the BACKGROUND ---
    if (isUserLoggedIn()) {
        // We REMOVED 'await' here as well.
        authenticatedFetch(`${API_BASE_URL}/api/customer/cart`, {
            method: 'POST',
            body: JSON.stringify({ serviceId, category, quantity: newQuantity })
        }).catch(error => {
            console.warn('Background cart quantity sync failed:', error);
        });
    }
}
// script.js - REPLACE the existing renderCart function

function renderCart(category) {
    const cartItemsContainer = document.getElementById('cart-items-container');
    const summaryContainer = document.querySelector('.cart-summary');
    if (!cartItemsContainer || !summaryContainer) return;

    const categoryItems = cart[category] || {};
    const cartItemIds = Object.keys(categoryItems);

    cartItemsContainer.innerHTML = ''; // Clear previous items

    if (cartItemIds.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart-message">Your cart for this category is empty.</p>';
        summaryContainer.innerHTML = ''; // Hide checkout button if empty
        return;
    }

    let categoryTotal = 0;
    cartItemIds.forEach(serviceId => {
        const item = categoryItems[serviceId];
        if (!item || !item.service) return; // Safety check

        const itemBaseTotal = item.service.price * item.quantity;
        const addOnsTotal = (item.addOns || []).reduce((sum, addOn) => sum + (addOn.price * addOn.quantity), 0);
        const itemGroupSubtotal = itemBaseTotal + addOnsTotal;
        categoryTotal += itemGroupSubtotal;

        const addOnsHtml = (item.addOns || []).map(addOn => `
            <div class="cart-addon-item">
                + ${addOn.name} (x${addOn.quantity}) <span>₹${(addOn.price * addOn.quantity).toFixed(0)}</span>
            </div>
        `).join('');

        // --- ✅ THIS IS THE FIX for the conditional subtotal ---
        let subtotalHtml = '';
        // Only create the subtotal HTML if there are add-ons present for this item
        if (item.addOns && item.addOns.length > 0) {
            subtotalHtml = `
                <div class="cart-item-subtotal">
                    <span>Subtotal</span>
                    <strong>₹${itemGroupSubtotal.toFixed(0)}</strong>
                </div>
            `;
        }
        // --- End of fix ---

        const cartItemHtml = `
            <div class="cart-item-group" data-service-id="${serviceId}"> 
                <div class="cart-item-main">
                    <span class="cart-item-name">${item.service.name}</span>
                    <div class="quantity-picker cart-quantity-picker">
                        <button class="decrease-quantity-btn" data-service-id="${serviceId}">-</button>
                        <span>${item.quantity}</span>
                        <button class="increase-quantity-btn" data-service-id="${serviceId}">+</button>
                    </div>
                </div>
                <div class="cart-addons-list"> 
                    ${addOnsHtml}
                </div>
                ${subtotalHtml} 
            </div> 
        `;
        cartItemsContainer.insertAdjacentHTML('beforeend', cartItemHtml);
    });

    // Re-render the summary with the corrected total
    summaryContainer.innerHTML = `
        <p>Total: <span>₹${categoryTotal.toFixed(0)}</span></p>
        <button class="checkout-btn view-cart-btn">Proceed to Checkout</button>
    `;
}
// SCRIPT.JS - CORRECTED updateQuantityPicker FUNCTION

function updateQuantityPicker(cardElement, service, quantity) {
    if (!cardElement) return;

    // CORRECTED: Added '.add-to-cart-btn' to the selector
    let buttonWrapper = cardElement.querySelector('.add-btn') || cardElement.querySelector('.add-to-cart-btn') || cardElement.querySelector('.quantity-picker-wrapper');
    if (!buttonWrapper) return;

    // ... rest of the function remains the same
    if (quantity > 0) {
        const pickerHtml = `
            <div class="quantity-picker-wrapper" data-service-id="${service._id}">
                <div class="quantity-picker">
                    <button class="decrease-quantity-btn" data-service-id="${service._id}">-</button>
                    <span data-quantity-display="${service._id}">${quantity}</span>
                    <button class="increase-quantity-btn" data-service-id="${service._id}">+</button>
                </div>
            </div>
        `;
        if (buttonWrapper.matches('.add-btn, .add-to-cart-btn')) {
            buttonWrapper.outerHTML = pickerHtml;
        } else {
            const displaySpan = buttonWrapper.querySelector(`[data-quantity-display="${service._id}"]`);
            if (displaySpan) displaySpan.textContent = quantity;
        }
    } else {
        // Find the specific button container to replace it with the correct button type
        if (cardElement.classList.contains('your-booking-card')) {
            buttonWrapper.outerHTML = `<button class="add-to-cart-btn large-btn" data-service-id="${service._id}">Add to Cart</button>`;
        } else {
            buttonWrapper.outerHTML = `<button class="add-btn" data-service-id="${service._id}">Add</button>`;
        }
    }
}

// --- Cart Sidebar Open/Close ---
const cartSidebar = document.getElementById('cartSidebar');
const overlay = document.getElementById('overlay');
// script.js -> REPLACE this function

// script.js

function openCartSidebar() {
    const cartSidebar = document.getElementById('cartSidebar');
    const deepDetailsModal = document.getElementById('service-deep-details-modal');
    if (!cartSidebar) return;

    // Show skeleton first
    renderCartSkeleton();

    // Make sidebar visible and shift the details modal
    cartSidebar.classList.add('active', 'full-height-cart');
   
if (window.innerWidth > 768) {
    deepDetailsModal.classList.add('shifted-view');
}

    // Render real content
    setTimeout(() => {
        if (activeCartCategory) {
            renderCart(activeCartCategory);
        }
    }, 50);
}

// In your script.js file, find and REPLACE the old scroll listener with this one.
window.addEventListener('scroll', function () {
    // Target the header inside the main application, not the login page header
    const header = document.querySelector('#main-app-container > header');
    
    // Ensure the header exists on the current page before trying to modify it
    if (header) {
        // Add the 'scrolled' class after scrolling down a bit (e.g., 50 pixels)
        if (window.scrollY > 1) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }
});

async function showServicePopup(serviceId, category) {
    const popup = document.getElementById('service-popup');
    const content = document.getElementById('service-popup-content');
    const addToCartBtn = document.getElementById('addToCartBtn');

    // Clear previous content and show loading state
    document.getElementById('service-popup-title').innerText = 'Loading...';
    document.getElementById('service-popup-description').innerText = '';
    document.getElementById('service-popup-price').innerText = '';
    document.getElementById('reviews-section').innerHTML = ''; // Clear old reviews
    document.getElementById('reviews-section').style.display = 'none'; // Hide reviews section initially

    popup.style.display = 'flex';

    try {
        const response = await fetch(`/api/services/single/${serviceId}`);
        if (!response.ok) {
            throw new Error('Service not found');
        }
        const service = await response.json();

        // Populate the popup with fetched service details
        document.getElementById('service-popup-title').innerText = service.name;
        document.getElementById('service-popup-description').innerText = service.description || "No additional details available.";
        document.getElementById('service-popup-price').innerText = service.price;

        // Update the 'Add to cart' button's data attributes
        addToCartBtn.dataset.serviceId = service._id;
        addToCartBtn.dataset.serviceName = service.name;
        addToCartBtn.dataset.servicePrice = parseFloat(service.price.replace(/[^0-9.-]+/g, ""));
        addToCartBtn.dataset.serviceCategory = category;



    } catch (error) {
        console.error('Error fetching service details:', error);
        document.getElementById('service-popup-title').innerText = 'Error';
        document.getElementById('service-popup-description').innerText = 'Could not load service details.';
    }
}
const sliderTrackCleaning = document.querySelector('#most-booked-cleaning .slider-track');
const sliderTrackPainting = document.querySelector('#most-booked-painting .slider-track');
const sliderTrackElectrician = document.querySelector('#most-booked-electrician .slider-track');
const sliderTrackLaundry = document.querySelector('#most-booked-laundry .slider-track');
const proceedToPayBtn = document.getElementById('proceed-to-pay-btn');
const paymentModal = document.getElementById('payment-modal');
const closePaymentModalBtn = document.getElementById('close-payment-modal');
const confirmServiceBtn = document.getElementById('confirm-service-btn');
const confirmationModal = document.getElementById('confirmation-modal');
const backToHomeBtn = document.getElementById('back-to-home-btn');

function openPaymentModal() {
    const paymentModal = document.getElementById('payment-modal');
    if (paymentModal) {
        paymentModal.classList.remove('hidden');
        paymentModal.style.display = 'flex'; // <<< ADD THIS LINE
    }
}

function closePaymentModal() {
    if (paymentModal) {
        paymentModal.classList.add('hidden');
        paymentModal.style.display = 'none';
    }
}


// script.js

async function clearBookedItemsFromCart() {
    // 1. Check if there's an active category to clear.
    if (!activeCartCategory || !cart[activeCartCategory]) {
        console.log("No active cart category to clear.");
        return;
    }

    try {
        // 2. Call the NEW backend endpoint to clear the category from the database.
        const response = await authenticatedFetch(`${API_BASE_URL}/api/customer/cart/clear-category`, {
            method: 'POST',
            body: JSON.stringify({ category: activeCartCategory })
        });

        if (!response.ok) {
            // If the server fails, we stop here to avoid inconsistency.
            // The cart will remain locally, prompting the user to try booking again later.
            throw new Error('Failed to clear cart on server.');
        }

        // 3. IMPORTANT: Only after the server confirms success, update the local state.
        console.log(`Cart for category '${activeCartCategory}' cleared on server and locally.`);
        delete cart[activeCartCategory]; // Remove the category from the local cart object
        saveCart(); // Update localStorage
        updateCartCountDisplay(); // Update the cart icon in the header IMMEDIATELY
     
updateMobileCartCountDisplay();
        activeCartCategory = null; // Reset the active category

    } catch (error) {
        console.error("Cart clearing error:", error);
        // You can optionally show an alert to the user here.
        // For now, we will clear it locally as a fallback to avoid confusion.
        delete cart[activeCartCategory];
        saveCart();
        updateCartCountDisplay();
      
updateMobileCartCountDisplay();
        activeCartCategory = null;
    }
}

async function confirmBooking() {
    const latestLocation = savedLocations[0] || recentLocations[0];
    if (!latestLocation) {
        alert("Please ensure an address is selected.");
        return;
    }

    const cartItems = Object.values(cart[activeCartCategory] || {});
    if (cartItems.length === 0) {
        alert("Your cart is empty for this category.");
        return;
    }

    const itemsPayload = cartItems.map(item => ({
        serviceId: item.service._id,
        name: item.service.name,
        price: parseFloat(String(item.service.price).replace(/[^0-9.-]+/g, '')),
        quantity: item.quantity,
        categoryName: item.service.categoryName,
        addOns: item.addOns || [] // <-- ADD THIS LINE to send add-ons to the backend
    }));

    const { finalAmount } = calculateCheckoutTotals();

    const jobPayload = {
        customerAddress: latestLocation.address,
        customerName: currentUserProfile ? currentUserProfile.name : "Valued Customer",
        mainCategory: activeCartCategory,
        items: itemsPayload,
        totalAmount: finalAmount // Grand total for context
    };

    if (bookingType === 'SCHEDULED') {
        if (!selectedSlot.date || !selectedSlot.time) {
            alert("Please select a time and date for your scheduled booking.");
            return;
        }
        const [year, month, day] = selectedSlot.date.split('-');
        const [time, period] = selectedSlot.time.split(' ');
        let [hours, minutes] = time.split(':');
        hours = parseInt(hours, 10);
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        const requestedDateTime = new Date(year, month - 1, day, hours, parseInt(minutes));
        jobPayload.requestedTime = requestedDateTime.toISOString();
    }

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/api/jobs`, {
            method: 'POST',
            body: JSON.stringify(jobPayload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to book the service.');
        }

        const result = await response.json();
        const firstJobId = result.jobIds[0];

        console.log(`Booking successful! Created jobs: ${result.jobIds.join(', ')}`);

        initiateJobTracking(firstJobId);

        // Get the calculated discount to show in the popup
        const { discountAmount } = calculateCheckoutTotals();

        // Show our new confirmation popup instead of redirecting
       showConfirmationPopup(itemsPayload, finalAmount, discountAmount);

        clearBookedItemsFromCart();

    } catch (error) {
        console.error("Booking Error:", error);
        alert(`Sorry, we couldn't confirm your booking: ${error.message}`);
    }
}
// script.js - REPLACE this function

function calculateCheckoutTotals() {
    let itemTotal = 0;
    if (activeCartCategory && cart[activeCartCategory]) {
        Object.values(cart[activeCartCategory]).forEach(item => {
            // 1. Calculate the base price for the main service
            const price = parseFloat(String(item.service.price).replace(/[^0-9.-]+/g, '')) || 0;
            const itemBaseTotal = price * item.quantity;

            // --- THIS IS THE FIX ---
            // 2. Calculate the total for all add-ons, respecting each add-on's own quantity
            const addOnsTotal = (item.addOns || []).reduce((sum, addOn) => {
                // Correctly multiplies add-on price by add-on quantity
                return sum + (addOn.price * addOn.quantity);
            }, 0);
            // --- END OF FIX ---

            // 3. Add both totals to the grand item total
            itemTotal += itemBaseTotal + addOnsTotal;
        });
    }

    // The discount logic below remains the same and is correct
    let totalDiscountPercentage = 0;
    const diwaliCheckbox = document.getElementById('diwali-discount');
    const onlineCheckbox = document.getElementById('online-payment-discount');
    if (diwaliCheckbox && diwaliCheckbox.checked) totalDiscountPercentage += parseFloat(diwaliCheckbox.dataset.discount);
    if (onlineCheckbox && onlineCheckbox.checked) totalDiscountPercentage += parseFloat(onlineCheckbox.dataset.discount);

    const discountAmount = (itemTotal * totalDiscountPercentage) / 100;
    const finalAmount = itemTotal - discountAmount;

    return { itemTotal, discountAmount, finalAmount };
}
if (proceedToPayBtn) {
    proceedToPayBtn.addEventListener('click', () => {
        // --- CHANGE THIS ---
        window.location.hash = '#/payment';
    });
}
if (closePaymentModalBtn) {
    closePaymentModalBtn.addEventListener('click', () => history.back());
}
if (confirmServiceBtn) {
    confirmServiceBtn.addEventListener('click', confirmBooking);
}

// script.js -> Find toggleMobileSidebar function

// ▼▼▼ REPLACE THE EXISTING toggleMobileSidebar FUNCTION WITH THIS ▼▼▼
function toggleMobileSidebar(forceClose = false) {
    const servicesSidebar = document.getElementById('services-sidebar');
    const overlay = document.getElementById('overlay');
    const bookingContent = document.getElementById('booking-details-content-area'); // Get the booking modal content

    if (!servicesSidebar || !overlay) return;

    const shouldClose = forceClose || servicesSidebar.classList.contains('active');

    if (shouldClose) {
        servicesSidebar.classList.remove('active');
        overlay.classList.remove('active');
        // Reset z-index or hide the overlay if it was only for the sidebar
        overlay.style.zIndex = ''; 
        // If the booking modal is open, ensure its z-index is correct
        if (bookingContent) {
            bookingContent.style.zIndex = ''; // Reset booking content z-index
        }
    } else {
        servicesSidebar.classList.add('active');
        overlay.classList.add('active');
        // Make the overlay appear on top of the booking modal but under the sidebar
        overlay.style.zIndex = '2999'; // Higher than booking modal (2000), lower than sidebar (3000)
        // Ensure booking content doesn't block the overlay interaction
        if (bookingContent) {
            bookingContent.style.zIndex = '2000'; // Ensure booking modal is under overlay
        }
    }
}

function updateBookingCartBadge() {
    const bookingCartBadge = document.getElementById('booking-cart-badge');
    if (bookingCartBadge && activeCartCategory && cart[activeCartCategory]) {
        const itemCount = Object.keys(cart[activeCartCategory]).length;
        bookingCartBadge.textContent = itemCount;
        bookingCartBadge.style.display = itemCount > 0 ? 'block' : 'none';
    } else if (bookingCartBadge) {
        bookingCartBadge.textContent = '0';
        bookingCartBadge.style.display = 'none';
    }
}
// ▲▲▲ END OF REPLACED FUNCTION ▲▲▲
// script.js

function openRewardsModal() {
    const modal = document.getElementById('rewards-modal');
    if (!modal) return;

    // This part handles showing the profile icon or the login button
    const guestHeader = document.getElementById('rewards-guest-header');
    const userHeader = document.getElementById('rewards-profile-icon-wrapper');
    const userInitial = document.getElementById('rewards-profile-initial');
    
    if (isUserLoggedIn() && currentUserProfile) {
        guestHeader.classList.add('hidden');
        userHeader.classList.remove('hidden');
        if (userInitial) {
            userInitial.textContent = currentUserProfile.name.charAt(0).toUpperCase();
        }
    } else {
        guestHeader.classList.remove('hidden');
        userHeader.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    modal.querySelector('.about-main-content').scrollTop = 0; // Scroll to top
}

// script.js

function openAccountModal() {
    const modal = document.getElementById('account-modal');
    if (!modal) return;

    // Populate user-specific data
    const nameEl = modal.querySelector('[data-bind="account-name"]');
    const phoneEl = modal.querySelector('[data-bind="account-phone"]');
    
    if (isUserLoggedIn() && currentUserProfile) {
        nameEl.textContent = currentUserProfile.name;
        phoneEl.textContent = "+91 " + currentUserProfile.whatsappNumber;
    } else {
        nameEl.textContent = "Guest User";
        phoneEl.textContent = "Please log in";
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    modal.querySelector('.about-main-content').scrollTop = 0; // Scroll to top
}

// REPLACE this entire function in script.js

let cartToastTimeout; 

function showAddToCartToast(message = "Item added to your cart", onDisappearCallback = null) {
    const toastElement = document.getElementById('add-to-cart-toast');
    const toastText = document.getElementById('toast-message-text');
    if (!toastElement || !toastText) return;

    clearTimeout(cartToastTimeout);

    toastText.textContent = message;
    toastElement.classList.add('show');

    // Set a timer to hide the toast
    cartToastTimeout = setTimeout(() => {
        toastElement.classList.remove('show'); // This starts the hiding animation

        // If a callback function was provided, execute it after the hide animation finishes (500ms)
        if (onDisappearCallback) {
            setTimeout(onDisappearCallback, 500); 
        }
    }, 2500); // Toast is visible for 2.5 seconds
}

// ADD this new function to script.js

function renderAndShowAddonPopup(service) {
    currentServiceForAddons = service;
    const modal = document.getElementById('addon-selection-modal');
    if (!modal) return;

    const headerImage = modal.querySelector('[data-bind="addon-header-image"]');
    const headerName = modal.querySelector('[data-bind="addon-header-name"]');
    const addButton = document.getElementById('addon-header-add-btn');
    const pickerWrapper = document.getElementById('addon-header-qty-picker');

    headerImage.src = service.image_src;
    headerName.textContent = service.name;
    addButton.dataset.serviceId = service._id;
    pickerWrapper.dataset.serviceId = service._id;

    const container = document.getElementById('addon-list-container');
    container.innerHTML = '<h3>Frequently Added Together</h3>'; 

    renderAddonPopupContent(service); 
    syncAddonPopupHeaderUI(service); 

    // This part actually shows the modal
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

// script.js
// script.js

async function fetchAllGroupedServices() {
    const categories = ['cleaning', 'painting', 'electrician', 'laundry'];
    try {
        const promises = categories.map(category =>
            fetch(`${API_BASE_URL}/api/services/${category}/grouped`).then(res => {
                if (!res.ok) throw new Error(`Failed to fetch grouped services for ${category}`);
                return res.json();
            })
        );
        const results = await Promise.all(promises);

        categories.forEach((category, index) => {
            allGroupedServices[category] = results[index];
        });
        console.log("Successfully fetched all grouped services.", allGroupedServices);
    } catch (error) {
        console.error("Error fetching grouped services:", error);
    }
}
// script.js

function openSearchModal() {
    const modal = document.getElementById('search-modal');
    if (!modal) return;

    // Build the category content when the modal is opened
    buildSearchModalContent();

    // Show the modal
    modal.classList.remove('hidden');
    modal.style.display = 'block';

    // Auto-focus the search input for a better user experience
    document.getElementById('modal-search-input').focus();
}
// script.js

function buildSearchModalContent() {
    const container = document.getElementById('search-categories-container');
    if (!container) return;

    // Define icons for your main categories
    const categoryIcons = {
        'cleaning': 'fa-broom',
        'painting': 'fa-paint-roller',
        'electrician': 'fa-bolt',
        'laundry': 'fa-tshirt'
    };

    let contentHtml = '<div class="search-category-accordion">';
    
    // Define the order you want your categories to appear in
    const categoryOrder = ['cleaning', 'painting', 'electrician', 'laundry'];

    for (const categoryKey of categoryOrder) {
        const categoryData = allGroupedServices[categoryKey];
        if (!categoryData) continue; // Skip if data for this category isn't available

        const categoryName = categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
        const icon = categoryIcons[categoryKey] || 'fa-concierge-bell';
        
        // Build the accordion item for the main category
        contentHtml += `
            <div class="search-category-item" data-category-name="${categoryKey}">
                <button class="search-category-header">
                    <i class="fas ${icon} category-icon"></i>
                    <span class="category-name">${categoryName}</span>
                    <i class="fas fa-chevron-down chevron-icon"></i>
                </button>
                <div class="subcategory-list">
        `;
        
        // Loop through the SUB-CATEGORIES from your data
        for (const subCategoryName in categoryData) {
            const servicesInSubCategory = categoryData[subCategoryName];
            // Ensure there's at least one service to link to
            if (servicesInSubCategory.length > 0) {
                // Use the ID of the first service in the sub-category as the navigation link
                const firstServiceId = servicesInSubCategory[0]._id;
                
                contentHtml += `
                    <div class="search-subcategory-link" data-service-id="${firstServiceId}">
                        <span>${subCategoryName}</span>
                        <i class="fas fa-chevron-right"></i>
                    </div>
                `;
            }
        }
        
        contentHtml += `
                </div>
            </div>
        `;
    }
    
    contentHtml += '</div>';
    container.innerHTML = contentHtml;
}

document.addEventListener('DOMContentLoaded', async () => { // Make the listener async
    const vh = window.innerHeight;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    const token = localStorage.getItem('onclickseva_customer_token');

    if (token) {
        console.log("Returning user detected. Syncing profile and server cart.");
        showMainApp();
        // This function now becomes the SOLE source of cart data for logged-in users.
        await fetchAndSyncUserProfile();
        await fetchAllServicesForSearch(); // This line already exists
    await fetchAllGroupedServices();
    } else {
        // For GUEST users, we still load the cart from localStorage.
        console.log("Guest user detected. Loading cart from localStorage.");
        loadCart();
        updateCartCountDisplay();
        
updateMobileCartCountDisplay();
await fetchAllServicesForSearch(); // This line already exists
    await fetchAllGroupedServices();
    }

const mobileSidebarToggleBtn = document.getElementById('mobile-sidebar-toggle-btn');
if (mobileSidebarToggleBtn) {
    mobileSidebarToggleBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        // This adds the sidebar state to the URL and browser history
        if (!window.location.hash.includes('&sidebar=open')) {
            window.location.hash += '&sidebar=open';
        }
    });
}

const mobileCartToggleBtn = document.getElementById('mobile-cart-toggle-btn');
if (mobileCartToggleBtn) {
    mobileCartToggleBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        // This adds '&cart=open' to the URL, which our navigation handler will detect.
        if (!window.location.hash.includes('&cart=open')) {
            window.location.hash += '&cart=open';
        }
    });
}
    
  const overlay = document.getElementById('overlay');
if (overlay) {
    overlay.addEventListener('click', (event) => {
        event.stopPropagation();
        // The overlay now just acts as a universal back button.
        // Our navigation handler will figure out what to close.
        history.back();
    });
}

    function renderServiceCards(container, services, category) {
        // Clear any existing content (like "Loading...")
        container.innerHTML = '';

        // Loop through each service and create a card for it
        services.forEach(service => {
            // Use the renderServiceCard function we already updated
            const cardElement = renderServiceCard(service, category);
            container.appendChild(cardElement);
        });
    }

    // ^ ^ ^ END OF THE NEW FUNCTION ^ ^ ^


    // NOW, FIND AND MODIFY THE FUNCTION BELOW
    async function fetchAndRenderServices(category, container) {
        try {
            // This line is now calling a backend route that doesn't exist. 
            // We will fix this in the next step. For now, let's keep it.
            const response = await fetch(`${API_BASE_URL}/api/services/${category}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const services = await response.json();

            const servicesWithCategory = services.map(s => ({ ...s, category }));
            allServices.push(...servicesWithCategory);

            // --- THIS IS THE LINE TO FIX ---
            // It was: renderServiceCards(container, services);
            // Change it to pass the category:
            renderServiceCards(container, services, category); // <-- FIX THIS LINE

        } catch (error) {
            console.error('Error fetching services:', error);
            container.innerHTML = `<p>Error loading services.</p>`;
        }
    }

      
    // script.js

    function renderServiceCard(service, category) {
        const formattedPrice = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(service.price);

        const displayRating = service.averageRating > 0 ? service.averageRating.toFixed(2) : 'No ratings';
        const displayTotalReviews = service.totalReviews > 0 ? `(${formatNumberForCard(service.totalReviews)})` : '(0)';
        const ratingHtml = service.averageRating > 0 ?
            `<span class="rating-star">★</span> ${displayRating} ${displayTotalReviews}` :
            `No ratings yet`;

        const card = document.createElement('div');
        card.className = 'service-card';
        card.setAttribute('data-service-id', service._id);
        card.setAttribute('data-service-category', category);

        card.innerHTML = `
      <img class="service-card-image" src="${service.image_src || 'https://via.placeholder.com/300'}" alt="${service.name}" />
        <div class="service-info">
            <h3>${service.name}</h3>
            <div class="service-rating">
                ${ratingHtml}
            </div>
            <div class="service-price">
                <span class="current-price">₹${service.price}</span>
            </div>
            <button class="book-now-btn" data-service-id="${service._id}" data-service-category="${category}">Book now</button>
        </div>
    `;

        const bookNowBtn = card.querySelector('.book-now-btn');
        bookNowBtn.addEventListener('click', (event) => {
            event.stopPropagation();

            const serviceId = event.target.dataset.serviceId;
            const category = event.target.dataset.serviceCategory;
            // ✨ CHANGE: Navigate by setting the URL hash
            window.location.hash = `#/booking?serviceId=${serviceId}`;
        });
        card.addEventListener('click', () => {
            // ✨ CHANGE: Navigate by setting the URL hash
            window.location.hash = `#/details?serviceId=${service._id}`;
        });

        return card;
    }


    fetchAndRenderServices("cleaning", sliderTrackCleaning);
    fetchAndRenderServices("painting", sliderTrackPainting);
    fetchAndRenderServices("electrician", sliderTrackElectrician);
    fetchAndRenderServices("laundry", sliderTrackLaundry);

    const bookingModalCloseBtn = document.querySelector('#booking-details-modal .close-button');
    if (bookingModalCloseBtn) {
        bookingModalCloseBtn.addEventListener('click', () => {
            history.back(); // ✨ CHANGE: Just go back in history
        });
    }

    // This is the NEW code
    const deepDetailsCloseBtn = document.getElementById('close-deep-details-modal');
    if (deepDetailsCloseBtn) {
        // ✨ CHANGE: This now uses the history system correctly.
        deepDetailsCloseBtn.addEventListener('click', () => history.back());
    }

    window.addEventListener('click', (event) => {
        if (event.target.id === 'booking-details-modal') {
            closeModals();
        }
    });

    document.addEventListener('click', async function (event) {

      const mobileNavAction = event.target.closest('.mobile-nav-btn')?.dataset.action;
        if (mobileNavAction) {
            event.preventDefault(); // Prevent default link behavior
            switch (mobileNavAction) {
                case 'go-home':
                    window.location.hash = '#home';
                    break;
                case 'open-bookings':
                    window.location.hash = '#/my-bookings';
                    break;
                case 'open-cart':
                    window.location.hash = '#/cart';
                    break;
                case 'open-rewards':
                    window.location.hash = '#/rewards';
                    break;
                case 'open-account':
                 window.location.hash = '#/account';
                    break;
            }
        }

        document.querySelectorAll('.service-card').forEach(card => {
            card.addEventListener('mousemove', e => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                card.style.setProperty('--mouse-x', `${x}px`);
                card.style.setProperty('--mouse-y', `${y}px`);
            });
        });
        if (event.target.matches('.book-now-btn')) {
            const serviceId = event.target.dataset.serviceId;
            const categorySection = event.target.closest('.services-section');
            const category = categorySection ? categorySection.id.split('-').pop() : null;

            if (serviceId && category) {
                // This is the only line needed. It opens the 3-column booking modal.
                showBookingDetailsModal(serviceId, category);
            }
        }
    // script.js

// ... inside document.addEventListener('click', async function (event) { ...

        if (event.target.matches('.add-btn') || event.target.matches('.add-to-cart-btn')) {
            event.stopPropagation();
            const serviceId = event.target.dataset.serviceId;
            if (serviceId && activeCartCategory) {
                // ✅ FIX: Only open sidebar on screens wider than 768px
                if (window.innerWidth > 768) {
                    window.location.hash = '#/cart-sidebar';
                }
                await addToCart(serviceId, activeCartCategory);
                syncModalUI(serviceId);
            }
        }
        else if (event.target.matches('.increase-quantity-btn')) {
            event.stopPropagation();
            const serviceId = event.target.dataset.serviceId;
            if (serviceId && activeCartCategory) {
                // ✅ FIX: Only open sidebar on screens wider than 768px
                if (window.innerWidth > 768) {
                    window.location.hash = '#/cart-sidebar';
                }
                const currentQuantity = cart[activeCartCategory]?.[serviceId]?.quantity || 0;
                updateCartQuantity(serviceId, activeCartCategory, currentQuantity + 1);
            }
        }
        else if (event.target.matches('.decrease-quantity-btn')) {
            event.stopPropagation();
            const serviceId = event.target.dataset.serviceId;
            if (serviceId && activeCartCategory) {
                // ✅ FIX: Only open sidebar on screens wider than 768px
                if (window.innerWidth > 768) {
                    window.location.hash = '#/cart-sidebar';
                }
                const currentQuantity = cart[activeCartCategory]?.[serviceId]?.quantity || 0;
                updateCartQuantity(serviceId, activeCartCategory, currentQuantity - 1);
            }
        }

// ... rest of the click listener
else if (event.target.matches('#overlay')) {
    const servicesSidebar = document.getElementById('services-sidebar');

    // If the mobile sidebar is active, close it and navigate back.
    // This makes the overlay behind the sidebar a "back" button for both.
    if (servicesSidebar && servicesSidebar.classList.contains('active')) {
       
        history.back(); // Navigate back (closes booking modal)
        event.stopPropagation(); // Stop further propagation to prevent other listeners from firing
    } 
    // If the overlay is clicked but the mobile sidebar is NOT active, 
    // it means the overlay is likely for a desktop modal, so history.back() is also appropriate here.
    // However, the earlier fix in handleNavigation should prevent the overlay
    // from showing for the booking modal on mobile screens in the first place,
    // so this 'else' path is primarily for desktop modal closing.
    else if (window.innerWidth > 768) { // Only navigate back on desktop if sidebar is not active
         history.back();
         event.stopPropagation();
    }
}
// ▲▲▲ END OF REPLACED BLOCK ▲▲▲
        else if (event.target.closest('.view-cart-btn')) {
            history.replaceState(null, '', '#/checkout'); // <-- REPLACE
            handleNavigation();                            // <-- Manually trigger router
        }
        else if (event.target.matches('#back-to-main-from-checkout')) {
            history.back(); // ✨ CHANGE: Just go back in history
        }
    });

    const servicesSidebarList = document.getElementById('services-sidebar-list');
    if (servicesSidebarList) {
        servicesSidebarList.addEventListener('click', (event) => {
            const target = event.target;

            // Logic for expanding/collapsing the accordion
            const header = target.closest('.category-header');
            if (header) {
                const categoryContainer = header.parentElement;
                // Optional: Close other categories when one is opened
                document.querySelectorAll('.sidebar-category').forEach(cat => {
                    if (cat !== categoryContainer) {
                        cat.classList.remove('active');
                    }
                });
                categoryContainer.classList.toggle('active');
                return; // Action handled, no need to proceed
            }

            // Logic for selecting a specific service item (this remains the same)
            const targetItem = target.closest('.sidebar-service-item');
            if (targetItem) {
                const serviceId = targetItem.dataset.serviceId;
                const cartSidebar = document.getElementById('cartSidebar');

                if (cartSidebar && cartSidebar.classList.contains('active')) {
                    window.location.hash = `#/booking?serviceId=${serviceId}&cart=open`;
                } else {
                    window.location.hash = `#/booking?serviceId=${serviceId}`;
                }
                toggleMobileSidebar(true);
            }
            
        });
    }

    // --- NEW LIVE SEARCH FUNCTIONALITY ---
    const searchInput = document.getElementById('search-input');
    const searchResultsDropdown = document.getElementById('search-results-dropdown');

    // Function to render the results in the dropdown
    function renderSearchResults(results) {
        searchResultsDropdown.innerHTML = ''; // Clear previous results
        if (results.length === 0) {
            searchResultsDropdown.innerHTML = '<div class="no-results-message">No services found.</div>';
            return;
        }

        results.forEach(service => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            // Store service data on the element itself for easy access on click
            item.dataset.serviceId = service._id;
            item.dataset.serviceCategory = service.category;

            item.innerHTML = `
                <img src="${service.image_src}" alt="${service.name}">
                <span>${service.name}</span>
            `;
            searchResultsDropdown.appendChild(item);
        });
    }

    // script.js (inside your main DOMContentLoaded listener)

    // --- THIS IS THE CORRECTED CODE BLOCK ---
    const header = document.querySelector('#main-app-container header'); // <-- THE FIX IS HERE


    if (header && searchInput) {
        // When the user clicks into the search bar, elevate the header
        searchInput.addEventListener('focus', () => {
            header.classList.add('search-active');
        });

        // When the user clicks away from the search bar, return the header to normal
        searchInput.addEventListener('blur', () => {
            // We use a small delay to allow a click on a dropdown item to register first
            setTimeout(() => {
                // Check if focus moved to an item within the dropdown
                if (document.activeElement.closest('.search-result-item') === null) {
                    header.classList.remove('search-active');
                }
            }, 200);
        });
    }

    // Listen for typing in the search input
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();

        if (query.length < 2) { // Start searching after 2 characters
            searchResultsDropdown.classList.add('hidden');
            return;
        }

        const filteredServices = allServices.filter(service =>
            service.name.toLowerCase().includes(query)
        );

        renderSearchResults(filteredServices);
        searchResultsDropdown.classList.remove('hidden');
    });

    // This is the NEW code
    searchResultsDropdown.addEventListener('click', (event) => {
        const selectedItem = event.target.closest('.search-result-item');
        if (selectedItem) {

            const { serviceId, serviceCategory } = selectedItem.dataset;
            // ✨ CHANGE: Navigate by setting the URL hash
            window.location.hash = `#/booking?serviceId=${serviceId}`;

            // Hide dropdown and clear input after selection
            searchResultsDropdown.classList.add('hidden');
            searchInput.value = '';
        }
    });

    // --- NEW CHECKOUT OFFERS LOGIC ---
    const offersHeader = document.getElementById('offers-header');
    const offersBody = document.getElementById('offers-body');
    const offerCheckboxes = document.querySelectorAll('.offer-checkbox');

    // Accordion expand/collapse
    if (offersHeader) {
        offersHeader.addEventListener('click', () => {
            offersHeader.classList.toggle('active');
            offersBody.classList.toggle('hidden');
        });
    }


    // Hide the dropdown if the user clicks anywhere else on the page
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.option-item.search')) {
            searchResultsDropdown.classList.add('hidden');
            if (header) header.classList.remove('search-active');
        }
    });



    // SCRIPT.JS - REPLACE THE OLD LOCATION MODAL LOGIC BLOCK WITH THIS

    // --- NEW EXPANDED LOCATION MODAL LOGIC ---
    const locationSelector = document.getElementById('location-selector');
    const locationModal = document.getElementById('location-modal');
    const closeLocationModalBtn = document.getElementById('close-location-modal');
    const backFromLocationModalBtn = document.getElementById('back-to-home-from-location');
    const locationSearchInput = document.getElementById('location-search-input');
    const clearLocationSearchBtn = document.getElementById('clear-location-search'); // NEW
    const locationSearchResults = document.getElementById('location-search-results'); // NEW
    const confirmSelectedLocationBtn = document.getElementById('confirm-selected-location-btn');
    const addNewAddressBtn = document.getElementById('add-new-address-btn');
    const useCurrentLocationBtn = document.getElementById('use-current-location-btn');
    // script.js -> Inside the DOMContentLoaded listener

    // --- NEW HELP CENTER EVENT LISTENERS ---
    const accountLink = document.getElementById('account-link');
    if (accountLink) accountLink.addEventListener('click', () => { window.location.hash = '#/help/account'; });

    const gettingStartedLink = document.getElementById('getting-started-link');
    if (gettingStartedLink) gettingStartedLink.addEventListener('click', () => { window.location.hash = '#/help/getting-started'; });

    const paymentLink = document.getElementById('payment-link');
    if (paymentLink) paymentLink.addEventListener('click', () => { window.location.hash = '#/help/payment'; });

    // Back buttons for help sub-pages
    const backToMain = document.getElementById('back-to-main');
    if (backToMain) backToMain.addEventListener('click', () => history.back());

    const backToHelpCenter = document.getElementById('back-to-help-center');
    if (backToHelpCenter) backToHelpCenter.addEventListener('click', () => { window.location.hash = '#/help'; });

    const backToHelpCenterFromGettingStarted = document.getElementById('back-to-help-center-from-getting-started');
    if (backToHelpCenterFromGettingStarted) backToHelpCenterFromGettingStarted.addEventListener('click', () => { window.location.hash = '#/help'; });

    const backToHelpCenterFromPayment = document.getElementById('back-to-help-center-from-payment');
    if (backToHelpCenterFromPayment) backToHelpCenterFromPayment.addEventListener('click', () => { window.location.hash = '#/help'; });

    if (locationSelector) {
        locationSelector.addEventListener('click', () => {
            // --- CHANGE THIS ---
            window.location.hash = '#/location';
        });
    }
    if (closeLocationModalBtn) {
        closeLocationModalBtn.addEventListener('click', () => history.back());
    }
    if (backFromLocationModalBtn) {
        backFromLocationModalBtn.addEventListener('click', () => history.back());
    }

    // Clear search input button
    if (clearLocationSearchBtn) {
        clearLocationSearchBtn.addEventListener('click', () => {
            locationSearchInput.value = '';
            locationSearchResults.classList.add('hidden');
            clearLocationSearchBtn.classList.add('hidden');
            document.querySelectorAll('.location-item').forEach(item => item.classList.remove('selected'));
            document.getElementById('confirm-selected-location-btn').classList.add('hidden');
            document.getElementById('add-new-address-btn').classList.add('hidden');
        });
    }

    // Live search input handler with debounce
    if (locationSearchInput) {
        locationSearchInput.addEventListener('input', () => {
            const query = locationSearchInput.value.trim();
            if (query.length > 0) {
                clearLocationSearchBtn.classList.remove('hidden'); // Show clear button
                document.getElementById('add-new-address-btn').classList.remove('hidden'); // Show add new address
                document.getElementById('confirm-selected-location-btn').classList.add('hidden'); // Hide confirm for now
                document.querySelectorAll('.location-item').forEach(item => item.classList.remove('selected')); // Clear selected location
            } else {
                clearLocationSearchBtn.classList.add('hidden');
                document.getElementById('add-new-address-btn').classList.add('hidden');
                locationSearchResults.classList.add('hidden'); // Hide results if input is empty
            }

            // Debounce the API call
            clearTimeout(locationSearchTimeout);
            if (query.length > 2) { // Only search if query is at least 3 characters
                locationSearchTimeout = setTimeout(() => {
                    fetchLocationSuggestions(query);
                }, 300); // Wait 300ms after typing stops
            } else {
                locationSearchResults.classList.add('hidden');
            }
        });
    }

    // Handle clicking on a search result
    if (locationSearchResults) {
        locationSearchResults.addEventListener('click', (event) => {
            const selectedResult = event.target.closest('.location-result-item');
            if (selectedResult) {
                const address = selectedResult.dataset.address;
                locationSearchInput.value = address; // Put the selected address in the search input
                locationSearchResults.classList.add('hidden'); // Hide the dropdown
                document.querySelectorAll('.location-item').forEach(item => item.classList.remove('selected')); // Clear existing selections

                document.getElementById('confirm-selected-location-btn').classList.remove('hidden'); // Show confirm button
                document.getElementById('add-new-address-btn').classList.add('hidden'); // Hide add new address button
            }
        });
    }

    // ... (the rest of your existing listeners, like for locationModal click, confirmSelectedLocationBtn, addNewAddressBtn, useCurrentLocationBtn) ...
    // Handle clicks on saved/recent locations
    if (locationModal) { // Delegate the event to the modal
        locationModal.addEventListener('click', (event) => {
            const selectedLocationItem = event.target.closest('.location-item');
            if (selectedLocationItem) {
                // Remove 'selected' from all items first
                document.querySelectorAll('.location-item').forEach(item => item.classList.remove('selected'));
                // Add 'selected' to the clicked item
                selectedLocationItem.classList.add('selected');

                const address = selectedLocationItem.dataset.address;
                locationSearchInput.value = address; // Put selected address in search input
                confirmSelectedLocationBtn.classList.remove('hidden'); // Show confirm button
                addNewAddressBtn.classList.add('hidden'); // Hide add new address
            }
        });
    }

    // --- ALL LOCATION BUTTON HANDLERS MOVED HERE ---

    // Find the listener for 'confirm-selected-location-btn' and modify it
    // script.js - MODIFY THE confirm-selected-location-btn LISTENER

    if (confirmSelectedLocationBtn) {
        confirmSelectedLocationBtn.addEventListener('click', async () => { // Make it async
            const selectedAddress = locationSearchInput.value.trim();
            if (selectedAddress) {
                const newLocation = { address: selectedAddress, title: 'Home' }; // Default title

                // --- NEW: Sync with backend ---
                try {
                    const response = await authenticatedFetch(`${API_BASE_URL}/api/customer/addresses`, {
                        method: 'POST',
                        body: JSON.stringify(newLocation)
                    });
                    if (!response.ok) throw new Error("Server failed to save address.");

                    // If server is successful, update local state
                    saveLocationToLocalStorage(newLocation);
                    updateLocationDisplay(selectedAddress);
                    updateCheckoutAddress();
                    closeLocationModal();

                } catch (error) {
                    console.error("Failed to save address to server:", error);
                    alert("Could not save your address. Please try again.");
                }
                // --- END NEW ---
            } else {
                alert('Please select or enter a location.');
            }
        });
    }
    // script.js - REPLACE this event listener

    if (addNewAddressBtn) {
        addNewAddressBtn.addEventListener('click', async () => { // Make it async
            const newAddress = locationSearchInput.value.trim();
            if (newAddress) {
                const newLocation = { address: newAddress, title: 'Home' };

                // --- NEW: Sync with backend ---
                try {
                    const response = await authenticatedFetch(`${API_BASE_URL}/api/customer/addresses`, {
                        method: 'POST',
                        body: JSON.stringify(newLocation)
                    });
                    if (!response.ok) throw new Error("Server failed to save address.");

                    // If server is successful, update local state
                    saveLocationToLocalStorage(newLocation);
                    updateLocationDisplay(newAddress);
                    updateCheckoutAddress();
                    closeLocationModal();

                } catch (error) {
                    console.error("Failed to save new address to server:", error);
                    alert("Could not save your new address. Please try again.");
                }
                // --- END NEW ---
            } else {
                alert("Please enter an address in the search box to add.");
            }
        });
    }

    // Call getRealLocation when "Use current location" button is clicked
    if (useCurrentLocationBtn) {
        useCurrentLocationBtn.addEventListener('click', getRealLocation);
    }

    // Listen for input in the search box to show/hide confirm/add buttons
    if (locationSearchInput) {
        locationSearchInput.addEventListener('input', () => {
            if (locationSearchInput.value.trim().length > 0) {
                addNewAddressBtn.classList.remove('hidden');
                confirmSelectedLocationBtn.classList.add('hidden'); // Hide confirm until explicit selection
                document.querySelectorAll('.location-item').forEach(item => item.classList.remove('selected')); // Clear selection
            } else {
                addNewAddressBtn.classList.add('hidden');
                confirmSelectedLocationBtn.classList.add('hidden');
            }
        });
    }
    const editAddressBtn = document.getElementById('edit-checkout-address-btn');
    if (editAddressBtn) {
        editAddressBtn.addEventListener('click', () => {
            window.location.hash = '#/location';
        });
    }

    // This is the NEW code
    const cartBackButton = document.getElementById('cart-back-btn');
    if (cartBackButton) {
        cartBackButton.addEventListener('click', () => {
            history.back(); // ✨ CHANGE: Simply go back in history.
        });
    }

    // script.js (inside your main DOMContentLoaded listener)
    // script.js (inside your main DOMContentLoaded listener)

    // --- ✅ ADD THIS ENTIRE NEW BLOCK ---
    const helpLink = document.getElementById('help-link');
    if (helpLink) {
        helpLink.addEventListener('click', (e) => {
            e.preventDefault();
            const profileDropdown = document.getElementById('profile-dropdown');
            profileDropdown.classList.add('hidden');

            // This also resets the header's z-index.
            if (header) header.classList.remove('profile-active');

            window.location.hash = '#/help';
        });
    }
    // Find this existing listener
    const myBookingsLink = Array.from(document.querySelectorAll('.profile-dropdown a')).find(a => a.textContent === 'My Bookings');
    if (myBookingsLink) {
        myBookingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            const profileDropdown = document.getElementById('profile-dropdown');
            profileDropdown.classList.add('hidden');

            // --- ✅ ADD THIS LINE ---
            // This resets the header's z-index when the link is clicked.
            if (header) header.classList.remove('profile-active');

            window.location.hash = '#/my-bookings';
        });
    }
    // --- REPLACE the entire myBookingsModal event listener with this corrected version ---
    const myBookingsModal = document.getElementById('my-bookings-modal');
    if (myBookingsModal) {
        myBookingsModal.addEventListener('click', (event) => {
            const target = event.target; // The element that was actually clicked
            if (target === myBookingsModal) {
                history.back(); // Use history to close both popup and overlay
                return;
            }
            // Handler for the main "Close/Back" button
            if (target.closest('#close-my-bookings-modal')) {
                history.back();
                return; // Action handled, stop here.
            }

            // Handler for the "Rate Now" button
            const rateButton = target.closest('.rate-now-btn');
            if (rateButton) {
                const jobId = rateButton.dataset.jobId;
                window.location.hash = `#/rate?jobId=${jobId}`;
                return; // Action handled, stop here.
            }

            // Handler for a click anywhere on a booking item (including the details link)
            const bookingItem = target.closest('.booking-summary-item');
            if (bookingItem) {
                // --- THIS IS THE FIX ---
                // We check if the click was specifically on the "View Details" link.
                // If it was, we MUST prevent the link's default behavior of navigating to "#".
                if (target.closest('.view-details-link')) {
                    event.preventDefault();
                }
                // --- END OF FIX ---

                // Now, whether the user clicked the link or the surrounding div,
                // we perform the same correct navigation action.
                const jobId = bookingItem.dataset.jobId;
                window.location.hash = `#/my-bookings/${jobId}`;
            }
        });
    }
    const backToBookingsListBtn = document.getElementById('back-to-bookings-list');
    if (backToBookingsListBtn) {
        // ✨ CHANGE: Simply tell the browser to go back in its history.
        // The popstate event will automatically show the bookings list.
        backToBookingsListBtn.addEventListener('click', () => {
            history.back();
        });
    }
    const profileIcon = document.getElementById('profile-icon');
    const profileDropdown = document.getElementById('profile-dropdown');

    if (profileIcon && profileDropdown) {
        profileIcon.addEventListener('click', (event) => {
            event.stopPropagation();

            // Toggle visibility for both the dropdown and the header's active state
            profileDropdown.classList.toggle('hidden');
            header.classList.toggle('profile-active'); // ✅ **THE FIX**
        });
    }

    // This listener closes the dropdown if you click anywhere else on the page
    document.addEventListener('click', (event) => {
        if (!profileIcon.contains(event.target) && !profileDropdown.classList.contains('hidden')) {
            profileDropdown.classList.add('hidden');
            header.classList.remove('profile-active'); // ✅ **ADD THIS LINE**
        }
    });

    const scheduledBtn = document.getElementById('booking-type-scheduled');
    const onDemandBtn = document.getElementById('booking-type-ondemand');
    const slotContainer = document.getElementById('slot-selection-container-checkout');
    const proceedToPayBtnOnCheckout = document.getElementById('proceed-to-pay-btn'); // Ensure this ID is on your button

    if (scheduledBtn && onDemandBtn && slotContainer) {
        scheduledBtn.addEventListener('click', () => {
            bookingType = 'SCHEDULED';
            scheduledBtn.classList.add('active');
            onDemandBtn.classList.remove('active');
            slotContainer.classList.remove('hidden');
            // Only show proceed button if a slot has already been selected
            if (!selectedSlot.date) {
                proceedToPayBtnOnCheckout.classList.add('hidden');
                document.getElementById('payment-placeholder').classList.remove('hidden');
            }
        });

        onDemandBtn.addEventListener('click', () => {
            bookingType = 'ON_DEMAND';
            onDemandBtn.classList.add('active');
            scheduledBtn.classList.remove('active');
            slotContainer.classList.add('hidden');
            // For on-demand, the user can always proceed
            proceedToPayBtnOnCheckout.classList.remove('hidden');
            document.getElementById('payment-placeholder').classList.add('hidden');
        });
    }

    // This is the corrected code inside DOMContentLoaded
    // --- RATING MODAL LOGIC ---
    ratingModal = document.getElementById('rating-modal'); // REMOVED CONST
    const closeRatingModalBtn = document.getElementById('close-rating-modal');
    stars = document.querySelectorAll('#rating-stars .star'); // REMOVED CONST
    const submitRatingBtn = document.getElementById('submit-rating-btn');
    let selectedRating = 0; // This can stay here, it's only used within this block

    // script.js - REPLACE this function
    function openRatingModal(jobId) {

        currentJobToRate = jobId;



        // Reset modal state (your existing code is correct)
        selectedRating = 0;
        stars.forEach(s => s.classList.remove('selected', 'hovered'));
        document.getElementById('feedback-textarea').value = '';

        // Make the rating modal visible (your existing code is correct)
        ratingModal.classList.remove('hidden');
        ratingModal.style.display = 'flex'; // Use flex for proper centering
    }
    // script.js - REPLACE this function

    function closeRatingModal() {
        ratingModal.classList.add('hidden');
        ratingModal.style.display = 'none';
        currentJobToRate = null;

        // Re-open the bookings list for a better user experience
        openMyBookingsModal();
    }
    // Event listeners for star interactions
    stars.forEach(star => {
        star.addEventListener('mouseover', () => {
            stars.forEach(s => s.classList.remove('hovered'));
            star.classList.add('hovered');
            let prev = star.previousElementSibling;
            while (prev) {
                prev.classList.add('hovered');
                prev = prev.previousElementSibling;
            }
        });

        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.value);
            stars.forEach(s => s.classList.remove('selected'));
            star.classList.add('selected');
            let prev = star.previousElementSibling;
            while (prev) {
                prev.classList.add('selected');
                prev = prev.previousElementSibling;
            }
        });
    });

    document.getElementById('rating-stars').addEventListener('mouseout', () => {
        stars.forEach(s => s.classList.remove('hovered'));
    });

    // This is the NEW code
    closeRatingModalBtn.addEventListener('click', () => history.back());
    submitRatingBtn.addEventListener('click', submitRating);


    async function submitRating() {
        if (selectedRating === 0) {
            alert('Please select a star rating.');
            return;
        }

        const feedback = document.getElementById('feedback-textarea').value;

        submitRatingBtn.disabled = true;
        submitRatingBtn.textContent = 'Submitting...';

        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/api/jobs/${currentJobToRate}/rate`, {
                method: 'POST',
                body: JSON.stringify({
                    rating: selectedRating,
                    feedback: feedback
                })
            });

            if (!response.ok) {
                throw new Error('Failed to submit rating.');
            }

            showMessage('Thank you for your feedback!', 'success');
            closeRatingModal();
            renderMyBookingsList(); // Refresh the bookings list to show the update

        } catch (error) {
            console.error('Rating submission error:', error);
            alert(error.message);
        } finally {
            submitRatingBtn.disabled = false;
            submitRatingBtn.textContent = 'Submit Rating';
        }
    }

    // This is the NEW, CORRECTED code
    const bookingDetailsModal = document.getElementById('booking-details-modal');
// REPLACE this entire event listener in script.js

if (bookingDetailsModal) {
    bookingDetailsModal.addEventListener('click', async (event) => {

        if (event.target.matches('.add-to-cart-btn, .add-btn')) {
            event.stopPropagation();
            const serviceId = event.target.dataset.serviceId;
            if (!serviceId || !activeCartCategory) return;

            // --- THIS IS THE FIX ---
            // The direct call to openAddonSelectionPopup() is now REMOVED.
            // addToCart will now handle the entire logic flow.
            
            if (window.innerWidth > 768) {
                // We still want the cart sidebar on desktop, but the add-on logic
                // will be handled inside addToCart now.
                const cartItem = cart[activeCartCategory]?.[serviceId];
                const isNewItem = !cartItem || cartItem.quantity === 0;
                
                // Only open cart sidebar if it's NOT a new item with addons.
                // The add-on popup will take precedence.
                if (!(isNewItem && currentServiceInBookingModal?.addOns?.length > 0)) {
                    window.location.hash = '#/cart-sidebar';
                }
            }

            await addToCart(serviceId, activeCartCategory, 1);
            syncModalUI(serviceId);
            return;
        }

        if (event.target.matches('.increase-quantity-btn, .decrease-quantity-btn')) {
            event.stopPropagation();
            const serviceId = event.target.dataset.serviceId;
            if (serviceId && activeCartCategory) {
                if (window.innerWidth > 768) {
                    window.location.hash = '#/cart-sidebar';
                }
                const currentQuantity = cart[activeCartCategory]?.[serviceId]?.quantity || 0;
                const change = event.target.matches('.increase-quantity-btn') ? 1 : -1;
                await updateCartQuantity(serviceId, activeCartCategory, currentQuantity + change);
            }
            return;
        }

        // This part for opening details popups remains the same.
        const bookingCard = event.target.closest('.your-booking-card');
        if (bookingCard && !event.target.closest('button')) {
            const serviceId = bookingCard.querySelector('[data-service-id]')?.dataset.serviceId;
            if (serviceId) window.location.hash = `#/details?serviceId=${serviceId}`;
            return;
        }

        const recommendationCard = event.target.closest('.recommendation-card');
        if (recommendationCard && !event.target.closest('.add-btn, .quantity-picker-wrapper')) {
            const serviceId = recommendationCard.dataset.serviceId;
            if (serviceId) window.location.hash = `#/details?serviceId=${serviceId}`;
            return;
        }
    });
}

    // Add listener for the new modal's close button
    const closeDeepDetailsBtn = document.getElementById('close-deep-details-modal');
    if (closeDeepDetailsBtn) {
        // ✨ CHANGE: Instead of closing the popup directly, we go back in history.
        // The 'popstate' event will then call handleNavigation() to close the popup.
        closeDeepDetailsBtn.addEventListener('click', () => {
            history.back();
        });
    }

    // script.js

    // This is the CORRECTED code
    const deepDetailsModal = document.getElementById('service-deep-details-modal');

    // Find this listener for the "deep details" modal and REPLACE its contents.
    if (deepDetailsModal) {
        deepDetailsModal.addEventListener('click', (event) => {

            // --- ✅ START OF FIX ---
            // We add a specific check for the close button.
            // This must be handled separately from other clicks inside the modal.
            if (event.target.id === 'close-deep-details-modal') {
                // This is the key change. Instead of closing modals directly,
                // we simply tell the browser to go back one step in its history.
                // This behaves exactly like the device's back button.
                history.back();
                return; // Stop further execution for this click.
            }
            const serviceId = currentServiceInPopup.id;
        const category = currentServiceInPopup.category;

        // --- NEW LOGIC FOR MAIN SERVICE BUTTONS IN CONTENT ---
        const mainAddToCartBtn = event.target.closest('.details-summary-section .add-to-cart-btn');
        const mainIncreaseBtn = event.target.closest('.details-summary-section .increase-quantity-btn');
        const mainDecreaseBtn = event.target.closest('.details-summary-section .decrease-quantity-btn');
// script.js

// ... inside if (deepDetailsModal) { deepDetailsModal.addEventListener('click', (event) => { ...

        const handleMainServiceUpdate = async (change) => {
            if (!serviceId || !category) return;
            
            // ✅ FIX: Only open sidebar on screens wider than 768px
            if (window.innerWidth > 768) {
                window.location.hash = '#/cart-sidebar'; 
            }

            const currentQuantity = cart[category]?.[serviceId]?.quantity || 0;
            await updateCartQuantity(serviceId, category, currentQuantity + change);
            
            renderServiceDeepDetails(currentServiceInPopup.serviceData);
            syncDeepDetailsHeaderButton();
        };

        // ... existing button logic for main service update ...

        const handleAddonUpdate = async (addonName, addonPrice, change) => {
            // ... (rest of the handleAddonUpdate function is the same)
            const mainServiceId = currentServiceInPopup.id;
            const mainCartItem = cart[activeCartCategory]?.[mainServiceId];
            if (!mainCartItem) {
                alert('Please add the main service to your cart before managing add-ons.');
                return;
            }

            // ✅ FIX: Only open sidebar on screens wider than 768px
            if (window.innerWidth > 768) {
                window.location.hash = '#/cart-sidebar';
            }
            
            if (!mainCartItem.addOns) mainCartItem.addOns = [];
            // ... rest of the function continues as before ...
            const addonIndex = mainCartItem.addOns.findIndex(a => a.name === addonName);
            let updatedAddOns = [...mainCartItem.addOns]; 

            if (addonIndex > -1) {
                updatedAddOns[addonIndex].quantity += change;
                if (updatedAddOns[addonIndex].quantity <= 0) {
                    updatedAddOns.splice(addonIndex, 1);
                }
            } else if (change > 0) {
                updatedAddOns.push({ name: addonName, price: parseFloat(addonPrice), quantity: 1 });
            }

            try {
                const response = await authenticatedFetch(`${API_BASE_URL}/api/customer/cart/addons`, {
                    method: 'POST',
                    body: JSON.stringify({
                        serviceId: mainServiceId,
                        category: activeCartCategory,
                        addOns: updatedAddOns 
                    })
                });

                if (!response.ok) throw new Error('Failed to sync add-ons with server.');

                mainCartItem.addOns = updatedAddOns;

                saveCart();
                renderCart(activeCartCategory);
                renderServiceDeepDetails(currentServiceInPopup.serviceData);

            } catch (error) {
                console.error("Error updating add-ons on server:", error);
                alert("Could not update add-ons. Please check your connection.");
                renderServiceDeepDetails(currentServiceInPopup.serviceData);
            }
        };

// ... rest of the click listener

            const addBtn = event.target.closest('.addon-add-btn');
            const increaseBtn = event.target.closest('.increase-addon-qty-btn');
            const decreaseBtn = event.target.closest('.decrease-addon-qty-btn');

            if (addBtn) {
                event.stopPropagation();
                handleAddonUpdate(addBtn.dataset.name, addBtn.dataset.price, 1);
            } else if (increaseBtn) {
                event.stopPropagation();
                handleAddonUpdate(increaseBtn.dataset.name, increaseBtn.dataset.price, 1);
            } else if (decreaseBtn) {
                event.stopPropagation();
                handleAddonUpdate(decreaseBtn.dataset.name, decreaseBtn.dataset.price, -1);
            }
            // --- END: NEW ADVANCED ADD-ON LOGIC ---

            if (event.target === deepDetailsModal && deepDetailsModal.classList.contains('shifted-view')) {
                // ... (this part is correct) ...
            }
        });
    }
  const deepDetailsHeader = document.querySelector('.deep-details-header');
if (deepDetailsHeader) {
    deepDetailsHeader.addEventListener('click', async (event) => {
        const serviceId = currentServiceInPopup.id;
        const category = currentServiceInPopup.category;
        if (!serviceId || !category) return;

        // This is our screen width check
        const isDesktop = window.innerWidth > 768;

        // Case 1: Clicked the "Add to Cart" button
        if (event.target.id === 'header-add-to-cart-btn') {
            if (isDesktop) {
                window.location.hash = '#/cart-sidebar'; // Triggers sidebar only on desktop
            }
            await addToCart(serviceId, category);
            syncDeepDetailsHeaderButton();
        }

        // Case 2: Clicked the "+" button
        if (event.target.id === 'increase-header-qty') {
            if (isDesktop) {
                window.location.hash = '#/cart-sidebar'; // Triggers sidebar only on desktop
            }
            const currentQuantity = cart[category]?.[serviceId]?.quantity || 0;
            await updateCartQuantity(serviceId, category, currentQuantity + 1);
            syncDeepDetailsHeaderButton();
        }

        // Case 3: Clicked the "-" button
        if (event.target.id === 'decrease-header-qty') {
            if (isDesktop) {
                window.location.hash = '#/cart-sidebar'; // Triggers sidebar only on desktop
            }
            const currentQuantity = cart[category]?.[serviceId]?.quantity || 0;
            await updateCartQuantity(serviceId, category, currentQuantity - 1);
            syncDeepDetailsHeaderButton();
        }
    });
}
    

    // script.js

    // ADD THIS NEW BLOCK to handle the FAQ accordion clicks in the new modal
    const faqModal = document.getElementById('faq-modal');
    if (faqModal) {
        faqModal.addEventListener('click', (event) => {
            // Find the question button that was clicked
            const question = event.target.closest('.faq-question');
            if (question) {
                const item = question.parentElement; // This is the .faq-item

                // This part is optional but provides good UX: It closes other open questions.
                faqModal.querySelectorAll('.faq-item').forEach(otherItem => {
                    if (otherItem !== item && otherItem.classList.contains('active')) {
                        otherItem.classList.remove('active');
                    }
                });

                // Toggle the 'active' class on the clicked item to expand/collapse it
                item.classList.toggle('active');
            }
        });
    }
    const goToHomeBtn = document.getElementById('go-to-home-from-details');
    if (goToHomeBtn) {
        goToHomeBtn.addEventListener('click', () => {
            window.location.hash = '#home';
        });
    }
    // script.js - REPLACE the entire #checkout-page event listener

    const checkoutPage = document.getElementById('checkout-page');
    if (checkoutPage) {
        checkoutPage.addEventListener('click', (event) => {

            if (event.target.closest('#proceed-to-details-btn')) {
                history.replaceState(null, '', '#/checkout/details'); // <-- REPLACE
                handleNavigation();                                    // <-- Manually trigger router
                return;
            }
            if (event.target.closest('#back-to-main-from-checkout')) {
                if (window.location.hash.includes('/details')) {
                    window.location.hash = '#/checkout';
                } else {
                    history.back();
                }
                return;
            }

            const serviceId = event.target.closest('[data-service-id]')?.dataset.serviceId;
            if (!serviceId) return;

            const cartItem = cart[activeCartCategory]?.[serviceId];
            if (!cartItem) return;

            // --- Block 2: Main service quantity and remove buttons ---
            const currentQuantity = cartItem.quantity || 0;
            if (event.target.matches('.checkout-increase-qty-btn')) {
                updateCartQuantity(serviceId, activeCartCategory, currentQuantity + 1).then(() => renderCheckoutPage());
            } else if (event.target.matches('.checkout-decrease-qty-btn')) {
                updateCartQuantity(serviceId, activeCartCategory, currentQuantity - 1).then(() => renderCheckoutPage());
            } else if (event.target.closest('.checkout-remove-btn')) {
                removeFromCart(serviceId, activeCartCategory).then(() => renderCheckoutPage());
            }

            // --- Block 3: NEW LOGIC FOR ADD-ON BUTTONS ---
            const addonName = event.target.dataset.addonName;
            if (addonName) {
                const addonIndex = (cartItem.addOns || []).findIndex(a => a.name === addonName);
                if (addonIndex === -1) return; // Should not happen

                const currentAddonQuantity = cartItem.addOns[addonIndex].quantity;

                if (event.target.matches('.increase-addon-qty-btn')) {
                    cartItem.addOns[addonIndex].quantity = currentAddonQuantity + 1;
                } else if (event.target.matches('.decrease-addon-qty-btn')) {
                    cartItem.addOns[addonIndex].quantity = currentAddonQuantity - 1;
                    // If quantity becomes zero, remove the add-on
                    if (cartItem.addOns[addonIndex].quantity <= 0) {
                        cartItem.addOns.splice(addonIndex, 1);
                    }
                }
                saveCart();
                renderCheckoutPage(); // Re-render the entire page to reflect changes
            }
        });
    }
    // --- NEW: General Service Card Click Handler ---
    const servicesContainer = document.querySelector('#services .services-container');
    if (servicesContainer) {
        servicesContainer.addEventListener('click', (event) => {
            const card = event.target.closest('.general-service-card');
            if (card) {

                const category = card.dataset.category;
                if (!category) {
                    console.error('Service card is missing a data-category attribute.');
                    return;
                }

                // Find the first service available in this category to open the modal with
                const serviceToOpen = allServices.find(s => s.category === category);

                if (serviceToOpen) {
                    // Use the existing navigation system to open the modal.
                    // This triggers the handleNavigation() function.
                    window.location.hash = `#/booking?serviceId=${serviceToOpen._id}`;
                } else {
                    alert(`Sorry, no services are currently available for the "${category}" category.`);
                    console.warn(`No services found in allServices array for category: ${category}`);
                }
            }
        });
    }
    // --- NEW LOGOUT LOGIC ---
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (event) => {
            event.preventDefault(); // Prevents the link from navigating anywhere

            // 1. This erases EVERYTHING from localStorage: the login token,
            // cart, saved locations, etc. It's a complete reset.
            localStorage.clear();

            // 2. This redirects the user to the login page and, crucially,
            // REPLACES the current page in the browser's history. This is what
            // prevents the user from clicking the "back" button to see the
            // page they were just on.
            window.location.replace(window.location.origin + window.location.pathname);
        });
    }
    const addonSelectionModal = document.getElementById('addon-selection-modal');
// script.js

if (addonSelectionModal) {
    addonSelectionModal.addEventListener('click', async (event) => {
        // ✅ FIX: This stops the click from triggering other listeners
        event.stopPropagation(); 
        
        const target = event.target;
        const service = currentServiceForAddons;
        if (!service) return;
        
        const mainServiceId = service._id;

        // Case 1: Click "Add" for the MAIN service in the header
        if (target.id === 'addon-header-add-btn') {
            await addToCart(mainServiceId, activeCartCategory, 1);
            syncAddonPopupHeaderUI(service);
            return;
        }

        // Case 2: Click "+" for the MAIN service in the header
        if (target.matches('.increase-addon-header-qty')) {
            const currentQuantity = cart[activeCartCategory]?.[mainServiceId]?.quantity || 0;
            await updateCartQuantity(mainServiceId, activeCartCategory, currentQuantity + 1);
            syncAddonPopupHeaderUI(service);
            return;
        }

        // Case 3: Click "-" for the MAIN service in the header
        if (target.matches('.decrease-addon-header-qty')) {
            const currentQuantity = cart[activeCartCategory]?.[mainServiceId]?.quantity || 0;
            await updateCartQuantity(mainServiceId, activeCartCategory, currentQuantity - 1);
            syncAddonPopupHeaderUI(service);
            return;
        }

        // Handle Skip or Done buttons
        if (target.matches('#skip-addons-btn, #done-with-addons-btn')) {
            closeAddonSelectionPopup();
            return;
        }
        
        // ... (The rest of the add-on logic remains the same)
        const handleAddonUpdateInPopup = async (addonName, addonPrice, change) => {
            // ... (this function's content is correct)
            let mainCartItem = cart[activeCartCategory]?.[service._id];
            if (!mainCartItem) return;

            if (!mainCartItem.addOns) mainCartItem.addOns = [];
            const addonIndex = mainCartItem.addOns.findIndex(a => a.name === addonName);
            let updatedAddOns = [...mainCartItem.addOns];

            if (addonIndex > -1) {
                updatedAddOns[addonIndex].quantity += change;
                if (updatedAddOns[addonIndex].quantity <= 0) {
                    updatedAddOns.splice(addonIndex, 1);
                }
            } else if (change > 0) {
                updatedAddOns.push({ name: addonName, price: parseFloat(addonPrice), quantity: 1 });
            }

            try {
                const response = await authenticatedFetch(`${API_BASE_URL}/api/customer/cart/addons`, {
                    method: 'POST',
                    body: JSON.stringify({
                        serviceId: service._id,
                        category: activeCartCategory,
                        addOns: updatedAddOns
                    })
                });

                if (!response.ok) throw new Error('Failed to sync add-ons with server.');

                mainCartItem.addOns = updatedAddOns;

                saveCart();
                renderCart(activeCartCategory);
                renderAddonPopupContent(service);

            } catch (error) {
                console.error("Error updating add-ons on server:", error);
                alert("Could not update add-ons. Please check your connection.");
                renderAddonPopupContent(service);
            }
        };

        const addBtn = target.closest('.addon-add-btn');
        const increaseBtn = target.closest('.increase-addon-qty-btn');
        const decreaseBtn = target.closest('.decrease-addon-qty-btn');

        if (addBtn) {
            handleAddonUpdateInPopup(addBtn.dataset.name, addBtn.dataset.price, 1);
        } else if (increaseBtn) {
            handleAddonUpdateInPopup(increaseBtn.dataset.name, increaseBtn.dataset.price, 1);
        } else if (decreaseBtn) {
            handleAddonUpdateInPopup(decreaseBtn.dataset.name, decreaseBtn.dataset.price, 1);
        }
    });
}
    // --- [UPDATED] INITIALIZE ALL HORIZONTAL SLIDERS ---
    function initializeAllSliders() {
        const sliders = document.querySelectorAll('.slider-container');

        sliders.forEach(slider => {
            const track = slider.querySelector('.slider-track');
            const leftBtn = slider.querySelector('.slider-btn-left');
            const rightBtn = slider.querySelector('.slider-btn-right');

            if (track && leftBtn && rightBtn) {

                // --- NEW: Run the check whenever the track is scrolled ---
                track.addEventListener('scroll', () => {
                    updateSliderButtons(track, leftBtn, rightBtn);
                });

                rightBtn.addEventListener('click', () => {
                    track.scrollBy({ left: 320, behavior: 'smooth' });
                });

                leftBtn.addEventListener('click', () => {
                    track.scrollBy({ left: -320, behavior: 'smooth' });
                });

                // --- NEW: Run the check once on initial load ---
                // A small delay ensures the content has rendered and widths are correct.
                setTimeout(() => {
                    updateSliderButtons(track, leftBtn, rightBtn);
                }, 100);
            }
        });
    }

    // --- NEW: Checks scroll position to show/hide slider buttons ---
    function updateSliderButtons(track, leftBtn, rightBtn) {
        if (!track || !leftBtn || !rightBtn) return;

        const scrollLeft = track.scrollLeft;
        const scrollWidth = track.scrollWidth;
        const clientWidth = track.clientWidth;

        // Hide LEFT button if scrolled all the way to the start
        if (scrollLeft < 10) { // Use a small buffer
            leftBtn.classList.add('hidden-btn');
        } else {
            leftBtn.classList.remove('hidden-btn');
        }

        // Hide RIGHT button if scrolled all the way to the end
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
            rightBtn.classList.add('hidden-btn');
        } else {
            rightBtn.classList.remove('hidden-btn');
        }
    }

    // Call the new function to set everything up
    initializeAllSliders();

    // --- Initial Load of Locations ---
    loadLocationsFromLocalStorage();

    window.addEventListener('hashchange', handleNavigation);

    // 2. Run the handler once on initial page load to handle deep links
    // (e.g., if the user refreshes on a page with #/checkout in the URL)
    handleNavigation();

// script.js

    // --- NEW: HELP CENTER ACCORDION CLICK HANDLERS ---
    const accountPage = document.getElementById('account-page');
    if (accountPage) {
        accountPage.addEventListener('click', (event) => {
            const question = event.target.closest('.faq-question');
            if (question) {
                const item = question.parentElement;
                item.classList.toggle('active');
            }
        });
    }

    const gettingStartedPage = document.getElementById('getting-started-page');
    if (gettingStartedPage) {
        gettingStartedPage.addEventListener('click', (event) => {
            const question = event.target.closest('.faq-question');
            if (question) {
                const item = question.parentElement;
                item.classList.toggle('active');
            }
        });
    }

    const paymentPage = document.getElementById('payment-page');
    if (paymentPage) {
        paymentPage.addEventListener('click', (event) => {
            const question = event.target.closest('.faq-question');
            if (question) {
                const item = question.parentElement;
                item.classList.toggle('active');
            }
        });
    }


        window.addEventListener('hashchange', updateMobileNavActiveState);
    updateMobileNavActiveState();

// script.js -> inside the DOMContentLoaded listener

    // ... after other listeners ...

    // --- [NEW] REWARDS MODAL EVENT LISTENERS ---
    const rewardsModal = document.getElementById('rewards-modal');
    if (rewardsModal) {
        rewardsModal.addEventListener('click', (event) => {
            const action = event.target.closest('[data-action]')?.dataset.action;
            if (!action) return;

            const referralLink = 'https://www.onclickseva.com/referral?code=SONU123';
            const referralMessage = `Hey! I'm using OnClickSeva for home services and I love it. Sign up using my link to get ₹100 off your first service! ${referralLink}`;

            switch (action) {
                case 'close-rewards-modal':
                    history.back();
                    break;
                case 'refer-whatsapp':
                    window.open(`whatsapp://send?text=${encodeURIComponent(referralMessage)}`);
                    break;
                case 'refer-messenger':
                    // Note: Messenger deep links are more complex and often restricted.
                    // A simple share is more reliable.
                    alert("Messenger sharing is not yet available.");
                    break;
                case 'copy-referral-link':
                    navigator.clipboard.writeText(referralLink).then(() => {
                        showToast('Link copied to clipboard!');
                    }).catch(err => {
                        console.error('Failed to copy text: ', err);
                        alert('Could not copy link.');
                    });
                    break;
                case 'open-terms':
                    window.location.hash = '#/terms-conditions';
                    break;
                case 'open-faq':
                    window.location.hash = '#/faq';
                    break;
            }
        });
    }

    // Helper function to show a temporary toast message
    function showToast(message) {
        const toast = document.getElementById('toast-notification');
        if (!toast) return;
        toast.textContent = message;
        toast.style.opacity = '1';
        toast.style.bottom = '90px';
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.bottom = '80px';
        }, 2000);
    }

    // script.js -> inside the DOMContentLoaded listener

    // ... after other listeners ...

    // --- [NEW] ACCOUNT MODAL EVENT LISTENERS ---
    const accountModal = document.getElementById('account-modal');
    if (accountModal) {
        accountModal.addEventListener('click', (event) => {
            const action = event.target.closest('[data-action]')?.dataset.action;
            if (!action) return;

            switch (action) {
                case 'close-account-modal':
                    history.back();
                    break;
                case 'go-to-bookings':
                    window.location.hash = '#/my-bookings';
                    break;
                case 'go-to-help':
                    window.location.hash = '#/help';
                    break;
                case 'manage-addresses':
                    window.location.hash = '#/location';
                    break;
                case 'go-to-about':
                    window.location.hash = '#/about-us';
                    break;
                case 'go-to-rewards':
                    window.location.hash = '#/rewards';
                    break;
                case 'logout':
                    // Perform the logout action
                    localStorage.clear();
                    window.location.replace(window.location.origin + window.location.pathname);
                    break;
            }
        });
    }
    // script.js -> inside the DOMContentLoaded listener

    // ... after the initial if/else for token check ...

    // --- [NEW] SAVE SCROLL POSITION FOR MAIN PAGE ---
    window.addEventListener('scroll', () => {
        const hash = window.location.hash || '#home';
        // Only save the scroll position if we are on the main page.
        if (hash === '#home') {
            mainPageScrollPosition = window.scrollY;
        }
    });
// script.js -> inside the main DOMContentLoaded listener

// ... after your other listeners ...

// --- [NEW] FULL-SCREEN SEARCH MODAL EVENT LISTENERS ---
const mainSearchInput = document.getElementById('search-input');
if (mainSearchInput) {
    // This opens the modal when the main header's search bar is clicked
    mainSearchInput.addEventListener('focus', (e) => {
        e.preventDefault();
        // Only trigger on mobile/tablet
        if (window.innerWidth <= 768) {
            mainSearchInput.blur(); // Prevent keyboard from opening on the main page
            window.location.hash = '#/search';
        }
    });
}

const searchModal = document.getElementById('search-modal');
if (searchModal) {
    searchModal.addEventListener('click', (event) => {
        // Close button
        if (event.target.id === 'close-search-modal') {
            history.back();
        }

        // Accordion expand/collapse
        const categoryHeader = event.target.closest('.search-category-header');
        if (categoryHeader) {
            categoryHeader.parentElement.classList.toggle('active');
        }

      const subcategoryLink = event.target.closest('.search-subcategory-link');
        if (subcategoryLink) {
            const serviceId = subcategoryLink.dataset.serviceId;
            // This navigates to the booking modal for the first service in that sub-category
            window.location.hash = `#/booking?serviceId=${serviceId}`;
        }
        const resultItem = event.target.closest('.search-result-service-item');
    if (resultItem) {
        const serviceId = resultItem.dataset.serviceId;
        // Navigate to the booking page for the clicked service
        window.location.hash = `#/booking?serviceId=${serviceId}`;
    }

    });

    // script.js -> inside the 'if (searchModal)' block

    // Live search filtering
    const modalSearchInput = document.getElementById('modal-search-input');
    const clearModalSearch = document.getElementById('clear-modal-search');

    // script.js

// ▼▼▼ REPLACE WITH THIS NEW, UPGRADED SEARCH LOGIC ▼▼▼
modalSearchInput.addEventListener('input', () => {
    const query = modalSearchInput.value.toLowerCase().trim();
    clearModalSearch.classList.toggle('hidden', query.length === 0);

    const categoriesContainer = document.getElementById('search-categories-container');
    const resultsContainer = document.getElementById('search-results-container');

    // If the search query is too short, show the default category browser
    if (query.length < 2) {
        categoriesContainer.classList.remove('hidden');
        resultsContainer.classList.add('hidden');
        resultsContainer.innerHTML = ''; // Clear old results
        return;
    }

    // If there is a query, hide the category browser and show the results list
    categoriesContainer.classList.add('hidden');
    resultsContainer.classList.remove('hidden');

    // Filter the global `allServices` array to find matches
    const matchingServices = allServices.filter(service => 
        service.name.toLowerCase().includes(query)
    );

    // Now, render the results
    if (matchingServices.length > 0) {
        resultsContainer.innerHTML = matchingServices.map(service => {
            // Capitalize the first letter of the category for display
            const parentCategory = service.category.charAt(0).toUpperCase() + service.category.slice(1);
            
            return `
                <div class="search-result-service-item" data-service-id="${service._id}">
                    <img src="${service.image_src}" alt="${service.name}">
                    <div class="service-text-details">
                        <span class="service-name">${service.name}</span>
                        <span class="service-parent-category">in ${parentCategory}</span>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        resultsContainer.innerHTML = '<p class="no-results-message">No services found for your search.</p>';
    }
});
// ▲▲▲ END OF REPLACEMENT ▲▲▲
    // ▲▲▲ END OF REPLACEMENT ▲▲▲
    clearModalSearch.addEventListener('click', () => {
        modalSearchInput.value = '';
        // Manually trigger the input event to reset the filter
        modalSearchInput.dispatchEvent(new Event('input'));
    });
}
    // ... the rest of the DOMContentLoaded listener continues here ...

}); // <-- This is the final closing bracket of DOMContentLoad

// --- Element Selections ---
const loginTab = document.getElementById('login-tab');
const signupTab = document.getElementById('signup-tab');
const loginPanel = document.getElementById('login-panel');
const signupPanel = document.getElementById('signup-panel');
const formMessage = document.getElementById('form-message');

// --- Tab Switching Logic ---
loginTab.addEventListener('click', () => switchTab('login'));
signupTab.addEventListener('click', () => switchTab('signup'));

function switchTab(tabName) {
    clearMessage();
    if (tabName === 'login') {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginPanel.classList.add('active');
        signupPanel.classList.remove('active');
    } else {
        loginTab.classList.remove('active');
        signupTab.classList.add('active');
        loginPanel.classList.remove('active');
        signupPanel.classList.add('active');
    }
}

// --- LOGIN FORM LOGIC ---
const loginForm = document.getElementById('login-form');
const phoneNumberInput = document.getElementById('phone-number');
const otpGroup = document.getElementById('otp-group');
const otpCodeInput = document.getElementById('otp-code');
const sendOtpButton = document.getElementById('send-otp-button');
const verifyOtpButton = document.getElementById('verify-otp-button');
const resendLink = document.getElementById('resend-link');
const countdownTimer = document.getElementById('countdown-timer');

let generatedOTP = '';
let countdownInterval;

sendOtpButton.addEventListener('click', handleSendOTP);
loginForm.addEventListener('submit', handleVerifyOTP);
resendLink.addEventListener('click', function (event) {
    event.preventDefault();
    if (!resendLink.classList.contains('disabled')) { handleSendOTP(); }
});

// script.js - REPLACE these two functions in the LOGIN FORM LOGIC section

async function handleSendOTP() { // Make it async
    clearMessage();
    const phone = phoneNumberInput.value;
    if (!isValidPhone(phone)) {
        showMessage('Please enter a valid 10-digit phone number.', 'error');
        return;
    }

    sendOtpButton.disabled = true;
    sendOtpButton.textContent = 'Sending...';

    try {
        // 1. Call your backend to send the OTP
        const response = await fetch(`${API_BASE_URL}/api/customer/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ whatsappNumber: phone }) // Only send phone number for login
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to send OTP.');
        }

        // 2. If successful, update the UI
        console.log("Login OTP sent from backend. Check server terminal.");
        showMessage('A 6-digit OTP has been sent.', 'success');
        otpGroup.hidden = false;
        sendOtpButton.hidden = true;
        verifyOtpButton.hidden = false;
        phoneNumberInput.disabled = true;
        startCountdown();

    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        sendOtpButton.disabled = false;
        sendOtpButton.textContent = 'Send OTP';
    }
}

async function handleVerifyOTP(event) { // Make it async
    event.preventDefault();
    clearMessage();
    const phone = phoneNumberInput.value;
    const otp = otpCodeInput.value;

    if (!otp || otp.length !== 6) {
        showMessage('Please enter a valid 6-digit OTP.', 'error');
        return;
    }

    verifyOtpButton.disabled = true;
    verifyOtpButton.textContent = 'Verifying...';

    try {
        // 1. Call your backend to verify the OTP
        const response = await fetch(`${API_BASE_URL}/api/customer/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ whatsappNumber: phone, otp: otp })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'OTP verification failed.');
        }

        // 2. SUCCESS! Save the token from the backend response
        localStorage.setItem('onclickseva_customer_token', data.token);

        showMessage('Login Successful! Welcome back.', 'success');

        // 3. CRITICAL: Fetch the user's saved data from the server
        await fetchAndSyncUserProfile();

        // 4. Switch to the main app view
        setTimeout(() => {
            showMainApp();
        }, 1000);

    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        verifyOtpButton.disabled = false;
        verifyOtpButton.textContent = 'Verify OTP';
    }
}

function startCountdown() {
    let timeLeft = 30;
    resendLink.classList.add('disabled');
    countdownTimer.textContent = `(${timeLeft}s)`;
    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        timeLeft--;
        countdownTimer.textContent = `(${timeLeft}s)`;
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            countdownTimer.textContent = '';
            resendLink.classList.remove('disabled');
        }
    }, 1000);
}

// --- SIGN UP FORM LOGIC (WITH OTP VERIFICATION) ---
const signupForm = document.getElementById('signup-form'); // Add this selector
const signupNameInput = document.getElementById('signup-name');
const signupEmailInput = document.getElementById('signup-email');
const signupPhoneInput = document.getElementById('signup-phone');
const createAccountButton = document.getElementById('create-account-button');
const signupOtpGroup = document.getElementById('signup-otp-group');
const signupOtpInput = document.getElementById('signup-otp-code');
const verifySignupOtpButton = document.getElementById('verify-signup-otp-button');

// Step 1: Handle the "Create Account" button click to send OTP
createAccountButton.addEventListener('click', async () => {
    clearMessage();

    if (!isNotEmpty(signupNameInput.value) || !isValidEmail(signupEmailInput.value) || !isValidPhone(signupPhoneInput.value)) {
        showMessage('Please fill in all fields correctly.', 'error');
        return;
    }

    createAccountButton.disabled = true;
    createAccountButton.textContent = 'Sending...';

    try {
        const response = await fetch(`${API_BASE_URL}/api/customer/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: signupNameInput.value,
                email: signupEmailInput.value,
                whatsappNumber: signupPhoneInput.value
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to send OTP.');
        }

        showMessage('OTP sent successfully. Check the server console.', 'success');

        // Update the UI
        createAccountButton.hidden = true;
        signupOtpGroup.hidden = false;
        verifySignupOtpButton.hidden = false;

        signupNameInput.disabled = true;
        signupEmailInput.disabled = true;
        signupPhoneInput.disabled = true;

    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        createAccountButton.disabled = false;
        createAccountButton.textContent = 'Create Account';
    }
});

// Step 2: Handle the "Verify & Create Account" button click
verifySignupOtpButton.addEventListener('click', async () => {
    clearMessage();
    const enteredOtp = signupOtpInput.value;

    if (!enteredOtp || enteredOtp.length !== 6) {
        showMessage('Please enter a valid 6-digit OTP.', 'error');
        return;
    }

    verifySignupOtpButton.disabled = true;
    verifySignupOtpButton.textContent = 'Verifying...';

    try {
        const response = await fetch(`${API_BASE_URL}/api/customer/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                whatsappNumber: signupPhoneInput.value,
                otp: enteredOtp
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'OTP verification failed.');
        }

        // SUCCESS! Save the token and show the main app.
        localStorage.setItem('onclickseva_customer_token', data.token);

        showMessage('Verification Successful! Welcome.', 'success');
        await fetchAndSyncUserProfile();
        setTimeout(() => {
            showMainApp();
        }, 1000);

    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        verifySignupOtpButton.disabled = false;
        verifySignupOtpButton.textContent = 'Verify & Create Account';
    }
});

// --- Helper Functions ---
function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;
}

function clearMessage() {
    formMessage.textContent = '';
    formMessage.className = 'form-message';
}

// --- REAL-TIME VALIDATION ---
// Validation functions
const isNotEmpty = value => value.trim() !== '';
const isValidEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = phone => /^[0-9]{10}$/.test(phone);

function createValidator(inputElement, errorElement, validationFn, errorMessage) {
    inputElement.addEventListener('input', () => {
        if (validationFn(inputElement.value)) {
            errorElement.textContent = '';
        } else {
            errorElement.textContent = errorMessage;
        }
    });
}

createValidator(phoneNumberInput, document.getElementById('phone-error'), isValidPhone, 'Must be a 10-digit number.');
createValidator(signupNameInput, document.getElementById('signup-name-error'), isNotEmpty, 'Name cannot be empty.');
createValidator(signupEmailInput, document.getElementById('signup-email-error'), isValidEmail, 'Please enter a valid email.');
createValidator(signupPhoneInput, document.getElementById('signup-phone-error'), isValidPhone, 'Must be a 10-digit number.');


// script.js -> PASTE THIS ENTIRE CORRECTED FUNCTION

async function fetchServiceDetails(serviceId) {
    const serviceDetailsContainer = document.querySelector('#booking-details-modal .your-booking-section');
    const recommendationsContainer = document.querySelector('#booking-details-modal .recommendations-wrapper');

    if (!serviceDetailsContainer || !recommendationsContainer) {
        console.error('Booking modal content containers not found!');
        return;
    }

    // --- ✅ START OF FIX: This is the new, correct skeleton loader ---
    serviceDetailsContainer.innerHTML = `
        <div class="your-booking-card">
            <div class="booking-card-image skeleton">
                </div>
            <div class="booking-card-details">
                <div class="skeleton skeleton-title" style="width: 80%; height: 1.75rem; margin-bottom: 12px;"></div>
                <div class="skeleton skeleton-text" style="width: 40%; height: 1.5rem; margin-bottom: 15px;"></div>
                <div class="skeleton skeleton-text" style="width: 50%; height: 1rem; margin-bottom: 25px;"></div>
                <div class="skeleton skeleton-text" style="width: 95%; height: 0.95rem;"></div>
                <div class="skeleton skeleton-text" style="width: 70%; height: 0.95rem; margin-bottom: 30px;"></div>
                <div class="skeleton skeleton-btn" style="height: 50px;"></div>
            </div>
        </div>
    `;
    // --- ✅ END OF FIX ---

    recommendationsContainer.innerHTML = `
        <div class="recommendation-card">
            <div class="skeleton" style="height: 140px; border-radius: 8px;"></div>
            <div class="skeleton skeleton-text" style="width: 90%; margin-top: 10px;"></div>
            <div class="skeleton skeleton-text" style="width: 50%;"></div>
        </div>
        <div class="recommendation-card">
            <div class="skeleton" style="height: 140px; border-radius: 8px;"></div>
            <div class="skeleton skeleton-text" style="width: 80%; margin-top: 10px;"></div>
            <div class="skeleton skeleton-text" style="width: 60%;"></div>
        </div>
    `;

    try {
        const servicePromise = (async () => {
            let service = allServices.find(s => s._id === serviceId);
            if (!service) {
                const response = await fetch(`${API_BASE_URL}/api/services/single/${serviceId}`);
                if (!response.ok) throw new Error('Failed to fetch service');
                return response.json();
            }
            return service;
        })();

        const recommendationsPromise = fetch(`${API_BASE_URL}/api/services/recommendations?exclude_id=${serviceId}`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch recommendations');
                return res.json();
            });

        const [service, recommendations] = await Promise.all([servicePromise, recommendationsPromise]);

        currentServiceInBookingModal = service;
        const serviceTemplate = document.getElementById('service-template');
        const serviceClone = document.importNode(serviceTemplate.content, true);

        serviceClone.querySelector('[data-bind="name"]').textContent = service.name;
        serviceClone.querySelector('[data-bind="price"]').textContent = `₹${service.price}`;
        const oldPriceElement = serviceClone.querySelector('[data-bind="oldPrice"]');
        if (service.oldPrice) {
            oldPriceElement.textContent = `₹${service.oldPrice}`;
        } else {
            oldPriceElement.style.display = 'none';
        }
        serviceClone.querySelector('[data-bind="per-unit-price"]').textContent = service.perUnitPrice || '';
        const ratingLine = serviceClone.querySelector('.rating-line');
        const ratingSpan = serviceClone.querySelector('[data-bind="rating"]');
        const reviewsSpan = serviceClone.querySelector('[data-bind="reviews"]');
        const starIcon = ratingLine.querySelector('.fa-star');
        const displayRating = service.averageRating;
        const displayReviews = service.totalReviews;
        if (displayRating > 0) {
            ratingLine.style.display = 'flex';
            starIcon.style.display = 'inline-block';
            ratingSpan.textContent = typeof displayRating === 'number' ? displayRating.toFixed(2) : displayRating;
            reviewsSpan.textContent = `(${formatNumberForCard(displayReviews || 0)} reviews)`;
        } else {
            ratingLine.style.display = 'flex';
            starIcon.style.display = 'none';
            ratingSpan.textContent = 'No ratings yet';
            reviewsSpan.textContent = '';
        }
        serviceClone.querySelector('[data-bind="description"]').textContent = service.description || 'Service details and inclusions will be displayed here.';
        serviceClone.querySelector('.add-to-cart-btn').dataset.serviceId = service._id;
        const imageElement = serviceClone.querySelector('[data-bind="image"]');
        if (imageElement) {
            imageElement.src = service.image_src || 'https://via.placeholder.com/160';
            imageElement.alt = service.name;
        }

        serviceDetailsContainer.innerHTML = '';
        serviceDetailsContainer.appendChild(serviceClone);

        recommendationsContainer.innerHTML = '';
        if (recommendations.length > 0) {
            const recommendationTemplate = document.getElementById('recommendation-template');
            recommendations.forEach(rec => {
                const recClone = document.importNode(recommendationTemplate.content, true);

                const cardElement = recClone.querySelector('.recommendation-card');
                cardElement.dataset.serviceId = rec._id;
                cardElement.dataset.serviceCategory = rec.category;

                recClone.querySelector('[data-bind="rec-image"]').src = rec.image_src;
                recClone.querySelector('[data-bind="rec-name"]').textContent = rec.name;
                recClone.querySelector('[data-bind="rec-price"]').textContent = rec.price;
                recClone.querySelector('[data-bind="rec-duration"]').textContent = rec.duration || '';

                const ratingEl = recClone.querySelector('[data-bind="rec-rating"]');
                const reviewsEl = recClone.querySelector('[data-bind="rec-reviews"]');
                const ratingLineEl = recClone.querySelector('.rec-rating-line');

                if (rec.averageRating > 0) {
                    ratingEl.textContent = rec.averageRating.toFixed(1);
                    reviewsEl.textContent = `(${formatNumberForCard(rec.totalReviews)})`;
                } else {
                    ratingLineEl.innerHTML = '<span>No ratings yet</span>';
                }

                const buttonContainer = recClone.querySelector('.recommendation-add-button-container');
                const isInCart = cart[activeCartCategory]?.[rec._id]?.quantity > 0;
                const buttonHtml = isInCart
                    ? `<div class="quantity-picker-wrapper" data-service-id="${rec._id}"><div class="quantity-picker"><button class="decrease-quantity-btn" data-service-id="${rec._id}">-</button><span data-quantity-display="${rec._id}">${cart[activeCartCategory][rec._id].quantity}</span><button class="increase-quantity-btn" data-service-id="${rec._id}">+</button></div></div>`
                    : `<button class="add-btn" data-service-id="${rec._id}">Add</button>`;
                buttonContainer.innerHTML = buttonHtml;
                recommendationsContainer.appendChild(recClone);
            });
        } else {
            recommendationsContainer.innerHTML = '<p class="no-recommendations">No recommendations available.</p>';
        }

        const newCard = serviceDetailsContainer.querySelector('.your-booking-card');
        const cartItem = cart[activeCartCategory]?.[service._id];
        const quantity = cartItem ? cartItem.quantity : 0;
        updateQuantityPicker(newCard, service, quantity);

    } catch (error) {
        console.error('Error fetching data for booking details modal:', error);
        serviceDetailsContainer.innerHTML = '<p class="error-message">Failed to load service details.</p>';
        recommendationsContainer.innerHTML = '<p class="error-message">Failed to load recommendations.</p>';
    }
}
// REPLACE this entire function in script.js

function showBookingDetailsModal(serviceId, category) {
    const bookingDetailsModal = document.getElementById('booking-details-modal');
    if (!bookingDetailsModal) return;

    // --- START OF NEW LOGIC ---
    // Check if the modal is already open and showing the correct service.
    // This is the case when navigating "back" from the add-on, cart, or service sidebar.
    const isAlreadyOpenForThisService =
        bookingDetailsModal.style.display === 'flex' &&
        lastOpenedBookingModal.serviceId === serviceId;

    if (isAlreadyOpenForThisService) {
        console.log("Booking modal already open. Performing a light UI sync instead of full refresh.");

        // 1. Just update the button states and cart, which is fast.
        syncModalUI(serviceId);
        renderCart(category);
        updateBookingCartBadge();

        // 2. Ensure the modal isn't shifted (in case we came from a sidebar).
        bookingDetailsModal.classList.remove('modal-shifted');
        
        // 3. CRITICAL: Stop the function here to prevent the full re-render below.
        return; 
    }
    // --- END OF NEW LOGIC ---

    // --- This is the original logic for a FIRST-TIME load of the modal ---
    // It will only run if the 'if' block above is false.
    lastOpenedBookingModal = { serviceId, category };
    currentServiceInPopup = { id: null, category: null };
    activeCartCategory = category;

    bookingDetailsModal.style.display = 'flex';
    bookingDetailsModal.classList.remove('modal-shifted');
    const contentArea = document.getElementById('booking-details-content-area');
    if (contentArea) {
        contentArea.scrollTop = 0;
    }

    if (currentBookingCategory !== category) {
        populateServicesSidebar(category, serviceId);
    } else {
        updateSidebarActiveState(serviceId);
    }
    currentBookingCategory = category;

    // This is the "expensive" function we are now successfully avoiding on "back" navigation.
    fetchServiceDetails(serviceId); 
    
    renderCart(activeCartCategory);
    updateBookingCartBadge();
}
async function populateServicesSidebar(category, activeServiceId) {
    const sidebarList = document.getElementById('services-sidebar-list');
    if (!sidebarList) return;

    // 1. Show a skeleton loader immediately.
    sidebarList.innerHTML = `
        <div class="skeleton skeleton-list-item" style="height: 45px;"></div>
        <div class="skeleton skeleton-list-item" style="height: 45px;"></div>
        <div class="skeleton skeleton-list-item" style="height: 45px;"></div>
    `;

    try {
        // 2. Fetch the new grouped data from the backend.
        const response = await fetch(`${API_BASE_URL}/api/services/${category}/grouped`);
        if (!response.ok) throw new Error('Failed to fetch services for sidebar');
        const groupedServices = await response.json();

        // 3. Clear the skeleton and render the accordion structure.
        sidebarList.innerHTML = '';
        let activeServiceCategory = null;

        // Find which category the active service belongs to
        for (const categoryName in groupedServices) {
            if (groupedServices[categoryName].some(s => s._id === activeServiceId)) {
                activeServiceCategory = categoryName;
                break;
            }
        }

        // Create an accordion for each category
        for (const categoryName in groupedServices) {
            const services = groupedServices[categoryName];

            const categoryContainer = document.createElement('div');
            categoryContainer.className = 'sidebar-category';

            // If this category contains the initially active service, expand it.
            if (categoryName === activeServiceCategory) {
                categoryContainer.classList.add('active');
            }

            categoryContainer.innerHTML = `
                <button class="category-header">
                    <span>${categoryName}</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="category-services">
                    ${services.map(service => `
                        <div class="sidebar-service-item ${service._id === activeServiceId ? 'active' : ''}" data-service-id="${service._id}">
                            <img src="${service.image_src}" alt="${service.name}" class="service-item-img">
                            <span>${service.name}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            sidebarList.appendChild(categoryContainer);
        }

    } catch (error) {
        console.error('Error populating services sidebar:', error);
        sidebarList.innerHTML = '<p>Could not load services.</p>';
    }
}
// This is the NEW, CORRECTED code
function closeModals() {
    // ✨ CHANGE: The only action is to go back. 
    // The handleNavigation() function will take care of hiding the modal and overlay.
    history.back();
}

// SCRIPT.JS - CORRECTED syncModalUI FUNCTION

function syncModalUI(serviceId) {
    const modal = document.getElementById('booking-details-modal');
    if (modal && modal.style.display === 'flex') {
        const elementsToUpdate = modal.querySelectorAll(`[data-service-id="${serviceId}"]`);

        elementsToUpdate.forEach(element => {
            const cardElement = element.closest('.your-booking-card, .recommendation-card');
            if (cardElement) {
                // FIX: Use the activeCartCategory to access the new nested structure
                const cartItem = cart[activeCartCategory]?.[serviceId];
                const quantity = cartItem ? cartItem.quantity : 0;
                const service = cartItem ? cartItem.service : { _id: serviceId };

                updateQuantityPicker(cardElement, service, quantity);
            }
        });
    }
}

// ADD THIS NEW HELPER FUNCTION
function updateSidebarActiveState(activeServiceId) {
    const sidebarList = document.getElementById('services-sidebar-list');
    if (!sidebarList) return;

    // 1. Remove 'active' class from the currently selected item
    const currentActive = sidebarList.querySelector('.sidebar-service-item.active');
    if (currentActive) {
        currentActive.classList.remove('active');
    }

    // 2. Add 'active' class to the new item based on its serviceId
    const newActive = sidebarList.querySelector(`.sidebar-service-item[data-service-id="${activeServiceId}"]`);
    if (newActive) {
        newActive.classList.add('active');
    }
}
function showCheckoutPage() {
    // This function's ONLY job is to show its own element and render its content.
    document.getElementById('checkout-page').classList.remove('hidden');

    renderCheckoutSkeleton();
    setTimeout(() => {
        renderCheckoutPage();
    }, 50);
}

function hideCheckoutPage() {
    document.getElementById('main-content').classList.remove('hidden');
    document.querySelector('header').classList.remove('hidden');
    document.getElementById('checkout-page').classList.add('hidden');
}

// script.js

function renderCheckoutPage() {
    const summaryPaneContent = document.getElementById('summary-pane-content');
    const detailsContainer = document.querySelector('#checkout-details-pane .checkout-details');

    if (!summaryPaneContent || !detailsContainer) {
        console.error('Essential checkout pane containers are missing from the DOM!');
        return;
    }

    let slotSelectionHtml = '';
    let paymentSectionHtml = '';

    if (selectedSlot.date && selectedSlot.time) {
        const dateObj = new Date(selectedSlot.date);
        dateObj.setMinutes(dateObj.getMinutes() + dateObj.getTimezoneOffset());
        const formattedDate = dateObj.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });

        slotSelectionHtml = `
            <div id="slot-selection-content">
                <p class="selected-slot-display">${formattedDate} - ${selectedSlot.time}</p>
            </div>
            <button class="edit-btn" id="edit-slot-btn">Edit</button>
        `;

        paymentSectionHtml = `
            <h4>Payment Method</h4>
            <button id="proceed-to-pay-btn" class="checkout-btn">Proceed to Pay</button>
        `;
    } else {
        slotSelectionHtml = `
            <div id="slot-selection-content">
                <button class="select-slot-btn"><i class="far fa-calendar-alt"></i> Select time & date</button>
            </div>
            <button class="edit-btn hidden" id="edit-slot-btn">Edit</button>
        `;

        paymentSectionHtml = `
             <h4>Payment Method</h4>
             <div id="payment-placeholder">
                <p><i class="fas fa-info-circle"></i> Please select a time slot to proceed.</p>
            </div>
            <button id="proceed-to-pay-btn" class="checkout-btn hidden">Proceed to Pay</button>
        `;
    }

    detailsContainer.innerHTML = `
        <div class="checkout-card saving-card">
            <i class="fas fa-leaf"></i>
            <span>Calculating savings...</span>
        </div>
        <div class="checkout-card">
            <h4>Send booking details to</h4>
            <p><i class="fas fa-mobile-alt"></i> ${currentUserProfile ? currentUserProfile.whatsappNumber : 'Loading...'}</p>
        </div>
        <div class="checkout-card">
            <div class="card-header">
                <h4>Address</h4>
                <button class="edit-btn" id="edit-checkout-address-btn">Edit</button>
            </div>
            <p id="checkout-address-display">
                <i class="fas fa-map-marker-alt"></i> Loading address...
            </p>
        </div>
        <div class="checkout-card">
            <div class="card-header"><h4>Select Slot</h4></div>
            <div class="booking-type-selector">
                <button id="booking-type-scheduled" class="booking-type-btn active"><i class="far fa-calendar-alt"></i> Scheduled</button>
                <button id="booking-type-ondemand" class="booking-type-btn"><i class="fas fa-bolt"></i> On-Demand (ASAP)</button>
            </div>
            <div id="slot-selection-container-checkout">
                ${slotSelectionHtml}
            </div>
        </div>
        <div class="checkout-card">
            ${paymentSectionHtml}
        </div>
        <div class="cancellation-policy">
            <h4>Cancellation policy</h4>
            <p>Free cancellations if done more than 12 hrs before the service or if a professional isn't assigned. A fee will be charged otherwise. <span>Read full policy</span></p>
        </div>
    `;

    summaryPaneContent.innerHTML = `
        <div id="checkout-items-container"></div>
        <div class="checkout-offers-section">
            <div class="offers-header" id="offers-header">
                <div><i class="fas fa-tags"></i><span>Apply Coupon</span></div>
                <i class="fas fa-chevron-down"></i>
            </div>
            <div class="offers-body hidden" id="offers-body">
                <div class="offer-item">
                    <input type="checkbox" id="diwali-discount" class="offer-checkbox" data-discount="10">
                    <label for="diwali-discount"><strong>10% Diwali discount</strong><span>Festive savings on your order.</span></label>
                </div>
                <div class="offer-item">
                    <input type="checkbox" id="online-payment-discount" class="offer-checkbox" data-discount="5">
                    <label for="online-payment-discount"><strong>Extra 5% off on online payment</strong><span>Pay online to save more.</span></label>
                </div>
            </div>
        </div>
        <div class="checkout-total">
            <div class="total-breakup">
                <div class="breakup-row"><span>Item Total</span><span id="checkout-item-total">₹0</span></div>
                <div class="breakup-row discount-row hidden" id="discount-row"><span>Discount</span><span id="checkout-discount-amount">- ₹0</span></div>
            </div>
            <div class="grand-total-row"><h4>Amount to pay</h4><div id="checkout-total-amount">₹0</div></div>
        </div>
        <div class="ocs-promise">
            <h4>OCS Promise <i class="fas fa-shield-alt"></i></h4>
            <ul>
                <li><i class="fas fa-check-circle"></i> Verified Professionals</li>
                <li><i class="fas fa-check-circle"></i> Hassle Free Booking</li>
                <li><i class="fas fa-check-circle"></i> Transparent Pricing</li>
            </ul>
        </div>
    `;

    const itemsContainer = summaryPaneContent.querySelector('#checkout-items-container');
    itemsContainer.innerHTML = '';

    if (activeCartCategory && cart[activeCartCategory]) {
        const categoryItems = cart[activeCartCategory];


        Object.values(categoryItems).forEach(item => {
            // Calculate the total for this entire group (main service + all add-ons)
            const itemBaseTotal = item.service.price * item.quantity;
            const addOnsTotal = (item.addOns || []).reduce((sum, addOn) => sum + (addOn.price * addOn.quantity), 0);
            const itemGroupSubtotal = itemBaseTotal + addOnsTotal;

            // Generate HTML for the list of add-ons with their own quantity pickers
            const addOnsHtml = (item.addOns || []).map(addOn => `
                <div class="checkout-addon-row">
                    <span class="addon-name">+ ${addOn.name}</span>
                    <div class="addon-quantity-picker">
                        <button class="decrease-addon-qty-btn" data-service-id="${item.service._id}" data-addon-name="${addOn.name}">-</button>
                        <span>${addOn.quantity}</span>
                        <button class="increase-addon-qty-btn" data-service-id="${item.service._id}" data-addon-name="${addOn.name}">+</button>
                    </div>
                    <span class="addon-price">₹${(addOn.price * addOn.quantity).toFixed(0)}</span>
                </div>
            `).join('');

            // --- ✅ THIS IS THE FIX for the conditional subtotal on the CHECKOUT PAGE ---
            let subtotalHtml = '';
            // Only create the subtotal HTML if there are add-ons for this item
            if (item.addOns && item.addOns.length > 0) {
                subtotalHtml = `
                    <div class="checkout-item-subtotal">
                        <strong>₹${itemGroupSubtotal.toFixed(0)}</strong>
                    </div>
                `;
            }
            // --- End of fix ---

            // Assemble the final HTML for the entire item group
            const itemHtml = `
                <div class="checkout-item" data-service-id="${item.service._id}">
                    <div class="checkout-item-header">
                        <div class="checkout-item-name-price">
                            <span class="name">${item.service.name}</span>
                          
                            <strong class="base-price">₹${(item.service.price * item.quantity).toFixed(0)}</strong>
                        </div>
                        <div class="checkout-item-controls">
                            <div class="checkout-quantity-picker">
                                <button class="checkout-decrease-qty-btn" data-service-id="${item.service._id}">-</button>
                                <span>${item.quantity}</span>
                                <button class="checkout-increase-qty-btn" data-service-id="${item.service._id}">+</button>
                            </div>
                            <button class="checkout-remove-btn" data-service-id="${item.service._id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="checkout-addons-list">
                        ${addOnsHtml}
                    </div>
                    ${subtotalHtml}
                </div>
            `;
            itemsContainer.insertAdjacentHTML('beforeend', itemHtml);
        });

    }

    updateCheckoutTotal();
    updateCheckoutAddress();

    document.getElementById('edit-checkout-address-btn')?.addEventListener('click', () => window.location.hash = '#/location');
    document.querySelector('.select-slot-btn')?.addEventListener('click', () => window.location.hash = '#/select-slot');
    document.getElementById('edit-slot-btn')?.addEventListener('click', () => window.location.hash = '#/select-slot');
    document.getElementById('proceed-to-pay-btn')?.addEventListener('click', () => {
        history.replaceState(null, '', '#/payment'); // <-- THE FIX
        handleNavigation();                          // <-- Manually trigger router
    });


    document.getElementById('offers-header')?.addEventListener('click', (e) => {
        e.currentTarget.classList.toggle('active');
        document.getElementById('offers-body').classList.toggle('hidden');
    });

    const scheduledBtn = document.getElementById('booking-type-scheduled');
    const onDemandBtn = document.getElementById('booking-type-ondemand');
    const slotContainer = document.getElementById('slot-selection-container-checkout');
    const proceedToPayBtnOnCheckout = document.getElementById('proceed-to-pay-btn');

    if (scheduledBtn && onDemandBtn && slotContainer) {
        scheduledBtn.addEventListener('click', () => {
            bookingType = 'SCHEDULED';
            scheduledBtn.classList.add('active');
            onDemandBtn.classList.remove('active');
            slotContainer.classList.remove('hidden');
            if (!selectedSlot.date) {
                proceedToPayBtnOnCheckout.classList.add('hidden');
                document.getElementById('payment-placeholder').classList.remove('hidden');
            }
        });

        onDemandBtn.addEventListener('click', () => {
            bookingType = 'ON_DEMAND';
            onDemandBtn.classList.add('active');
            scheduledBtn.classList.remove('active');
            slotContainer.classList.add('hidden');
            proceedToPayBtnOnCheckout.classList.remove('hidden');
            document.getElementById('payment-placeholder').classList.add('hidden');
        });
    }
}

function updateCheckoutTotal() {
    const itemTotalEl = document.getElementById('checkout-item-total');
    const discountRowEl = document.getElementById('discount-row');
    const discountAmountEl = document.getElementById('checkout-discount-amount');
    const totalAmountEl = document.getElementById('checkout-total-amount');
    const savingCardTextEl = document.querySelector('.saving-card span');
    const proceedBtnTotal = document.getElementById('proceed-total-amount');

    const { itemTotal, discountAmount, finalAmount } = calculateCheckoutTotals();

    if (itemTotalEl) itemTotalEl.textContent = `₹${itemTotal.toFixed(0)}`;

    if (discountAmount > 0) {
        if (discountAmountEl) discountAmountEl.textContent = `- ₹${discountAmount.toFixed(0)}`;
        if (discountRowEl) discountRowEl.classList.remove('hidden');
        if (savingCardTextEl) savingCardTextEl.textContent = `Saving ₹${discountAmount.toFixed(0)} on this order`;
    } else {
        if (discountRowEl) discountRowEl.classList.add('hidden');
        if (savingCardTextEl) savingCardTextEl.textContent = 'No savings applied on this order';
    }

    if (totalAmountEl) totalAmountEl.textContent = `₹${finalAmount.toFixed(0)}`;
    if (proceedBtnTotal) proceedBtnTotal.textContent = `₹${finalAmount.toFixed(0)}`;
}


// script.js - REPLACE this function

function calculateCheckoutTotals() {
    let itemTotal = 0;
    if (activeCartCategory && cart[activeCartCategory]) {
        Object.values(cart[activeCartCategory]).forEach(item => {
            // 1. Calculate the base price for the main service
            const price = parseFloat(String(item.service.price).replace(/[^0-9.-]+/g, '')) || 0;
            const itemBaseTotal = price * item.quantity;

            // --- THIS IS THE FIX ---
            // 2. Calculate the total for all add-ons, multiplying by the main item's quantity
            const addOnsTotal = (item.addOns || []).reduce((sum, addOn) => {
                return sum + (addOn.price * item.quantity);
            }, 0);
            // --- END OF FIX ---

            // 3. Add both totals to the grand item total
            itemTotal += itemBaseTotal + addOnsTotal;
        });
    }

    // The discount logic below remains the same and is correct
    let totalDiscountPercentage = 0;
    const diwaliCheckbox = document.getElementById('diwali-discount');
    const onlineCheckbox = document.getElementById('online-payment-discount');
    if (diwaliCheckbox && diwaliCheckbox.checked) totalDiscountPercentage += parseFloat(diwaliCheckbox.dataset.discount);
    if (onlineCheckbox && onlineCheckbox.checked) totalDiscountPercentage += parseFloat(onlineCheckbox.dataset.discount);

    const discountAmount = (itemTotal * totalDiscountPercentage) / 100;
    const finalAmount = itemTotal - discountAmount;

    return { itemTotal, discountAmount, finalAmount };
}

// script.js

// Get references to your cart elements
const topCartIcon = document.getElementById('topCartIcon'); // **YOU NEED TO ADD THIS ID TO YOUR TOP CART ICON IN HTML (Image 2)**
const yourCartModal = document.getElementById('yourCartModal');
const closeCartModalBtn = document.getElementById('closeCartModalBtn');
const fullCartDisplayContainer = document.getElementById('full-cart-display-container');
const overallCheckoutBtn = document.getElementById('overallCheckoutBtn'); // If you use the footer button

// SCRIPT.JS - REPLACE THE OLD renderFullCartModalContent FUNCTION WITH THIS
// script.js
// ADD THIS NEW FUNCTION
function renderFullCartSkeleton() {
    const container = document.getElementById('full-cart-display-container');
    if (!container) return;

    container.innerHTML = `
        <div class="skeleton-cart-card">
            <div class="skeleton skeleton-title" style="width: 60%; height: 1.5rem;"></div>
            <div class="skeleton skeleton-text" style="width: 90%; margin-top: 15px;"></div>
            <div class="skeleton skeleton-text" style="width: 70%;"></div>
            <div class="skeleton-row" style="margin-top: 25px; gap: 10px;">
                <div class="skeleton skeleton-btn" style="height: 40px; margin: 0;"></div>
                <div class="skeleton skeleton-btn" style="height: 40px; margin: 0;"></div>
            </div>
        </div>
        <div class="skeleton-cart-card">
            <div class="skeleton skeleton-title" style="width: 50%; height: 1.5rem;"></div>
            <div class="skeleton skeleton-text" style="width: 80%; margin-top: 15px;"></div>
            <div class="skeleton-row" style="margin-top: 25px; gap: 10px;">
                <div class="skeleton skeleton-btn" style="height: 40px; margin: 0;"></div>
                <div class="skeleton skeleton-btn" style="height: 40px; margin: 0;"></div>
            </div>
        </div>
    `;
}

function renderFullCartModalContent() {
    if (!fullCartDisplayContainer) {
        console.error('Cart display container not found in modal.');
        return;
    }
    fullCartDisplayContainer.innerHTML = ''; // Clear previous content

    const cartCategories = [
        { key: 'electrician', name: 'Electrician' },
        { key: 'cleaning', name: 'Cleaning' },
        { key: 'painting', name: 'Painting' },
        { key: 'acservice', name: 'AC Service and Repair' },
        { key: 'laundry', name: 'Laundry' }
    ];

    let cartIsEmpty = true;

    cartCategories.forEach(category => {
        const categoryItems = cart[category.key];

        if (categoryItems && Object.keys(categoryItems).length > 0) {
            cartIsEmpty = false;

            const items = Object.values(categoryItems);

            const totalServices = items.reduce((sum, item) => sum + item.quantity, 0); // Correctly sum quantities

            // --- THIS IS THE CORRECTED PRICE CALCULATION ---
            const totalPrice = items.reduce((sum, item) => {
                // Remove non-numeric characters before parsing to prevent NaN
                const price = parseFloat(String(item.service.price).replace(/[^0-9.-]+/g, '')) || 0;
                return sum + (price * item.quantity);
            }, 0);

            const dataCategoryName = category.name.toLowerCase().replace(/ /g, '-');

            const cardHTML = `
                <div class="cart-category-card">
                    <div class="category-header">
                        <h3 class="category-title">${category.name}</h3>
                        <span class="category-summary">${totalServices} services • ₹${totalPrice.toFixed(0)}</span>
                    </div>
                    <ul class="sub-services-list">
                        ${items.map(item => `<li>• ${item.service.name} X ${item.quantity}</li>`).join('')}
                    </ul>
                    <div class="card-actions">
                        <button class="add-services-btn" data-category="${dataCategoryName}">Add Services</button>
                        <button class="checkout-btn">Checkout</button>
                    </div>
                </div>
            `;
            fullCartDisplayContainer.insertAdjacentHTML('beforeend', cardHTML);
        }
    });

    if (cartIsEmpty) {
        fullCartDisplayContainer.innerHTML = '<p class="empty-cart-message">Your cart is empty. Add some services!</p>';
        if (overallCheckoutBtn) overallCheckoutBtn.classList.add('hidden');
    } else {
        if (overallCheckoutBtn) overallCheckoutBtn.classList.remove('hidden');
    }
}

// script.js

function openYourCartModal() {
    renderFullCartSkeleton();
    yourCartModal.classList.remove('hidden');
    // The handleNavigation function already manages body scrolling.

    setTimeout(() => {
        renderFullCartModalContent();
    }, 50);
}
// script.js

function closeYourCartModal() {
    yourCartModal.classList.add('hidden');
    // The handleNavigation function now correctly manages body scrolling.
}

// This is the NEW code
if (topCartIcon) {

    topCartIcon.addEventListener('click', () => {
        // ✨ CHANGE: Navigate by setting the URL hash
        window.location.hash = '#/cart';
    });
}
else {
    console.warn("Top cart icon with ID 'topCartIcon' not found. Cannot attach click listener.");
}
if (closeCartModalBtn) {
    closeCartModalBtn.addEventListener('click', () => history.back());
}

// Located inside the DOMContentLoaded event listener

// Close modal if clicking outside the content (on the overlay)
if (yourCartModal) {
    yourCartModal.addEventListener('click', function (event) {
        // Only trigger if clicking on the overlay itself, not the content inside
        if (event.target === yourCartModal) {
            // This tells the browser to go back, and your handleNavigation() 
            // function will automatically close BOTH the modal and the overlay.
            history.back();
        }
    });
}

// script.js

if (fullCartDisplayContainer) {
    fullCartDisplayContainer.addEventListener('click', function (event) {

        // "Add Services" button handler
        if (event.target.matches('.add-services-btn')) {
            const category = event.target.dataset.category;

            // Find the first service we have in that category to open the modal
            const service = allServices.find(s => s.category === category);

            if (service) {
                // ✨ CORRECTED: Navigate by changing the URL hash.
                // The handleNavigation function will automatically close the cart and open the booking modal.
                window.location.hash = `#/booking?serviceId=${service._id}`;
            }
        }

        // "Checkout" button handler (for individual category checkout)
        if (event.target.matches('.checkout-btn')) {
            const categoryCard = event.target.closest('.cart-category-card');
            if (categoryCard) {
                const addServicesButton = categoryCard.querySelector('.add-services-btn');
                if (addServicesButton) {
                    // Set the active category so the checkout page knows what to display
                    activeCartCategory = addServicesButton.dataset.category;

                    history.replaceState(null, '', '#/checkout'); // <-- REPLACE
                    handleNavigation();
                }
            }
        }
    });
}

// Optional: Overall "Proceed to Checkout" button in the footer
if (overallCheckoutBtn) {
    overallCheckoutBtn.addEventListener('click', function () {
        if (typeof openCartSidebar === 'function') {
            closeYourCartModal();
            openCartSidebar();
        } else {
            console.error('openCartSidebar function is not defined for overall checkout!');
        }
    });
}

// script.js

function updateCartCountDisplay() {
    const cartCountElement = document.getElementById('cart-count-badge');
    if (cartCountElement) {
        let totalItemsInCart = 0;

        // Loop through each category in the cart object
        Object.values(cart).forEach(categoryContent => {
            // Add the number of unique services in this category to the total
            if (categoryContent) {
                totalItemsInCart += Object.keys(categoryContent).length;
            }
        });

        cartCountElement.textContent = totalItemsInCart;
        cartCountElement.style.display = totalItemsInCart > 0 ? 'flex' : 'none';
    }
}

// script.js

function updateCheckoutAddress() {
    const addressDisplay = document.getElementById('checkout-address-display');
    if (!addressDisplay) return;

    // Use the most recent saved or recent location
    const latestLocation = savedLocations[0] || recentLocations[0];

    if (latestLocation && latestLocation.address) {
        // Assuming 'title' exists, otherwise default to 'Home'
        const title = latestLocation.title || 'Home';
        addressDisplay.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${title} - ${latestLocation.address}`;
    } else {
        // Fallback text if no location is set
        addressDisplay.innerHTML = `<i class="fas fa-map-marker-alt"></i> Please select an address`;
    }
}

// script.js - ADD THIS NEW CODE BLOCK

// --- SLOT SELECTION MODAL LOGIC ---

// Get references to all the new elements
const slotSelectionModal = document.getElementById('slot-selection-modal');
const closeSlotModalBtn = document.getElementById('close-slot-modal');
const confirmSlotBtn = document.getElementById('confirm-slot-btn');
const dateSelectionContainer = document.getElementById('date-selection-container');
const timeSelectionContainer = document.getElementById('time-selection-container');
const slotSelectionContent = document.getElementById('slot-selection-content');
const editSlotBtn = document.getElementById('edit-slot-btn');

// State to hold the selection
let selectedSlot = {
    date: null,
    time: null
};

// script.js -> REPLACE the existing openSlotModal function



function closeSlotModal() {
    if (slotSelectionModal) {
        slotSelectionModal.classList.add('hidden');
        slotSelectionModal.style.display = 'none';
        toggleBodyScroll('enable');
    }
}

// --- Function to populate modal content ---
function openSlotModal() {
    const slotSelectionModal = document.getElementById('slot-selection-modal');
    if (slotSelectionModal) {
        populateSlotModal();
        slotSelectionModal.classList.remove('hidden');
        slotSelectionModal.style.display = 'flex'; // <<< ADD THIS LINE
    }
}
function populateSlotModal() {
    // 1. Clear previous content
    dateSelectionContainer.innerHTML = '';
    timeSelectionContainer.innerHTML = '';
    confirmSlotBtn.disabled = true;
    selectedSlot = { date: null, time: null };

    // 2. Generate date tabs for the next 7 days
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);

        const dateTab = document.createElement('div');
        dateTab.className = 'date-tab';
        // Store date in a machine-readable format (e.g., 2025-09-28)
        dateTab.dataset.date = date.toISOString().split('T')[0];

        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNumber = date.getDate();

        dateTab.innerHTML = `
            <span class="day-name">${i === 0 ? 'Today' : dayName}</span>
            <span class="day-number">${dayNumber}</span>
        `;
        dateSelectionContainer.appendChild(dateTab);
    }

    // 3. Generate time slots
    const availableTimes = [
        '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
        '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM',
        '03:00 PM', '03:30 PM', '05:30 PM', '06:00 PM', '06:30 PM'
    ];

    availableTimes.forEach(time => {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        timeSlot.dataset.time = time;
        timeSlot.textContent = time;
        timeSelectionContainer.appendChild(timeSlot);
    });
}




document.addEventListener('click', function (event) {

    if (event.target.matches('.select-slot-btn') || event.target.matches('#edit-slot-btn')) {

        window.location.hash = '#/select-slot';
    }

});

if (closeSlotModalBtn) {
    closeSlotModalBtn.addEventListener('click', () => history.back());
}

// Handle date selection using event delegation
if (dateSelectionContainer) {
    dateSelectionContainer.addEventListener('click', function (event) {
        const selectedTab = event.target.closest('.date-tab');
        if (!selectedTab) return;

        // Update active state for dates
        dateSelectionContainer.querySelectorAll('.date-tab').forEach(tab => tab.classList.remove('active'));
        selectedTab.classList.add('active');
        selectedSlot.date = selectedTab.dataset.date;

        // Reset time selection when date changes
        timeSelectionContainer.querySelectorAll('.time-slot').forEach(slot => slot.classList.remove('active'));
        selectedSlot.time = null;
        confirmSlotBtn.disabled = true;
    });
}

// Handle time selection using event delegation
if (timeSelectionContainer) {
    timeSelectionContainer.addEventListener('click', function (event) {
        const selectedTimeSlot = event.target.closest('.time-slot');
        if (!selectedTimeSlot) return;

        // Check if a date has been selected first
        if (!selectedSlot.date) {
            alert('Please select a date first!');
            return;
        }

        // Update active state for times
        timeSelectionContainer.querySelectorAll('.time-slot').forEach(slot => slot.classList.remove('active'));
        selectedTimeSlot.classList.add('active');
        selectedSlot.time = selectedTimeSlot.dataset.time;

        // Enable the confirm button
        confirmSlotBtn.disabled = false;
    });
}

// AFTER
if (confirmSlotBtn) {
    confirmSlotBtn.addEventListener('click', function () {
        if (selectedSlot.date && selectedSlot.time) {
            // Explicitly go back to checkout details, replacing the current slot page URL
            history.replaceState(null, '', '#/checkout/details');
            handleNavigation();
        }
    });
}
function openMyBookingsModal() {
    const modal = document.getElementById('my-bookings-modal');
    if (modal) {
        renderMyBookingsList();
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
}

function closeMyBookingsModal() {
    const modal = document.getElementById('my-bookings-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        toggleBodyScroll('enable');
    }
}
// CUSTOMER APP script.js - REPLACE this function

// script.js -> REPLACE this function
async function renderMyBookingsList() {
    const container = document.getElementById('my-bookings-list-container');

    // 1. Show Skeleton Screen Immediately
    container.innerHTML = `
        <div class="skeleton skeleton-list-item"></div>
        <div class="skeleton skeleton-list-item"></div>
        <div class="skeleton skeleton-list-item"></div>
    `;

    try {
        // 2. Fetch real data in the background
        const response = await authenticatedFetch(`${API_BASE_URL}/api/customer/bookings`);
        if (!response.ok) throw new Error("Could not fetch bookings.");

        const bookings = await response.json();

        // 3. Render real data (or empty message)
        if (bookings.length === 0) {
            container.innerHTML = '<p class="empty-cart-message">You have no past bookings.</p>';
            return;
        }

        container.innerHTML = ''; // Clear skeleton
        bookings.forEach(booking => {
            const mainServiceTitle = booking.items && booking.items.length > 0 ? booking.items[0].name : booking.serviceCategory;
            const additionalItemsCount = booking.items ? booking.items.length - 1 : 0;
            const fullTitle = additionalItemsCount > 0 ? `${mainServiceTitle} + ${additionalItemsCount} more` : mainServiceTitle;
            const dateObj = new Date(booking.createdAt);
            const formattedDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

            let ratingActionHtml = '';
            if (booking.status === 'COMPLETED') {
                if (booking.professionalRating) {
                    ratingActionHtml = `<div class="your-rating-display">Your Rating: ${' <i class="fas fa-star"></i>'.repeat(booking.professionalRating)}</div>`;
                } else {
                    ratingActionHtml = `<button class="rate-now-btn" data-job-id="${booking._id}">Rate Now</button>`;
                }
            }

            let statusHtml;
            if (booking.status === 'ASSIGNED' && booking.assignedProfessionalInfo) {
                statusHtml = `<p class="booking-status assigned"><i class="fas fa-user-check"></i> Partner Assigned: ${booking.assignedProfessionalInfo.name}</p>`;
            } else {
                const statusText = booking.status.replace(/_/g, ' ');
                statusHtml = `<p class="booking-status searching"><i class="fas fa-spinner fa-spin"></i> ${statusText}</p>`;
            }

            const bookingItemHTML = `
                <div class="booking-summary-item" data-job-id="${booking._id}">
                    <div class="booking-info">
                        <h4 class="service-summary">${fullTitle}</h4>
                        <p class="booking-date">
                            Booked on: ${formattedDate}
                            ${booking.totalAmount !== undefined ? `&nbsp; | &nbsp; <strong>Total: ₹${booking.totalAmount.toFixed(0)}</strong>` : ''}
                        </p>
                        ${statusHtml}
                    </div>
                    <div class="booking-actions">
                        <div class="rating-action-container">
                            ${ratingActionHtml}
                        </div>
                        <a href="#" class="view-details-link">View Details</a>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', bookingItemHTML);
        });

    } catch (error) {
        console.error(error);
        container.innerHTML = '<p style="color:red;">Could not load your bookings.</p>';
    }
}


// script.js

async function renderBookingDetails(jobId) {
    const container = document.getElementById('booking-details-popup-content');
    // Skeleton/loading state can be added here if desired

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/api/customer/bookings/${jobId}`);
        if (!response.ok) throw new Error('Could not load booking details.');
        const booking = await response.json();

        const dateObj = new Date(booking.requestedTime || booking.createdAt);
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        let partnerDetailsHtml = '';
        if (booking.status === 'ASSIGNED' && booking.assignedProfessionalInfo) {
            partnerDetailsHtml = `
            <div class="partner-details-section">
                <h4><i class="fas fa-user-check"></i> Assigned Partner</h4>
                <div class="info-row">
                    <i class="fas fa-user"></i>
                    <div><strong>${booking.assignedProfessionalInfo.name}</strong><p>Your verified OnClickSeva Professional</p></div>
                </div>
                <div class="info-row">
                    <i class="fas fa-phone-alt"></i>
                    <div><strong>Contact Partner</strong><p><a href="tel:${booking.assignedProfessionalInfo.mobile || ''}" class="call-partner-btn">Call Now</a></p></div>
                </div>
            </div>`;
        }

        // --- ✅ START OF THE FIX ---
        // This block now generates a separate card for each main service and its add-ons.
        const itemsHtml = booking.items.map(item => {
            // Calculate the subtotal for this specific group
            let itemSubtotal = (item.price * item.quantity);
            const addOnsTotal = (item.addOns || []).reduce((sum, addOn) => sum + (addOn.price * addOn.quantity), 0);
            itemSubtotal += addOnsTotal;

            // Generate HTML for the main service
            const mainServiceHtml = `
                <div class="service-breakdown-item is-main-service">
                    <span>${item.name} (x${item.quantity})</span>
                    <strong>₹${(item.price * item.quantity).toFixed(0)}</strong>
                </div>
            `;
            // Generate HTML for the add-ons
            const addOnsForThisItemHtml = (item.addOns || []).map(addOn => `
                <div class="service-breakdown-item is-addon">
                    <span>+ ${addOn.name} (x${addOn.quantity})</span>
                    <strong>₹${(addOn.price * addOn.quantity).toFixed(0)}</strong>
                </div>
            `).join('');

            // Assemble the complete card for this group
            return `
                <div class="service-group-card">
                    ${mainServiceHtml}
                    ${addOnsForThisItemHtml}
                    <div class="service-group-subtotal">
                        <span class="subtotal-label">Subtotal</span>
                        <strong class="subtotal-amount">₹${itemSubtotal.toFixed(0)}</strong>
                    </div>
                </div>
            `;
        }).join('');
        // --- ✅ END OF THE FIX ---

        const paymentSummaryHtml = `
            <div class="payment-summary-section">
                <h4><i class="fas fa-receipt"></i> Payment Summary</h4>
                <div class="total-breakup">
                    ${itemsHtml}
                </div>
                <div class="grand-total-row">
                    <h4>Amount to pay</h4>
                    <div class="grand-total-amount">₹${booking.totalAmount.toFixed(0)}</div>
                </div>
            </div>
        `;

        container.innerHTML = `
            <div class="details-header">
                <h3>${booking.serviceCategory} Service</h3>
                <div class="status-badge confirmed">${booking.status.replace(/_/g, ' ')}</div>
            </div>
            <div class="info-section">
                <div class="info-row">
                    <i class="fas fa-map-marker-alt"></i>
                    <div><strong>Address</strong><p>${booking.customerAddress}</p></div>
                </div>
                <div class="info-row">
                    <i class="far fa-calendar-check"></i>
                    <div><strong>Date & Time</strong><p>${formattedDate}, ${formattedTime}</p></div>
                </div>
            </div>
            ${partnerDetailsHtml}
            ${paymentSummaryHtml}
        `;

    } catch (error) {
        console.error(error);
        container.innerHTML = `<p class="error-message">Error: ${error.message}</p>`;
    }
}


function openServiceDetailsPopup(serviceId, category) {
    activeCartCategory = category;
    lastOpenedBookingModal = { serviceId: null, category: null };

    const modal = document.getElementById('service-deep-details-modal');
    const contentContainer = document.getElementById('service-deep-details-content');
    const headerAddToCartBtn = document.getElementById('header-add-to-cart-btn');
    const headerQuantityPicker = document.getElementById('header-quantity-picker');
    
    // --- START: NEW JS FOR STICKY HEADER ---
    const stickyHeader = modal.querySelector('.deep-details-header');
    const floatingBackBtn = document.getElementById('floating-back-btn');

    // Attach listener to the scrollable content area
    contentContainer.onscroll = () => {
        // Show sticky header after scrolling 250px (past the image)
        if (contentContainer.scrollTop > 660) {
            stickyHeader.classList.add('sticky-header-visible');
        } else {
            stickyHeader.classList.remove('sticky-header-visible');
        }
    };

    // Make the new floating back button work
    floatingBackBtn.onclick = () => {
        history.back();
    };
    
    // Make the back arrow in the sticky header work too
    stickyHeader.onclick = (event) => {
        // We check if the click was on the header itself (where the ::before arrow is)
        if (event.target === stickyHeader) {
            history.back();
        }
    };
    // --- END: NEW JS FOR STICKY HEADER ---

    const isInCart = cart[category]?.[serviceId]?.quantity > 0;
    headerAddToCartBtn.classList.toggle('hidden', isInCart);
    headerQuantityPicker.classList.toggle('hidden', !isInCart);

    headerAddToCartBtn.dataset.serviceId = serviceId;
    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    contentContainer.innerHTML = `
        <div class="skeleton skeleton-img" style="height: 350px;"></div>
        <div class="details-section">
            <div class="skeleton skeleton-title" style="width: 80%; height: 2.5rem;"></div>
            <div class="skeleton skeleton-text"></div>
        </div>
    `;

    // Reset scroll position to the top every time it opens
    contentContainer.scrollTop = 0; 
    stickyHeader.classList.remove('sticky-header-visible');

    (async () => {
        try {
            const baseService = allServices.find(s => s._id === serviceId);
            if (!baseService) throw new Error('Base service details not found.');
            const response = await fetch(`${API_BASE_URL}/api/services/single/${serviceId}`);
            if (!response.ok) throw new Error('Could not load detailed service information.');
            const detailedService = await response.json();
            const fullService = { ...baseService, ...detailedService };
            currentServiceInPopup = { id: serviceId, category: category, serviceData: fullService };
            renderServiceDeepDetails(fullService);
            fetchAndDisplayReviews(serviceId);
            syncDeepDetailsHeaderButton();
        } catch (error) {
            console.error(error);
            contentContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    })();
}
// This is the NEW, CORRECTED code
function closeServiceDetailsPopup() {
    // ✨ CHANGE: The only action is to go back.
    history.back();

    currentServiceInPopup = { id: null, category: null };
}
function renderServiceDeepDetails(service) {
    const titleElement = document.getElementById('deep-details-title');
    const contentContainer = document.getElementById('service-deep-details-content');
    if (!titleElement || !contentContainer) return;

    // This sets the title for the STICKY header that appears on scroll
    titleElement.textContent = service.name;

    const imageUrl = service.imageUrl || service.image_src;
    let imageContainerHtml = imageUrl ? `
        <div id="deep-details-image-container">
            <img id="deep-details-image" src="${imageUrl}" alt="${service.name} image">
        </div>
    ` : '';
    
    // --- START: THIS IS THE FIX ---
    // This block dynamically creates the button or quantity picker for the main content area.
    const mainCartItem = cart[activeCartCategory]?.[service._id];
    const quantity = mainCartItem ? mainCartItem.quantity : 0;
    let actionButtonHtml = '';

    if (quantity > 0) {
        // If the item is in the cart, show the quantity picker
        actionButtonHtml = `
            <div class="quantity-picker-wrapper" data-service-id="${service._id}">
                <div class="quantity-picker">
                    <button class="decrease-quantity-btn" data-service-id="${service._id}">-</button>
                    <span data-quantity-display="${service._id}">${quantity}</span>
                    <button class="increase-quantity-btn" data-service-id="${service._id}">+</button>
                </div>
            </div>
        `;
    } else {
        // If not in the cart, show the "Add to Cart" button
        actionButtonHtml = `<button class="add-to-cart-btn" data-service-id="${service._id}">Add to Cart</button>`;
    }
    
    // This HTML now includes the dynamic title and the action button/picker
    const serviceSummaryHtml = `
        <div class="details-section details-summary-section">
            <h2 class="dynamic-service-title">${service.name}</h2>
            <div class="summary-price-line">
                <span class="price">₹${service.price}</span>
                ${service.oldPrice ? `<del class="old-price">₹${service.oldPrice}</del>` : ''}
            </div>
            ${service.totalReviews > 0 ? `
                <div class="summary-rating-line">
                    <i class="fas fa-star"></i> ${service.averageRating.toFixed(2)} <span>(${formatNumberForCard(service.totalReviews)} reviews)</span>
                </div>
            ` : `<div class="summary-rating-line"><span>No reviews yet</span></div>`}
            ${actionButtonHtml} 
        </div>
    `;

    // --- Block 2: How It Works ---
    const howItWorksHtml = service.howItWorks && service.howItWorks.length > 0 ? `
        <div class="details-section">
            <h4>How it works</h4>
            <ul class="how-it-works-list">
                ${service.howItWorks.sort((a, b) => a.step - b.step).map(item => `
                    <li class="how-it-works-item">
                        <div class="step-number">${item.step}</div>
                        <div class="step-details">
                            <strong>${item.title}</strong>
                            <p>${item.description}</p>
                        </div>
                    </li>
                `).join('')}
            </ul>
        </div>
    ` : '';

    // --- Helper for Included/Excluded lists ---
    const createInclusionList = (items, type) => {
        if (!items || items.length === 0) return '';
        const iconClass = type === 'included' ? 'fa-check-circle' : 'fa-times-circle';
        return items.map(item => `<li class="${type}"><i class="fas ${iconClass}"></i> ${item}</li>`).join('');
    };

    // --- Block 3: What's Included ---
    const whatsIncludedHtml = service.whatsIncluded && service.whatsIncluded.length > 0 ? `
        <div class="details-section">
            <h4>What is included?</h4>
            <ul class="inclusion-list">
                ${createInclusionList(service.whatsIncluded, 'included')}
            </ul>
        </div>
    ` : '';

    // script.js - inside renderServiceDeepDetails()

    // --- Block 4: Add-ons (REPLACE THIS BLOCK) ---
    const addOnsHtml = service.addOns && service.addOns.length > 0 ? `
        <div class="details-section">
            <h4>Add-ons</h4>
            <div class="addons-list">
                ${service.addOns.map(addon => {
        const mainCartItem = cart[activeCartCategory]?.[service._id];
        const addonInCart = mainCartItem?.addOns?.find(a => a.name === addon.name);
        const quantity = addonInCart ? addonInCart.quantity : 0;

        const actionButtonHtml = quantity > 0 ? `
                        <div class="addon-quantity-picker">
                            <button class="decrease-addon-qty-btn" data-name="${addon.name}" data-price="${addon.price}">-</button>
                            <span>${quantity}</span>
                            <button class="increase-addon-qty-btn" data-name="${addon.name}" data-price="${addon.price}">+</button>
                        </div>
                    ` : `
                        <button class="addon-add-btn" data-name="${addon.name}" data-price="${addon.price}">Add</button>
                    `;

        return `
                    <div class="addon-item">
                        <div class="addon-details">
                            <div class="addon-name">${addon.name}</div>
                            <div class="addon-description">${addon.description}</div>
                        </div>
                        <div class="addon-actions">
                            <div class="addon-price">₹${addon.price}</div>
                            ${actionButtonHtml}
                        </div>
                    </div>
                `}).join('')}
            </div>
        </div>
    ` : '';

    // --- Block 5: What's Excluded ---
    const whatsExcludedHtml = service.whatsExcluded && service.whatsExcluded.length > 0 ? `
        <div class="details-section">
            <h4>What is excluded?</h4>
            <ul class="inclusion-list">
                ${createInclusionList(service.whatsExcluded, 'excluded')}
            </ul>
        </div>
    ` : '';

    // --- Block 6: What We Need ---
    const whatWeNeedHtml = service.whatWeNeed && service.whatWeNeed.length > 0 ? `
        <div class="details-section what-we-need-card">
            <h4><i class="fas fa-hand-holding-heart"></i> What we need from you</h4>
            <ul class="what-we-need-list">
                ${service.whatWeNeed.map(item => `<li>${item}</li>`).join('')}
            </ul>
        </div>
    ` : '';

    // --- Block 7: Professionals ---
    const professionalsHtml = service.professionals ? `
        <div class="details-section">
            <h4>Our professionals</h4>
            <div class="professionals-grid">
                <div class="details">
                    <ul class="inclusion-list">
                        ${service.professionals.trainedHours ? `<li class="included"><i class="fas fa-graduation-cap"></i> Trained for ${service.professionals.trainedHours}+ hours</li>` : ''}
                        ${service.professionals.averageRating ? `<li class="included"><i class="fas fa-star"></i> ${service.professionals.averageRating}+ average rating</li>` : ''}
                        ${service.professionals.homesServed ? `<li class="included"><i class="fas fa-home"></i> Served ${service.professionals.homesServed}+ homes</li>` : ''}
                        ${service.professionals.backgroundVerified ? `<li class="included"><i class="fas fa-check-circle"></i> Background verified</li>` : ''}
                    </ul>
                </div>
                <img src="https://i.imgur.com/r33b19b.jpg" alt="OnClickSeva Professional" class="pro-image">
            </div>
        </div>
    ` : '';

    // --- Block 8: FAQs (Accordion) ---
    const faqsHtml = service.faqs && service.faqs.length > 0 ? `
        <div class="details-section">
            <h4>Frequently Asked Questions</h4>
            <div class="faq-accordion">
                ${service.faqs.map(faq => `
                    <div class="faq-item">
                        <button class="faq-question">
                            <span>${faq.question}</span>
                            <i class="fas fa-chevron-down"></i>
                        </button>
                        <div class="faq-answer">
                            <p>${faq.answer}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    // --- Block 9: OCS Cover ---
    const coverHtml = `
        <div class="details-section cover-protection-section">
             <i class="fas fa-shield-alt"></i>
                <div class="details">
                    <strong>OCS Cover Protection</strong>
                    <p>Up to ₹10,000 cover if any damage happens during the job.</p>
                </div>
        </div>
    `;

    // --- FINAL ASSEMBLY: Prepend the new imageContainerHtml to the rest of the content ---
    contentContainer.innerHTML = `
        ${imageContainerHtml}
        ${serviceSummaryHtml}
        ${addOnsHtml} 
        ${howItWorksHtml}
        ${whatsIncludedHtml}
        ${whatsExcludedHtml}
        ${whatWeNeedHtml}
        ${professionalsHtml}
        ${faqsHtml}
        ${coverHtml}
    `;
}

// AFTER (The corrected code)
async function fetchAndSyncUserProfile() {
    console.log("Attempting to sync user profile...");
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/api/customer/profile`);

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                console.log("Token invalid or expired. Logging out.");
                localStorage.removeItem('onclickseva_customer_token');
                window.location.reload();
            }
            throw new Error('Could not fetch user profile.');
        }

        const profile = await response.json();
        currentUserProfile = profile;

        if (profile.name) {
            // ... (Your existing profile icon logic is correct, no changes needed here) ...
            const defaultIcon = document.getElementById('default-profile-icon');
            const avatar = document.getElementById('profile-avatar');
            const initialSpan = document.getElementById('profile-initial');
            if (defaultIcon && avatar && initialSpan) {
                const firstInitial = profile.name.charAt(0).toUpperCase();
                initialSpan.textContent = firstInitial;
                defaultIcon.classList.add('hidden');
                avatar.classList.remove('hidden');
            }
        }

        // --- 1. Sync Cart (with the fix) ---
        cart = {}; // Clear guest cart first
        if (profile.cart && profile.cart.length > 0) {
            for (const item of profile.cart) {
                const serviceRes = await fetch(`${API_BASE_URL}/api/services/single/${item.serviceId}`);
                if (serviceRes.ok) {
                    const serviceDetails = await serviceRes.json();
                    if (!cart[item.category]) {
                        cart[item.category] = {};
                    }
                    // ✅ THE FIX: We now copy the addOns array from the database into our local cart object.
                    cart[item.category][item.serviceId] = {
                        service: serviceDetails,
                        quantity: item.quantity,
                        addOns: item.addOns || [] // Use the addOns from the DB, or an empty array if null
                    };
                }
            }
        }
        saveCart();
        updateCartCountDisplay();
     
updateMobileCartCountDisplay();

        // --- 2. Sync Saved Addresses (this part was already correct) ---
        savedLocations = profile.savedAddresses || [];
        localStorage.setItem('onclickseva_saved_locations', JSON.stringify(savedLocations));

        if (savedLocations.length > 0) {
            updateLocationDisplay(savedLocations[0].address);
        } else {
            updateLocationDisplay('Select Location');
        }

    } catch (error) {
        console.error('Profile sync failed:', error);
    }
}


// FIND AND REPLACE THE ENTIRE fetchAndDisplayReviews FUNCTION WITH THIS NEW VERSION
async function fetchAndDisplayReviews(serviceId) {
    // 1. TARGET THE CORRECT CONTAINER (THE DEEP DETAILS POPUP)
    const reviewsContainer = document.getElementById('service-deep-details-content');
    if (!reviewsContainer) return; // Exit if the container isn't found

    // You can add a temporary loading message if you want
    // reviewsContainer.insertAdjacentHTML('beforeend', '<p id="review-loader">Loading reviews...</p>');

    try {
        const response = await fetch(`${API_BASE_URL}/api/reviews/${serviceId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch reviews.');
        }
        const data = await response.json();

        // if (document.getElementById('review-loader')) {
        //     document.getElementById('review-loader').remove();
        // }

        if (data.totalReviews === 0) {
            // 2. APPEND the "no reviews" message
            const noReviewsHtml = '<div class="details-section"><p>No reviews yet for this service.</p></div>';
            reviewsContainer.insertAdjacentHTML('beforeend', noReviewsHtml);
            return;
        }

        const summaryHTML = renderReviewSummary(data);
        const reviewsHTML = renderIndividualReviews(data.reviews);

        // 3. WRAP THE REVIEWS IN A CARD AND APPEND IT
        const finalReviewHtml = `
            <div class="details-section">
                ${summaryHTML}
                ${reviewsHTML}
            </div>
        `;
        reviewsContainer.insertAdjacentHTML('beforeend', finalReviewHtml);

    } catch (error) {
        console.error('Error:', error);
        const errorHtml = '<div class="details-section"><p>Could not load reviews at this time.</p></div>';
        reviewsContainer.insertAdjacentHTML('beforeend', errorHtml);
    }
}

function renderReviewSummary(data) {
    let barsHTML = '';
    for (let i = 5; i >= 1; i--) {
        const count = data.ratingCounts[i];
        const percentage = data.totalReviews > 0 ? (count / data.totalReviews) * 100 : 0;
        barsHTML += `
            <div class="rating-bar-container">
                <span class="star-label">${i} star</span>
                <div class="rating-bar-bg">
                    <div class="rating-bar-fg" style="width: ${percentage}%;"></div>
                </div>
                <span class="rating-count">${formatNumber(count)}</span>
            </div>
        `;
    }

    return `
        <div class="review-summary">
            <div class="review-summary-score">
                <div class="avg-rating">${data.averageRating}</div>
                <div class="total-reviews">${formatNumber(data.totalReviews)} reviews</div>
            </div>
            <div class="review-summary-bars">
                ${barsHTML}
            </div>
        </div>
    `;
}

function renderIndividualReviews(reviews) {
    if (reviews.length === 0) return '';

    let reviewsListHTML = reviews.map(review => `
        <div class="review-card">
            <div class="review-header">
                <span class="review-author">${review.customerId ? review.customerId.name : 'A Customer'}</span>
                <span class="review-date">${formatDate(review.createdAt)}</span>
            </div>
            <div class="review-body">
                <p>${review.comment || ''}</p>
                <div class="review-rating">Rated: ${review.rating} ★</div>
            </div>
        </div>
    `).join('');

    return `
        <div class="individual-reviews-container">
            <h3>All Reviews (${reviews.length})</h3>
            ${reviewsListHTML}
        </div>
    `;
}

// script.js -> ADD THESE NEW FUNCTIONS

function renderCheckoutSkeleton() {
    const detailsContainer = document.querySelector('#checkout-page .checkout-details');
    const summaryContainer = document.querySelector('#checkout-page .checkout-summary');

    if (!detailsContainer || !summaryContainer) return;

    // Skeleton for the left column (details)
    detailsContainer.innerHTML = `
        <div class="skeleton skeleton-card" style="height: 50px;"></div>
        <div class="skeleton-card">
            <div class="skeleton skeleton-title" style="width: 50%; height: 1.1rem;"></div>
            <div class="skeleton skeleton-text" style="width: 80%; margin-top: 10px;"></div>
        </div>
        <div class="skeleton-card">
            <div class="skeleton skeleton-title" style="width: 40%; height: 1.1rem;"></div>
            <div class="skeleton skeleton-text" style="width: 90%; margin-top: 10px;"></div>
        </div>
        <div class="skeleton-card">
            <div class="skeleton skeleton-title" style="width: 60%; height: 1.1rem;"></div>
            <div class="skeleton-row" style="margin-top: 15px;">
                <div class="skeleton skeleton-text" style="height: 40px; margin: 0; flex: 1; border-radius: 8px; margin-right: 10px;"></div>
                <div class="skeleton skeleton-text" style="height: 40px; margin: 0; flex: 1; border-radius: 8px;"></div>
            </div>
            <div class="skeleton skeleton-btn" style="height: 50px;"></div>
        </div>
    `;

    // Skeleton for the right column (summary)
    summaryContainer.innerHTML = `
        <div id="checkout-items-container">
            <div class="skeleton-row" style="padding: 15px 0; border-bottom: 1px solid #f0f0f0;">
                <div class="skeleton skeleton-text" style="width: 70%;"></div>
                <div class="skeleton skeleton-text" style="width: 20%;"></div>
            </div>
            <div class="skeleton-row" style="padding: 15px 0; border-bottom: 1px solid #f0f0f0;">
                <div class="skeleton skeleton-text" style="width: 60%;"></div>
                <div class="skeleton skeleton-text" style="width: 25%;"></div>
            </div>
        </div>
        <div class="skeleton-row" style="padding: 20px 0; border-bottom: 1px solid #f0f0f0;">
            <div class="skeleton skeleton-text" style="width: 40%;"></div>
        </div>
        <div class="ocs-promise">
            <div class="skeleton skeleton-title" style="width: 50%; margin-top: 20px;"></div>
            <div class="skeleton-row" style="margin-top: 10px;">
                <div class="skeleton skeleton-icon" style="width: 18px; height: 18px;"></div>
                <div class="skeleton skeleton-text" style="width: 85%; margin-bottom: 0;"></div>
            </div>
            <div class="skeleton-row">
                <div class="skeleton skeleton-icon" style="width: 18px; height: 18px;"></div>
                <div class="skeleton skeleton-text" style="width: 85%; margin-bottom: 0;"></div>
            </div>
        </div>
        <div class="checkout-total" style="padding-top: 20px;">
            <div class="skeleton-row">
                <div class="skeleton skeleton-text" style="width: 30%;"></div>
                <div class="skeleton skeleton-text" style="width: 25%;"></div>
            </div>
            <div class="skeleton skeleton-title" style="width: 60%; height: 2.5rem; margin-top: 10px;"></div>
        </div>
    `;
}

function renderCartSkeleton() {
    const cartItemsContainer = document.getElementById('cart-items-container');
    const summaryContainer = document.querySelector('#cartSidebar .cart-summary');
    if (!cartItemsContainer || !summaryContainer) return;

    cartItemsContainer.innerHTML = `
        <div class="cart-item" style="border-bottom: 1px solid #f0f0f0; padding-bottom: 15px;">
            <div class="skeleton skeleton-text" style="width: 40%; margin: 0;"></div>
            <div class="skeleton skeleton-text" style="width: 90px; height: 34px; border-radius: 4px; margin: 0;"></div>
            <div class="skeleton skeleton-text" style="width: 15%; margin: 0;"></div>
        </div>
        <div class="cart-item" style="padding-bottom: 15px;">
            <div class="skeleton skeleton-text" style="width: 50%; margin: 0;"></div>
            <div class="skeleton skeleton-text" style="width: 90px; height: 34px; border-radius: 4px; margin: 0;"></div>
            <div class="skeleton skeleton-text" style="width: 20%; margin: 0;"></div>
        </div>
    `;
    summaryContainer.innerHTML = `
        <div class="skeleton skeleton-btn"></div>
        <div class="skeleton skeleton-text" style="height: 50px; margin-top: 20px; border-radius: 8px;"></div>
    `;
}

// script.js - ADD THIS NEW FUNCTION

function syncDeepDetailsHeaderButton() {
    // Get references to the new elements
    const addButton = document.getElementById('header-add-to-cart-btn');
    const pickerWrapper = document.getElementById('header-quantity-picker');
    const quantityDisplay = document.getElementById('header-quantity-display');

    if (!addButton || !pickerWrapper || !quantityDisplay) return;

    // Get the current service ID from the popup's state
    const serviceId = currentServiceInPopup.id;
    const category = currentServiceInPopup.category;

    // Check the cart for this service
    const cartItem = cart[category]?.[serviceId];
    const quantity = cartItem ? cartItem.quantity : 0;

    if (quantity > 0) {
        // If the item is in the cart, show the picker and hide the button
        addButton.classList.add('hidden');
        pickerWrapper.classList.remove('hidden');
        quantityDisplay.textContent = quantity;
    } else {
        // If not in the cart, show the button and hide the picker
        addButton.classList.remove('hidden');
        pickerWrapper.classList.add('hidden');
    }
}

// script.js

function openAboutModal() {
    const modal = document.getElementById('about-us-modal');
    if (!modal) return;

    const guestHeader = document.getElementById('about-us-guest-header');
    const userHeader = document.getElementById('about-us-profile-icon-wrapper');
    const userAvatar = document.getElementById('about-us-profile-avatar');
    const userInitial = document.getElementById('about-us-profile-initial');

    const token = localStorage.getItem('onclickseva_customer_token');
    if (token && currentUserProfile) {
        // User is LOGGED IN
        guestHeader.classList.add('hidden');
        userHeader.classList.remove('hidden');
        if (userInitial) {
            userInitial.textContent = currentUserProfile.name.charAt(0).toUpperCase();
        }
    } else {
        // User is a GUEST
        guestHeader.classList.remove('hidden');
        userHeader.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    modal.scrollTop = 0;
}


function openPrivacyPolicyModal() {
    const modal = document.getElementById('privacy-policy-modal');
    if (!modal) return;

    // ▼▼▼ THIS IS THE FIX! We are now targeting the UNIQUE IDs! ▼▼▼
    const guestHeader = document.getElementById('privacy-policy-guest-header');
    const userHeader = document.getElementById('privacy-policy-profile-icon-wrapper');
    const userInitial = document.getElementById('privacy-policy-profile-initial');
    // ▲▲▲ END OF FIX ▲▲▲

    const token = localStorage.getItem('onclickseva_customer_token');

    // Check if the user is logged in (token exists and profile data is loaded)
    if (token && currentUserProfile) {
        // User is LOGGED IN: Show profile icon and hide login button
        guestHeader.classList.add('hidden');
        userHeader.classList.remove('hidden');
        if (userInitial) {
            userInitial.textContent = currentUserProfile.name.charAt(0).toUpperCase();
        }
    } else {
        // User is a GUEST: Show login button and hide profile icon
        guestHeader.classList.remove('hidden');
        userHeader.classList.add('hidden');
    }

    // This part remains the same
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    modal.scrollTop = 0;
}

function openTermsConditionsModal() {
    const modal = document.getElementById('terms-conditions-modal');
    if (!modal) return;

    const guestHeader = document.getElementById('terms-guest-header');
    const userHeader = document.getElementById('terms-profile-icon-wrapper');
    const userInitial = document.getElementById('terms-profile-initial');

    const token = localStorage.getItem('onclickseva_customer_token');

    if (token && currentUserProfile) {
        guestHeader.classList.add('hidden');
        userHeader.classList.remove('hidden');
        if (userInitial) {
            userInitial.textContent = currentUserProfile.name.charAt(0).toUpperCase();
        }
    } else {
        guestHeader.classList.remove('hidden');
        userHeader.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    modal.scrollTop = 0;
}


// script.js

function openFaqModal() {
    const modal = document.getElementById('faq-modal');
    if (!modal) return;

    const guestHeader = document.getElementById('faq-guest-header');
    const userHeader = document.getElementById('faq-profile-icon-wrapper');
    const userInitial = document.getElementById('faq-profile-initial');

    const token = localStorage.getItem('onclickseva_customer_token');

    if (token && currentUserProfile) {
        guestHeader.classList.add('hidden');
        userHeader.classList.remove('hidden');
        if (userInitial) {
            userInitial.textContent = currentUserProfile.name.charAt(0).toUpperCase();
        }
    } else {
        guestHeader.classList.remove('hidden');
        userHeader.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    modal.scrollTop = 0;
}

// script.js

function openCustomerSupportModal() {
    const modal = document.getElementById('customer-support-modal');
    if (!modal) return;

    const guestHeader = document.getElementById('support-guest-header');
    const userHeader = document.getElementById('support-profile-icon-wrapper');
    const userInitial = document.getElementById('support-profile-initial');
    const token = localStorage.getItem('onclickseva_customer_token');

    if (token && currentUserProfile) {
        guestHeader.classList.add('hidden');
        userHeader.classList.remove('hidden');
        if (userInitial) {
            userInitial.textContent = currentUserProfile.name.charAt(0).toUpperCase();
        }
    } else {
        guestHeader.classList.remove('hidden');
        userHeader.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    modal.scrollTop = 0;
}

// script.js

function openHowItWorksModal() {
    const modal = document.getElementById('how-it-works-modal');
    if (!modal) return;

    const guestHeader = document.getElementById('how-it-works-guest-header');
    const userHeader = document.getElementById('how-it-works-profile-icon-wrapper');
    const userInitial = document.getElementById('how-it-works-profile-initial');
    const token = localStorage.getItem('onclickseva_customer_token');

    if (token && currentUserProfile) {
        guestHeader.classList.add('hidden');
        userHeader.classList.remove('hidden');
        if (userInitial) {
            userInitial.textContent = currentUserProfile.name.charAt(0).toUpperCase();
        }
    } else {
        guestHeader.classList.remove('hidden');
        userHeader.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    modal.scrollTop = 0;
}

// script.js

function openCareersModal() {
    const modal = document.getElementById('careers-modal');
    if (!modal) return;
    const guestHeader = document.getElementById('careers-guest-header');
    const userHeader = document.getElementById('careers-profile-icon-wrapper');
    const userInitial = document.getElementById('careers-profile-initial');
    const token = localStorage.getItem('onclickseva_customer_token');

    if (token && currentUserProfile) {
        guestHeader.classList.add('hidden');
        userHeader.classList.remove('hidden');
        if (userInitial) {
            userInitial.textContent = currentUserProfile.name.charAt(0).toUpperCase();
        }
    } else {
        guestHeader.classList.remove('hidden');
        userHeader.classList.add('hidden');
    }
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    modal.scrollTop = 0;
}

// script.js

function openHelpCenter() {
    const helpCenter = document.getElementById('help-center-section');
    if (helpCenter) {
        document.getElementById('account-page')?.classList.add('hidden');
        document.getElementById('getting-started-page')?.classList.add('hidden');
        document.getElementById('payment-page')?.classList.add('hidden');
        helpCenter.classList.remove('hidden');
        helpCenter.scrollTop = 0;
    }
}

function showHelpSubPage(pageId) {
    document.getElementById('help-center-section')?.classList.add('hidden');
    document.getElementById('account-page')?.classList.add('hidden');
    document.getElementById('getting-started-page')?.classList.add('hidden');
    document.getElementById('payment-page')?.classList.add('hidden');

    const subPage = document.getElementById(pageId);
    if (subPage) {
        subPage.classList.remove('hidden');
        subPage.scrollTop = 0;
    }
}
