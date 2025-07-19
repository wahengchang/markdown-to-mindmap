/**
 * Event Manager Module - Centralized event handling for mindmap interactions
 * Handles node interactions, zoom/pan controls, keyboard shortcuts, and touch gestures
 */
(function() {
    'use strict';

    // Import utilities for debouncing and throttling
    const Performance = (typeof window !== 'undefined' && window.TreeInteraction?.Utils?.Performance) || {};
    const Debug = (typeof window !== 'undefined' && window.TreeInteraction?.Utils?.Debug) || {};

    /**
     * Event Manager Class
     */
    class EventManager {
        constructor() {
            this.container = null;
            this.listeners = new Map();
            this.customListeners = new Map();
            this.isInitialized = false;
            this.zoomLevel = 1;
            this.panX = 0;
            this.panY = 0;
            this.isDragging = false;
            this.lastMousePosition = { x: 0, y: 0 };
            this.touchStartDistance = 0;
            this.touchCenter = { x: 0, y: 0 };
            
            // Configuration
            this.config = {
                zoomMin: 0.1,
                zoomMax: 5.0,
                zoomStep: 0.1,
                panSensitivity: 1.0,
                touchSensitivity: 0.5,
                debounceDelay: 100,
                throttleDelay: 16 // ~60fps
            };
        }

        /**
         * Initialize the event manager
         * @param {HTMLElement} container - Container element for mindmap
         * @param {Object} options - Configuration options
         */
        init(container, options = {}) {
            if (this.isInitialized) {
                this.destroy();
            }

            this.container = container;
            this.config = { ...this.config, ...options };
            
            this.setupEventListeners();
            this.setupKeyboardShortcuts();
            this.setupTouchGestures();
            this.setupUIControls();
            
            this.isInitialized = true;
            this.emit('manager-initialized', { container, config: this.config });

            if (Debug.log) {
                Debug.log('info', 'EventManager initialized', { container: container.id });
            }
        }

        /**
         * Setup basic event listeners
         */
        setupEventListeners() {
            if (!this.container) return;

            // Mouse events for pan and zoom
            this.addListener(this.container, 'mousedown', this.handleMouseDown.bind(this));
            this.addListener(this.container, 'mousemove', Performance.throttle ? 
                Performance.throttle(this.handleMouseMove.bind(this), this.config.throttleDelay) :
                this.handleMouseMove.bind(this));
            this.addListener(this.container, 'mouseup', this.handleMouseUp.bind(this));
            this.addListener(this.container, 'mouseleave', this.handleMouseUp.bind(this));

            // Wheel event for zoom
            this.addListener(this.container, 'wheel', Performance.throttle ? 
                Performance.throttle(this.handleWheel.bind(this), this.config.throttleDelay) :
                this.handleWheel.bind(this), { passive: false });

            // Click events for node selection
            this.addListener(this.container, 'click', Performance.debounce ? 
                Performance.debounce(this.handleClick.bind(this), this.config.debounceDelay) :
                this.handleClick.bind(this));

            // Double-click for centering
            this.addListener(this.container, 'dblclick', this.handleDoubleClick.bind(this));

            // Context menu
            this.addListener(this.container, 'contextmenu', this.handleContextMenu.bind(this));
        }

        /**
         * Setup keyboard shortcuts
         */
        setupKeyboardShortcuts() {
            const shortcuts = {
                'Space': () => this.centerView(),
                'Equal': () => this.zoomIn(),
                'Minus': () => this.zoomOut(),
                'Digit0': () => this.resetZoom(),
                'ArrowUp': () => this.pan(0, -50),
                'ArrowDown': () => this.pan(0, 50),
                'ArrowLeft': () => this.pan(-50, 0),
                'ArrowRight': () => this.pan(50, 0),
                'KeyF': () => this.toggleFullscreen(),
                'KeyR': () => this.resetView(),
                'Escape': () => this.clearSelection()
            };

            this.addListener(document, 'keydown', (event) => {
                // Only handle if mindmap container is focused or no input is focused
                const activeElement = document.activeElement;
                const isInputFocused = activeElement && 
                    (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');

                if (isInputFocused) return;

                const key = event.code;
                if (shortcuts[key]) {
                    event.preventDefault();
                    shortcuts[key]();
                    this.emit('keyboard-shortcut', { key, action: shortcuts[key].name });
                }
            });
        }

        /**
         * Setup touch gestures for mobile support
         */
        setupTouchGestures() {
            if (!this.container) return;

            let touchStartTime = 0;
            let touchCount = 0;

            this.addListener(this.container, 'touchstart', (event) => {
                touchStartTime = Date.now();
                touchCount = event.touches.length;
                
                if (touchCount === 1) {
                    // Single touch - start pan
                    const touch = event.touches[0];
                    this.lastMousePosition = { x: touch.clientX, y: touch.clientY };
                    this.isDragging = true;
                } else if (touchCount === 2) {
                    // Two finger - prepare for pinch zoom
                    const touch1 = event.touches[0];
                    const touch2 = event.touches[1];
                    
                    this.touchStartDistance = this.getTouchDistance(touch1, touch2);
                    this.touchCenter = this.getTouchCenter(touch1, touch2);
                }
                
                event.preventDefault();
            }, { passive: false });

            this.addListener(this.container, 'touchmove', (event) => {
                if (touchCount === 1 && this.isDragging) {
                    // Single touch pan
                    const touch = event.touches[0];
                    const deltaX = touch.clientX - this.lastMousePosition.x;
                    const deltaY = touch.clientY - this.lastMousePosition.y;
                    
                    this.pan(deltaX * this.config.touchSensitivity, deltaY * this.config.touchSensitivity);
                    this.lastMousePosition = { x: touch.clientX, y: touch.clientY };
                } else if (touchCount === 2) {
                    // Two finger pinch zoom
                    const touch1 = event.touches[0];
                    const touch2 = event.touches[1];
                    
                    const currentDistance = this.getTouchDistance(touch1, touch2);
                    const scale = currentDistance / this.touchStartDistance;
                    
                    this.zoomAt(this.touchCenter.x, this.touchCenter.y, scale);
                    this.touchStartDistance = currentDistance;
                }
                
                event.preventDefault();
            }, { passive: false });

            this.addListener(this.container, 'touchend', (event) => {
                const touchDuration = Date.now() - touchStartTime;
                
                if (touchCount === 1 && touchDuration < 200) {
                    // Short tap - treat as click
                    const touch = event.changedTouches[0];
                    this.handleClick({ 
                        clientX: touch.clientX, 
                        clientY: touch.clientY,
                        target: event.target 
                    });
                }
                
                this.isDragging = false;
                touchCount = 0;
                event.preventDefault();
            }, { passive: false });
        }

        /**
         * Setup UI control event listeners
         */
        setupUIControls() {
            // Zoom controls
            const zoomInBtn = document.getElementById('zoomInBtn');
            const zoomOutBtn = document.getElementById('zoomOutBtn');
            const resetZoomBtn = document.getElementById('resetZoomBtn');
            const centerNodeBtn = document.getElementById('centerNodeBtn');
            const fullscreenBtn = document.getElementById('fullscreenBtn');

            if (zoomInBtn) this.addListener(zoomInBtn, 'click', () => this.zoomIn());
            if (zoomOutBtn) this.addListener(zoomOutBtn, 'click', () => this.zoomOut());
            if (resetZoomBtn) this.addListener(resetZoomBtn, 'click', () => this.resetZoom());
            if (centerNodeBtn) this.addListener(centerNodeBtn, 'click', () => this.centerView());
            if (fullscreenBtn) this.addListener(fullscreenBtn, 'click', () => this.toggleFullscreen());

            // Filter input
            const filterInput = document.getElementById('filterInput');
            if (filterInput) {
                const debouncedFilter = Performance.debounce ? 
                    Performance.debounce(this.handleFilter.bind(this), 300) :
                    this.handleFilter.bind(this);
                this.addListener(filterInput, 'input', debouncedFilter);
            }
        }

        /**
         * Handle mouse down events
         */
        handleMouseDown(event) {
            if (event.button === 0) { // Left mouse button
                this.isDragging = true;
                this.lastMousePosition = { x: event.clientX, y: event.clientY };
                this.container.style.cursor = 'grabbing';
                event.preventDefault();
            }
        }

        /**
         * Handle mouse move events
         */
        handleMouseMove(event) {
            if (this.isDragging) {
                const deltaX = event.clientX - this.lastMousePosition.x;
                const deltaY = event.clientY - this.lastMousePosition.y;
                
                this.pan(deltaX, deltaY);
                this.lastMousePosition = { x: event.clientX, y: event.clientY };
            }
        }

        /**
         * Handle mouse up events
         */
        handleMouseUp(event) {
            this.isDragging = false;
            this.container.style.cursor = 'default';
        }

        /**
         * Handle wheel events for zoom
         */
        handleWheel(event) {
            event.preventDefault();
            
            const delta = event.deltaY > 0 ? -this.config.zoomStep : this.config.zoomStep;
            const rect = this.container.getBoundingClientRect();
            const centerX = event.clientX - rect.left;
            const centerY = event.clientY - rect.top;
            
            this.zoomAt(centerX, centerY, 1 + delta);
        }

        /**
         * Handle click events
         */
        handleClick(event) {
            const target = event.target;
            
            // Check if click is on a node
            if (target.classList.contains('mindmap-node') || target.closest('.mindmap-node')) {
                const nodeElement = target.classList.contains('mindmap-node') ? 
                    target : target.closest('.mindmap-node');
                const nodeId = nodeElement.getAttribute('data-node-id');
                
                this.emit('node-click', { 
                    nodeId, 
                    element: nodeElement, 
                    event,
                    position: { x: event.clientX, y: event.clientY }
                });
            } else {
                // Click on empty space
                this.emit('canvas-click', { 
                    event,
                    position: { x: event.clientX, y: event.clientY }
                });
                this.clearSelection();
            }
        }

        /**
         * Handle double-click events
         */
        handleDoubleClick(event) {
            const rect = this.container.getBoundingClientRect();
            const centerX = event.clientX - rect.left;
            const centerY = event.clientY - rect.top;
            
            this.zoomAt(centerX, centerY, 1.5);
            this.emit('double-click', { position: { x: centerX, y: centerY } });
        }

        /**
         * Handle context menu events
         */
        handleContextMenu(event) {
            event.preventDefault();
            
            const target = event.target;
            if (target.classList.contains('mindmap-node') || target.closest('.mindmap-node')) {
                const nodeElement = target.classList.contains('mindmap-node') ? 
                    target : target.closest('.mindmap-node');
                const nodeId = nodeElement.getAttribute('data-node-id');
                
                this.emit('node-context-menu', { 
                    nodeId, 
                    element: nodeElement, 
                    position: { x: event.clientX, y: event.clientY }
                });
            }
        }

        /**
         * Handle filter input
         */
        handleFilter(event) {
            const query = event.target.value.trim().toLowerCase();
            this.emit('filter-change', { query });
        }

        /**
         * Zoom in
         */
        zoomIn() {
            this.zoom(this.zoomLevel + this.config.zoomStep);
        }

        /**
         * Zoom out
         */
        zoomOut() {
            this.zoom(this.zoomLevel - this.config.zoomStep);
        }

        /**
         * Reset zoom to 100%
         */
        resetZoom() {
            this.zoom(1);
        }

        /**
         * Zoom to specific level
         */
        zoom(level) {
            const newZoom = Math.max(this.config.zoomMin, Math.min(this.config.zoomMax, level));
            if (newZoom !== this.zoomLevel) {
                this.zoomLevel = newZoom;
                this.updateTransform();
                this.updateZoomDisplay();
                this.emit('zoom-change', { level: this.zoomLevel });
            }
        }

        /**
         * Zoom at specific point
         */
        zoomAt(x, y, scale) {
            const newZoom = Math.max(this.config.zoomMin, 
                Math.min(this.config.zoomMax, this.zoomLevel * scale));
            
            if (newZoom !== this.zoomLevel) {
                // Adjust pan to zoom toward the specified point
                const factor = newZoom / this.zoomLevel - 1;
                this.panX -= (x - this.panX) * factor;
                this.panY -= (y - this.panY) * factor;
                
                this.zoomLevel = newZoom;
                this.updateTransform();
                this.updateZoomDisplay();
                this.emit('zoom-change', { level: this.zoomLevel, center: { x, y } });
            }
        }

        /**
         * Pan the view
         */
        pan(deltaX, deltaY) {
            this.panX += deltaX * this.config.panSensitivity;
            this.panY += deltaY * this.config.panSensitivity;
            this.updateTransform();
            this.emit('pan-change', { x: this.panX, y: this.panY });
        }

        /**
         * Center the view
         */
        centerView() {
            this.panX = 0;
            this.panY = 0;
            this.updateTransform();
            this.emit('view-centered');
        }

        /**
         * Reset view to default state
         */
        resetView() {
            this.zoomLevel = 1;
            this.panX = 0;
            this.panY = 0;
            this.updateTransform();
            this.updateZoomDisplay();
            this.emit('view-reset');
        }

        /**
         * Toggle fullscreen mode
         */
        toggleFullscreen() {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                this.container.requestFullscreen();
            }
            this.emit('fullscreen-toggle');
        }

        /**
         * Clear selection
         */
        clearSelection() {
            const selected = this.container.querySelectorAll('.selected');
            selected.forEach(el => el.classList.remove('selected'));
            this.emit('selection-cleared');
        }

        /**
         * Update transform of mindmap content
         */
        updateTransform() {
            const mindmapContent = this.container.querySelector('.mindmap-content') || 
                                   this.container.querySelector('svg') ||
                                   this.container.firstElementChild;
            
            if (mindmapContent) {
                mindmapContent.style.transform = 
                    `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
            }
        }

        /**
         * Update zoom level display
         */
        updateZoomDisplay() {
            const zoomDisplay = document.getElementById('zoomLevel');
            if (zoomDisplay) {
                zoomDisplay.textContent = `${Math.round(this.zoomLevel * 100)}%`;
            }
        }

        /**
         * Helper function to get distance between two touches
         */
        getTouchDistance(touch1, touch2) {
            const dx = touch1.clientX - touch2.clientX;
            const dy = touch1.clientY - touch2.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }

        /**
         * Helper function to get center point between two touches
         */
        getTouchCenter(touch1, touch2) {
            return {
                x: (touch1.clientX + touch2.clientX) / 2,
                y: (touch1.clientY + touch2.clientY) / 2
            };
        }

        /**
         * Add event listener and track it
         */
        addListener(element, event, handler, options = {}) {
            element.addEventListener(event, handler, options);
            
            if (!this.listeners.has(element)) {
                this.listeners.set(element, []);
            }
            this.listeners.get(element).push({ event, handler, options });
        }

        /**
         * Emit custom event
         */
        emit(eventType, data = {}) {
            if (this.customListeners.has(eventType)) {
                const listeners = this.customListeners.get(eventType);
                listeners.forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error(`Error in event listener for ${eventType}:`, error);
                    }
                });
            }

            // Also emit as DOM event
            const customEvent = new CustomEvent(`mindmap:${eventType}`, { detail: data });
            (this.container || document).dispatchEvent(customEvent);
        }

        /**
         * Add custom event listener
         */
        on(eventType, callback) {
            if (!this.customListeners.has(eventType)) {
                this.customListeners.set(eventType, []);
            }
            this.customListeners.get(eventType).push(callback);
        }

        /**
         * Remove custom event listener
         */
        off(eventType, callback) {
            if (this.customListeners.has(eventType)) {
                const listeners = this.customListeners.get(eventType);
                const index = listeners.indexOf(callback);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            }
        }

        /**
         * Destroy event manager and cleanup
         */
        destroy() {
            // Remove all event listeners
            this.listeners.forEach((eventList, element) => {
                eventList.forEach(({ event, handler, options }) => {
                    element.removeEventListener(event, handler, options);
                });
            });
            
            this.listeners.clear();
            this.customListeners.clear();
            this.container = null;
            this.isInitialized = false;
        }
    }

    // Create global instance
    const eventManager = new EventManager();

    // Expose EventManager to global namespace
    if (typeof window !== 'undefined') {
        window.TreeInteraction = window.TreeInteraction || {};
        window.TreeInteraction.EventManager = {
            init: eventManager.init.bind(eventManager),
            on: eventManager.on.bind(eventManager),
            off: eventManager.off.bind(eventManager),
            emit: eventManager.emit.bind(eventManager),
            zoom: eventManager.zoom.bind(eventManager),
            zoomIn: eventManager.zoomIn.bind(eventManager),
            zoomOut: eventManager.zoomOut.bind(eventManager),
            resetZoom: eventManager.resetZoom.bind(eventManager),
            pan: eventManager.pan.bind(eventManager),
            centerView: eventManager.centerView.bind(eventManager),
            resetView: eventManager.resetView.bind(eventManager),
            clearSelection: eventManager.clearSelection.bind(eventManager),
            destroy: eventManager.destroy.bind(eventManager),
            
            // Getters
            get zoomLevel() { return eventManager.zoomLevel; },
            get panX() { return eventManager.panX; },
            get panY() { return eventManager.panY; },
            get isInitialized() { return eventManager.isInitialized; }
        };
    } else if (typeof module !== 'undefined' && module.exports) {
        // Node.js environment support
        module.exports = { EventManager };
    }

})();