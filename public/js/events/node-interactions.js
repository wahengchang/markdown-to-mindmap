/**
 * Node Interaction Events Module - T019 Implementation
 * Handles comprehensive node interactions: click, hover, expand, select, keyboard navigation
 * Integrates with centralized event bus system from T018
 */
(function() {
    'use strict';

    // Import event bus and utilities
    const EventBus = (typeof window !== 'undefined' && window.MindmapEvents) || null;
    const EVENT_TYPES = (typeof window !== 'undefined' && window.TreeInteraction?.EVENT_TYPES) || {};
    const Performance = (typeof window !== 'undefined' && window.TreeInteraction?.Utils?.Performance) || {};
    const Debug = (typeof window !== 'undefined' && window.TreeInteraction?.Utils?.Debug) || {};

    /**
     * Node Event Types Registry
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
        NODE_BLUR: 'node:blur',
        
        // Selection events
        SELECTION_CHANGED: 'selection:changed',
        SELECTION_CLEARED: 'selection:cleared'
    };

    /**
     * Interaction Configuration
     */
    const InteractionConfig = {
        // Click behavior
        clickDelay: 200,
        doubleClickThreshold: 400,
        
        // Hover behavior
        hoverDelay: 300,
        hoverExitDelay: 100,
        
        // Selection behavior
        multiSelectEnabled: true,
        multiSelectKey: 'ctrlKey',
        
        // Keyboard navigation
        keyboardEnabled: true,
        focusOnClick: true,
        
        // Accessibility
        announceSelection: true,
        keyboardShortcuts: true,
        
        // Performance
        debounceHover: true,
        throttleSelection: true
    };

    /**
     * Node Interaction Manager Class
     */
    class NodeInteractionManager {
        constructor() {
            this.container = null;
            this.isInitialized = false;
            
            // State tracking
            this.selectedNodes = new Set();
            this.expandedNodes = new Set();
            this.focusedNode = null;
            this.hoveredNode = null;
            
            // Event state
            this.clickTimer = null;
            this.hoverTimer = null;
            this.lastClickTime = 0;
            this.lastClickedNode = null;
            
            // Performance tracking
            this.eventStats = {
                totalEvents: 0,
                clickEvents: 0,
                hoverEvents: 0,
                selectionChanges: 0
            };
        }

        /**
         * Initialize node interaction management
         * @param {HTMLElement} container - Container element for mindmap
         * @param {Object} options - Configuration options
         */
        init(container, options = {}) {
            if (!container) {
                throw new Error('Container element is required');
            }

            this.container = container;
            this.config = { ...InteractionConfig, ...options };
            
            this.setupEventListeners();
            this.setupKeyboardHandlers();
            this.setupAccessibility();
            
            this.isInitialized = true;
            
            if (EventBus) {
                EventBus.emit('node-interactions:initialized', {
                    container: container.id || 'unnamed',
                    config: this.config
                });
            }

            if (Debug?.log) {
                Debug.log('info', 'NodeInteractionManager initialized', {
                    container: container.id,
                    multiSelect: this.config.multiSelectEnabled
                });
            }
        }

        /**
         * Setup event listeners for node interactions
         */
        setupEventListeners() {
            if (!this.container) return;

            // Use event delegation for performance with many nodes
            this.container.addEventListener('click', this.handleClick.bind(this), true);
            this.container.addEventListener('dblclick', this.handleDoubleClick.bind(this), true);
            this.container.addEventListener('mouseenter', this.handleMouseEnter.bind(this), true);
            this.container.addEventListener('mouseleave', this.handleMouseLeave.bind(this), true);
            this.container.addEventListener('contextmenu', this.handleContextMenu.bind(this), true);
            
            // Focus events for accessibility
            this.container.addEventListener('focusin', this.handleFocusIn.bind(this), true);
            this.container.addEventListener('focusout', this.handleFocusOut.bind(this), true);
        }

        /**
         * Setup keyboard event handlers
         */
        setupKeyboardHandlers() {
            if (!this.config.keyboardEnabled) return;

            document.addEventListener('keydown', (event) => {
                if (this.handleKeyboardShortcuts(event)) {
                    event.preventDefault();
                }
            });
        }

        /**
         * Setup accessibility features
         */
        setupAccessibility() {
            if (!this.container) return;

            // Ensure nodes are focusable
            this.container.setAttribute('role', 'tree');
            
            // Setup aria-labels and keyboard navigation hints
            this.updateAccessibilityAttributes();
        }

        /**
         * Handle click events with click/double-click distinction
         */
        handleClick(event) {
            const nodeElement = this.findNodeElement(event.target);
            if (!nodeElement) return;

            const nodeId = nodeElement.getAttribute('data-node-id');
            if (!nodeId) return;

            this.eventStats.totalEvents++;
            this.eventStats.clickEvents++;

            // Handle double-click detection
            const currentTime = Date.now();
            const timeSinceLastClick = currentTime - this.lastClickTime;
            
            if (this.lastClickedNode === nodeId && timeSinceLastClick < this.config.doubleClickThreshold) {
                // This is a double-click, cancel single click timer
                if (this.clickTimer) {
                    clearTimeout(this.clickTimer);
                    this.clickTimer = null;
                }
                this.handleNodeDoubleClick(nodeId, event, nodeElement);
                return;
            }

            // Set timer for single click (delayed to check for double-click)
            this.clickTimer = setTimeout(() => {
                this.handleNodeClick(nodeId, event, nodeElement);
                this.clickTimer = null;
            }, this.config.clickDelay);

            this.lastClickTime = currentTime;
            this.lastClickedNode = nodeId;
        }

        /**
         * Handle node single click
         */
        handleNodeClick(nodeId, event, nodeElement) {
            const nodeData = this.getNodeData(nodeElement);
            
            // Handle selection
            if (this.config.multiSelectEnabled && event[this.config.multiSelectKey]) {
                this.toggleSelection(nodeId);
            } else {
                this.selectNode(nodeId, false);
            }

            // Focus management
            if (this.config.focusOnClick) {
                this.focusNode(nodeId);
            }

            // Emit event
            if (EventBus) {
                EventBus.emit(NODE_EVENT_TYPES.NODE_CLICK, {
                    nodeId,
                    nodeData,
                    event,
                    element: nodeElement,
                    multiSelect: event[this.config.multiSelectKey]
                });
            }

            if (Debug?.log) {
                Debug.log('debug', `Node clicked: ${nodeId}`, { multiSelect: event[this.config.multiSelectKey] });
            }
        }

        /**
         * Handle node double click
         */
        handleNodeDoubleClick(nodeId, event, nodeElement) {
            const nodeData = this.getNodeData(nodeElement);
            
            // Double-click typically expands/collapses nodes
            this.toggleNodeExpansion(nodeId);

            // Emit event
            if (EventBus) {
                EventBus.emit(NODE_EVENT_TYPES.NODE_DOUBLE_CLICK, {
                    nodeId,
                    nodeData,
                    event,
                    element: nodeElement
                });
            }

            if (Debug?.log) {
                Debug.log('debug', `Node double-clicked: ${nodeId}`);
            }
        }

        /**
         * Handle mouse enter (hover start)
         */
        handleMouseEnter(event) {
            const nodeElement = this.findNodeElement(event.target);
            if (!nodeElement) return;

            const nodeId = nodeElement.getAttribute('data-node-id');
            if (!nodeId || this.hoveredNode === nodeId) return;

            // Clear any existing hover timer
            if (this.hoverTimer) {
                clearTimeout(this.hoverTimer);
            }

            // Set delayed hover to avoid excessive events
            this.hoverTimer = setTimeout(() => {
                this.handleNodeHoverEnter(nodeId, event, nodeElement);
                this.hoverTimer = null;
            }, this.config.hoverDelay);
        }

        /**
         * Handle mouse leave (hover end)
         */
        handleMouseLeave(event) {
            const nodeElement = this.findNodeElement(event.target);
            if (!nodeElement) return;

            const nodeId = nodeElement.getAttribute('data-node-id');
            if (!nodeId || this.hoveredNode !== nodeId) return;

            // Clear hover timer if still pending
            if (this.hoverTimer) {
                clearTimeout(this.hoverTimer);
                this.hoverTimer = null;
            }

            // Delayed hover exit to prevent flicker
            setTimeout(() => {
                if (this.hoveredNode === nodeId) {
                    this.handleNodeHoverExit(nodeId, event, nodeElement);
                }
            }, this.config.hoverExitDelay);
        }

        /**
         * Handle hover enter
         */
        handleNodeHoverEnter(nodeId, event, nodeElement) {
            this.hoveredNode = nodeId;
            this.eventStats.hoverEvents++;

            const nodeData = this.getNodeData(nodeElement);

            // Add hover state
            nodeElement.classList.add('mindmap-node-hovered');

            // Emit event
            if (EventBus) {
                EventBus.emit(NODE_EVENT_TYPES.NODE_HOVER_ENTER, {
                    nodeId,
                    nodeData,
                    event,
                    element: nodeElement
                });
            }
        }

        /**
         * Handle hover exit
         */
        handleNodeHoverExit(nodeId, event, nodeElement) {
            this.hoveredNode = null;

            // Remove hover state
            nodeElement.classList.remove('mindmap-node-hovered');

            // Emit event
            if (EventBus) {
                EventBus.emit(NODE_EVENT_TYPES.NODE_HOVER_EXIT, {
                    nodeId,
                    event,
                    element: nodeElement
                });
            }
        }

        /**
         * Handle context menu
         */
        handleContextMenu(event) {
            const nodeElement = this.findNodeElement(event.target);
            if (!nodeElement) return;

            const nodeId = nodeElement.getAttribute('data-node-id');
            if (!nodeId) return;

            event.preventDefault(); // Prevent browser context menu

            const nodeData = this.getNodeData(nodeElement);

            // Emit event
            if (EventBus) {
                EventBus.emit(NODE_EVENT_TYPES.NODE_CONTEXT_MENU, {
                    nodeId,
                    nodeData,
                    event,
                    element: nodeElement,
                    position: { x: event.clientX, y: event.clientY }
                });
            }
        }

        /**
         * Handle focus events
         */
        handleFocusIn(event) {
            const nodeElement = this.findNodeElement(event.target);
            if (!nodeElement) return;

            const nodeId = nodeElement.getAttribute('data-node-id');
            if (!nodeId) return;

            this.focusedNode = nodeId;
            nodeElement.classList.add('mindmap-node-focused');

            if (EventBus) {
                EventBus.emit(NODE_EVENT_TYPES.NODE_FOCUS, {
                    nodeId,
                    element: nodeElement
                });
            }
        }

        /**
         * Handle focus out events
         */
        handleFocusOut(event) {
            const nodeElement = this.findNodeElement(event.target);
            if (!nodeElement) return;

            const nodeId = nodeElement.getAttribute('data-node-id');
            if (!nodeId) return;

            nodeElement.classList.remove('mindmap-node-focused');

            if (EventBus) {
                EventBus.emit(NODE_EVENT_TYPES.NODE_BLUR, {
                    nodeId,
                    element: nodeElement
                });
            }
        }

        /**
         * Handle keyboard shortcuts
         */
        handleKeyboardShortcuts(event) {
            if (!this.config.keyboardShortcuts || !this.focusedNode) return false;

            switch (event.code) {
                case 'Enter':
                case 'Space':
                    this.toggleNodeExpansion(this.focusedNode);
                    return true;
                    
                case 'ArrowUp':
                    this.navigateUp();
                    return true;
                    
                case 'ArrowDown':
                    this.navigateDown();
                    return true;
                    
                case 'ArrowLeft':
                    this.navigateLeft();
                    return true;
                    
                case 'ArrowRight':
                    this.navigateRight();
                    return true;
                    
                case 'Escape':
                    this.clearSelection();
                    return true;
                    
                default:
                    return false;
            }
        }

        /**
         * Node Selection Management
         */

        /**
         * Select a node
         * @param {string} nodeId - Node ID to select
         * @param {boolean} addToSelection - Add to existing selection
         */
        selectNode(nodeId, addToSelection = false) {
            if (!addToSelection) {
                this.clearSelection();
            }

            if (this.selectedNodes.has(nodeId)) return;

            this.selectedNodes.add(nodeId);
            this.eventStats.selectionChanges++;

            const nodeElement = this.getNodeElement(nodeId);
            if (nodeElement) {
                nodeElement.classList.add('mindmap-node-selected');
                nodeElement.setAttribute('aria-selected', 'true');
            }

            if (EventBus) {
                EventBus.emit(NODE_EVENT_TYPES.NODE_SELECTED, {
                    nodeId,
                    selectedNodes: Array.from(this.selectedNodes)
                });
                
                EventBus.emit(NODE_EVENT_TYPES.SELECTION_CHANGED, {
                    selectedNodes: Array.from(this.selectedNodes),
                    action: 'add',
                    nodeId
                });
            }

            this.announceSelection(nodeId, 'selected');
        }

        /**
         * Deselect a node
         * @param {string} nodeId - Node ID to deselect
         */
        deselectNode(nodeId) {
            if (!this.selectedNodes.has(nodeId)) return;

            this.selectedNodes.delete(nodeId);
            this.eventStats.selectionChanges++;

            const nodeElement = this.getNodeElement(nodeId);
            if (nodeElement) {
                nodeElement.classList.remove('mindmap-node-selected');
                nodeElement.setAttribute('aria-selected', 'false');
            }

            if (EventBus) {
                EventBus.emit(NODE_EVENT_TYPES.NODE_DESELECTED, {
                    nodeId,
                    selectedNodes: Array.from(this.selectedNodes)
                });
                
                EventBus.emit(NODE_EVENT_TYPES.SELECTION_CHANGED, {
                    selectedNodes: Array.from(this.selectedNodes),
                    action: 'remove',
                    nodeId
                });
            }

            this.announceSelection(nodeId, 'deselected');
        }

        /**
         * Toggle node selection
         * @param {string} nodeId - Node ID to toggle
         */
        toggleSelection(nodeId) {
            if (this.selectedNodes.has(nodeId)) {
                this.deselectNode(nodeId);
            } else {
                this.selectNode(nodeId, true);
            }
        }

        /**
         * Clear all selections
         */
        clearSelection() {
            const previousSelection = Array.from(this.selectedNodes);
            
            this.selectedNodes.forEach(nodeId => {
                const nodeElement = this.getNodeElement(nodeId);
                if (nodeElement) {
                    nodeElement.classList.remove('mindmap-node-selected');
                    nodeElement.setAttribute('aria-selected', 'false');
                }
            });

            this.selectedNodes.clear();

            if (previousSelection.length > 0) {
                if (EventBus) {
                    EventBus.emit(NODE_EVENT_TYPES.SELECTION_CLEARED, {
                        previousSelection
                    });
                }
                this.announceSelection(null, 'cleared');
            }
        }

        /**
         * Node Expansion Management
         */

        /**
         * Toggle node expansion state
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
         * @param {boolean} recursive - Expand all children recursively
         */
        expandNode(nodeId, recursive = false) {
            if (this.expandedNodes.has(nodeId)) return;

            this.expandedNodes.add(nodeId);

            const nodeElement = this.getNodeElement(nodeId);
            if (nodeElement) {
                nodeElement.classList.add('mindmap-node-expanded');
                nodeElement.setAttribute('aria-expanded', 'true');
            }

            if (EventBus) {
                EventBus.emit(NODE_EVENT_TYPES.NODE_EXPANDED, {
                    nodeId,
                    recursive,
                    expandedNodes: Array.from(this.expandedNodes)
                });
            }

            this.announceExpansion(nodeId, 'expanded');
        }

        /**
         * Collapse a node
         * @param {string} nodeId - Node ID to collapse
         * @param {boolean} recursive - Collapse all children recursively
         */
        collapseNode(nodeId, recursive = false) {
            if (!this.expandedNodes.has(nodeId)) return;

            this.expandedNodes.delete(nodeId);

            const nodeElement = this.getNodeElement(nodeId);
            if (nodeElement) {
                nodeElement.classList.remove('mindmap-node-expanded');
                nodeElement.setAttribute('aria-expanded', 'false');
            }

            if (EventBus) {
                EventBus.emit(NODE_EVENT_TYPES.NODE_COLLAPSED, {
                    nodeId,
                    recursive,
                    expandedNodes: Array.from(this.expandedNodes)
                });
            }

            this.announceExpansion(nodeId, 'collapsed');
        }

        /**
         * Navigation Methods
         */

        /**
         * Navigate to parent node
         */
        navigateUp() {
            // Implementation depends on tree structure
            // For now, emit navigation event for other modules to handle
            if (EventBus && this.focusedNode) {
                EventBus.emit('navigation:up', { currentNode: this.focusedNode });
            }
        }

        /**
         * Navigate to next sibling
         */
        navigateDown() {
            if (EventBus && this.focusedNode) {
                EventBus.emit('navigation:down', { currentNode: this.focusedNode });
            }
        }

        /**
         * Navigate to previous sibling
         */
        navigateLeft() {
            if (EventBus && this.focusedNode) {
                EventBus.emit('navigation:left', { currentNode: this.focusedNode });
            }
        }

        /**
         * Navigate to first child
         */
        navigateRight() {
            if (EventBus && this.focusedNode) {
                EventBus.emit('navigation:right', { currentNode: this.focusedNode });
            }
        }

        /**
         * Focus a specific node
         * @param {string} nodeId - Node ID to focus
         */
        focusNode(nodeId) {
            const nodeElement = this.getNodeElement(nodeId);
            if (nodeElement) {
                nodeElement.focus();
                this.focusedNode = nodeId;
            }
        }

        /**
         * Utility Methods
         */

        /**
         * Find the node element from an event target
         * @param {Element} target - Event target element
         * @returns {Element|null} Node element or null
         */
        findNodeElement(target) {
            // Look for node element with data-node-id attribute
            let element = target;
            while (element && element !== this.container) {
                if (element.hasAttribute && element.hasAttribute('data-node-id')) {
                    return element;
                }
                element = element.parentElement;
            }
            return null;
        }

        /**
         * Get node element by ID
         * @param {string} nodeId - Node ID
         * @returns {Element|null} Node element or null
         */
        getNodeElement(nodeId) {
            return this.container?.querySelector(`[data-node-id="${nodeId}"]`) || null;
        }

        /**
         * Extract node data from element
         * @param {Element} nodeElement - Node DOM element
         * @returns {Object} Node data object
         */
        getNodeData(nodeElement) {
            return {
                id: nodeElement.getAttribute('data-node-id'),
                text: nodeElement.textContent?.trim(),
                level: parseInt(nodeElement.getAttribute('data-level')) || 0,
                type: nodeElement.getAttribute('data-type') || 'text',
                expanded: this.expandedNodes.has(nodeElement.getAttribute('data-node-id')),
                selected: this.selectedNodes.has(nodeElement.getAttribute('data-node-id'))
            };
        }

        /**
         * Update accessibility attributes
         */
        updateAccessibilityAttributes() {
            if (!this.container) return;

            const nodes = this.container.querySelectorAll('[data-node-id]');
            nodes.forEach(node => {
                node.setAttribute('role', 'treeitem');
                node.setAttribute('tabindex', '0');
                node.setAttribute('aria-selected', 'false');
                node.setAttribute('aria-expanded', 'false');
            });
        }

        /**
         * Announce selection changes for screen readers
         * @param {string} nodeId - Node ID
         * @param {string} action - Action performed (selected, deselected, cleared)
         */
        announceSelection(nodeId, action) {
            if (!this.config.announceSelection) return;

            let message = '';
            switch (action) {
                case 'selected':
                    message = `Node selected. ${this.selectedNodes.size} nodes selected.`;
                    break;
                case 'deselected':
                    message = `Node deselected. ${this.selectedNodes.size} nodes selected.`;
                    break;
                case 'cleared':
                    message = 'All selections cleared.';
                    break;
            }

            if (message) {
                this.announceToScreenReader(message);
            }
        }

        /**
         * Announce expansion changes for screen readers
         * @param {string} nodeId - Node ID
         * @param {string} action - Action performed (expanded, collapsed)
         */
        announceExpansion(nodeId, action) {
            if (!this.config.announceSelection) return;

            const message = `Node ${action}.`;
            this.announceToScreenReader(message);
        }

        /**
         * Announce message to screen readers
         * @param {string} message - Message to announce
         */
        announceToScreenReader(message) {
            // Create a live region for screen reader announcements
            let liveRegion = document.getElementById('mindmap-live-region');
            if (!liveRegion) {
                liveRegion = document.createElement('div');
                liveRegion.id = 'mindmap-live-region';
                liveRegion.setAttribute('aria-live', 'polite');
                liveRegion.setAttribute('aria-atomic', 'true');
                liveRegion.style.position = 'absolute';
                liveRegion.style.left = '-10000px';
                liveRegion.style.width = '1px';
                liveRegion.style.height = '1px';
                liveRegion.style.overflow = 'hidden';
                document.body.appendChild(liveRegion);
            }

            liveRegion.textContent = message;
        }

        /**
         * Get interaction statistics
         * @returns {Object} Statistics object
         */
        getStats() {
            return {
                ...this.eventStats,
                selectedNodes: this.selectedNodes.size,
                expandedNodes: this.expandedNodes.size,
                focusedNode: this.focusedNode,
                hoveredNode: this.hoveredNode
            };
        }

        /**
         * Get current selection
         * @returns {Array} Array of selected node IDs
         */
        getSelection() {
            return Array.from(this.selectedNodes);
        }

        /**
         * Get expanded nodes
         * @returns {Array} Array of expanded node IDs
         */
        getExpandedNodes() {
            return Array.from(this.expandedNodes);
        }

        /**
         * Cleanup and destroy
         */
        destroy() {
            // Clear timers
            if (this.clickTimer) {
                clearTimeout(this.clickTimer);
            }
            if (this.hoverTimer) {
                clearTimeout(this.hoverTimer);
            }

            // Clear state
            this.clearSelection();
            this.selectedNodes.clear();
            this.expandedNodes.clear();
            this.focusedNode = null;
            this.hoveredNode = null;

            // Remove live region
            const liveRegion = document.getElementById('mindmap-live-region');
            if (liveRegion) {
                liveRegion.remove();
            }

            this.container = null;
            this.isInitialized = false;
        }
    }

    // Create global instance
    const nodeInteractionManager = new NodeInteractionManager();

    // Expose to global namespace
    if (typeof window !== 'undefined') {
        window.TreeInteraction = window.TreeInteraction || {};
        
        // Add node event types to global registry
        Object.assign(window.TreeInteraction.EVENT_TYPES || {}, NODE_EVENT_TYPES);
        
        // Node interaction manager interface
        window.TreeInteraction.NodeInteractions = {
            init: nodeInteractionManager.init.bind(nodeInteractionManager),
            selectNode: nodeInteractionManager.selectNode.bind(nodeInteractionManager),
            deselectNode: nodeInteractionManager.deselectNode.bind(nodeInteractionManager),
            clearSelection: nodeInteractionManager.clearSelection.bind(nodeInteractionManager),
            toggleSelection: nodeInteractionManager.toggleSelection.bind(nodeInteractionManager),
            expandNode: nodeInteractionManager.expandNode.bind(nodeInteractionManager),
            collapseNode: nodeInteractionManager.collapseNode.bind(nodeInteractionManager),
            toggleNodeExpansion: nodeInteractionManager.toggleNodeExpansion.bind(nodeInteractionManager),
            focusNode: nodeInteractionManager.focusNode.bind(nodeInteractionManager),
            getSelection: nodeInteractionManager.getSelection.bind(nodeInteractionManager),
            getExpandedNodes: nodeInteractionManager.getExpandedNodes.bind(nodeInteractionManager),
            getStats: nodeInteractionManager.getStats.bind(nodeInteractionManager),
            destroy: nodeInteractionManager.destroy.bind(nodeInteractionManager),
            
            // Getters
            get selectedNodes() { return nodeInteractionManager.selectedNodes; },
            get expandedNodes() { return nodeInteractionManager.expandedNodes; },
            get focusedNode() { return nodeInteractionManager.focusedNode; },
            get isInitialized() { return nodeInteractionManager.isInitialized; }
        };

        // Event types for external use
        window.TreeInteraction.NODE_EVENT_TYPES = NODE_EVENT_TYPES;

        if (Debug?.log) {
            Debug.log('info', 'Node Interaction Events module loaded', {
                eventTypes: Object.keys(NODE_EVENT_TYPES).length,
                globalInterface: 'window.TreeInteraction.NodeInteractions'
            });
        }
    } else if (typeof module !== 'undefined' && module.exports) {
        // Node.js environment support
        module.exports = { 
            NodeInteractionManager, 
            NODE_EVENT_TYPES, 
            InteractionConfig 
        };
    }

})();