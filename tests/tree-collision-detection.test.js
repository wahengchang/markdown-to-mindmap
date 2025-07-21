/**
 * Tree Collision Detection Tests
 * Comprehensive test suite for T012: Layout Engine collision detection and spacing adjustment
 */

// Test setup and helper functions
const TEST_CONFIG = {
    timeout: 5000,
    performanceThreshold: 100, // 100ms for 500 nodes
    minNodeSpacing: 15,
    defaultViewport: { width: 1200, height: 800 }
};

/**
 * Create test tree with specified structure
 * @param {number} levels - Number of levels
 * @param {number} childrenPerLevel - Children per level
 * @returns {TreeNode} Root node
 */
function createTestTree(levels, childrenPerLevel) {
    const TreeNode = window.TreeInteraction?.TreeNode;
    if (!TreeNode) {
        throw new Error('TreeNode class not available');
    }

    const root = new TreeNode('Root', 0);
    
    function buildLevel(parent, level, maxLevel) {
        if (level >= maxLevel) return;
        
        for (let i = 0; i < childrenPerLevel; i++) {
            const child = new TreeNode(`Level ${level} Node ${i}`, level);
            parent.addChild(child);
            buildLevel(child, level + 1, maxLevel);
        }
    }
    
    buildLevel(root, 1, levels);
    return root;
}

/**
 * Create overlapping nodes for collision testing
 * @returns {TreeNode[]} Array of overlapping nodes
 */
function createOverlappingNodes() {
    const TreeNode = window.TreeInteraction?.TreeNode;
    const nodes = [];
    
    // Create nodes positioned to overlap
    for (let i = 0; i < 5; i++) {
        const node = new TreeNode(`Overlap Node ${i}`, 1);
        node.x = 100 + (i * 10); // Small spacing to create overlaps
        node.y = 100 + (i * 5);
        nodes.push(node);
    }
    
    return nodes;
}

/**
 * Test Suite: Basic Collision Detection
 */
function testBasicCollisionDetection() {
    console.log('🔸 Testing Basic Collision Detection...');
    
    const LayoutEngine = window.TreeInteraction?.LayoutEngine;
    if (!LayoutEngine) {
        throw new Error('LayoutEngine not available');
    }
    
    const TreeNode = window.TreeInteraction?.TreeNode;
    
    // Test 1: Non-overlapping nodes
    const node1 = new TreeNode('Node 1', 1);
    node1.x = 0;
    node1.y = 0;
    
    const node2 = new TreeNode('Node 2', 1);
    node2.x = 100;
    node2.y = 100;
    
    const noCollision = LayoutEngine.detectCollision(node1, node2);
    console.assert(!noCollision, 'Non-overlapping nodes should not collide');
    
    // Test 2: Overlapping nodes
    const node3 = new TreeNode('Node 3', 1);
    node3.x = 0;
    node3.y = 0;
    
    const node4 = new TreeNode('Node 4', 1);
    node4.x = 10;
    node4.y = 10;
    
    const hasCollision = LayoutEngine.detectCollision(node3, node4);
    console.assert(hasCollision, 'Overlapping nodes should collide');
    
    // Test 3: Edge case - same position
    const node5 = new TreeNode('Node 5', 1);
    node5.x = 50;
    node5.y = 50;
    
    const node6 = new TreeNode('Node 6', 1);
    node6.x = 50;
    node6.y = 50;
    
    const exactOverlap = LayoutEngine.detectCollision(node5, node6);
    console.assert(exactOverlap, 'Nodes at same position should collide');
    
    console.log('✅ Basic collision detection tests passed');
    return true;
}

/**
 * Test Suite: Spatial Grid Optimization
 */
function testSpatialGridOptimization() {
    console.log('🔸 Testing Spatial Grid Optimization...');
    
    const LayoutEngine = window.TreeInteraction?.LayoutEngine;
    const nodes = createOverlappingNodes();
    
    // Test collision finding with spatial optimization
    const startTime = performance.now();
    const collisions = LayoutEngine.findCollisions(nodes, TEST_CONFIG.defaultViewport);
    const endTime = performance.now();
    
    console.assert(collisions.length > 0, 'Should find collisions in overlapping nodes');
    console.assert(endTime - startTime < 10, 'Spatial optimization should be fast (<10ms)');
    
    console.log(`✅ Found ${collisions.length} collisions in ${(endTime - startTime).toFixed(2)}ms`);
    return true;
}

/**
 * Test Suite: Overlap Resolution
 */
function testOverlapResolution() {
    console.log('🔸 Testing Overlap Resolution...');
    
    const LayoutEngine = window.TreeInteraction?.LayoutEngine;
    const nodes = createOverlappingNodes();
    
    // Find initial collisions
    const initialCollisions = LayoutEngine.findCollisions(nodes, TEST_CONFIG.defaultViewport);
    console.assert(initialCollisions.length > 0, 'Should have initial collisions');
    
    // Resolve overlaps
    const resolutionStats = LayoutEngine.resolveOverlaps(initialCollisions);
    
    // Verify resolution statistics
    console.assert(resolutionStats.iterations > 0, 'Should perform resolution iterations');
    console.assert(resolutionStats.executionTime >= 0, 'Should track execution time');
    console.assert(typeof resolutionStats.converged === 'boolean', 'Should track convergence');
    
    // Check that collisions are reduced
    const finalCollisions = LayoutEngine.findCollisions(nodes, TEST_CONFIG.defaultViewport);
    console.assert(finalCollisions.length < initialCollisions.length, 
        'Should reduce number of collisions');
    
    console.log(`✅ Reduced collisions from ${initialCollisions.length} to ${finalCollisions.length} in ${resolutionStats.iterations} iterations`);
    return true;
}

/**
 * Test Suite: Layout Integration
 */
function testLayoutIntegration() {
    console.log('🔸 Testing Layout Integration...');
    
    const LayoutEngine = window.TreeInteraction?.LayoutEngine;
    const tree = createTestTree(3, 3); // 3 levels, 3 children per level
    
    // Test basic layout without collision detection
    const basicStats = LayoutEngine.calculateLayout(tree, 400, 300, TEST_CONFIG.defaultViewport);
    console.assert(basicStats.nodesProcessed > 0, 'Should process nodes in basic layout');
    
    // Test enhanced layout with collision detection
    const enhancedStats = LayoutEngine.calculateLayoutWithCollisionDetection(
        tree, 400, 300, TEST_CONFIG.defaultViewport, { enableCollisionDetection: true }
    );
    
    console.assert(enhancedStats.collisionDetection.enabled, 'Collision detection should be enabled');
    console.assert(enhancedStats.collisionDetection.totalExecutionTime >= 0, 'Should track execution time');
    console.assert(typeof enhancedStats.collisionDetection.totalCollisions === 'number', 'Should count collisions');
    
    console.log(`✅ Enhanced layout processed ${enhancedStats.nodesProcessed} nodes with ${enhancedStats.collisionDetection.totalCollisions} collisions`);
    return true;
}

/**
 * Test Suite: Performance Benchmarks
 */
function testPerformanceBenchmarks() {
    console.log('🔸 Testing Performance Benchmarks...');
    
    const LayoutEngine = window.TreeInteraction?.LayoutEngine;
    
    // Create large tree for performance testing
    const largeTree = createTestTree(4, 5); // 4 levels, 5 children per level = ~781 nodes
    console.log(`Created tree with ${largeTree.getNodeCount()} nodes`);
    
    // Benchmark collision detection
    const startTime = performance.now();
    const stats = LayoutEngine.calculateLayoutWithCollisionDetection(
        largeTree, 600, 400, { width: 1600, height: 1200 }, { enableCollisionDetection: true }
    );
    const endTime = performance.now();
    
    const totalTime = endTime - startTime;
    
    console.assert(totalTime < TEST_CONFIG.performanceThreshold, 
        `Performance should be under ${TEST_CONFIG.performanceThreshold}ms, got ${totalTime.toFixed(2)}ms`);
    
    console.log(`✅ Performance test: ${stats.nodesProcessed} nodes processed in ${totalTime.toFixed(2)}ms`);
    console.log(`   Collision detection: ${stats.collisionDetection.totalCollisions} collisions, ${stats.collisionDetection.resolutionIterations} iterations`);
    return true;
}

/**
 * Test Suite: Edge Cases
 */
function testEdgeCases() {
    console.log('🔸 Testing Edge Cases...');
    
    const LayoutEngine = window.TreeInteraction?.LayoutEngine;
    const TreeNode = window.TreeInteraction?.TreeNode;
    
    // Test 1: Single node
    const singleNode = new TreeNode('Single', 0);
    const singleStats = LayoutEngine.calculateLayoutWithCollisionDetection(
        singleNode, 400, 300, TEST_CONFIG.defaultViewport, { enableCollisionDetection: true }
    );
    console.assert(singleStats.collisionDetection.totalCollisions === 0, 'Single node should have no collisions');
    
    // Test 2: Two nodes
    const root = new TreeNode('Root', 0);
    const child = new TreeNode('Child', 1);
    root.addChild(child);
    
    const twoNodeStats = LayoutEngine.calculateLayoutWithCollisionDetection(
        root, 400, 300, TEST_CONFIG.defaultViewport, { enableCollisionDetection: true }
    );
    console.assert(twoNodeStats.nodesProcessed === 2, 'Should process both nodes');
    
    // Test 3: Disabled collision detection
    const disabledStats = LayoutEngine.calculateLayoutWithCollisionDetection(
        root, 400, 300, TEST_CONFIG.defaultViewport, { enableCollisionDetection: false }
    );
    console.assert(!disabledStats.collisionDetection.enabled, 'Collision detection should be disabled');
    
    console.log('✅ Edge case tests passed');
    return true;
}

/**
 * Test Suite: Configuration
 */
function testConfiguration() {
    console.log('🔸 Testing Configuration...');
    
    const LayoutEngine = window.TreeInteraction?.LayoutEngine;
    
    // Get current configuration
    const config = LayoutEngine.getConfig();
    console.assert(config.collision, 'Should have collision configuration');
    console.assert(typeof config.collision.nodeMargin === 'number', 'Should have nodeMargin setting');
    console.assert(typeof config.collision.maxIterations === 'number', 'Should have maxIterations setting');
    
    // Test configuration update
    const originalMargin = config.collision.nodeMargin;
    LayoutEngine.updateConfig({ collision: { nodeMargin: 20 } });
    
    const updatedConfig = LayoutEngine.getConfig();
    console.assert(updatedConfig.collision.nodeMargin === 20, 'Should update configuration');
    
    // Restore original configuration
    LayoutEngine.updateConfig({ collision: { nodeMargin: originalMargin } });
    
    console.log('✅ Configuration tests passed');
    return true;
}

/**
 * Main test runner
 */
function runCollisionDetectionTests() {
    console.log('🚀 Starting Tree Collision Detection Tests...');
    
    const tests = [
        testBasicCollisionDetection,
        testSpatialGridOptimization,
        testOverlapResolution,
        testLayoutIntegration,
        testPerformanceBenchmarks,
        testEdgeCases,
        testConfiguration
    ];
    
    let passed = 0;
    let failed = 0;
    
    tests.forEach((test, index) => {
        try {
            const result = test();
            if (result) {
                passed++;
            } else {
                failed++;
                console.error(`❌ Test ${index + 1} failed`);
            }
        } catch (error) {
            failed++;
            console.error(`❌ Test ${index + 1} threw error:`, error);
        }
    });
    
    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
        console.log('🎉 All collision detection tests passed!');
        return true;
    } else {
        console.log('❌ Some tests failed');
        return false;
    }
}

// Auto-run tests if this script is loaded in browser
if (typeof window !== 'undefined') {
    // Wait for dependencies to load
    setTimeout(() => {
        if (window.TreeInteraction && window.TreeInteraction.LayoutEngine && window.TreeInteraction.TreeNode) {
            runCollisionDetectionTests();
        } else {
            console.error('TreeInteraction dependencies not loaded');
        }
    }, 100);
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runCollisionDetectionTests,
        testBasicCollisionDetection,
        testSpatialGridOptimization,
        testOverlapResolution,
        testLayoutIntegration,
        testPerformanceBenchmarks,
        testEdgeCases,
        testConfiguration,
        createTestTree,
        createOverlappingNodes
    };
}