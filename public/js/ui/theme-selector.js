/**
 * Theme Selector Module
 * Provides an interactive modal interface for selecting themes
 * Features keyboard navigation and live theme preview
 * 
 * @module ThemeSelector
 */

(function() {
    'use strict';

    // DOM references
    let modalContainer = null;
    let themeCardsContainer = null;
    let activeCard = null;
    let previewTimeout = null;
    let isOpen = false;
    let config = {
        debounceTime: 100, // ms to wait before applying theme preview
        onPreview: null,   // callback for theme preview
        onSelect: null     // callback for theme selection
    };

    /**
     * Initialize the theme selector
     * @param {Object} options - Configuration options
     */
    function init(options = {}) {
        // Merge options with defaults
        if (options.debounceTime !== undefined) config.debounceTime = options.debounceTime;
        if (typeof options.onPreview === 'function') config.onPreview = options.onPreview;
        if (typeof options.onSelect === 'function') config.onSelect = options.onSelect;
        
        // Create modal if it doesn't exist yet
        if (!modalContainer) {
            createModal();
        }
        
        // Setup event listeners
        setupEventListeners();
    }

    /**
     * Create the modal structure for theme selection
     */
    function createModal() {
        // Create modal container
        modalContainer = document.createElement('div');
        modalContainer.className = 'theme-selector-modal';
        modalContainer.setAttribute('role', 'dialog');
        modalContainer.setAttribute('aria-modal', 'true');
        modalContainer.setAttribute('aria-labelledby', 'theme-selector-title');
        modalContainer.setAttribute('tabindex', '-1');
        
        const modalContent = document.createElement('div');
        modalContent.className = 'theme-selector-content';
        
        // Modal header
        const header = document.createElement('div');
        header.className = 'theme-selector-header';
        
        const title = document.createElement('h3');
        title.className = 'theme-selector-title';
        title.id = 'theme-selector-title';
        title.textContent = 'Select a Theme';
        
        const closeButton = document.createElement('button');
        closeButton.className = 'theme-selector-close';
        closeButton.setAttribute('aria-label', 'Close theme selector');
        closeButton.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>';
        closeButton.addEventListener('click', close);
        
        header.appendChild(title);
        header.appendChild(closeButton);
        
        // Modal body
        const body = document.createElement('div');
        body.className = 'theme-selector-body';
        
        themeCardsContainer = document.createElement('div');
        themeCardsContainer.className = 'theme-cards-container';
        
        body.appendChild(themeCardsContainer);
        
        // Modal footer
        const footer = document.createElement('div');
        footer.className = 'theme-selector-footer';
        
        const hint = document.createElement('div');
        hint.className = 'theme-selector-hint';
        hint.textContent = 'Use arrow keys to navigate, Enter or Space to select';
        
        footer.appendChild(hint);
        
        // Assemble modal
        modalContent.appendChild(header);
        modalContent.appendChild(body);
        modalContent.appendChild(footer);
        modalContainer.appendChild(modalContent);
        
        // Add to DOM
        document.body.appendChild(modalContainer);
        
        // Generate theme cards
        generateThemeCards();
    }

    /**
     * Generate cards for each available theme
     */
    function generateThemeCards() {
        // Only proceed if ThemeManager is available
        if (!window.MarkdownMindmap?.ThemeManager) {
            console.error('ThemeManager is required for ThemeSelector');
            return;
        }
        
        // Clear existing cards
        themeCardsContainer.innerHTML = '';
        
        // Get available themes
        const themes = window.MarkdownMindmap.ThemeManager.getAvailableThemes();
        const currentTheme = window.MarkdownMindmap.ThemeManager.getCurrentTheme().name;
        
        // Create a card for each theme
        themes.forEach((theme, index) => {
            const card = createThemeCard(theme);
            
            // Mark current theme as selected
            if (theme.id === currentTheme) {
                card.classList.add('selected');
                activeCard = card;
            }
            
            themeCardsContainer.appendChild(card);
        });
    }

    /**
     * Create a card for a theme
     * @param {Object} theme - Theme data
     * @returns {HTMLElement} The theme card element
     */
    function createThemeCard(theme) {
        const card = document.createElement('div');
        card.className = 'theme-card';
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Select ${theme.name} theme`);
        card.dataset.themeId = theme.id;
        
        // Card header with color samples
        const header = document.createElement('div');
        header.className = 'theme-card-header';
        
        const colorSamples = document.createElement('div');
        colorSamples.className = 'theme-color-samples';
        
        // Add color samples
        const mainColors = ['primary', 'secondary', 'accent'];
        mainColors.forEach(colorKey => {
            if (theme.colors[colorKey]) {
                const colorSample = document.createElement('div');
                colorSample.className = 'color-sample';
                colorSample.style.backgroundColor = theme.colors[colorKey];
                colorSamples.appendChild(colorSample);
            }
        });
        
        // Checkmark for selected theme
        const checkmark = document.createElement('div');
        checkmark.className = 'theme-card-check';
        checkmark.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7"></path></svg>';
        
        header.appendChild(colorSamples);
        header.appendChild(checkmark);
        
        // Card body with theme info
        const body = document.createElement('div');
        body.className = 'theme-card-body';
        
        const themeName = document.createElement('h4');
        themeName.className = 'theme-name';
        themeName.textContent = theme.name;
        
        const themeDesc = document.createElement('p');
        themeDesc.className = 'theme-description';
        themeDesc.textContent = theme.description || '';
        
        body.appendChild(themeName);
        body.appendChild(themeDesc);
        
        // Text preview sample
        const preview = document.createElement('div');
        preview.className = 'theme-text-preview';
        preview.textContent = 'Text Preview';
        preview.style.color = theme.colors.text;
        preview.style.backgroundColor = theme.colors.background;
        
        // Assemble card
        card.appendChild(header);
        card.appendChild(body);
        card.appendChild(preview);
        
        // Add event listeners
        card.addEventListener('click', () => selectTheme(theme.id));
        card.addEventListener('keydown', (e) => handleCardKeydown(e, card));
        card.addEventListener('mouseenter', () => previewTheme(theme.id));
        card.addEventListener('mouseleave', () => {
            // Reset to current theme when mouse leaves
            const currentTheme = window.MarkdownMindmap.ThemeManager.getCurrentTheme().id;
            previewTheme(currentTheme);
        });
        
        return card;
    }

    /**
     * Set up event listeners for the modal
     */
    function setupEventListeners() {
        // Theme picker button
        const themePickerBtn = document.getElementById('themePickerBtn');
        if (themePickerBtn) {
            themePickerBtn.addEventListener('click', open);
        }
        
        // Click outside to close
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) {
                close();
            }
        });
        
        // Keyboard navigation for modal
        modalContainer.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'Escape':
                    close();
                    break;
                case 'Tab':
                    // Keep focus inside modal
                    handleTabKey(e);
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    focusNextCard();
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    focusPreviousCard();
                    break;
                case 'Home':
                    e.preventDefault();
                    focusFirstCard();
                    break;
                case 'End':
                    e.preventDefault();
                    focusLastCard();
                    break;
            }
        });
    }

    /**
     * Open the theme selector modal
     */
    function open() {
        modalContainer.classList.add('open');
        isOpen = true;
        
        // Focus the modal
        modalContainer.focus();
        
        // If we have an active card, focus it
        if (activeCard) {
            activeCard.focus();
        }
        
        // Prevent scrolling of body
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close the theme selector modal
     */
    function close() {
        modalContainer.classList.remove('open');
        isOpen = false;
        
        // Re-enable scrolling
        document.body.style.overflow = '';
        
        // Return focus to the button that opened the modal
        const themePickerBtn = document.getElementById('themePickerBtn');
        if (themePickerBtn) {
            themePickerBtn.focus();
        }
    }

    /**
     * Preview a theme without selecting it
     * @param {string} themeId - ID of the theme to preview
     */
    function previewTheme(themeId) {
        // Clear any pending preview
        if (previewTimeout) {
            clearTimeout(previewTimeout);
        }
        
        // Debounce theme changes to prevent rapid switching
        previewTimeout = setTimeout(() => {
            if (config.onPreview) {
                config.onPreview(themeId);
            } else if (window.MarkdownMindmap?.ThemeManager) {
                // Default to using ThemeManager if available
                window.MarkdownMindmap.ThemeManager.switchTheme(themeId);
            }
        }, config.debounceTime);
    }

    /**
     * Select a theme permanently
     * @param {string} themeId - ID of the theme to select
     */
    function selectTheme(themeId) {
        // Update active card
        const cards = themeCardsContainer.querySelectorAll('.theme-card');
        cards.forEach(card => {
            if (card.dataset.themeId === themeId) {
                card.classList.add('selected');
                activeCard = card;
            } else {
                card.classList.remove('selected');
            }
        });
        
        // Call onSelect callback
        if (config.onSelect) {
            config.onSelect(themeId);
        }
        
        // Close modal
        close();
    }

    /**
     * Handle tab key to trap focus inside the modal
     * @param {KeyboardEvent} e - Keyboard event
     */
    function handleTabKey(e) {
        // Get all focusable elements in the modal
        const focusableElements = modalContainer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        // If shift+tab on first element, go to last
        if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        }
        // If tab on last element, go to first
        else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        }
    }

    /**
     * Handle keyboard navigation for theme cards
     * @param {KeyboardEvent} e - Keyboard event
     * @param {HTMLElement} card - The theme card element
     */
    function handleCardKeydown(e, card) {
        switch (e.key) {
            case ' ':
            case 'Enter':
                e.preventDefault();
                selectTheme(card.dataset.themeId);
                break;
        }
    }

    /**
     * Focus the next theme card
     */
    function focusNextCard() {
        const cards = Array.from(themeCardsContainer.querySelectorAll('.theme-card'));
        if (!cards.length) return;
        
        const currentIndex = cards.findIndex(card => card === document.activeElement);
        const nextIndex = (currentIndex + 1) % cards.length;
        
        cards[nextIndex].focus();
        previewTheme(cards[nextIndex].dataset.themeId);
    }

    /**
     * Focus the previous theme card
     */
    function focusPreviousCard() {
        const cards = Array.from(themeCardsContainer.querySelectorAll('.theme-card'));
        if (!cards.length) return;
        
        const currentIndex = cards.findIndex(card => card === document.activeElement);
        const prevIndex = (currentIndex - 1 + cards.length) % cards.length;
        
        cards[prevIndex].focus();
        previewTheme(cards[prevIndex].dataset.themeId);
    }

    /**
     * Focus the first theme card
     */
    function focusFirstCard() {
        const cards = themeCardsContainer.querySelectorAll('.theme-card');
        if (!cards.length) return;
        
        cards[0].focus();
        previewTheme(cards[0].dataset.themeId);
    }

    /**
     * Focus the last theme card
     */
    function focusLastCard() {
        const cards = themeCardsContainer.querySelectorAll('.theme-card');
        if (!cards.length) return;
        
        const lastCard = cards[cards.length - 1];
        lastCard.focus();
        previewTheme(lastCard.dataset.themeId);
    }

    /**
     * Public API
     */
    if (typeof window !== 'undefined') {
        // Initialize MarkdownMindmap namespace if needed
        window.MarkdownMindmap = window.MarkdownMindmap || {};
        
        // Expose public methods
        window.MarkdownMindmap.ThemeSelector = {
            init,
            open,
            close,
            previewTheme,
            selectTheme
        };
    }
})();
