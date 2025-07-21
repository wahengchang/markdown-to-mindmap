/**
 * Expansion Controls Tests
 * Comprehensive test suite for T013: Build node expansion/collapse controls with animations
 */

// Test configuration
const TEST_CONFIG = {
    timeout: 3000,
    animationDuration: 250,
    staggerDelay: 50,
    animationTolerance: 50 // ms tolerance for animation timing
};

/**
 * Create test DOM structure with expandable nodes
 * @returns {HTMLElement} Test container
 */
function createTestDOM() {
    const container = document.createElement('div');
    container.id = 'test-expansion-container';
    container.className = 'mindmap-container';
    
    // Create sample nodes with parent-child relationships
    const nodesData = [
        { id: 'root', text: 'Root Node', level: 0, hasChildren: true, parentId: null },
        { id: 'child1', text: 'Child Node 1', level: 1, hasChildren: true, parentId: 'root' },
        { id: 'child2', text: 'Child Node 2', level: 1, hasChildren: false, parentId: 'root' },
        { id: 'grandchild1', text: 'Grandchild 1', level: 2, hasChildren: false, parentId: 'child1' },
        { id: 'grandchild2', text: 'Grandchild 2', level: 2, hasChildren: true, parentId: 'child1' }
    ];
    
    nodesData.forEach(nodeData => {
        const nodeElement = document.createElement('div');
        nodeElement.className = 'mindmap-node';
        nodeElement.setAttribute('data-node-id', nodeData.id);
        nodeElement.setAttribute('data-node-text', nodeData.text);
        nodeElement.setAttribute('data-node-level', nodeData.level);
        nodeElement.setAttribute('data-has-children', nodeData.hasChildren);
        
        if (nodeData.parentId) {
            nodeElement.setAttribute('data-parent-id', nodeData.parentId);
        }
        
        nodeElement.textContent = nodeData.text;
        nodeElement.style.position = 'relative';
        
        container.appendChild(nodeElement);
    });
    
    document.body.appendChild(container);
    return container;
}

/**
 * Clean up test DOM
 * @param {HTMLElement} container - Test container to remove
 */
function cleanupTestDOM(container) {
    if (container && container.parentNode) {
        container.parentNode.removeChild(container);
    }
}

/**
 * Wait for animation to complete
 * @param {number} duration - Animation duration to wait for
 * @returns {Promise} Promise that resolves after duration
 */
function waitForAnimation(duration = TEST_CONFIG.animationDuration) {
    return new Promise(resolve => setTimeout(resolve, duration + TEST_CONFIG.animationTolerance));
}

/**
 * Create mock reduced motion media query
 * @param {boolean} matches - Whether reduced motion is preferred
 */
function mockReducedMotion(matches) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
            matches: query === '(prefers-reduced-motion: reduce)' ? matches : false,
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        })),
    });
}

/**
 * Test Suite: Initialization and Setup
 */
function testInitializationAndSetup() {
    console.log('🔸 Testing Initialization and Setup...');
    
    const container = createTestDOM();
    const ExpansionControls = window.TreeInteraction?.ExpansionControls;
    
    try {
        console.assert(ExpansionControls, 'ExpansionControls should be available');
        console.assert(typeof ExpansionControls.init === 'function', 'Should have init method');
        
        // Test initialization
        ExpansionControls.init(container, {
            controlType: 'chevron',
            duration: 200
        });
        
        console.assert(ExpansionControls.isInitialized, 'Should be initialized');
        console.assert(ExpansionControls.config.duration === 200, 'Should apply custom config');
        
        // Test styles are injected
        const styleElement = document.getElementById('expansion-controls-styles');
        console.assert(styleElement, 'Should inject CSS styles');
        console.assert(styleElement.textContent.includes('.expansion-control'), 'Should include control styles');
        
        console.log('✅ Initialization and setup tests passed');
        return true;
        
    } finally {
        ExpansionControls.destroy();
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: Control Creation
 */
function testControlCreation() {
    console.log('🔸 Testing Control Creation...');
    
    const container = createTestDOM();
    const ExpansionControls = window.TreeInteraction.ExpansionControls;
    
    try {
        ExpansionControls.init(container);
        
        // Check that controls are created for nodes with children
        const rootNode = container.querySelector('[data-node-id="root"]');
        const child1Node = container.querySelector('[data-node-id="child1"]');
        const child2Node = container.querySelector('[data-node-id="child2"]');
        
        const rootControl = rootNode.querySelector('.expansion-control');
        const child1Control = child1Node.querySelector('.expansion-control');
        const child2Control = child2Node.querySelector('.expansion-control');
        
        console.assert(rootControl, 'Root node should have expansion control');
        console.assert(child1Control, 'Child1 node should have expansion control');
        console.assert(!child2Control, 'Child2 node should not have expansion control (no children)');
        
        // Test control attributes
        console.assert(rootControl.getAttribute('data-node-id') === 'root', 'Control should have correct node ID');
        console.assert(rootControl.classList.contains('chevron'), 'Control should have chevron class');
        console.assert(rootControl.classList.contains('collapsed'), 'Control should start collapsed');
        console.assert(rootControl.getAttribute('aria-expanded') === 'false', 'Control should have correct aria-expanded');
        
        // Test stats
        const stats = ExpansionControls.getStats();
        console.assert(stats.controlsCreated >= 2, 'Should track created controls');
        console.assert(stats.activeControls >= 2, 'Should track active controls');
        
        console.log('✅ Control creation tests passed');
        return true;
        
    } finally {
        ExpansionControls.destroy();
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: Control Interaction
 */
async function testControlInteraction() {
    console.log('🔸 Testing Control Interaction...');
    
    const container = createTestDOM();
    const ExpansionControls = window.TreeInteraction.ExpansionControls;
    const NodeInteractions = window.TreeInteraction.NodeInteractions;
    const eventBus = window.MindmapEvents;
    
    try {
        ExpansionControls.init(container);
        NodeInteractions.registerNodeEvents(container);
        
        let expansionEvents = [];
        eventBus.on('node:expanded', (data) => expansionEvents.push({ type: 'expanded', data }));
        eventBus.on('node:collapsed', (data) => expansionEvents.push({ type: 'collapsed', data }));
        
        const rootNode = container.querySelector('[data-node-id="root"]');
        const rootControl = rootNode.querySelector('.expansion-control');
        
        console.assert(rootControl, 'Root control should exist');
        
        // Test click interaction
        rootControl.click();
        await waitForAnimation(100);
        
        console.assert(expansionEvents.length > 0, 'Click should trigger expansion event');
        console.assert(expansionEvents[0].type === 'expanded', 'Should expand node');
        console.assert(rootControl.classList.contains('expanded'), 'Control should show expanded state');
        console.assert(rootControl.getAttribute('aria-expanded') === 'true', 'Control should have correct aria-expanded');
        
        // Test collapse
        rootControl.click();
        await waitForAnimation(100);
        
        console.assert(expansionEvents.length === 2, 'Should have collapse event');
        console.assert(expansionEvents[1].type === 'collapsed', 'Should collapse node');
        console.assert(rootControl.classList.contains('collapsed'), 'Control should show collapsed state');
        
        console.log('✅ Control interaction tests passed');
        return true;
        
    } finally {
        ExpansionControls.destroy();
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: Keyboard Navigation
 */
async function testKeyboardNavigation() {
    console.log('🔸 Testing Keyboard Navigation...');
    
    const container = createTestDOM();
    const ExpansionControls = window.TreeInteraction.ExpansionControls;
    const eventBus = window.MindmapEvents;
    
    try {
        ExpansionControls.init(container);
        
        let expansionEvents = [];
        eventBus.on('node:expanded', (data) => expansionEvents.push(data));
        
        const rootNode = container.querySelector('[data-node-id="root"]');
        const rootControl = rootNode.querySelector('.expansion-control');
        
        // Test Enter key
        rootControl.focus();
        const enterEvent = new KeyboardEvent('keydown', { 
            key: 'Enter', 
            bubbles: true 
        });
        rootControl.dispatchEvent(enterEvent);
        
        await waitForAnimation(100);
        
        console.assert(expansionEvents.length > 0, 'Enter key should trigger expansion');
        
        // Test Space key
        expansionEvents = [];
        const spaceEvent = new KeyboardEvent('keydown', { 
            key: ' ', 
            bubbles: true 
        });
        rootControl.dispatchEvent(spaceEvent);
        
        await waitForAnimation(100);
        
        console.assert(expansionEvents.length > 0, 'Space key should trigger expansion');
        
        console.log('✅ Keyboard navigation tests passed');
        return true;
        
    } finally {
        ExpansionControls.destroy();
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: Animation System
 */
async function testAnimationSystem() {
    console.log('🔸 Testing Animation System...');
    
    const container = createTestDOM();
    const ExpansionControls = window.TreeInteraction.ExpansionControls;
    const eventBus = window.MindmapEvents;
    
    try {
        ExpansionControls.init(container, {
            duration: 200,
            enableStagger: true
        });
        
        let animationEvents = [];
        eventBus.on('expansion-animation:complete', (data) => animationEvents.push(data));
        
        const rootNode = container.querySelector('[data-node-id="root"]');
        
        // Test expansion animation
        const startTime = performance.now();
        ExpansionControls.updateExpansionState('root', true, true);
        
        // Check that animation class is applied
        console.assert(rootNode.classList.contains('expanding'), 'Node should have expanding class during animation');
        
        // Wait for animation to complete
        await waitForAnimation(200);
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.assert(!rootNode.classList.contains('expanding'), 'Animation class should be removed after completion');
        console.assert(animationEvents.length > 0, 'Animation completion event should be fired');
        console.assert(duration >= 200, `Animation should take at least 200ms, took ${duration.toFixed(2)}ms`);
        
        // Test collapse animation
        animationEvents = [];
        ExpansionControls.updateExpansionState('root', false, true);
        
        console.assert(rootNode.classList.contains('collapsing'), 'Node should have collapsing class during animation');
        
        await waitForAnimation(200);
        
        console.assert(!rootNode.classList.contains('collapsing'), 'Collapsing class should be removed');
        
        console.log('✅ Animation system tests passed');
        return true;
        
    } finally {
        ExpansionControls.destroy();
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: Control Types
 */
function testControlTypes() {
    console.log('🔸 Testing Control Types...');
    
    const container = createTestDOM();
    const ExpansionControls = window.TreeInteraction.ExpansionControls;
    const CONTROL_TYPES = window.TreeInteraction.CONTROL_TYPES;
    
    try {
        console.assert(CONTROL_TYPES, 'Control types should be available');
        console.assert(CONTROL_TYPES.CHEVRON, 'Should have CHEVRON type');
        console.assert(CONTROL_TYPES.PLUS_MINUS, 'Should have PLUS_MINUS type');
        console.assert(CONTROL_TYPES.TRIANGLE, 'Should have TRIANGLE type');
        
        // Test chevron type
        ExpansionControls.init(container, { controlType: CONTROL_TYPES.CHEVRON });
        let rootControl = container.querySelector('.expansion-control');
        console.assert(rootControl.classList.contains('chevron'), 'Should have chevron class');
        
        ExpansionControls.destroy();
        
        // Test plus-minus type
        ExpansionControls.init(container, { controlType: CONTROL_TYPES.PLUS_MINUS });
        rootControl = container.querySelector('.expansion-control');
        console.assert(rootControl.classList.contains('plus-minus'), 'Should have plus-minus class');
        
        ExpansionControls.destroy();
        
        // Test triangle type
        ExpansionControls.init(container, { controlType: CONTROL_TYPES.TRIANGLE });
        rootControl = container.querySelector('.expansion-control');
        console.assert(rootControl.classList.contains('triangle'), 'Should have triangle class');
        
        console.log('✅ Control types tests passed');
        return true;
        
    } finally {
        ExpansionControls.destroy();
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: Accessibility Features
 */
function testAccessibilityFeatures() {
    console.log('🔸 Testing Accessibility Features...');
    
    const container = createTestDOM();
    const ExpansionControls = window.TreeInteraction.ExpansionControls;
    
    try {
        ExpansionControls.init(container, { announceChanges: true });
        
        // Test ARIA attributes
        const rootControl = container.querySelector('.expansion-control');
        console.assert(rootControl.getAttribute('role') !== null || rootControl.tagName === 'BUTTON', 'Control should be focusable');
        console.assert(rootControl.hasAttribute('aria-expanded'), 'Control should have aria-expanded');
        console.assert(rootControl.hasAttribute('aria-label'), 'Control should have aria-label');
        console.assert(rootControl.getAttribute('tabindex') === '0', 'Control should be keyboard accessible');
        
        // Test focus management
        console.assert(document.activeElement !== rootControl, 'Control should not be focused initially');
        rootControl.focus();
        console.assert(document.activeElement === rootControl, 'Control should be focusable');
        
        // Test live region creation
        ExpansionControls.updateExpansionState('root', true);
        const liveRegion = document.getElementById('expansion-live-region');
        console.assert(liveRegion, 'Live region should be created for announcements');
        console.assert(liveRegion.getAttribute('aria-live') === 'polite', 'Live region should have aria-live=polite');
        
        console.log('✅ Accessibility features tests passed');
        return true;
        
    } finally {
        ExpansionControls.destroy();
        cleanupTestDOM(container);
        // Clean up live region
        const liveRegion = document.getElementById('expansion-live-region');
        if (liveRegion) {
            liveRegion.remove();
        }
    }
}

/**
 * Test Suite: Performance and Statistics
 */
async function testPerformanceAndStats() {
    console.log('🔸 Testing Performance and Statistics...');
    
    const container = createTestDOM();
    const ExpansionControls = window.TreeInteraction.ExpansionControls;
    
    try {
        ExpansionControls.init(container);
        
        // Get initial stats
        const initialStats = ExpansionControls.getStats();
        console.assert(typeof initialStats === 'object', 'Stats should be an object');
        console.assert(typeof initialStats.controlsCreated === 'number', 'Should track controls created');
        console.assert(typeof initialStats.animationsStarted === 'number', 'Should track animations started');
        
        // Test performance with multiple rapid animations
        const startTime = performance.now();
        
        for (let i = 0; i < 10; i++) {
            ExpansionControls.updateExpansionState('root', i % 2 === 0, true);
            ExpansionControls.updateExpansionState('child1', i % 2 === 1, true);
        }
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.assert(duration < 1000, `Multiple animations should complete quickly, took ${duration.toFixed(2)}ms`);
        
        // Wait for animations to complete
        await waitForAnimation(300);
        
        const finalStats = ExpansionControls.getStats();
        console.assert(finalStats.animationsStarted > initialStats.animationsStarted, 'Should track animation starts');
        console.assert(finalStats.averageAnimationTime > 0, 'Should track average animation time');
        
        console.log(`✅ Performance tests passed (${duration.toFixed(2)}ms for multiple animations)`);
        return true;
        
    } finally {
        ExpansionControls.destroy();
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: Reduced Motion Support
 */
function testReducedMotionSupport() {
    console.log('🔸 Testing Reduced Motion Support...');
    
    // Mock reduced motion preference
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = (query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => {}
    });
    
    const container = createTestDOM();
    const ExpansionControls = window.TreeInteraction.ExpansionControls;
    
    try {
        ExpansionControls.init(container, { respectReducedMotion: true });
        
        const stats = ExpansionControls.getStats();
        console.assert(stats.prefersReducedMotion, 'Should detect reduced motion preference');
        console.assert(ExpansionControls.config.duration === 0, 'Should disable animations when reduced motion is preferred');
        
        // Test that CSS includes reduced motion rules
        const styleElement = document.getElementById('expansion-controls-styles');
        console.assert(styleElement.textContent.includes('@media (prefers-reduced-motion: reduce)'), 'Should include reduced motion CSS');
        
        console.log('✅ Reduced motion support tests passed');
        return true;
        
    } finally {
        // Restore original matchMedia
        window.matchMedia = originalMatchMedia;
        ExpansionControls.destroy();
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: Integration with Node Interactions
 */
async function testIntegrationWithNodeInteractions() {
    console.log('🔸 Testing Integration with Node Interactions...');
    
    const container = createTestDOM();
    const ExpansionControls = window.TreeInteraction.ExpansionControls;
    const NodeInteractions = window.TreeInteraction.NodeInteractions;
    const eventBus = window.MindmapEvents;
    
    try {
        // Initialize both systems
        ExpansionControls.init(container);
        NodeInteractions.registerNodeEvents(container);
        
        let stateChanges = [];
        eventBus.on('node:expanded', (data) => stateChanges.push({ type: 'expanded', nodeId: data.nodeId }));
        eventBus.on('node:collapsed', (data) => stateChanges.push({ type: 'collapsed', nodeId: data.nodeId }));
        
        // Test that NodeInteractions expansion updates controls
        NodeInteractions.expandNode('root');
        await waitForAnimation(100);
        
        const rootControl = container.querySelector('[data-node-id="root"] .expansion-control');
        console.assert(rootControl.classList.contains('expanded'), 'Control should reflect NodeInteractions state');
        console.assert(stateChanges.length > 0, 'Should receive expansion events');
        
        // Test that control clicks work through NodeInteractions
        stateChanges = [];
        rootControl.click();
        await waitForAnimation(100);
        
        console.assert(stateChanges.length > 0, 'Control click should work through NodeInteractions');
        console.assert(rootControl.classList.contains('collapsed'), 'Control should update after click');
        
        console.log('✅ Integration with node interactions tests passed');
        return true;
        
    } finally {
        ExpansionControls.destroy();
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: Configuration and Updates
 */
function testConfigurationAndUpdates() {
    console.log('🔸 Testing Configuration and Updates...');
    
    const container = createTestDOM();
    const ExpansionControls = window.TreeInteraction.ExpansionControls;
    
    try {
        const customConfig = {
            duration: 300,
            controlType: 'plus-minus',
            position: 'right',
            enableStagger: false
        };
        
        ExpansionControls.init(container, customConfig);
        
        // Test initial configuration
        console.assert(ExpansionControls.config.duration === 300, 'Should apply custom duration');
        console.assert(ExpansionControls.config.controlType === 'plus-minus', 'Should apply custom control type');
        console.assert(ExpansionControls.config.position === 'right', 'Should apply custom position');
        
        // Test configuration update
        ExpansionControls.updateConfig({ duration: 500, enableStagger: true });
        
        console.assert(ExpansionControls.config.duration === 500, 'Should update duration');
        console.assert(ExpansionControls.config.enableStagger === true, 'Should update stagger setting');
        console.assert(ExpansionControls.config.controlType === 'plus-minus', 'Should preserve other settings');
        
        // Test refresh functionality
        const initialControlCount = ExpansionControls.getStats().activeControls;
        ExpansionControls.refresh();
        const refreshedControlCount = ExpansionControls.getStats().activeControls;
        
        console.assert(refreshedControlCount >= initialControlCount, 'Refresh should maintain or add controls');
        
        console.log('✅ Configuration and updates tests passed');
        return true;
        
    } finally {
        ExpansionControls.destroy();
        cleanupTestDOM(container);
    }
}

/**
 * Main test runner
 */
async function runExpansionControlsTests() {
    console.log('🚀 Starting Expansion Controls Tests...');
    
    const tests = [
        testInitializationAndSetup,
        testControlCreation,
        testControlInteraction,
        testKeyboardNavigation,
        testAnimationSystem,
        testControlTypes,
        testAccessibilityFeatures,
        testPerformanceAndStats,
        testReducedMotionSupport,
        testIntegrationWithNodeInteractions,
        testConfigurationAndUpdates
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            const result = await test();
            if (result) {
                passed++;
            } else {
                failed++;
                console.error(`❌ Test ${test.name} failed`);
            }
        } catch (error) {
            failed++;
            console.error(`❌ Test ${test.name} threw error:`, error);
        }
    }
    
    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
        console.log('🎉 All expansion controls tests passed!');
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
        if (window.TreeInteraction?.ExpansionControls && window.MindmapEvents) {
            runExpansionControlsTests();
        } else {
            console.error('Expansion controls dependencies not loaded');
        }
    }, 100);
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runExpansionControlsTests,
        testInitializationAndSetup,
        testControlCreation,
        testControlInteraction,
        testKeyboardNavigation,
        testAnimationSystem,
        testControlTypes,
        testAccessibilityFeatures,
        testPerformanceAndStats,
        testReducedMotionSupport,
        testIntegrationWithNodeInteractions,
        testConfigurationAndUpdates,
        createTestDOM,
        cleanupTestDOM,
        waitForAnimation
    };
}