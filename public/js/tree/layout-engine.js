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
        },
        // Collision detection configuration
        collision: {
            enabled: true,
            nodeMargin: 15,
            maxIterations: 50,
            spatialGridSize: 100,
            forceStrength: 0.1,
            convergenceThreshold: 1.0,
            preserveHierarchy: true,
            adaptiveSpacing: true,
            nodeRadius: 25 // Default node radius for collision calculations
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

    /**
     * Collision Detection Functions
     */

    /**
     * Detect collision between two nodes
     * @param {TreeNode} node1 - First node
     * @param {TreeNode} node2 - Second node
     * @param {number} margin - Minimum distance between nodes
     * @returns {boolean} True if nodes are colliding
     */
    function detectCollision(node1, node2, margin = LayoutConfig.collision.nodeMargin) {
        if (!node1 || !node2 || node1 === node2) return false;
        
        const dx = node1.x - node2.x;
        const dy = node1.y - node2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (LayoutConfig.collision.nodeRadius * 2) + margin;
        
        return distance < minDistance;
    }

    /**
     * Create spatial grid for efficient collision detection
     * @param {Object} viewport - Viewport dimensions {width, height}
     * @param {number} cellSize - Size of each grid cell
     * @returns {Object} Spatial grid structure
     */
    function createSpatialGrid(viewport, cellSize = LayoutConfig.collision.spatialGridSize) {
        const grid = {
            cellSize,
            cols: Math.ceil(viewport.width / cellSize),
            rows: Math.ceil(viewport.height / cellSize),
            cells: new Map()
        };
        
        return grid;
    }

    /**
     * Add node to spatial grid
     * @param {Object} grid - Spatial grid
     * @param {TreeNode} node - Node to add
     */
    function addToGrid(grid, node) {
        const col = Math.floor(node.x / grid.cellSize);
        const row = Math.floor(node.y / grid.cellSize);
        const key = `${col},${row}`;
        
        if (!grid.cells.has(key)) {
            grid.cells.set(key, []);
        }
        grid.cells.get(key).push(node);
    }

    /**
     * Get nearby nodes from spatial grid
     * @param {Object} grid - Spatial grid
     * @param {TreeNode} node - Reference node
     * @returns {TreeNode[]} Nearby nodes
     */
    function getNearbyNodes(grid, node) {
        const nearby = [];
        const col = Math.floor(node.x / grid.cellSize);
        const row = Math.floor(node.y / grid.cellSize);
        
        // Check 3x3 grid around the node
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const checkCol = col + i;
                const checkRow = row + j;
                const key = `${checkCol},${checkRow}`;
                
                if (grid.cells.has(key)) {
                    nearby.push(...grid.cells.get(key));
                }
            }
        }
        
        return nearby.filter(n => n !== node);
    }

    /**
     * Find all colliding node pairs
     * @param {TreeNode[]} nodes - Array of all nodes
     * @param {Object} viewport - Viewport dimensions
     * @returns {Array} Array of colliding node pairs
     */
    function findCollisions(nodes, viewport) {
        const collisions = [];
        const grid = createSpatialGrid(viewport);
        
        // Populate spatial grid
        nodes.forEach(node => addToGrid(grid, node));
        
        // Check for collisions using spatial optimization
        nodes.forEach(node => {
            const nearby = getNearbyNodes(grid, node);
            nearby.forEach(other => {
                if (detectCollision(node, other) && !collisions.some(pair => 
                    (pair[0] === node && pair[1] === other) || 
                    (pair[0] === other && pair[1] === node))) {
                    collisions.push([node, other]);
                }
            });
        });
        
        return collisions;
    }

    /**
     * Resolve overlapping nodes using force-based adjustment
     * @param {Array} collisionPairs - Array of colliding node pairs
     * @param {number} iterations - Number of adjustment iterations
     * @returns {Object} Resolution statistics
     */
    function resolveOverlaps(collisionPairs, iterations = LayoutConfig.collision.maxIterations) {
        const startTime = performance.now();
        let resolved = 0;
        
        for (let iter = 0; iter < iterations; iter++) {
            let adjustmentMade = false;
            let maxAdjustment = 0;
            
            collisionPairs.forEach(([node1, node2]) => {
                if (!detectCollision(node1, node2)) return;
                
                const dx = node1.x - node2.x;
                const dy = node1.y - node2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance === 0) {
                    // Handle exact overlap with small random offset
                    const angle = Math.random() * 2 * Math.PI;
                    const offset = LayoutConfig.collision.nodeRadius + LayoutConfig.collision.nodeMargin;
                    node1.x += Math.cos(angle) * offset * 0.5;
                    node1.y += Math.sin(angle) * offset * 0.5;
                    node2.x -= Math.cos(angle) * offset * 0.5;
                    node2.y -= Math.sin(angle) * offset * 0.5;
                    adjustmentMade = true;
                    return;
                }
                
                const minDistance = (LayoutConfig.collision.nodeRadius * 2) + LayoutConfig.collision.nodeMargin;
                const overlap = minDistance - distance;
                
                if (overlap > 0) {
                    // Calculate unit vector
                    const ux = dx / distance;
                    const uy = dy / distance;
                    
                    // Apply force-based adjustment
                    const force = overlap * LayoutConfig.collision.forceStrength;
                    const adjustment = force * 0.5; // Split adjustment between both nodes
                    
                    node1.x += ux * adjustment;
                    node1.y += uy * adjustment;
                    node2.x -= ux * adjustment;
                    node2.y -= uy * adjustment;
                    
                    maxAdjustment = Math.max(maxAdjustment, adjustment);
                    adjustmentMade = true;
                }
            });
            
            // Check convergence
            if (!adjustmentMade || maxAdjustment < LayoutConfig.collision.convergenceThreshold) {
                resolved = iter + 1;
                break;
            }
        }
        
        const endTime = performance.now();
        return {
            iterations: resolved,
            executionTime: endTime - startTime,
            converged: resolved < iterations
        };
    }

    /**
     * Calculate layout with collision detection and resolution
     * @param {TreeNode} root - Root node of the tree
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate
     * @param {Object} viewport - Viewport dimensions
     * @param {Object} options - Layout options
     * @returns {Object} Enhanced layout statistics
     */
    function calculateLayoutWithCollisionDetection(root, centerX = 600, centerY = 400, viewport = null, options = {}) {
        const startTime = performance.now();
        
        // First, calculate basic layout
        const basicStats = calculateLayout(root, centerX, centerY, viewport);
        
        // Skip collision detection if disabled
        if (!LayoutConfig.collision.enabled || !options.enableCollisionDetection) {
            return { ...basicStats, collisionDetection: { enabled: false } };
        }
        
        // Collect all nodes for collision detection
        const allNodes = [];
        function collectNodes(node) {
            allNodes.push(node);
            if (node.children) {
                node.children.forEach(child => collectNodes(child));
            }
        }
        collectNodes(root);
        
        // Find and resolve collisions
        const viewportBounds = viewport || LayoutConfig.defaultViewport;
        const collisions = findCollisions(allNodes, viewportBounds);
        
        let resolutionStats = { iterations: 0, executionTime: 0, converged: true };
        if (collisions.length > 0) {
            resolutionStats = resolveOverlaps(collisions);
        }
        
        const endTime = performance.now();
        
        // Enhanced statistics
        const enhancedStats = {
            ...basicStats,
            collisionDetection: {
                enabled: true,
                totalCollisions: collisions.length,
                resolutionIterations: resolutionStats.iterations,
                resolutionTime: resolutionStats.executionTime,
                converged: resolutionStats.converged,
                totalExecutionTime: endTime - startTime
            }
        };
        
        // Log performance if debug utilities are available
        if (typeof window !== 'undefined' && window.TreeInteraction?.Utils?.Debug?.log) {
            window.TreeInteraction.Utils.Debug.log('info', 
                `Enhanced layout with collision detection completed: ${collisions.length} collisions resolved in ${resolutionStats.iterations} iterations (${(endTime - startTime).toFixed(2)}ms total)`);
        }
        
        return enhancedStats;
    }

    // Expose layout engine to global namespace
    if (typeof window !== 'undefined') {
        window.TreeInteraction = window.TreeInteraction || {};
        window.TreeInteraction.LayoutEngine = {
            calculateLayout,
            calculateLayoutWithCollisionDetection,
            positionRadially,
            detectCollision,
            findCollisions,
            resolveOverlaps,
            getConfig,
            updateConfig,
            calculateOptimalViewport
        };
    } else if (typeof module !== 'undefined' && module.exports) {
        // Node.js environment support
        module.exports = {
            calculateLayout,
            calculateLayoutWithCollisionDetection,
            positionRadially,
            detectCollision,
            findCollisions,
            resolveOverlaps,
            getConfig,
            updateConfig,
            calculateOptimalViewport
        };
    }

})();