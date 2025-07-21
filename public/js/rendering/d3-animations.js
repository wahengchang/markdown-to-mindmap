/**
 * D3 Animations Module - T017 Implementation
 * Node expansion animation system coordinating with expansion controls
 * Integrates with T013 expansion controls, T018 event bus, and T019 node interactions
 */
(function() {
    'use strict';

    // Import dependencies
    const EventBus = (typeof window !== 'undefined' && window.MindmapEvents) || null;
    const ExpansionControls = (typeof window !== 'undefined' && window.TreeInteraction?.ExpansionControls) || null;
    const NodeInteractions = (typeof window !== 'undefined' && window.TreeInteraction?.NodeInteractions) || null;
    const EVENT_TYPES = (typeof window !== 'undefined' && window.TreeInteraction?.EVENT_TYPES) || {};
    const Debug = (typeof window !== 'undefined' && window.TreeInteraction?.Utils?.Debug) || {};

    /**
     * D3 Animation Configuration
     */
    const AnimationConfig = {
        // Timing settings
        expandDuration: 300,
        collapseDuration: 200,
        staggerDelay: 50,
        
        // Easing functions
        expandEasing: d3.easeCubicOut,
        collapseEasing: d3.easeCubicInOut,
        
        // Animation properties
        scaleRange: [0.1, 1.0],
        opacityRange: [0, 1],
        transformOrigin: 'center',
        
        // Performance settings
        useHardwareAcceleration: true,
        batchAnimations: true,
        maxConcurrentAnimations: 10,
        
        // Reduced motion support
        respectReducedMotion: true,
        reducedMotionDuration: 100,
        
        // Hardware acceleration
        willChange: 'transform, opacity',
        transform3d: true
    };

    /**
     * D3 Animation Coordinator Class
     */
    class D3AnimationCoordinator {
        constructor() {
            this.isInitialized = false;
            this.svgElement = null;
            this.rootGroup = null;
            this.activeAnimations = new Map(); // nodeId -> animation info
            this.animationQueue = [];
            this.isAnimating = false;
            
            this.config = { ...AnimationConfig };
            
            // Performance tracking
            this.stats = {
                animationsStarted: 0,
                animationsCompleted: 0,
                averageFrameRate: 60,
                slowAnimations: 0
            };
            
            // Reduced motion detection
            this.respectReducedMotion = this.config.respectReducedMotion && 
                window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        }

        /**
         * Initialize animation coordinator
         * @param {SVGElement} svgElement - D3 SVG element
         * @param {Object} options - Configuration options
         */
        init(svgElement, options = {}) {
            if (!svgElement) {
                throw new Error('SVG element is required for animation coordinator');
            }

            this.svgElement = svgElement;
            this.rootGroup = d3.select(svgElement).select('g');
            this.config = { ...this.config, ...options };
            
            this.setupEventListeners();
            this.enableHardwareAcceleration();
            
            this.isInitialized = true;

            if (EventBus) {
                EventBus.emit('d3-animations:initialized', {
                    config: this.config,
                    reducedMotion: this.respectReducedMotion
                });
            }

            if (Debug?.log) {
                Debug.log('info', 'D3 Animation Coordinator initialized', {
                    reducedMotion: this.respectReducedMotion,
                    maxConcurrentAnimations: this.config.maxConcurrentAnimations
                });
            }
        }

        /**
         * Setup event listeners for expansion controls
         */
        setupEventListeners() {
            if (!EventBus) return;

            // Listen for expansion control events
            EventBus.on('expansion-control:expand', (data) => {
                this.animateNodeExpansion(data.nodeId, data.expansionData, data.duration);
            });

            EventBus.on('expansion-control:collapse', (data) => {
                this.animateNodeCollapse(data.nodeId, data.duration);
            });

            EventBus.on('expansion-control:toggle', (data) => {
                if (data.expanded) {
                    this.animateNodeExpansion(data.nodeId, data.expansionData, data.duration);
                } else {
                    this.animateNodeCollapse(data.nodeId, data.duration);
                }
            });

            // Listen for bulk operations
            EventBus.on('expansion-control:bulk-expand', (data) => {
                this.animateBulkExpansion(data.nodeIds, data.staggerDelay);
            });

            EventBus.on('expansion-control:bulk-collapse', (data) => {
                this.animateBulkCollapse(data.nodeIds, data.staggerDelay);
            });

            // Listen for theme changes for animation updates
            EventBus.on('theme:changed', (data) => {
                this.updateAnimationTheme(data.theme);
            });
        }

        /**
         * Enable hardware acceleration for animations
         */
        enableHardwareAcceleration() {
            if (!this.config.useHardwareAcceleration || !this.rootGroup) return;

            this.rootGroup
                .style('will-change', this.config.willChange)
                .style('transform', 'translateZ(0)'); // Force hardware acceleration
        }

        /**
         * Animate node expansion
         * @param {string} nodeId - Node identifier
         * @param {Object} expansionData - Data for expanded content
         * @param {number} duration - Animation duration override
         */
        animateNodeExpansion(nodeId, expansionData, duration = null) {
            if (!this.isInitialized || !this.rootGroup) return;

            const animationDuration = this.respectReducedMotion ? 
                this.config.reducedMotionDuration : 
                (duration || this.config.expandDuration);

            const nodeSelection = this.rootGroup.selectAll('.node')
                .filter(d => this.getNodeId(d) === nodeId);

            if (nodeSelection.empty()) {
                if (Debug?.log) {
                    Debug.log('warn', `Node ${nodeId} not found for expansion animation`);
                }
                return;
            }

            // Track animation
            this.stats.animationsStarted++;
            this.activeAnimations.set(nodeId, {
                type: 'expansion',
                startTime: performance.now(),
                duration: animationDuration
            });

            // Create expanded content elements
            const expandedElements = this.createExpandedContent(nodeSelection, expansionData);

            // Animate expansion
            this.performExpansionAnimation(nodeSelection, expandedElements, animationDuration)
                .then(() => {
                    this.activeAnimations.delete(nodeId);
                    this.stats.animationsCompleted++;
                    
                    if (EventBus) {
                        EventBus.emit('d3-animations:expansion-complete', {
                            nodeId,
                            duration: performance.now() - this.activeAnimations.get(nodeId)?.startTime
                        });
                    }
                })
                .catch(error => {
                    if (Debug?.log) {
                        Debug.log('error', 'Expansion animation failed', { nodeId, error });
                    }
                });
        }

        /**
         * Animate node collapse
         * @param {string} nodeId - Node identifier
         * @param {number} duration - Animation duration override
         */
        animateNodeCollapse(nodeId, duration = null) {
            if (!this.isInitialized || !this.rootGroup) return;

            const animationDuration = this.respectReducedMotion ? 
                this.config.reducedMotionDuration : 
                (duration || this.config.collapseDuration);

            const nodeSelection = this.rootGroup.selectAll('.node')
                .filter(d => this.getNodeId(d) === nodeId);

            if (nodeSelection.empty()) return;

            // Track animation
            this.stats.animationsStarted++;
            this.activeAnimations.set(nodeId, {
                type: 'collapse',
                startTime: performance.now(),
                duration: animationDuration
            });

            // Animate collapse
            this.performCollapseAnimation(nodeSelection, animationDuration)
                .then(() => {
                    this.activeAnimations.delete(nodeId);
                    this.stats.animationsCompleted++;
                    
                    if (EventBus) {
                        EventBus.emit('d3-animations:collapse-complete', {
                            nodeId,
                            duration: performance.now() - this.activeAnimations.get(nodeId)?.startTime
                        });
                    }
                })
                .catch(error => {
                    if (Debug?.log) {
                        Debug.log('error', 'Collapse animation failed', { nodeId, error });
                    }
                });
        }

        /**
         * Animate bulk expansion with staggered timing
         * @param {Array} nodeIds - Array of node identifiers
         * @param {number} staggerDelay - Delay between animations
         */
        animateBulkExpansion(nodeIds, staggerDelay = null) {
            const delay = staggerDelay || this.config.staggerDelay;
            
            nodeIds.forEach((nodeId, index) => {
                setTimeout(() => {
                    this.animateNodeExpansion(nodeId);
                }, index * delay);
            });
        }

        /**
         * Animate bulk collapse with staggered timing
         * @param {Array} nodeIds - Array of node identifiers
         * @param {number} staggerDelay - Delay between animations
         */
        animateBulkCollapse(nodeIds, staggerDelay = null) {
            const delay = staggerDelay || this.config.staggerDelay;
            
            nodeIds.forEach((nodeId, index) => {
                setTimeout(() => {
                    this.animateNodeCollapse(nodeId);
                }, index * delay);
            });
        }

        /**
         * Create expanded content elements
         * @param {d3.Selection} nodeSelection - Selected node
         * @param {Object} expansionData - Expansion content data
         * @returns {d3.Selection} Created elements
         */
        createExpandedContent(nodeSelection, expansionData) {
            const expandedGroup = nodeSelection.append('g')
                .attr('class', 'expanded-content')
                .style('opacity', 0)
                .style('transform', 'scale(0.1)')
                .style('transform-origin', 'center');

            // Add different content based on type
            if (expansionData.type === 'list') {
                this.createListExpansion(expandedGroup, expansionData);
            } else if (expansionData.type === 'table') {
                this.createTableExpansion(expandedGroup, expansionData);
            } else if (expansionData.type === 'code') {
                this.createCodeExpansion(expandedGroup, expansionData);
            } else {
                this.createTextExpansion(expandedGroup, expansionData);
            }

            return expandedGroup;
        }

        /**
         * Create list expansion content
         * @param {d3.Selection} container - Container for content
         * @param {Object} listData - List data
         */
        createListExpansion(container, listData) {
            const listGroup = container.append('g')
                .attr('class', 'list-expansion')
                .attr('transform', 'translate(20, 20)');

            // Create list items with proper spacing
            listData.items.forEach((item, index) => {
                const itemGroup = listGroup.append('g')
                    .attr('class', 'list-item')
                    .attr('transform', `translate(0, ${index * 20})`);

                // Add bullet point
                itemGroup.append('circle')
                    .attr('r', 2)
                    .attr('fill', 'currentColor')
                    .attr('opacity', 0.7);

                // Add item text
                itemGroup.append('text')
                    .attr('x', 10)
                    .attr('dy', '0.35em')
                    .style('font-size', '11px')
                    .style('fill', 'currentColor')
                    .text(item.text || '');
            });
        }

        /**
         * Create table expansion content
         * @param {d3.Selection} container - Container for content
         * @param {Object} tableData - Table data
         */
        createTableExpansion(container, tableData) {
            const tableGroup = container.append('g')
                .attr('class', 'table-expansion')
                .attr('transform', 'translate(20, 20)');

            // Simple table representation
            tableGroup.append('rect')
                .attr('width', 150)
                .attr('height', 80)
                .attr('fill', 'none')
                .attr('stroke', 'currentColor')
                .attr('stroke-width', 1)
                .attr('opacity', 0.5);

            tableGroup.append('text')
                .attr('x', 75)
                .attr('y', 40)
                .attr('text-anchor', 'middle')
                .attr('dy', '0.35em')
                .style('font-size', '10px')
                .style('fill', 'currentColor')
                .text(`Table (${tableData.rows || 0} rows)`);
        }

        /**
         * Create code expansion content
         * @param {d3.Selection} container - Container for content
         * @param {Object} codeData - Code data
         */
        createCodeExpansion(container, codeData) {
            const codeGroup = container.append('g')
                .attr('class', 'code-expansion')
                .attr('transform', 'translate(20, 20)');

            // Code block representation
            codeGroup.append('rect')
                .attr('width', 200)
                .attr('height', 60)
                .attr('fill', 'rgba(0, 0, 0, 0.05)')
                .attr('stroke', 'currentColor')
                .attr('stroke-width', 1)
                .attr('rx', 4);

            codeGroup.append('text')
                .attr('x', 10)
                .attr('y', 20)
                .style('font-family', 'monospace')
                .style('font-size', '9px')
                .style('fill', 'currentColor')
                .text(codeData.language || 'code');

            // Show first few lines
            const lines = (codeData.content || '').split('\n').slice(0, 3);
            lines.forEach((line, index) => {
                codeGroup.append('text')
                    .attr('x', 10)
                    .attr('y', 35 + index * 12)
                    .style('font-family', 'monospace')
                    .style('font-size', '8px')
                    .style('fill', 'currentColor')
                    .text(line.substring(0, 25) + (line.length > 25 ? '...' : ''));
            });
        }

        /**
         * Create text expansion content
         * @param {d3.Selection} container - Container for content
         * @param {Object} textData - Text data
         */
        createTextExpansion(container, textData) {
            const textGroup = container.append('g')
                .attr('class', 'text-expansion')
                .attr('transform', 'translate(20, 20)');

            // Break text into lines
            const text = textData.content || textData.text || '';
            const lines = this.wrapText(text, 25);

            lines.forEach((line, index) => {
                textGroup.append('text')
                    .attr('x', 0)
                    .attr('y', index * 14)
                    .attr('dy', '0.35em')
                    .style('font-size', '10px')
                    .style('fill', 'currentColor')
                    .text(line);
            });
        }

        /**
         * Perform expansion animation
         * @param {d3.Selection} nodeSelection - Selected node
         * @param {d3.Selection} expandedElements - Elements to animate
         * @param {number} duration - Animation duration
         * @returns {Promise} Animation completion promise
         */
        performExpansionAnimation(nodeSelection, expandedElements, duration) {
            return new Promise((resolve, reject) => {
                try {
                    // Animate opacity and scale
                    expandedElements
                        .transition()
                        .duration(duration)
                        .ease(this.config.expandEasing)
                        .style('opacity', 1)
                        .style('transform', 'scale(1)')
                        .on('end', resolve);

                    // Animate node highlighting
                    nodeSelection.select('circle')
                        .transition()
                        .duration(duration / 2)
                        .style('stroke-width', 3)
                        .style('stroke', '#4f46e5')
                        .transition()
                        .duration(duration / 2)
                        .style('stroke-width', 2)
                        .style('stroke', '#fff');

                } catch (error) {
                    reject(error);
                }
            });
        }

        /**
         * Perform collapse animation
         * @param {d3.Selection} nodeSelection - Selected node
         * @param {number} duration - Animation duration
         * @returns {Promise} Animation completion promise
         */
        performCollapseAnimation(nodeSelection, duration) {
            return new Promise((resolve, reject) => {
                try {
                    const expandedContent = nodeSelection.select('.expanded-content');
                    
                    if (!expandedContent.empty()) {
                        expandedContent
                            .transition()
                            .duration(duration)
                            .ease(this.config.collapseEasing)
                            .style('opacity', 0)
                            .style('transform', 'scale(0.1)')
                            .on('end', () => {
                                expandedContent.remove();
                                resolve();
                            });
                    } else {
                        resolve();
                    }

                    // Brief node highlight
                    nodeSelection.select('circle')
                        .transition()
                        .duration(duration / 2)
                        .style('stroke-width', 3)
                        .style('stroke', '#ef4444')
                        .transition()
                        .duration(duration / 2)
                        .style('stroke-width', 2)
                        .style('stroke', '#fff');

                } catch (error) {
                    reject(error);
                }
            });
        }

        /**
         * Get node ID from D3 data
         * @param {Object} d - D3 node data
         * @returns {string} Node identifier
         */
        getNodeId(d) {
            return d.data.id || d.data.name || d.id || `node-${d.depth}-${d.index}`;
        }

        /**
         * Wrap text into lines
         * @param {string} text - Text to wrap
         * @param {number} maxLength - Maximum line length
         * @returns {Array} Array of text lines
         */
        wrapText(text, maxLength) {
            const words = text.split(' ');
            const lines = [];
            let currentLine = '';

            words.forEach(word => {
                if ((currentLine + word).length <= maxLength) {
                    currentLine += (currentLine ? ' ' : '') + word;
                } else {
                    if (currentLine) lines.push(currentLine);
                    currentLine = word;
                }
            });

            if (currentLine) lines.push(currentLine);
            return lines.slice(0, 5); // Limit to 5 lines
        }

        /**
         * Update animation theme
         * @param {Object} theme - New theme configuration
         */
        updateAnimationTheme(theme) {
            // Update colors based on theme
            if (this.rootGroup) {
                this.rootGroup.selectAll('.expanded-content')
                    .style('color', theme.colors?.text || 'currentColor');
            }
        }

        /**
         * Get animation statistics
         * @returns {Object} Animation performance stats
         */
        getStats() {
            return {
                ...this.stats,
                activeAnimations: this.activeAnimations.size,
                animationSuccessRate: this.stats.animationsCompleted / this.stats.animationsStarted || 0,
                reducedMotionEnabled: this.respectReducedMotion
            };
        }

        /**
         * Update configuration
         * @param {Object} newConfig - New configuration options
         */
        updateConfig(newConfig) {
            this.config = { ...this.config, ...newConfig };
            
            // Update reduced motion detection
            if (newConfig.respectReducedMotion !== undefined) {
                this.respectReducedMotion = newConfig.respectReducedMotion && 
                    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            }
        }

        /**
         * Clear all active animations
         */
        clearAnimations() {
            this.activeAnimations.clear();
            
            if (this.rootGroup) {
                this.rootGroup.selectAll('*').interrupt();
            }
        }

        /**
         * Destroy animation coordinator
         */
        destroy() {
            this.clearAnimations();
            this.svgElement = null;
            this.rootGroup = null;
            this.isInitialized = false;
        }
    }

    // Create global instance
    const d3AnimationCoordinator = new D3AnimationCoordinator();

    // Expose to global namespace
    if (typeof window !== 'undefined') {
        window.TreeInteraction = window.TreeInteraction || {};
        
        // D3 animations interface
        window.TreeInteraction.D3Animations = {
            init: d3AnimationCoordinator.init.bind(d3AnimationCoordinator),
            animateNodeExpansion: d3AnimationCoordinator.animateNodeExpansion.bind(d3AnimationCoordinator),
            animateNodeCollapse: d3AnimationCoordinator.animateNodeCollapse.bind(d3AnimationCoordinator),
            animateBulkExpansion: d3AnimationCoordinator.animateBulkExpansion.bind(d3AnimationCoordinator),
            updateConfig: d3AnimationCoordinator.updateConfig.bind(d3AnimationCoordinator),
            getStats: d3AnimationCoordinator.getStats.bind(d3AnimationCoordinator),
            clearAnimations: d3AnimationCoordinator.clearAnimations.bind(d3AnimationCoordinator),
            destroy: d3AnimationCoordinator.destroy.bind(d3AnimationCoordinator),
            
            // Getters
            get isInitialized() { return d3AnimationCoordinator.isInitialized; },
            get config() { return d3AnimationCoordinator.config; },
            get stats() { return d3AnimationCoordinator.getStats(); }
        };

        if (Debug?.log) {
            Debug.log('info', 'D3 Animations module loaded', {
                globalInterface: 'window.TreeInteraction.D3Animations'
            });
        }
    } else if (typeof module !== 'undefined' && module.exports) {
        // Node.js environment support
        module.exports = { 
            D3AnimationCoordinator, 
            AnimationConfig 
        };
    }

})();