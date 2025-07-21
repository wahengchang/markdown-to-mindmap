/**
 * Event Manager Module - Centralized event bus and interaction handling
 * Provides event bus system for module communication and handles UI interactions
 * Implements T018: Centralized event bus for module communication
 */
(function() {
    'use strict';

    // Import utilities for debouncing and throttling
    const Performance = (typeof window !== 'undefined' && window.TreeInteraction?.Utils?.Performance) || {};
    const Debug = (typeof window !== 'undefined' && window.TreeInteraction?.Utils?.Debug) || {};

    /**
     * Event Types Registry for centralized event bus
     */
    const EVENT_TYPES = {
        // Node Events
        NODE_CLICK: 'node:click',
        NODE_HOVER: 'node:hover',
        NODE_EXPAND: 'node:expand',
        NODE_COLLAPSE: 'node:collapse',
        
        // Theme Events
        THEME_CHANGE: 'theme:change',
        THEME_LOADED: 'theme:loaded',
        
        // Content Events
        CONTENT_UPDATED: 'content:updated',
        CONTENT_PARSED: 'content:parsed',
        
        // System Events
        ERROR: 'system:error',
        PERFORMANCE_WARNING: 'system:performance',
        MEMORY_WARNING: 'system:memory'
    };

    /**
     * Centralized Event Bus System
     * Provides module communication through observer pattern
     */
    class EventBus {
        constructor() {
            this.listeners = new Map();
            this.onceListeners = new Map();
            this.errorHandlers = [];
            this.performanceMonitor = {
                eventCounts: new Map(),
                totalEvents: 0,
                startTime: Date.now()
            };
        }

        /**
         * Register event listener
         * @param {string} eventType - Event type to listen for
         * @param {Function} callback - Callback function
         * @param {Object} context - Optional context for callback
         * @returns {Function} Cleanup function
         */
        on(eventType, callback, context = null) {
            if (typeof callback !== 'function') {
                throw new Error('Callback must be a function');
            }

            if (!this.listeners.has(eventType)) {
                this.listeners.set(eventType, []);
            }

            const listener = { callback, context, id: this._generateId() };
            this.listeners.get(eventType).push(listener);

            // Return cleanup function
            return () => this.off(eventType, callback, context);
        }

        /**
         * Register one-time event listener
         * @param {string} eventType - Event type to listen for
         * @param {Function} callback - Callback function
         * @param {Object} context - Optional context for callback
         * @returns {Function} Cleanup function
         */
        once(eventType, callback, context = null) {
            if (typeof callback !== 'function') {
                throw new Error('Callback must be a function');
            }

            if (!this.onceListeners.has(eventType)) {
                this.onceListeners.set(eventType, []);
            }

            const listener = { callback, context, id: this._generateId() };
            this.onceListeners.get(eventType).push(listener);

            // Return cleanup function
            return () => this._removeOnceListener(eventType, listener.id);
        }

        /**
         * Remove event listener
         * @param {string} eventType - Event type
         * @param {Function} callback - Callback function to remove
         * @param {Object} context - Optional context to match
         */
        off(eventType, callback, context = null) {
            const listeners = this.listeners.get(eventType);
            if (!listeners) return;

            for (let i = listeners.length - 1; i >= 0; i--) {
                const listener = listeners[i];
                if (listener.callback === callback && listener.context === context) {
                    listeners.splice(i, 1);
                    break;
                }
            }

            if (listeners.length === 0) {
                this.listeners.delete(eventType);
            }
        }

        /**
         * Emit event to all registered listeners
         * @param {string} eventType - Event type to emit
         * @param {*} data - Data to pass to listeners
         */
        emit(eventType, data = null) {
            const startTime = performance.now();
            
            try {
                // Update performance monitoring
                this._updatePerformanceStats(eventType);

                // Process regular listeners
                this._processListeners(this.listeners.get(eventType), eventType, data);

                // Process once listeners
                const onceListeners = this.onceListeners.get(eventType);
                if (onceListeners) {
                    this._processListeners(onceListeners, eventType, data);
                    this.onceListeners.delete(eventType); // Clear once listeners
                }

                // Performance warning for slow events
                const duration = performance.now() - startTime;
                if (duration > 10) { // >10ms warning threshold
                    this.emit(EVENT_TYPES.PERFORMANCE_WARNING, {
                        eventType,
                        duration,
                        threshold: 10
                    });
                }

            } catch (error) {
                this._handleError(error, eventType, data);
            }
        }

        /**
         * Clear all listeners for an event type
         * @param {string} eventType - Event type to clear
         */
        clear(eventType = null) {
            if (eventType) {
                this.listeners.delete(eventType);
                this.onceListeners.delete(eventType);
            } else {
                this.listeners.clear();
                this.onceListeners.clear();
            }
        }

        /**
         * Get listener count for event type
         * @param {string} eventType - Event type
         * @returns {number} Number of listeners
         */
        getListenerCount(eventType) {
            const regular = this.listeners.get(eventType)?.length || 0;
            const once = this.onceListeners.get(eventType)?.length || 0;
            return regular + once;
        }

        /**
         * Register error handler
         * @param {Function} handler - Error handling function
         */
        onError(handler) {
            if (typeof handler === 'function') {
                this.errorHandlers.push(handler);
            }
        }

        /**
         * Get performance statistics
         * @returns {Object} Performance data
         */
        getPerformanceStats() {
            const uptime = Date.now() - this.performanceMonitor.startTime;
            return {
                totalEvents: this.performanceMonitor.totalEvents,
                eventsPerSecond: this.performanceMonitor.totalEvents / (uptime / 1000),
                eventCounts: Object.fromEntries(this.performanceMonitor.eventCounts),
                uptime
            };
        }

        /**
         * Process listeners array
         * @private
         */
        _processListeners(listeners, eventType, data) {
            if (!listeners) return;

            listeners.forEach(listener => {
                try {
                    if (listener.context) {
                        listener.callback.call(listener.context, data, eventType);
                    } else {
                        listener.callback(data, eventType);
                    }
                } catch (error) {
                    this._handleError(error, eventType, data, listener);
                }
            });
        }

        /**
         * Update performance monitoring statistics
         * @private
         */
        _updatePerformanceStats(eventType) {
            this.performanceMonitor.totalEvents++;
            const count = this.performanceMonitor.eventCounts.get(eventType) || 0;
            this.performanceMonitor.eventCounts.set(eventType, count + 1);
        }

        /**
         * Handle errors in event processing
         * @private
         */
        _handleError(error, eventType, data, listener = null) {
            const errorInfo = {
                error,
                eventType,
                data,
                listener: listener ? listener.id : null,
                timestamp: Date.now()
            };

            // Call registered error handlers
            this.errorHandlers.forEach(handler => {
                try {
                    handler(errorInfo);
                } catch (handlerError) {
                    console.error('Error in error handler:', handlerError);
                }
            });

            // Emit system error event (if not already an error event to prevent loops)
            if (eventType !== EVENT_TYPES.ERROR) {
                try {
                    this.emit(EVENT_TYPES.ERROR, errorInfo);
                } catch (emitError) {
                    console.error('Failed to emit error event:', emitError);
                }
            }

            console.error('EventBus error:', error);
        }

        /**
         * Remove once listener by ID
         * @private
         */
        _removeOnceListener(eventType, listenerId) {
            const listeners = this.onceListeners.get(eventType);
            if (!listeners) return;

            for (let i = listeners.length - 1; i >= 0; i--) {
                if (listeners[i].id === listenerId) {
                    listeners.splice(i, 1);
                    break;
                }
            }

            if (listeners.length === 0) {
                this.onceListeners.delete(eventType);
            }
        }

        /**
         * Generate unique ID for listeners
         * @private
         */
        _generateId() {
            return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
    }

    /**
     * Node Interaction Event Types (extends EVENT_TYPES from T018)
     */
    const NODE_EVENT_TYPES = {
        // Basic interactions
        NODE_CLICK: 'node:click',
        NODE_DOUBLE_CLICK: 'node:double-click',
        NODE_HOVER_ENTER: 'node:hover:enter',
        NODE_HOVER_EXIT: 'node:hover:exit',
        NODE_CONTEXT_MENU: 'node:context-menu',
        
        // State changes
        NODE_SELECTED: 'node:selected',
        NODE_DESELECTED: 'node:deselected',
        NODE_EXPANDED: 'node:expanded',
        NODE_COLLAPSED: 'node:collapsed',
        
        // Complex interactions
        NODE_DRAG_START: 'node:drag:start',
        NODE_DRAG_END: 'node:drag:end',
        NODE_FOCUS: 'node:focus',
        NODE_BLUR: 'node:blur'
    };

    /**
     * Node Interaction Handler Class
     * Implements T019: Handle node interaction events (click, hover, expand)
     */
    class NodeInteractionHandler {
        constructor(eventBus) {
            this.eventBus = eventBus;
            this.selectedNodes = new Set();
            this.hoveredNode = null;
            this.expandedNodes = new Set();
            this.clickTimeout = null;
            this.hoverTimeout = null;
            
            // Configuration
            this.config = {
                clickDelay: 200,
                doubleClickThreshold: 400,
                hoverDelay: 300,
                hoverExitDelay: 100,
                multiSelectEnabled: true,
                multiSelectKey: 'ctrlKey',
                keyboardEnabled: true,
                focusOnClick: true,
                announceSelection: true,
                keyboardShortcuts: true
            };

            // Performance monitoring
            this.stats = {
                clickEvents: 0,
                hoverEvents: 0,
                expandEvents: 0,
                totalInteractions: 0,
                lastInteractionTime: Date.now()
            };
        }

        /**
         * Register event listeners for node interactions
         * @param {HTMLElement} container - Container element with mindmap nodes
         */
        registerNodeEvents(container) {
            if (!container) {
                console.warn('NodeInteractionHandler: No container provided');
                return;
            }

            // Use event delegation for better performance
            container.addEventListener('click', this.handleClick.bind(this));
            container.addEventListener('dblclick', this.handleDoubleClick.bind(this));
            container.addEventListener('mouseenter', this.handleMouseEnter.bind(this), true);
            container.addEventListener('mouseleave', this.handleMouseLeave.bind(this), true);
            container.addEventListener('contextmenu', this.handleContextMenu.bind(this));
            container.addEventListener('keydown', this.handleKeyDown.bind(this));
            container.addEventListener('focus', this.handleFocus.bind(this), true);
            container.addEventListener('blur', this.handleBlur.bind(this), true);
        }

        /**
         * Handle click events on nodes
         * @param {Event} event - Click event
         */
        handleClick(event) {
            const nodeElement = this.getNodeFromEvent(event);
            if (!nodeElement) return;

            event.preventDefault();
            event.stopPropagation();

            const nodeData = this.getNodeData(nodeElement);
            if (!nodeData) return;

            this.stats.clickEvents++;
            this.stats.totalInteractions++;

            // Clear any pending double-click timeout
            if (this.clickTimeout) {
                clearTimeout(this.clickTimeout);
                this.clickTimeout = null;
            }

            // Delay click handling to distinguish from double-click
            this.clickTimeout = setTimeout(() => {
                this.processNodeClick(nodeData, event, nodeElement);
                this.clickTimeout = null;
            }, this.config.clickDelay);
        }

        /**
         * Handle double-click events on nodes
         * @param {Event} event - Double-click event
         */
        handleDoubleClick(event) {
            const nodeElement = this.getNodeFromEvent(event);
            if (!nodeElement) return;

            event.preventDefault();
            event.stopPropagation();

            // Clear single-click timeout since this is a double-click
            if (this.clickTimeout) {
                clearTimeout(this.clickTimeout);
                this.clickTimeout = null;
            }

            const nodeData = this.getNodeData(nodeElement);
            if (!nodeData) return;

            this.processNodeDoubleClick(nodeData, event, nodeElement);
        }

        /**
         * Handle mouse enter events for hover
         * @param {Event} event - Mouse enter event
         */
        handleMouseEnter(event) {
            const nodeElement = this.getNodeFromEvent(event);
            if (!nodeElement || nodeElement === this.hoveredNode) return;

            const nodeData = this.getNodeData(nodeElement);
            if (!nodeData) return;

            // Clear any existing hover timeout
            if (this.hoverTimeout) {
                clearTimeout(this.hoverTimeout);
            }

            // Set hover delay
            this.hoverTimeout = setTimeout(() => {
                this.processNodeHoverEnter(nodeData, event, nodeElement);
                this.hoveredNode = nodeElement;
                this.hoverTimeout = null;
            }, this.config.hoverDelay);
        }

        /**
         * Handle mouse leave events for hover
         * @param {Event} event - Mouse leave event
         */
        handleMouseLeave(event) {
            const nodeElement = this.getNodeFromEvent(event);
            if (!nodeElement || nodeElement !== this.hoveredNode) return;

            // Clear hover timeout if still pending
            if (this.hoverTimeout) {
                clearTimeout(this.hoverTimeout);
                this.hoverTimeout = null;
            }

            const nodeData = this.getNodeData(nodeElement);
            if (!nodeData) return;

            setTimeout(() => {
                this.processNodeHoverExit(nodeData, event, nodeElement);
                this.hoveredNode = null;
            }, this.config.hoverExitDelay);
        }

        /**
         * Handle context menu events
         * @param {Event} event - Context menu event
         */
        handleContextMenu(event) {
            const nodeElement = this.getNodeFromEvent(event);
            if (!nodeElement) return;

            event.preventDefault();
            const nodeData = this.getNodeData(nodeElement);
            if (!nodeData) return;

            this.processNodeContextMenu(nodeData, event, nodeElement);
        }

        /**
         * Handle keyboard events for navigation
         * @param {Event} event - Keyboard event
         */
        handleKeyDown(event) {
            if (!this.config.keyboardEnabled) return;

            const nodeElement = this.getNodeFromEvent(event);
            if (!nodeElement) return;

            const nodeData = this.getNodeData(nodeElement);
            if (!nodeData) return;

            this.processNodeKeyboard(nodeData, event, nodeElement);
        }

        /**
         * Handle focus events
         * @param {Event} event - Focus event
         */
        handleFocus(event) {
            const nodeElement = this.getNodeFromEvent(event);
            if (!nodeElement) return;

            const nodeData = this.getNodeData(nodeElement);
            if (!nodeData) return;

            this.processNodeFocus(nodeData, event, nodeElement);
        }

        /**
         * Handle blur events
         * @param {Event} event - Blur event
         */
        handleBlur(event) {
            const nodeElement = this.getNodeFromEvent(event);
            if (!nodeElement) return;

            const nodeData = this.getNodeData(nodeElement);
            if (!nodeData) return;

            this.processNodeBlur(nodeData, event, nodeElement);
        }

        /**
         * Process node click interaction
         * @param {Object} nodeData - Node data
         * @param {Event} event - Original event
         * @param {HTMLElement} element - Node element
         */
        processNodeClick(nodeData, event, element) {
            const isMultiSelect = this.config.multiSelectEnabled && event[this.config.multiSelectKey];
            
            if (!isMultiSelect) {
                this.clearSelection();
            }
            
            this.selectNode(nodeData.id);

            if (this.config.focusOnClick) {
                element.focus();
            }

            // Emit event through centralized bus
            this.eventBus.emit(NODE_EVENT_TYPES.NODE_CLICK, {
                nodeId: nodeData.id,
                nodeData: nodeData,
                position: { x: event.clientX, y: event.clientY },
                element: element,
                originalEvent: event,
                timestamp: Date.now(),
                multiSelect: isMultiSelect
            });
        }

        /**
         * Process node double-click interaction
         * @param {Object} nodeData - Node data
         * @param {Event} event - Original event
         * @param {HTMLElement} element - Node element
         */
        processNodeDoubleClick(nodeData, event, element) {
            // Toggle expansion on double-click
            this.toggleNodeExpansion(nodeData.id);

            this.eventBus.emit(NODE_EVENT_TYPES.NODE_DOUBLE_CLICK, {
                nodeId: nodeData.id,
                nodeData: nodeData,
                position: { x: event.clientX, y: event.clientY },
                element: element,
                originalEvent: event,
                timestamp: Date.now()
            });
        }

        /**
         * Process node hover enter interaction
         * @param {Object} nodeData - Node data
         * @param {Event} event - Original event
         * @param {HTMLElement} element - Node element
         */
        processNodeHoverEnter(nodeData, event, element) {
            this.stats.hoverEvents++;
            element.classList.add('hovered');

            this.eventBus.emit(NODE_EVENT_TYPES.NODE_HOVER_ENTER, {
                nodeId: nodeData.id,
                nodeData: nodeData,
                position: { x: event.clientX, y: event.clientY },
                element: element,
                timestamp: Date.now()
            });
        }

        /**
         * Process node hover exit interaction
         * @param {Object} nodeData - Node data
         * @param {Event} event - Original event
         * @param {HTMLElement} element - Node element
         */
        processNodeHoverExit(nodeData, event, element) {
            element.classList.remove('hovered');

            this.eventBus.emit(NODE_EVENT_TYPES.NODE_HOVER_EXIT, {
                nodeId: nodeData.id,
                nodeData: nodeData,
                position: { x: event.clientX, y: event.clientY },
                element: element,
                timestamp: Date.now()
            });
        }

        /**
         * Process context menu interaction
         * @param {Object} nodeData - Node data
         * @param {Event} event - Original event
         * @param {HTMLElement} element - Node element
         */
        processNodeContextMenu(nodeData, event, element) {
            this.eventBus.emit(NODE_EVENT_TYPES.NODE_CONTEXT_MENU, {
                nodeId: nodeData.id,
                nodeData: nodeData,
                position: { x: event.clientX, y: event.clientY },
                element: element,
                originalEvent: event,
                timestamp: Date.now()
            });
        }

        /**
         * Process keyboard interaction
         * @param {Object} nodeData - Node data
         * @param {Event} event - Original event
         * @param {HTMLElement} element - Node element
         */
        processNodeKeyboard(nodeData, event, element) {
            const key = event.key;
            
            switch (key) {
                case 'Enter':
                case ' ':
                    event.preventDefault();
                    this.toggleNodeExpansion(nodeData.id);
                    break;
                case 'Escape':
                    event.preventDefault();
                    this.clearSelection();
                    break;
                case 'ArrowUp':
                case 'ArrowDown':
                case 'ArrowLeft':
                case 'ArrowRight':
                    event.preventDefault();
                    this.navigateWithKeyboard(nodeData.id, key);
                    break;
            }
        }

        /**
         * Process focus interaction
         * @param {Object} nodeData - Node data
         * @param {Event} event - Original event
         * @param {HTMLElement} element - Node element
         */
        processNodeFocus(nodeData, event, element) {
            element.classList.add('focused');

            this.eventBus.emit(NODE_EVENT_TYPES.NODE_FOCUS, {
                nodeId: nodeData.id,
                nodeData: nodeData,
                element: element,
                timestamp: Date.now()
            });
        }

        /**
         * Process blur interaction
         * @param {Object} nodeData - Node data
         * @param {Event} event - Original event
         * @param {HTMLElement} element - Node element
         */
        processNodeBlur(nodeData, event, element) {
            element.classList.remove('focused');

            this.eventBus.emit(NODE_EVENT_TYPES.NODE_BLUR, {
                nodeId: nodeData.id,
                nodeData: nodeData,
                element: element,
                timestamp: Date.now()
            });
        }

        /**
         * Select a node
         * @param {string} nodeId - Node ID to select
         * @param {boolean} addToSelection - Add to existing selection
         */
        selectNode(nodeId, addToSelection = false) {
            if (!addToSelection) {
                this.clearSelection();
            }

            this.selectedNodes.add(nodeId);
            
            const element = document.querySelector(`[data-node-id="${nodeId}"]`);
            if (element) {
                element.classList.add('selected');
                element.setAttribute('aria-selected', 'true');
            }

            this.eventBus.emit(NODE_EVENT_TYPES.NODE_SELECTED, {
                nodeId: nodeId,
                selectedNodes: Array.from(this.selectedNodes),
                timestamp: Date.now()
            });

            if (this.config.announceSelection) {
                this.announceSelection(nodeId);
            }
        }

        /**
         * Deselect a node
         * @param {string} nodeId - Node ID to deselect
         */
        deselectNode(nodeId) {
            this.selectedNodes.delete(nodeId);
            
            const element = document.querySelector(`[data-node-id="${nodeId}"]`);
            if (element) {
                element.classList.remove('selected');
                element.setAttribute('aria-selected', 'false');
            }

            this.eventBus.emit(NODE_EVENT_TYPES.NODE_DESELECTED, {
                nodeId: nodeId,
                selectedNodes: Array.from(this.selectedNodes),
                timestamp: Date.now()
            });
        }

        /**
         * Clear all selections
         */
        clearSelection() {
            const previouslySelected = Array.from(this.selectedNodes);
            
            previouslySelected.forEach(nodeId => {
                this.deselectNode(nodeId);
            });
            
            this.selectedNodes.clear();
        }

        /**
         * Toggle node expansion
         * @param {string} nodeId - Node ID to toggle
         */
        toggleNodeExpansion(nodeId) {
            if (this.expandedNodes.has(nodeId)) {
                this.collapseNode(nodeId);
            } else {
                this.expandNode(nodeId);
            }
        }

        /**
         * Expand a node
         * @param {string} nodeId - Node ID to expand
         * @param {boolean} recursive - Expand recursively
         */
        expandNode(nodeId, recursive = false) {
            this.expandedNodes.add(nodeId);
            this.stats.expandEvents++;
            
            const element = document.querySelector(`[data-node-id="${nodeId}"]`);
            if (element) {
                element.classList.add('expanded');
                element.setAttribute('aria-expanded', 'true');
            }

            this.eventBus.emit(NODE_EVENT_TYPES.NODE_EXPANDED, {
                nodeId: nodeId,
                recursive: recursive,
                expandedNodes: Array.from(this.expandedNodes),
                timestamp: Date.now()
            });
        }

        /**
         * Collapse a node
         * @param {string} nodeId - Node ID to collapse
         * @param {boolean} recursive - Collapse recursively
         */
        collapseNode(nodeId, recursive = false) {
            this.expandedNodes.delete(nodeId);
            
            const element = document.querySelector(`[data-node-id="${nodeId}"]`);
            if (element) {
                element.classList.remove('expanded');
                element.setAttribute('aria-expanded', 'false');
            }

            this.eventBus.emit(NODE_EVENT_TYPES.NODE_COLLAPSED, {
                nodeId: nodeId,
                recursive: recursive,
                expandedNodes: Array.from(this.expandedNodes),
                timestamp: Date.now()
            });
        }

        /**
         * Get node element from event
         * @param {Event} event - DOM event
         * @returns {HTMLElement|null} Node element
         */
        getNodeFromEvent(event) {
            let target = event.target;
            
            // Traverse up the DOM to find the node element
            while (target && target !== document) {
                if (target.hasAttribute && target.hasAttribute('data-node-id')) {
                    return target;
                }
                if (target.classList && target.classList.contains('mindmap-node')) {
                    return target;
                }
                target = target.parentElement;
            }
            
            return null;
        }

        /**
         * Get node data from element
         * @param {HTMLElement} element - Node element
         * @returns {Object|null} Node data
         */
        getNodeData(element) {
            if (!element) return null;
            
            const nodeId = element.getAttribute('data-node-id');
            if (!nodeId) return null;

            // Try to get data from element dataset
            const data = {
                id: nodeId,
                text: element.getAttribute('data-node-text') || element.textContent?.trim(),
                type: element.getAttribute('data-node-type') || 'text',
                level: parseInt(element.getAttribute('data-node-level')) || 0,
                expanded: element.classList.contains('expanded'),
                selected: element.classList.contains('selected')
            };

            return data;
        }

        /**
         * Navigate with keyboard
         * @param {string} currentNodeId - Current node ID
         * @param {string} direction - Direction key
         */
        navigateWithKeyboard(currentNodeId, direction) {
            // Implementation would depend on the tree structure
            // This is a placeholder for navigation logic
            this.eventBus.emit('keyboard:navigate', {
                currentNodeId,
                direction,
                timestamp: Date.now()
            });
        }

        /**
         * Announce selection for accessibility
         * @param {string} nodeId - Node ID
         */
        announceSelection(nodeId) {
            const element = document.querySelector(`[data-node-id="${nodeId}"]`);
            if (!element) return;

            const text = element.textContent?.trim() || 'Unknown node';
            const announcement = `Selected: ${text}`;
            
            // Create temporary announcement element
            const announcer = document.createElement('div');
            announcer.setAttribute('aria-live', 'polite');
            announcer.setAttribute('aria-atomic', 'true');
            announcer.style.position = 'absolute';
            announcer.style.left = '-10000px';
            announcer.textContent = announcement;
            
            document.body.appendChild(announcer);
            setTimeout(() => document.body.removeChild(announcer), 1000);
        }

        /**
         * Get interaction statistics
         * @returns {Object} Statistics
         */
        getStats() {
            return {
                ...this.stats,
                selectedCount: this.selectedNodes.size,
                expandedCount: this.expandedNodes.size,
                interactionsPerSecond: this.stats.totalInteractions / 
                    ((Date.now() - this.stats.lastInteractionTime) / 1000)
            };
        }

        /**
         * Update configuration
         * @param {Object} newConfig - New configuration options
         */
        updateConfig(newConfig) {
            this.config = { ...this.config, ...newConfig };
        }

        /**
         * Get selected nodes
         * @returns {Array} Selected node IDs
         */
        getSelectedNodes() {
            return Array.from(this.selectedNodes);
        }

        /**
         * Get expanded nodes
         * @returns {Array} Expanded node IDs
         */
        getExpandedNodes() {
            return Array.from(this.expandedNodes);
        }
    }

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

            const fullscreenBtn = document.getElementById('fullscreenBtn');

            if (zoomInBtn) this.addListener(zoomInBtn, 'click', () => this.zoomIn());
            if (zoomOutBtn) this.addListener(zoomOutBtn, 'click', () => this.zoomOut());
            if (resetZoomBtn) this.addListener(resetZoomBtn, 'click', () => this.resetZoom());

            if (fullscreenBtn) this.addListener(fullscreenBtn, 'click', () => this.toggleFullscreen());


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

    // Create global instances
    const eventBus = new EventBus();
    const eventManager = new EventManager();
    const nodeInteractionHandler = new NodeInteractionHandler(eventBus);

    // Expose to global namespace
    if (typeof window !== 'undefined') {
        window.TreeInteraction = window.TreeInteraction || {};
        
        // Global event bus instance (primary interface for T018)
        window.MindmapEvents = eventBus;
        
        // Event types registries
        window.TreeInteraction.EVENT_TYPES = EVENT_TYPES;
        window.TreeInteraction.NODE_EVENT_TYPES = NODE_EVENT_TYPES;
        
        // Node Interaction Handler (T019)
        window.TreeInteraction.NodeInteractions = {
            registerNodeEvents: nodeInteractionHandler.registerNodeEvents.bind(nodeInteractionHandler),
            selectNode: nodeInteractionHandler.selectNode.bind(nodeInteractionHandler),
            deselectNode: nodeInteractionHandler.deselectNode.bind(nodeInteractionHandler),
            clearSelection: nodeInteractionHandler.clearSelection.bind(nodeInteractionHandler),
            expandNode: nodeInteractionHandler.expandNode.bind(nodeInteractionHandler),
            collapseNode: nodeInteractionHandler.collapseNode.bind(nodeInteractionHandler),
            toggleNodeExpansion: nodeInteractionHandler.toggleNodeExpansion.bind(nodeInteractionHandler),
            updateConfig: nodeInteractionHandler.updateConfig.bind(nodeInteractionHandler),
            getStats: nodeInteractionHandler.getStats.bind(nodeInteractionHandler),
            
            // Getters
            get selectedNodes() { return nodeInteractionHandler.getSelectedNodes(); },
            get expandedNodes() { return nodeInteractionHandler.getExpandedNodes(); },
            get config() { return nodeInteractionHandler.config; }
        };
        
        // Event Manager for UI interactions
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

        // Classes for creating additional instances
        window.TreeInteraction.EventBus = EventBus;
        window.TreeInteraction.NodeInteractionHandler = NodeInteractionHandler;

        if (Debug.log) {
            Debug.log('info', 'Event Management System initialized', {
                eventBus: 'window.MindmapEvents',
                nodeInteractions: 'window.TreeInteraction.NodeInteractions',
                eventTypes: Object.keys(EVENT_TYPES).length,
                nodeEventTypes: Object.keys(NODE_EVENT_TYPES).length
            });
        }
    } else if (typeof module !== 'undefined' && module.exports) {
        // Node.js environment support
        module.exports = { 
            EventManager, 
            EventBus, 
            NodeInteractionHandler,
            EVENT_TYPES, 
            NODE_EVENT_TYPES 
        };
    }

})();