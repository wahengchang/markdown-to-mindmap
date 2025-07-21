/**
 * UI Components Module
 * Handles all user interface components and interactions
 * for the Markdown-to-Mindmap application
 */

window.MarkdownMindmap = window.MarkdownMindmap || {};

window.MarkdownMindmap.UIComponents = (function() {
    'use strict';

    // Private variables
    let config = null;
    let isInitialized = false;

    /**
     * Initialize UI components module
     * @param {Object} settings - Configuration settings
     */
    function init(settings = {}) {
        if (isInitialized) return;
        
        config = {
            toastDuration: 3000,
            loadingDelay: 100,
            animationDuration: 200,
            ...settings
        };

        initializeHeader();
        initializeNavigation();
        initializeSplitPane();
        initializeCanvasControls();
        initializeStatusBar();
        initializeThemeToggle();
        initializeNotifications();
        initializeModals();
        initializeExpansionControls();
        setupKeyboardShortcuts();
        setupAccessibility();

        isInitialized = true;
    }

    /**
     * Create and initialize header component
     */
    function initializeHeader() {
        const header = document.querySelector('header');
        if (!header) return;

        // Add dynamic header functionality
        addHeaderScrollBehavior();
        // Dark mode is now handled in main.js
        // initializeThemeToggle();
    }

    /**
     * Initialize navigation tabs
     */
    function initializeNavigation() {
        const navTabs = document.querySelectorAll('.nav-tab');
        
        navTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                handleNavTabClick(e.target);
            });
        });
    }

    /**
     * Handle navigation tab clicks
     * @param {HTMLElement} clickedTab - The clicked tab element
     */
    function handleNavTabClick(clickedTab) {
        // Remove active class from all tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active', 'text-blue-600', 'dark:text-blue-400', 'bg-blue-50', 'dark:bg-blue-900/20');
            tab.classList.add('text-gray-600', 'dark:text-gray-400');
        });

        // Add active class to clicked tab
        clickedTab.classList.add('active', 'text-blue-600', 'dark:text-blue-400', 'bg-blue-50', 'dark:bg-blue-900/20');
        clickedTab.classList.remove('text-gray-600', 'dark:text-gray-400');

        // Handle tab content (placeholder for future expansion)
        const tabName = clickedTab.textContent.trim();
        handleTabContent(tabName);
    }

    /**
     * Handle tab content switching
     * @param {string} tabName - Name of the active tab
     */
    function handleTabContent(tabName) {
        switch(tabName) {
            case 'Try It Out':
                // Already active - show main interface
                break;
            case 'Docs':
                showModal('docs', createDocsModal());
                break;
            case 'About':
                showModal('about', createAboutModal());
                break;
        }
    }



    /**
     * Initialize split-pane layout with resize functionality
     */
    function initializeSplitPane() {
        // Add resize functionality between editor and mindmap panes
        createResizeHandle();
    }

    /**
     * Create resize handle between panes
     */
    function createResizeHandle() {
        const leftPane = document.querySelector('.w-1\\/2:first-of-type');
        const rightPane = document.querySelector('.w-1\\/2:last-of-type');
        
        if (!leftPane || !rightPane) return;

        // Create resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'absolute top-0 right-0 w-1 h-full bg-gray-300 dark:bg-gray-600 cursor-col-resize hover:bg-blue-500 transition-colors z-10';
        resizeHandle.style.transform = 'translateX(50%)';
        
        leftPane.style.position = 'relative';
        leftPane.appendChild(resizeHandle);

        // Add resize functionality
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = leftPane.offsetWidth;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const diff = e.clientX - startX;
            const newWidth = startWidth + diff;
            const containerWidth = leftPane.parentElement.offsetWidth;
            const minWidth = containerWidth * 0.2; // 20% minimum
            const maxWidth = containerWidth * 0.8; // 80% maximum
            
            if (newWidth >= minWidth && newWidth <= maxWidth) {
                const leftPercent = (newWidth / containerWidth) * 100;
                const rightPercent = 100 - leftPercent;
                
                leftPane.style.width = `${leftPercent}%`;
                rightPane.style.width = `${rightPercent}%`;
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }

    /**
     * Initialize canvas controls
     */
    function initializeCanvasControls() {
        // Zoom controls
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const resetZoomBtn = document.getElementById('resetZoomBtn');
        const fullscreenBtn = document.getElementById('fullscreenBtn');

        if (zoomInBtn) zoomInBtn.addEventListener('click', () => handleZoom('in'));
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => handleZoom('out'));
        if (resetZoomBtn) resetZoomBtn.addEventListener('click', () => handleZoom('reset'));
        if (fullscreenBtn) fullscreenBtn.addEventListener('click', handleFullscreen);
    }

    /**
     * Initialize status bar with metrics
     */
    function initializeStatusBar() {
        // Download buttons
        const downloadHtmlBtn = document.getElementById('downloadHtmlBtn');
        const downloadSvgBtn = document.getElementById('downloadSvgBtn');

        if (downloadHtmlBtn) {
            downloadHtmlBtn.addEventListener('click', () => handleDownload('html'));
        }
        if (downloadSvgBtn) {
            downloadSvgBtn.addEventListener('click', () => handleDownload('svg'));
        }
    }

    /**
     * Initialize theme toggle functionality
     */
    function initializeThemeToggle() {
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (!darkModeToggle) return;

        // Set initial theme
        const isDark = localStorage.getItem('darkMode') === 'true';
        if (isDark) {
            document.documentElement.classList.add('dark');
        }

        darkModeToggle.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            const newDarkMode = document.documentElement.classList.contains('dark');
            localStorage.setItem('darkMode', newDarkMode);
            
            // Update theme toggle icon
            updateThemeToggleIcon(newDarkMode);
            
            // Update ThemeManager to match dark mode state
            if (window.MarkdownMindmap?.ThemeManager) {
                // If dark mode is on, switch to the dark theme; otherwise use the saved theme or default to 'professional'
                const targetTheme = newDarkMode ? 'dark' : (localStorage.getItem('savedTheme') || 'professional');
                console.log('Switching theme via ThemeManager to:', targetTheme);
                window.MarkdownMindmap.ThemeManager.switchTheme(targetTheme);
                
                // Save the current non-dark theme for later restoration
                if (!newDarkMode) {
                    localStorage.setItem('savedTheme', targetTheme);
                }
            }
            
            // DIRECT UPDATE: Explicitly force mindmap re-render
            console.log('Directly forcing mindmap re-render');
            setTimeout(() => {
                const markdownInput = document.getElementById('markdownInput');
                const container = document.getElementById('mindmapContainer');
                if (markdownInput && container && window.MarkdownMindmap?.Renderer) {
                    // Clear the container
                    container.innerHTML = '';
                    
                    // Force redraw with the current markdown content
                    window.MarkdownMindmap.Renderer.updateMindmapFromMarkdown(
                        markdownInput.value, 
                        container
                    );
                    console.log('Mindmap direct re-render completed');
                }
            }, 50); // Small delay to ensure DOM is ready
            
            // Show theme change notification
            showNotification(`Switched to ${newDarkMode ? 'dark' : 'light'} mode`, 'info');
        });

        updateThemeToggleIcon(isDark);
    }

    /**
     * Update theme toggle icon
     * @param {boolean} isDark - Whether dark mode is active
     */
    function updateThemeToggleIcon(isDark) {
        const toggle = document.getElementById('darkModeToggle');
        if (!toggle) return;

        const svg = toggle.querySelector('svg');
        if (!svg) return;

        if (isDark) {
            // Sun icon for switching to light mode
            svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>';
        } else {
            // Moon icon for switching to dark mode
            svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>';
        }
    }
    
    // Make updateThemeToggleIcon globally accessible
    window.updateThemeToggleIcon = updateThemeToggleIcon;

    /**
     * Initialize notification system
     */
    function initializeNotifications() {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'fixed top-4 right-4 z-50 space-y-2';
            document.body.appendChild(toastContainer);
        }
    }

    /**
     * Show notification toast
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, warning, info)
     * @param {number} duration - Duration in milliseconds
     */
    function showNotification(message, type = 'info', duration = null) {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = createToast(message, type);
        toastContainer.appendChild(toast);

        // Auto-remove after duration
        const removeAfter = duration || config.toastDuration;
        setTimeout(() => {
            removeToast(toast);
        }, removeAfter);
    }

    /**
     * Create toast element
     * @param {string} message - Toast message
     * @param {string} type - Toast type
     * @returns {HTMLElement} Toast element
     */
    function createToast(message, type) {
        const toast = document.createElement('div');
        const colorClasses = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            warning: 'bg-yellow-500 text-black',
            info: 'bg-blue-500 text-white'
        };

        toast.className = `px-4 py-2 rounded-lg shadow-lg ${colorClasses[type] || colorClasses.info} transform transition-all duration-300 translate-x-full opacity-0`;
        toast.textContent = message;

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        }, 10);

        // Add click to dismiss
        toast.addEventListener('click', () => removeToast(toast));

        return toast;
    }

    /**
     * Remove toast notification
     * @param {HTMLElement} toast - Toast element to remove
     */
    function removeToast(toast) {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    /**
     * Initialize modal system
     */
    function initializeModals() {
        // Create modal backdrop if it doesn't exist
        if (!document.getElementById('modalBackdrop')) {
            const backdrop = document.createElement('div');
            backdrop.id = 'modalBackdrop';
            backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 z-40 hidden';
            backdrop.addEventListener('click', closeModal);
            document.body.appendChild(backdrop);
        }
    }

    /**
     * Show modal dialog
     * @param {string} id - Modal ID
     * @param {HTMLElement} content - Modal content
     */
    function showModal(id, content) {
        const backdrop = document.getElementById('modalBackdrop');
        if (!backdrop) return;

        // Remove existing modal
        const existingModal = document.getElementById(`modal-${id}`);
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal
        const modal = document.createElement('div');
        modal.id = `modal-${id}`;
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto';
        modalContent.appendChild(content);
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Show backdrop and modal
        backdrop.classList.remove('hidden');
        
        // Add close button
        addModalCloseButton(modalContent);
    }

    /**
     * Close modal dialog
     */
    function closeModal() {
        const backdrop = document.getElementById('modalBackdrop');
        if (backdrop) {
            backdrop.classList.add('hidden');
        }
        
        // Remove all modals
        document.querySelectorAll('[id^="modal-"]').forEach(modal => {
            modal.remove();
        });
    }

    /**
     * Add close button to modal
     * @param {HTMLElement} modalContent - Modal content container
     */
    function addModalCloseButton(modalContent) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200';
        closeBtn.innerHTML = `
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        `;
        closeBtn.addEventListener('click', closeModal);
        
        modalContent.style.position = 'relative';
        modalContent.appendChild(closeBtn);
    }

    /**
     * Create documentation modal content
     * @returns {HTMLElement} Docs modal content
     */
    function createDocsModal() {
        const content = document.createElement('div');
        content.className = 'p-6';
        content.innerHTML = `
            <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Documentation</h2>
            <div class="prose dark:prose-invert max-w-none">
                <h3>Markdown Syntax Support</h3>
                <ul>
                    <li><strong>Headers:</strong> # ## ### #### ##### ######</li>
                    <li><strong>Lists:</strong> - * + for unordered, 1. 2. 3. for ordered</li>
                    <li><strong>Code blocks:</strong> \`\`\`language</li>
                    <li><strong>Checkboxes:</strong> [x] and [ ]</li>
                </ul>
                <h3>Keyboard Shortcuts</h3>
                <ul>
                    <li><strong>Ctrl/Cmd + Plus:</strong> Zoom in</li>
                    <li><strong>Ctrl/Cmd + Minus:</strong> Zoom out</li>
                    <li><strong>Ctrl/Cmd + 0:</strong> Reset zoom</li>
                    <li><strong>F11:</strong> Toggle fullscreen</li>
                </ul>
            </div>
        `;
        return content;
    }

    /**
     * Create about modal content
     * @returns {HTMLElement} About modal content
     */
    function createAboutModal() {
        const content = document.createElement('div');
        content.className = 'p-6';
        content.innerHTML = `
            <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">About Markdown to Mindmap</h2>
            <div class="prose dark:prose-invert max-w-none">
                <p>Transform your markdown documents into beautiful, interactive mind maps.</p>
                <h3>Features</h3>
                <ul>
                    <li>Real-time markdown parsing</li>
                    <li>Interactive mind map visualization</li>
                    <li>Dark/light mode support</li>
                    <li>Export to SVG and HTML</li>
                    <li>Responsive design</li>
                    <li>Accessibility compliant</li>
                </ul>
                <p class="text-sm text-gray-600 dark:text-gray-400 mt-4">
                    Version 1.0.0 - Built with D3.js and Tailwind CSS
                </p>
            </div>
        `;
        return content;
    }

    /**
     * Setup keyboard shortcuts
     */
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Zoom shortcuts
            if ((e.ctrlKey || e.metaKey) && e.key === '=') {
                e.preventDefault();
                handleZoom('in');
            } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
                e.preventDefault();
                handleZoom('out');
            } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
                e.preventDefault();
                handleZoom('reset');
            }
            
            // Fullscreen toggle
            if (e.key === 'F11') {
                e.preventDefault();
                handleFullscreen();
            }
            
            // Close modal with Escape
            if (e.key === 'Escape') {
                closeModal();
            }
        });
    }

    /**
     * Setup accessibility features
     */
    function setupAccessibility() {
        // Add proper ARIA labels and roles
        addAriaLabels();
        
        // Setup focus management
        setupFocusManagement();
        
        // Add screen reader announcements
        setupScreenReaderAnnouncements();
    }

    /**
     * Add ARIA labels to interactive elements
     */
    function addAriaLabels() {
        const buttons = document.querySelectorAll('button:not([aria-label])');
        buttons.forEach(button => {
            const text = button.textContent.trim() || button.innerHTML.includes('svg') ? 'Action button' : 'Button';
            button.setAttribute('aria-label', text);
        });
    }

    /**
     * Setup focus management for accessibility
     */
    function setupFocusManagement() {
        // Add visible focus indicators
        const style = document.createElement('style');
        style.textContent = `
            *:focus {
                outline: 2px solid #3b82f6 !important;
                outline-offset: 2px !important;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Setup screen reader announcements
     */
    function setupScreenReaderAnnouncements() {
        // Create live region for announcements
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.id = 'screenReaderAnnouncements';
        document.body.appendChild(liveRegion);
    }

    /**
     * Announce message to screen readers
     * @param {string} message - Message to announce
     */
    function announceToScreenReader(message) {
        const liveRegion = document.getElementById('screenReaderAnnouncements');
        if (liveRegion) {
            liveRegion.textContent = message;
        }
    }

    // Event Handlers
    

    function handleZoom(action) {
        // Dispatch event for other modules to handle
        document.dispatchEvent(new CustomEvent('zoom', { detail: action }));
        showNotification(`Zoom ${action}`, 'info');
    }

    function handleFullscreen() {
        const container = document.getElementById('mindmapContainer');
        if (!container) return;

        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
                showNotification('Fullscreen not supported', 'error');
            });
        } else {
            document.exitFullscreen();
        }
    }

    function handleDownload(format) {
        // Dispatch event for other modules to handle
        document.dispatchEvent(new CustomEvent('download', { detail: format }));
        showNotification(`Downloading as ${format.toUpperCase()}...`, 'info');
    }

    function addHeaderScrollBehavior() {
        let lastScrollY = window.scrollY;
        const header = document.querySelector('header');
        
        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;
            
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                // Scrolling down
                header.style.transform = 'translateY(-100%)';
            } else {
                // Scrolling up
                header.style.transform = 'translateY(0)';
            }
            
            lastScrollY = currentScrollY;
        });
    }

    /**
     * Update status bar metrics
     * @param {Object} metrics - Metrics object
     */
    function updateMetrics(metrics) {
        if (metrics.nodeCount !== undefined) {
            const nodeCountEl = document.getElementById('nodeCount');
            if (nodeCountEl) nodeCountEl.textContent = metrics.nodeCount;
        }
        
        if (metrics.renderTime !== undefined) {
            const renderTimeEl = document.getElementById('renderTime');
            if (renderTimeEl) renderTimeEl.textContent = `Render: ${metrics.renderTime}ms`;
        }
        
        if (metrics.zoomLevel !== undefined) {
            const zoomLevelEl = document.getElementById('zoomLevel');
            if (zoomLevelEl) zoomLevelEl.textContent = `${Math.round(metrics.zoomLevel)}%`;
        }
        
        if (metrics.status !== undefined) {
            const statusEl = document.getElementById('statusMessage');
            if (statusEl) statusEl.textContent = metrics.status;
        }
    }

    /**
     * Show loading indicator
     */
    function showLoading() {
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.classList.remove('hidden');
        }
    }

    /**
     * Hide loading indicator
     */
    function hideLoading() {
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.classList.add('hidden');
        }
    }

    /**
     * Expansion Control Manager Class
     * Implements T013: Build node expansion/collapse controls with animations
     */
    class ExpansionControlManager {
        constructor() {
            this.eventBus = window.MindmapEvents || null;
            this.nodeInteractions = window.TreeInteraction?.NodeInteractions || null;
            this.expandedNodes = new Set();
            this.animationConfig = {
                expansionDuration: 300,
                collapseDuration: 250,
                staggerDelay: 50,
                expansionEasing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
                collapseEasing: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
                fadeOpacity: true,
                scaleEffect: true,
                slideEffect: true,
                useTransforms: true,
                enableGPUAcceleration: true,
                respectReducedMotion: true
            };
            
            this.setupCSS();
            this.registerEventHandlers();
        }

        /**
         * Setup required CSS for expansion controls and animations
         */
        setupCSS() {
            const style = document.createElement('style');
            style.id = 'expansion-control-styles';
            style.textContent = `
                /* Expansion Control Styles */
                .expansion-control {
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    width: 16px;
                    height: 16px;
                    min-width: 44px; /* Touch target */
                    min-height: 44px;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    font-weight: bold;
                    opacity: 0;
                    transform: scale(0.8);
                    transition: all 0.2s ease;
                    z-index: 10;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }

                .expansion-control:hover {
                    background: #2563eb;
                    transform: scale(1.1);
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                }

                .expansion-control:active {
                    transform: scale(0.95);
                }

                .expansion-control.expanded {
                    background: #dc2626;
                }

                .expansion-control.expanded:hover {
                    background: #b91c1c;
                }

                /* Show controls on node hover */
                .mindmap-node:hover .expansion-control,
                .mindmap-node.focused .expansion-control,
                .mindmap-node.expanded .expansion-control {
                    opacity: 1;
                    transform: scale(1);
                }

                /* Expandable content container */
                .expandable-content {
                    overflow: hidden;
                    transition: all var(--expansion-duration, 300ms) var(--expansion-easing, ease);
                    transform-origin: top center;
                }

                .expandable-content.collapsed {
                    max-height: 0;
                    opacity: 0;
                    transform: scaleY(0);
                }

                .expandable-content.expanded {
                    max-height: 500px; /* Adjust based on content */
                    opacity: 1;
                    transform: scaleY(1);
                }

                /* Respect reduced motion preference */
                @media (prefers-reduced-motion: reduce) {
                    .expansion-control,
                    .expandable-content {
                        transition: none !important;
                        animation: none !important;
                    }
                }

                /* High contrast mode support */
                @media (prefers-contrast: high) {
                    .expansion-control {
                        border: 2px solid currentColor;
                        background: ButtonFace;
                        color: ButtonText;
                    }
                }

                /* Dark mode adjustments */
                .dark .expansion-control {
                    background: #1e40af;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
                }

                .dark .expansion-control:hover {
                    background: #1d4ed8;
                }

                .dark .expansion-control.expanded {
                    background: #dc2626;
                }

                .dark .expansion-control.expanded:hover {
                    background: #ef4444;
                }
            `;
            document.head.appendChild(style);
        }

        /**
         * Register event handlers for expansion controls
         */
        registerEventHandlers() {
            if (!this.eventBus) {
                console.warn('ExpansionControlManager: Event bus not available');
                return;
            }

            // Listen for node events from T019
            this.eventBus.on('node:click', this.handleNodeClick.bind(this));
            this.eventBus.on('node:double-click', this.handleNodeDoubleClick.bind(this));
            this.eventBus.on('node:expanded', this.handleNodeExpanded.bind(this));
            this.eventBus.on('node:collapsed', this.handleNodeCollapsed.bind(this));
        }

        /**
         * Add expansion control to a node element
         * @param {HTMLElement} nodeElement - Node DOM element
         * @param {Object} nodeData - Node data object
         */
        addExpansionControl(nodeElement, nodeData) {
            if (!nodeElement || !nodeData) return;
            
            // Check if node has expandable content
            if (!this.isNodeExpandable(nodeData)) return;

            // Remove existing control
            this.removeExpansionControl(nodeElement);

            // Create expansion control button
            const control = document.createElement('button');
            control.className = 'expansion-control';
            control.setAttribute('aria-label', 'Expand/Collapse node content');
            control.setAttribute('aria-expanded', 'false');
            control.setAttribute('data-node-id', nodeData.id);
            
            // Set initial icon
            const isExpanded = this.expandedNodes.has(nodeData.id);
            control.textContent = isExpanded ? '▼' : '▶';
            control.setAttribute('aria-expanded', isExpanded.toString());
            
            if (isExpanded) {
                control.classList.add('expanded');
            }

            // Add click handler
            control.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.handleExpansionToggle(nodeData.id);
            });

            // Position the control
            nodeElement.style.position = 'relative';
            nodeElement.appendChild(control);

            // Create expandable content container if it doesn't exist
            this.ensureExpandableContent(nodeElement, nodeData);
        }

        /**
         * Remove expansion control from node element
         * @param {HTMLElement} nodeElement - Node DOM element
         */
        removeExpansionControl(nodeElement) {
            if (!nodeElement) return;
            
            const existingControl = nodeElement.querySelector('.expansion-control');
            if (existingControl) {
                existingControl.remove();
            }
        }

        /**
         * Update control state for a node
         * @param {string} nodeId - Node ID
         * @param {boolean} expanded - Expansion state
         */
        updateControlState(nodeId, expanded) {
            const control = document.querySelector(`[data-node-id="${nodeId}"].expansion-control`);
            if (!control) return;

            control.textContent = expanded ? '▼' : '▶';
            control.setAttribute('aria-expanded', expanded.toString());
            
            if (expanded) {
                control.classList.add('expanded');
                this.expandedNodes.add(nodeId);
            } else {
                control.classList.remove('expanded');
                this.expandedNodes.delete(nodeId);
            }
        }

        /**
         * Handle expansion toggle
         * @param {string} nodeId - Node ID to toggle
         */
        handleExpansionToggle(nodeId) {
            const isExpanded = this.expandedNodes.has(nodeId);
            
            if (isExpanded) {
                this.animateCollapse(nodeId);
            } else {
                this.animateExpansion(nodeId);
            }

            // Use node interactions if available
            if (this.nodeInteractions) {
                this.nodeInteractions.toggleNodeExpansion(nodeId);
            }
        }

        /**
         * Animate node expansion
         * @param {string} nodeId - Node ID
         * @param {number} duration - Animation duration override
         */
        animateExpansion(nodeId, duration = null) {
            const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
            const contentElement = nodeElement?.querySelector('.expandable-content');
            
            if (!nodeElement || !contentElement) return;

            const animDuration = duration || this.animationConfig.expansionDuration;
            
            // Respect reduced motion preference
            if (this.animationConfig.respectReducedMotion && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                contentElement.classList.remove('collapsed');
                contentElement.classList.add('expanded');
                this.updateControlState(nodeId, true);
                return;
            }

            // Set CSS custom properties for animation
            contentElement.style.setProperty('--expansion-duration', `${animDuration}ms`);
            contentElement.style.setProperty('--expansion-easing', this.animationConfig.expansionEasing);

            // Start animation
            contentElement.classList.remove('collapsed');
            
            // Use requestAnimationFrame for smooth animation
            requestAnimationFrame(() => {
                contentElement.classList.add('expanded');
                this.updateControlState(nodeId, true);
                
                // Announce to screen readers
                announceToScreenReader(`Node expanded: ${nodeElement.textContent?.trim()}`);
                
                // Emit completion event
                if (this.eventBus) {
                    setTimeout(() => {
                        this.eventBus.emit('expansion:animation:complete', {
                            nodeId,
                            type: 'expand',
                            duration: animDuration
                        });
                    }, animDuration);
                }
            });
        }

        /**
         * Animate node collapse
         * @param {string} nodeId - Node ID
         * @param {number} duration - Animation duration override
         */
        animateCollapse(nodeId, duration = null) {
            const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
            const contentElement = nodeElement?.querySelector('.expandable-content');
            
            if (!nodeElement || !contentElement) return;

            const animDuration = duration || this.animationConfig.collapseDuration;
            
            // Respect reduced motion preference
            if (this.animationConfig.respectReducedMotion && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                contentElement.classList.remove('expanded');
                contentElement.classList.add('collapsed');
                this.updateControlState(nodeId, false);
                return;
            }

            // Set CSS custom properties for animation
            contentElement.style.setProperty('--expansion-duration', `${animDuration}ms`);
            contentElement.style.setProperty('--expansion-easing', this.animationConfig.collapseEasing);

            // Start animation
            contentElement.classList.remove('expanded');
            
            // Use requestAnimationFrame for smooth animation
            requestAnimationFrame(() => {
                contentElement.classList.add('collapsed');
                this.updateControlState(nodeId, false);
                
                // Announce to screen readers
                announceToScreenReader(`Node collapsed: ${nodeElement.textContent?.trim()}`);
                
                // Emit completion event
                if (this.eventBus) {
                    setTimeout(() => {
                        this.eventBus.emit('expansion:animation:complete', {
                            nodeId,
                            type: 'collapse',
                            duration: animDuration
                        });
                    }, animDuration);
                }
            });
        }

        /**
         * Set animation configuration
         * @param {Object} config - Animation configuration
         */
        setAnimationConfig(config) {
            this.animationConfig = { ...this.animationConfig, ...config };
        }

        /**
         * Get expanded nodes
         * @returns {Array} Array of expanded node IDs
         */
        getExpandedNodes() {
            return Array.from(this.expandedNodes);
        }

        /**
         * Check if node is expanded
         * @param {string} nodeId - Node ID
         * @returns {boolean} Expansion state
         */
        isNodeExpanded(nodeId) {
            return this.expandedNodes.has(nodeId);
        }

        /**
         * Check if node is expandable based on its data
         * @param {Object} nodeData - Node data
         * @returns {boolean} Whether node can be expanded
         */
        isNodeExpandable(nodeData) {
            if (!nodeData) return false;
            
            // Node is expandable if it has detail content or elements
            return !!(nodeData.detail || 
                     nodeData.elements?.length > 0 || 
                     nodeData.contentType === 'table' ||
                     nodeData.contentType === 'list' ||
                     nodeData.contentType === 'code');
        }

        /**
         * Ensure expandable content container exists
         * @param {HTMLElement} nodeElement - Node element
         * @param {Object} nodeData - Node data
         */
        ensureExpandableContent(nodeElement, nodeData) {
            let contentContainer = nodeElement.querySelector('.expandable-content');
            
            if (!contentContainer) {
                contentContainer = document.createElement('div');
                contentContainer.className = 'expandable-content collapsed';
                
                // Add expandable content based on node data
                this.populateExpandableContent(contentContainer, nodeData);
                
                nodeElement.appendChild(contentContainer);
            }
        }

        /**
         * Populate expandable content based on node data
         * @param {HTMLElement} container - Content container
         * @param {Object} nodeData - Node data
         */
        populateExpandableContent(container, nodeData) {
            if (!nodeData) return;

            // Clear existing content
            container.innerHTML = '';

            // Add detail content if available
            if (nodeData.detail) {
                const detailElement = document.createElement('div');
                detailElement.className = 'detail-content text-sm text-gray-600 dark:text-gray-400 mt-2';
                detailElement.textContent = nodeData.detail;
                container.appendChild(detailElement);
            }

            // Add elements if available
            if (nodeData.elements?.length > 0) {
                const elementsContainer = document.createElement('div');
                elementsContainer.className = 'elements-content mt-2';
                
                nodeData.elements.forEach(element => {
                    const elementDiv = document.createElement('div');
                    elementDiv.className = 'element-item text-xs text-gray-500 dark:text-gray-500 mb-1';
                    elementDiv.textContent = element;
                    elementsContainer.appendChild(elementDiv);
                });
                
                container.appendChild(elementsContainer);
            }

            // Add content type specific rendering
            if (nodeData.contentType && nodeData.contentType !== 'text') {
                const typeIndicator = document.createElement('div');
                typeIndicator.className = 'content-type-indicator text-xs font-medium text-blue-600 dark:text-blue-400 mt-1';
                typeIndicator.textContent = `Type: ${nodeData.contentType}`;
                container.appendChild(typeIndicator);
            }
        }

        /**
         * Handle node click events
         * @param {Object} eventData - Event data from T019
         */
        handleNodeClick(eventData) {
            // Add expansion control if node becomes expandable
            const nodeElement = eventData.element;
            const nodeData = eventData.nodeData;
            
            if (this.isNodeExpandable(nodeData)) {
                this.addExpansionControl(nodeElement, nodeData);
            }
        }

        /**
         * Handle node double-click events
         * @param {Object} eventData - Event data from T019
         */
        handleNodeDoubleClick(eventData) {
            // Double-click toggles expansion
            if (this.isNodeExpandable(eventData.nodeData)) {
                this.handleExpansionToggle(eventData.nodeId);
            }
        }

        /**
         * Handle node expanded events
         * @param {Object} eventData - Event data from T019
         */
        handleNodeExpanded(eventData) {
            this.animateExpansion(eventData.nodeId);
        }

        /**
         * Handle node collapsed events
         * @param {Object} eventData - Event data from T019
         */
        handleNodeCollapsed(eventData) {
            this.animateCollapse(eventData.nodeId);
        }
    }

    // Create global expansion control manager instance
    let expansionControlManager = null;

    /**
     * Initialize expansion controls
     */
    function initializeExpansionControls() {
        if (!expansionControlManager) {
            expansionControlManager = new ExpansionControlManager();
        }
        return expansionControlManager;
    }

    // Public API
    return {
        init,
        showNotification,
        showModal,
        closeModal,
        updateMetrics,
        showLoading,
        hideLoading,
        announceToScreenReader,
        initializeExpansionControls,
        get expansionControls() { return expansionControlManager; }
    };

})();