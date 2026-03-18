(function() {
    // --- Configuration Handling ---
    // Parses data attributes from the script tag that loaded this file.
    // This allows the widget to be configured via HTML attributes.
    const scriptTag = document.querySelector('script[src*="ecwon-review-widget.js"]');
    const config = {
        layout: scriptTag?.dataset.layout || 'embedded', // 'embedded' or 'floating'
        template: scriptTag?.dataset.template || 'default', // e.g., 'default', 'modern', 'compact'
        targetContainerId: scriptTag?.dataset.targetContainerId || 'ecwon-review-widget-container', // The ID of the HTML element where the widget will be rendered.
        apiUrl: scriptTag?.dataset.apiUrl || 'https://script.google.com/macros/s/AKfycbyYND56vybQbVOhUi21zqr1p_9Kg8nYoumfokY1XWRloAKXMZ6_2_Oo2eTSL3DFnrS9lA/exec', // Your Google Apps Script URL
        apiKey: scriptTag?.dataset.apiKey // Placeholder for future API key if needed
    };

    // Log the configuration for debugging purposes
    console.log("Ecwon Review Widget Config:", config);

    // --- Define Global Constants and Variables ---
    // These constants use the values from the configuration
    const SCRIPT_URL = config.apiUrl;
    const TARGET_CONTAINER_ID = config.targetContainerId;

    let allReviewsData = [];    // Stores all fetched review data
    let swiperInstance = null;  // Holds the Swiper carousel instance
    let selectedRating = 5;     // Current rating selected in the submission form
    let reviewTextEntered = false; // Flag to check if user has started typing in the form
    let debounceTimeout;        // Used for debouncing input checks

    // --- DOM Elements (References will be stored here after initialization) ---
    // These variables will hold references to the HTML elements that the widget interacts with.
    let widgetContainer = null;      // The main container where the widget lives
    let modal = null;                // The review submission modal
    let nameInput = null, countryInput = null, msgInput = null, picInput = null, submitBtn = null; // Form fields and button
    let nameError = null, countryError = null, msgError = null; // Error message containers
    let currentImageBase64 = "";     // Stores the base64 string of an uploaded image
    let swiperContainer = null;      // The Swiper carousel main element
    let reviewSortSelect = null;     // The dropdown for sorting reviews

    // --- Expose Public API for Widget (functions callable from HTML onclick or other scripts) ---
    // This object allows functions to be called directly from the HTML elements
    // (e.g., onclick="window.EcwonReviewWidget.openModal()") or by other external scripts.
    window.EcwonReviewWidget = {};

    // --- Helper Functions for Review Display ---

    /**
     * Generates a string of gold and empty stars based on a given rating.
     * @param {number} rating The numerical rating (e.g., 3, 4.5).
     * @returns {string} HTML string representing the stars.
     */
    function createStars(rating) {
        const starFull = "★";
        const starEmpty = "☆";
        const maxRating = 5;
        const fullStars = Math.floor(rating);
        const emptyStars = maxRating - fullStars;
        return `<span class="card-stars">${starFull.repeat(fullStars)}${starEmpty.repeat(emptyStars)}</span>`;
    }

    /**
     * Creates HTML for a review message with "Read more" functionality if the text is long.
     * @param {string} text The full review text.
     * @returns {string} HTML string for the review message.
     */
    function createReadMore(text) {
        const maxLength = 100; // Characters to display before "Read more"
        if (text.length <= maxLength) {
            return `<span>${text}</span>`;
        }
        const shortText = text.slice(0, maxLength);
        const fullText = text;
        return `
            <span class="short-text">${shortText}</span>
            <span class="dots">...</span>
            <span class="full-text" style="display:none;">${fullText}</span>
            <a class="read-more" onclick="window.EcwonReviewWidget.toggleReadMore(this)">Read more</a>
        `;
    }

    /**
     * Toggles the visibility of "Read more" text.
     * Exposed globally via `window.EcwonReviewWidget`.
     * @param {HTMLElement} el The "Read more" anchor element that was clicked.
     */
    window.EcwonReviewWidget.toggleReadMore = function (el) {
        const parent = el.parentElement;
        const shortText = parent.querySelector('.short-text');
        const dots = parent.querySelector('.dots');
        const fullText = parent.querySelector('.full-text');

        if (shortText.style.display === "none") { // If full text is showing, collapse it
            shortText.style.display = "inline";
            dots.style.display = "inline";
            fullText.style.display = "none";
            el.textContent = "Read more";
        } else { // If short text is showing, expand it
            shortText.style.display =
