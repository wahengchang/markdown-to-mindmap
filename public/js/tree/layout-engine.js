/**
 * Layout Engine Module - Radial layout algorithm for mindmap visualization
 * Extracted from index.html lines 625-709
 * Performance optimized for 500+ nodes in ≤100ms
 */
(function() {
    'use strict';

    // Import utilities for mathematical calculations
    const MathUtils = (typeof window !== 'undefined' && window.TreeInteraction?.Utils?.Math) || {};

    /**
     * Configuration for layout engine
     */
    const LayoutConfig = {
        baseRadius: 120,
        radiusIncrement: 90,
        minAngleSpacing: 0.6,
        baseAngleSpan: Math.PI / 3, // 60 degrees base
        depthReductionFactor: 0.1,
        minimumRadius: 40,
        radiusReductionFactor: 0.85,
        boundaryMargin: 100,
        defaultViewport: {
            width: 1200,
            height: 800
        }
    };

    /**
     * Calculate radial layout for the entire tree
     * @param {TreeNode} root - Root node of the tree
     * @param {number} centerX - Center X coordinate (default: 600)
     * @param {number} centerY - Center Y coordinate (default: 400)
     * @param {Object} viewport - Viewport dimensions {width, height}
     * @returns {Object} Layout statistics and metadata
     */
    function calculateLayout(root, centerX = 600, centerY = 400, viewport = null) {
        if (!root) {
            throw new Error('Root node is required for layout calculation');
        }

        const startTime = performance.now();
        const viewportBounds = viewport || LayoutConfig.defaultViewport;
        let nodesProcessed = 0;

        /**
         * Position nodes radially around their parent
         * @param {TreeNode} node - Current node to position
         * @param {number} angle - Angle from parent in radians
         * @param {number} radius - Distance from parent
         * @param {number} parentX - Parent X coordinate
         * @param {number} parentY - Parent Y coordinate
         */
        function positionRadially(node, angle = 0, radius = 0, parentX = centerX, parentY = centerY) {
            nodesProcessed++;

            if (node.text === 'Root') {
                // Position root at center
                node.x = centerX;
                node.y = centerY;
                
                // Distribute children around the center with optimal spacing
                const childCount = node.children.length;
                if (childCount === 0) return;

                const angleStep = (2 * Math.PI) / childCount;
                const startAngle = -Math.PI / 2; // Start at top
                
                node.children.forEach((child, index) => {
                    const childAngle = startAngle + index * angleStep;
                    positionRadially(child, childAngle, LayoutConfig.baseRadius, centerX, centerY);
                });
                return;
            }

            // Calculate position based on angle and radius
            node.x = parentX + radius * Math.cos(angle);
            node.y = parentY + radius * Math.sin(angle);

            // Position children with optimized spacing
            if (node.children.length > 0) {
                const childRadius = radius + LayoutConfig.radiusIncrement;
                
                // Calculate angle span based on number of children and depth
                const depthFactor = Math.max(0.5, 1 - (node.level * LayoutConfig.depthReductionFactor));
                const angleSpan = Math.max(
                    LayoutConfig.minAngleSpacing * node.children.length * depthFactor,
                    LayoutConfig.baseAngleSpan
                );
                
                const startAngle = angle - angleSpan / 2;
                const angleStep = node.children.length > 1 ? angleSpan / (node.children.length - 1) : 0;

                node.children.forEach((child, index) => {
                    const childAngle = startAngle + index * angleStep;
                    
                    // Calculate position with smart viewport constraints
                    let adjustedRadius = childRadius;
                    let childX, childY;
                    
                    // Calculate initial position
                    childX = node.x + adjustedRadius * Math.cos(childAngle);
                    childY = node.y + adjustedRadius * Math.sin(childAngle);
                    
                    // Apply bounds checking with margin
                    const margin = LayoutConfig.boundaryMargin;
                    const maxX = viewportBounds.width - margin;
                    const maxY = viewportBounds.height - margin;
                    
                    // If outside bounds, adjust position intelligently
                    if (childX < margin || childX > maxX || childY < margin || childY > maxY) {
                        // Reduce radius progressively until within bounds
                        while ((childX < margin || childX > maxX || childY < margin || childY > maxY) && 
                               adjustedRadius > LayoutConfig.minimumRadius) {
                            adjustedRadius *= LayoutConfig.radiusReductionFactor;
                            childX = node.x + adjustedRadius * Math.cos(childAngle);
                            childY = node.y + adjustedRadius * Math.sin(childAngle);
                        }
                        
                        // Final bounds clamping if still outside
                        childX = MathUtils.clamp ? 
                                MathUtils.clamp(childX, margin, maxX) :
                                Math.max(margin, Math.min(maxX, childX));
                        childY = MathUtils.clamp ? 
                                MathUtils.clamp(childY, margin, maxY) :
                                Math.max(margin, Math.min(maxY, childY));
                    }
                    
                    child.x = childX;
                    child.y = childY;
                    
                    // Continue positioning children recursively
                    positionRadially(child, childAngle, adjustedRadius, childX, childY);
                });
            }
        }

        // Start the layout process
        positionRadially(root);

        const endTime = performance.now();
        const layoutStats = {
            nodesProcessed,
            executionTime: endTime - startTime,
            centerPoint: { x: centerX, y: centerY },
            viewport: viewportBounds
        };

        // Log performance if debug utilities are available
        if (typeof window !== 'undefined' && window.TreeInteraction?.Utils?.Debug?.log) {
            window.TreeInteraction.Utils.Debug.log('info', 
                `Layout calculated for ${nodesProcessed} nodes in ${layoutStats.executionTime.toFixed(2)}ms`);
        }

        return layoutStats;
    }

    /**
     * Position a single node radially from its parent
     * @param {TreeNode} node - Node to position
     * @param {number} angle - Angle in radians
     * @param {number} radius - Distance from parent
     * @param {number} parentX - Parent X coordinate
     * @param {number} parentY - Parent Y coordinate
     */
    function positionRadially(node, angle, radius, parentX, parentY) {
        if (!node) {
            throw new Error('Node is required for radial positioning');
        }

        node.x = parentX + radius * Math.cos(angle);
        node.y = parentY + radius * Math.sin(angle);
    }

    /**
     * Get layout configuration
     * @returns {Object} Current layout configuration
     */
    function getConfig() {
        return { ...LayoutConfig };
    }

    /**
     * Update layout configuration
     * @param {Object} newConfig - Configuration updates
     */
    function updateConfig(newConfig) {
        Object.assign(LayoutConfig, newConfig);
    }

    /**
     * Calculate optimal viewport size for a tree
     * @param {TreeNode} root - Root node of the tree
     * @returns {Object} Recommended viewport dimensions
     */
    function calculateOptimalViewport(root) {
        if (!root) return LayoutConfig.defaultViewport;

        const maxDepth = getMaxDepth(root);
        const nodeCount = root.getNodeCount ? root.getNodeCount() : countNodes(root);
        
        // Estimate required space based on tree characteristics
        const estimatedRadius = LayoutConfig.baseRadius + (maxDepth * LayoutConfig.radiusIncrement);
        const requiredSize = (estimatedRadius * 2) + (LayoutConfig.boundaryMargin * 2);
        
        return {
            width: Math.max(LayoutConfig.defaultViewport.width, requiredSize),
            height: Math.max(LayoutConfig.defaultViewport.height, requiredSize)
        };
    }

    /**
     * Helper function to get maximum depth of tree
     * @param {TreeNode} node - Current node
     * @returns {number} Maximum depth
     */
    function getMaxDepth(node) {
        if (!node.children || node.children.length === 0) {
            return node.level || 0;
        }
        return Math.max(...node.children.map(child => getMaxDepth(child)));
    }

    /**
     * Helper function to count nodes in tree
     * @param {TreeNode} node - Current node
     * @returns {number} Total node count
     */
    function countNodes(node) {
        let count = 1;
        if (node.children) {
            for (let child of node.children) {
                count += countNodes(child);
            }
        }
        return count;
    }

    // Expose layout engine to global namespace
    if (typeof window !== 'undefined') {
        window.TreeInteraction = window.TreeInteraction || {};
        window.TreeInteraction.LayoutEngine = {
            calculateLayout,
            positionRadially,
            getConfig,
            updateConfig,
            calculateOptimalViewport
        };
    } else if (typeof module !== 'undefined' && module.exports) {
        // Node.js environment support
        module.exports = {
            calculateLayout,
            positionRadially,
            getConfig,
            updateConfig,
            calculateOptimalViewport
        };
    }

})();