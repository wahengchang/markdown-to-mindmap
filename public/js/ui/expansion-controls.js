/**
 * Expansion Controls Module - T013 Implementation
 * Visual expansion/collapse controls with smooth animations for mindmap nodes
 * Integrates with T019 node interaction events and T018 event bus system
 */
(function() {
    'use strict';

    // Import dependencies
    const EventBus = (typeof window !== 'undefined' && window.MindmapEvents) || null;
    const NodeInteractions = (typeof window !== 'undefined' && window.TreeInteraction?.NodeInteractions) || null;
    const EVENT_TYPES = (typeof window !== 'undefined' && window.TreeInteraction?.NODE_EVENT_TYPES) || {};
    const Debug = (typeof window !== 'undefined' && window.TreeInteraction?.Utils?.Debug) || {};

    /**
     * Animation Configuration
     */
    const AnimationConfig = {
        // Animation timing
        duration: 250,
        easing: 'ease-out',
        stagger: 50,
        
        // Visual effects
        scaleFrom: 0.8,
        opacityFrom: 0,
        rotationAngle: 90,
        
        // Performance
        useTransform: true,
        useOpacity: true,
        enableStagger: true,
        
        // Accessibility
        respectReducedMotion: true,
        announceChanges: true
    };

    /**
     * Control Types
     */
    const ControlTypes = {
        CHEVRON: 'chevron',
        PLUS_MINUS: 'plus-minus',
        TRIANGLE: 'triangle',
        CUSTOM: 'custom'
    };

    /**
     * Expansion Control Manager Class
     */
    class ExpansionControlManager {
        constructor() {
            this.container = null;
            this.isInitialized = false;
            this.controls = new Map(); // nodeId -> control element
            this.animatingNodes = new Set();
            
            // Configuration
            this.config = {
                ...AnimationConfig,
                controlType: ControlTypes.CHEVRON,
                showOnHover: false,
                autoHide: false,
                position: 'left' // left, right, center
            };

            // Performance tracking
            this.stats = {
                controlsCreated: 0,
                animationsStarted: 0,
                animationsCompleted: 0,
                averageAnimationTime: 0
            };

            // Check for reduced motion preference
            this.prefersReducedMotion = window.matchMedia && 
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        }

        /**
         * Initialize expansion control manager
         * @param {HTMLElement} container - Container element for mindmap
         * @param {Object} options - Configuration options
         */
        init(container, options = {}) {
            if (!container) {
                throw new Error('Container element is required');
            }

            this.container = container;
            this.config = { ...this.config, ...options };
            
            // Adjust animations based on motion preferences
            if (this.prefersReducedMotion && this.config.respectReducedMotion) {
                this.config.duration = 0;
                this.config.useTransform = false;
                this.config.useOpacity = false;
            }

            this.setupStyles();
            this.setupEventListeners();
            this.scanAndAddControls();
            
            this.isInitialized = true;

            if (EventBus) {
                EventBus.emit('expansion-controls:initialized', {
                    container: container.id || 'unnamed',
                    config: this.config
                });
            }

            if (Debug?.log) {
                Debug.log('info', 'ExpansionControlManager initialized', {
                    container: container.id,
                    controlType: this.config.controlType,
                    respectsReducedMotion: this.prefersReducedMotion
                });
            }
        }

        /**
         * Setup CSS styles for expansion controls
         */
        setupStyles() {
            const styleId = 'expansion-controls-styles';
            if (document.getElementById(styleId)) return;

            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = this.getControlStyles();
            document.head.appendChild(style);
        }

        /**
         * Get CSS styles for controls and animations
         * @returns {string} CSS styles
         */
        getControlStyles() {
            return `
                /* Expansion Control Base Styles */
                .expansion-control {
                    position: absolute;
                    width: 16px;
                    height: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.9);
                    border: 1px solid rgba(0, 0, 0, 0.2);
                    border-radius: 50%;
                    cursor: pointer;
                    user-select: none;
                    font-size: 10px;
                    line-height: 1;
                    color: #333;
                    z-index: 10;
                    transition: transform ${this.config.duration}ms ${this.config.easing},
                               opacity ${this.config.duration}ms ${this.config.easing},
                               background-color 150ms ease;
                }

                .expansion-control:hover {
                    background: rgba(255, 255, 255, 1);
                    border-color: rgba(0, 0, 0, 0.4);
                    transform: scale(1.1);
                }

                .expansion-control:focus {
                    outline: 2px solid #4A90E2;
                    outline-offset: 2px;
                }

                .expansion-control.hidden {
                    opacity: 0;
                    pointer-events: none;
                }

                /* Control Type Styles */
                .expansion-control.chevron::before {
                    content: '▶';
                    transition: transform ${this.config.duration}ms ${this.config.easing};
                }

                .expansion-control.chevron.expanded::before {
                    transform: rotate(${this.config.rotationAngle}deg);
                }

                .expansion-control.plus-minus.collapsed::before {
                    content: '+';
                }

                .expansion-control.plus-minus.expanded::before {
                    content: '−';
                }

                .expansion-control.triangle::before {
                    content: '▶';
                    transition: transform ${this.config.duration}ms ${this.config.easing};
                }

                .expansion-control.triangle.expanded::before {
                    transform: rotate(${this.config.rotationAngle}deg);
                }

                /* Node Animation States */
                .mindmap-node {
                    transition: opacity ${this.config.duration}ms ${this.config.easing},
                               transform ${this.config.duration}ms ${this.config.easing};
                }

                .mindmap-node.expanding {
                    animation: expandNode ${this.config.duration}ms ${this.config.easing} forwards;
                }

                .mindmap-node.collapsing {
                    animation: collapseNode ${this.config.duration}ms ${this.config.easing} forwards;
                }

                .mindmap-node.expanding-children > .mindmap-node {
                    animation: expandNodeStagger ${this.config.duration}ms ${this.config.easing} forwards;
                    animation-delay: calc(var(--stagger-index, 0) * ${this.config.stagger}ms);
                }

                /* Keyframe Animations */
                @keyframes expandNode {
                    from {
                        opacity: ${this.config.opacityFrom};
                        transform: scale(${this.config.scaleFrom});
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                @keyframes collapseNode {
                    from {
                        opacity: 1;
                        transform: scale(1);
                    }
                    to {
                        opacity: ${this.config.opacityFrom};
                        transform: scale(${this.config.scaleFrom});
                    }
                }

                @keyframes expandNodeStagger {
                    from {
                        opacity: 0;
                        transform: translateY(-10px) scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                /* Reduced Motion Support */
                @media (prefers-reduced-motion: reduce) {
                    .expansion-control,
                    .expansion-control::before,
                    .mindmap-node {
                        transition: none !important;
                        animation: none !important;
                    }
                }

                /* Auto-hide controls */
                .expansion-controls-autohide .expansion-control {
                    opacity: 0;
                    transition: opacity 200ms ease;
                }

                .expansion-controls-autohide .mindmap-node:hover .expansion-control,
                .expansion-controls-autohide .mindmap-node.mindmap-node-focused .expansion-control {
                    opacity: 1;
                }

                /* Position variants */
                .expansion-control.position-left {
                    left: -8px;
                    top: 50%;
                    transform: translateY(-50%);
                }

                .expansion-control.position-right {
                    right: -8px;
                    top: 50%;
                    transform: translateY(-50%);
                }

                .expansion-control.position-center {
                    left: 50%;
                    bottom: -8px;
                    transform: translateX(-50%);
                }
            `;
        }

        /**
         * Setup event listeners for expansion events
         */
        setupEventListeners() {
            if (!EventBus) return;

            // Listen for node expansion/collapse events from T019
            EventBus.on(EVENT_TYPES.NODE_EXPANDED, (data) => {
                this.handleNodeExpanded(data.nodeId, data.recursive);
            });

            EventBus.on(EVENT_TYPES.NODE_COLLAPSED, (data) => {
                this.handleNodeCollapsed(data.nodeId, data.recursive);
            });

            // Listen for node clicks on expansion controls
            this.container?.addEventListener('click', (event) => {
                const control = event.target.closest('.expansion-control');
                if (control) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.handleControlClick(control);
                }
            });

            // Keyboard support for controls
            this.container?.addEventListener('keydown', (event) => {
                const control = event.target.closest('.expansion-control');
                if (control && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    this.handleControlClick(control);
                }
            });
        }

        /**
         * Scan container and add controls to nodes with children
         */
        scanAndAddControls() {
            if (!this.container) return;

            const nodes = this.container.querySelectorAll('[data-node-id]');
            nodes.forEach(nodeElement => {
                const nodeId = nodeElement.getAttribute('data-node-id');
                const hasChildren = this.checkNodeHasChildren(nodeElement);
                
                if (hasChildren) {
                    this.addExpansionControl(nodeElement, true);
                }
            });
        }

        /**
         * Check if a node has children
         * @param {HTMLElement} nodeElement - Node element
         * @returns {boolean} True if node has children
         */
        checkNodeHasChildren(nodeElement) {
            // Check data attribute first
            const hasChildrenAttr = nodeElement.getAttribute('data-has-children');
            if (hasChildrenAttr !== null) {
                return hasChildrenAttr === 'true';
            }

            // Check if node has expandable content
            const contentType = nodeElement.getAttribute('data-node-type');
            const expandableTypes = ['table', 'list', 'complex', 'code'];
            if (expandableTypes.includes(contentType)) {
                return true;
            }

            // Check for child elements (less reliable for dynamically rendered trees)
            const nodeId = nodeElement.getAttribute('data-node-id');
            const childSelector = `[data-parent-id="${nodeId}"]`;
            return this.container.querySelector(childSelector) !== null;
        }

        /**
         * Add expansion control to a node element
         * @param {HTMLElement} nodeElement - Node element
         * @param {boolean} hasChildren - Whether node has children
         */
        addExpansionControl(nodeElement, hasChildren) {
            if (!hasChildren || this.getControlElement(nodeElement)) return;

            const nodeId = nodeElement.getAttribute('data-node-id');
            const control = this.createExpansionControl(nodeElement);
            
            nodeElement.style.position = 'relative';
            nodeElement.appendChild(control);
            
            this.controls.set(nodeId, control);
            this.stats.controlsCreated++;

            // Set initial state
            const isExpanded = NodeInteractions?.expandedNodes.includes(nodeId) || false;
            this.updateControlState(control, isExpanded);

            if (Debug?.log) {
                Debug.log('debug', `Added expansion control to node ${nodeId}`, { hasChildren, isExpanded });
            }
        }

        /**
         * Create expansion control element
         * @param {HTMLElement} nodeElement - Node element
         * @returns {HTMLElement} Control element
         */
        createExpansionControl(nodeElement) {
            const control = document.createElement('button');
            control.className = `expansion-control ${this.config.controlType} position-${this.config.position} collapsed`;
            control.setAttribute('type', 'button');
            control.setAttribute('aria-label', 'Toggle expansion');
            control.setAttribute('tabindex', '0');
            
            const nodeId = nodeElement.getAttribute('data-node-id');
            control.setAttribute('data-node-id', nodeId);
            control.setAttribute('data-control-for', nodeId);

            return control;
        }

        /**
         * Update expansion state with animation
         * @param {string} nodeId - Node ID
         * @param {boolean} isExpanded - Expansion state
         * @param {boolean} animate - Whether to animate
         */
        updateExpansionState(nodeId, isExpanded, animate = true) {
            const control = this.controls.get(nodeId);
            const nodeElement = this.container?.querySelector(`[data-node-id="${nodeId}"]`);
            
            if (control) {
                this.updateControlState(control, isExpanded);
            }

            if (nodeElement && animate && !this.prefersReducedMotion) {
                this.animateExpansion(nodeElement, isExpanded);
            }
        }

        /**
         * Update control visual state
         * @param {HTMLElement} control - Control element
         * @param {boolean} isExpanded - Expansion state
         */
        updateControlState(control, isExpanded) {
            control.classList.toggle('expanded', isExpanded);
            control.classList.toggle('collapsed', !isExpanded);
            control.setAttribute('aria-expanded', isExpanded.toString());
            control.setAttribute('aria-label', isExpanded ? 'Collapse' : 'Expand');
        }

        /**
         * Animate node expansion/collapse
         * @param {HTMLElement} nodeElement - Node element
         * @param {boolean} isExpanding - Whether expanding (true) or collapsing (false)
         */
        animateExpansion(nodeElement, isExpanding) {
            if (this.animatingNodes.has(nodeElement)) return;

            this.animatingNodes.add(nodeElement);
            this.stats.animationsStarted++;

            const startTime = performance.now();
            const animationClass = isExpanding ? 'expanding' : 'collapsing';
            
            // Add animation class
            nodeElement.classList.add(animationClass);

            // Handle child animations with stagger
            if (isExpanding && this.config.enableStagger) {
                this.animateChildrenWithStagger(nodeElement);
            }

            // Remove animation class after completion
            setTimeout(() => {
                nodeElement.classList.remove(animationClass, 'expanding-children');
                this.animatingNodes.delete(nodeElement);
                this.stats.animationsCompleted++;

                const duration = performance.now() - startTime;
                this.updateAverageAnimationTime(duration);

                if (EventBus) {
                    EventBus.emit('expansion-animation:complete', {
                        nodeId: nodeElement.getAttribute('data-node-id'),
                        isExpanding,
                        duration
                    });
                }
            }, this.config.duration + (this.config.enableStagger ? this.config.stagger * 3 : 0));
        }

        /**
         * Animate children with stagger effect
         * @param {HTMLElement} parentElement - Parent node element
         */
        animateChildrenWithStagger(parentElement) {
            const nodeId = parentElement.getAttribute('data-node-id');
            const children = this.container?.querySelectorAll(`[data-parent-id="${nodeId}"]`) || [];
            
            if (children.length === 0) return;

            parentElement.classList.add('expanding-children');
            
            children.forEach((child, index) => {
                child.style.setProperty('--stagger-index', index.toString());
            });
        }

        /**
         * Handle control click events
         * @param {HTMLElement} control - Clicked control element
         */
        handleControlClick(control) {
            const nodeId = control.getAttribute('data-node-id');
            if (!nodeId) return;

            // Use NodeInteractions to toggle expansion
            if (NodeInteractions) {
                NodeInteractions.toggleNodeExpansion(nodeId);
            } else {
                // Fallback: emit event directly
                if (EventBus) {
                    const isExpanded = control.classList.contains('expanded');
                    EventBus.emit(isExpanded ? EVENT_TYPES.NODE_COLLAPSED : EVENT_TYPES.NODE_EXPANDED, {
                        nodeId,
                        triggered: 'expansion-control'
                    });
                }
            }
        }

        /**
         * Handle node expanded event
         * @param {string} nodeId - Node ID
         * @param {boolean} recursive - Whether expansion was recursive
         */
        handleNodeExpanded(nodeId, recursive = false) {
            this.updateExpansionState(nodeId, true, true);
            
            if (this.config.announceChanges) {
                this.announceStateChange(nodeId, 'expanded');
            }
        }

        /**
         * Handle node collapsed event
         * @param {string} nodeId - Node ID
         * @param {boolean} recursive - Whether collapse was recursive
         */
        handleNodeCollapsed(nodeId, recursive = false) {
            this.updateExpansionState(nodeId, false, true);
            
            if (this.config.announceChanges) {
                this.announceStateChange(nodeId, 'collapsed');
            }
        }

        /**
         * Get control element for a node
         * @param {HTMLElement} nodeElement - Node element
         * @returns {HTMLElement|null} Control element
         */
        getControlElement(nodeElement) {
            return nodeElement.querySelector('.expansion-control');
        }

        /**
         * Remove expansion control from a node
         * @param {HTMLElement} nodeElement - Node element
         */
        removeExpansionControl(nodeElement) {
            const control = this.getControlElement(nodeElement);
            if (control) {
                const nodeId = nodeElement.getAttribute('data-node-id');
                control.remove();
                this.controls.delete(nodeId);
            }
        }

        /**
         * Update configuration
         * @param {Object} newConfig - New configuration options
         */
        updateConfig(newConfig) {
            this.config = { ...this.config, ...newConfig };
            
            // Re-apply styles if animation settings changed
            if (newConfig.duration || newConfig.easing) {
                this.setupStyles();
            }
        }

        /**
         * Announce state change for accessibility
         * @param {string} nodeId - Node ID
         * @param {string} state - New state (expanded/collapsed)
         */
        announceStateChange(nodeId, state) {
            const nodeElement = this.container?.querySelector(`[data-node-id="${nodeId}"]`);
            if (!nodeElement) return;

            const nodeText = nodeElement.textContent?.trim() || 'Node';
            const message = `${nodeText} ${state}`;
            
            // Create live region for announcement
            let liveRegion = document.getElementById('expansion-live-region');
            if (!liveRegion) {
                liveRegion = document.createElement('div');
                liveRegion.id = 'expansion-live-region';
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
         * Update average animation time
         * @param {number} duration - Animation duration
         */
        updateAverageAnimationTime(duration) {
            const currentAvg = this.stats.averageAnimationTime;
            const count = this.stats.animationsCompleted;
            this.stats.averageAnimationTime = ((currentAvg * (count - 1)) + duration) / count;
        }

        /**
         * Get statistics
         * @returns {Object} Statistics object
         */
        getStats() {
            return {
                ...this.stats,
                activeControls: this.controls.size,
                animatingNodes: this.animatingNodes.size,
                prefersReducedMotion: this.prefersReducedMotion
            };
        }

        /**
         * Refresh all controls (useful after DOM changes)
         */
        refresh() {
            if (!this.isInitialized) return;

            // Clear existing controls
            this.controls.clear();
            
            // Re-scan and add controls
            this.scanAndAddControls();
        }

        /**
         * Destroy expansion control manager
         */
        destroy() {
            // Remove all controls
            this.controls.forEach(control => control.remove());
            this.controls.clear();
            
            // Clear animating nodes
            this.animatingNodes.clear();
            
            // Remove live region
            const liveRegion = document.getElementById('expansion-live-region');
            if (liveRegion) {
                liveRegion.remove();
            }

            // Remove styles
            const styleElement = document.getElementById('expansion-controls-styles');
            if (styleElement) {
                styleElement.remove();
            }

            this.container = null;
            this.isInitialized = false;
        }
    }

    // Create global instance
    const expansionControlManager = new ExpansionControlManager();

    // Expose to global namespace
    if (typeof window !== 'undefined') {
        window.TreeInteraction = window.TreeInteraction || {};
        
        // Expansion controls interface
        window.TreeInteraction.ExpansionControls = {
            init: expansionControlManager.init.bind(expansionControlManager),
            addExpansionControl: expansionControlManager.addExpansionControl.bind(expansionControlManager),
            updateExpansionState: expansionControlManager.updateExpansionState.bind(expansionControlManager),
            removeExpansionControl: expansionControlManager.removeExpansionControl.bind(expansionControlManager),
            updateConfig: expansionControlManager.updateConfig.bind(expansionControlManager),
            refresh: expansionControlManager.refresh.bind(expansionControlManager),
            getStats: expansionControlManager.getStats.bind(expansionControlManager),
            destroy: expansionControlManager.destroy.bind(expansionControlManager),
            
            // Getters
            get isInitialized() { return expansionControlManager.isInitialized; },
            get config() { return expansionControlManager.config; },
            get stats() { return expansionControlManager.getStats(); }
        };

        // Control types for external use
        window.TreeInteraction.CONTROL_TYPES = ControlTypes;

        if (Debug?.log) {
            Debug.log('info', 'Expansion Controls module loaded', {
                controlTypes: Object.keys(ControlTypes).length,
                globalInterface: 'window.TreeInteraction.ExpansionControls'
            });
        }
    } else if (typeof module !== 'undefined' && module.exports) {
        // Node.js environment support
        module.exports = { 
            ExpansionControlManager, 
            ControlTypes, 
            AnimationConfig 
        };
    }

})();