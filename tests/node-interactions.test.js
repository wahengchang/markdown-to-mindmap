/**
 * Node Interaction Events Tests
 * Comprehensive test suite for T019: Handle node interaction events (click, hover, expand)
 */

// Test configuration
const TEST_CONFIG = {
    timeout: 3000,
    clickDelay: 200,
    hoverDelay: 300,
    debounceTime: 50
};

/**
 * Create test DOM structure with mock nodes
 * @returns {HTMLElement} Test container
 */
function createTestDOM() {
    const container = document.createElement('div');
    container.id = 'test-mindmap-container';
    container.setAttribute('role', 'tree');
    
    // Create sample nodes
    const nodes = [
        { id: 'node-1', text: 'Root Node', level: 0, type: 'text' },
        { id: 'node-2', text: 'Child Node 1', level: 1, type: 'text' },
        { id: 'node-3', text: 'Child Node 2', level: 1, type: 'table' },
        { id: 'node-4', text: 'Grandchild Node', level: 2, type: 'list' }
    ];
    
    nodes.forEach(nodeData => {
        const nodeElement = document.createElement('div');
        nodeElement.className = 'mindmap-node';
        nodeElement.setAttribute('data-node-id', nodeData.id);
        nodeElement.setAttribute('data-node-text', nodeData.text);
        nodeElement.setAttribute('data-node-level', nodeData.level);
        nodeElement.setAttribute('data-node-type', nodeData.type);
        nodeElement.setAttribute('tabindex', '0');
        nodeElement.setAttribute('role', 'treeitem');
        nodeElement.setAttribute('aria-selected', 'false');
        nodeElement.setAttribute('aria-expanded', 'false');
        nodeElement.textContent = nodeData.text;
        
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
 * Create mock event object
 * @param {string} type - Event type
 * @param {Object} options - Event options
 * @returns {Event} Mock event
 */
function createMockEvent(type, options = {}) {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, {
        clientX: options.clientX || 100,
        clientY: options.clientY || 100,
        ctrlKey: options.ctrlKey || false,
        shiftKey: options.shiftKey || false,
        altKey: options.altKey || false,
        target: options.target || null,
        ...options
    });
    return event;
}

/**
 * Wait for specified time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after delay
 */
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test Suite: Event Bus Integration
 */
function testEventBusIntegration() {
    console.log('🔸 Testing Event Bus Integration...');
    
    const eventBus = window.MindmapEvents;
    const NodeInteractions = window.TreeInteraction?.NodeInteractions;
    
    console.assert(eventBus, 'Event bus should be available at window.MindmapEvents');
    console.assert(NodeInteractions, 'Node interactions should be available');
    console.assert(typeof eventBus.emit === 'function', 'Event bus should have emit method');
    console.assert(typeof eventBus.on === 'function', 'Event bus should have on method');
    
    // Test event registration
    let eventReceived = false;
    const testHandler = () => { eventReceived = true; };
    
    eventBus.on('test:event', testHandler);
    eventBus.emit('test:event', { test: true });
    
    console.assert(eventReceived, 'Event should be received through event bus');
    
    eventBus.off('test:event', testHandler);
    
    console.log('✅ Event bus integration tests passed');
    return true;
}

/**
 * Test Suite: Node Click Events
 */
async function testNodeClickEvents() {
    console.log('🔸 Testing Node Click Events...');
    
    const container = createTestDOM();
    const NodeInteractions = window.TreeInteraction.NodeInteractions;
    const eventBus = window.MindmapEvents;
    
    try {
        // Register node events
        NodeInteractions.registerNodeEvents(container);
        
        let clickEventReceived = false;
        let clickData = null;
        
        // Listen for click events
        eventBus.on('node:click', (data) => {
            clickEventReceived = true;
            clickData = data;
        });
        
        // Get test node and simulate click
        const testNode = container.querySelector('[data-node-id="node-2"]');
        console.assert(testNode, 'Test node should exist');
        
        const clickEvent = createMockEvent('click', { target: testNode });
        testNode.dispatchEvent(clickEvent);
        
        // Wait for click delay
        await wait(TEST_CONFIG.clickDelay + 50);
        
        console.assert(clickEventReceived, 'Click event should be received');
        console.assert(clickData?.nodeId === 'node-2', 'Click event should contain correct node ID');
        console.assert(clickData?.nodeData, 'Click event should contain node data');
        
        // Test multi-select
        clickEventReceived = false;
        const ctrlClickEvent = createMockEvent('click', { 
            target: testNode, 
            ctrlKey: true 
        });
        testNode.dispatchEvent(ctrlClickEvent);
        
        await wait(TEST_CONFIG.clickDelay + 50);
        
        console.assert(clickEventReceived, 'Ctrl+click event should be received');
        console.assert(clickData?.multiSelect === true, 'Ctrl+click should be marked as multi-select');
        
        console.log('✅ Node click event tests passed');
        return true;
        
    } finally {
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: Node Selection Management
 */
function testNodeSelection() {
    console.log('🔸 Testing Node Selection Management...');
    
    const container = createTestDOM();
    const NodeInteractions = window.TreeInteraction.NodeInteractions;
    const eventBus = window.MindmapEvents;
    
    try {
        NodeInteractions.registerNodeEvents(container);
        
        let selectionEvents = [];
        eventBus.on('node:selected', (data) => selectionEvents.push({ type: 'selected', data }));
        eventBus.on('node:deselected', (data) => selectionEvents.push({ type: 'deselected', data }));
        
        // Test single selection
        NodeInteractions.selectNode('node-1');
        
        console.assert(NodeInteractions.selectedNodes.length === 1, 'Should have one selected node');
        console.assert(NodeInteractions.selectedNodes[0] === 'node-1', 'Should select correct node');
        
        const node1Element = container.querySelector('[data-node-id="node-1"]');
        console.assert(node1Element.classList.contains('selected'), 'Selected node should have selected class');
        console.assert(node1Element.getAttribute('aria-selected') === 'true', 'Selected node should have aria-selected=true');
        
        // Test multi-selection
        NodeInteractions.selectNode('node-2', true);
        console.assert(NodeInteractions.selectedNodes.length === 2, 'Should have two selected nodes');
        
        // Test deselection
        NodeInteractions.deselectNode('node-1');
        console.assert(NodeInteractions.selectedNodes.length === 1, 'Should have one selected node after deselection');
        console.assert(NodeInteractions.selectedNodes[0] === 'node-2', 'Should keep correct node selected');
        
        // Test clear selection
        NodeInteractions.clearSelection();
        console.assert(NodeInteractions.selectedNodes.length === 0, 'Should have no selected nodes after clear');
        
        console.log('✅ Node selection tests passed');
        return true;
        
    } finally {
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: Node Hover Events
 */
async function testNodeHoverEvents() {
    console.log('🔸 Testing Node Hover Events...');
    
    const container = createTestDOM();
    const NodeInteractions = window.TreeInteraction.NodeInteractions;
    const eventBus = window.MindmapEvents;
    
    try {
        NodeInteractions.registerNodeEvents(container);
        
        let hoverEvents = [];
        eventBus.on('node:hover:enter', (data) => hoverEvents.push({ type: 'enter', data }));
        eventBus.on('node:hover:exit', (data) => hoverEvents.push({ type: 'exit', data }));
        
        const testNode = container.querySelector('[data-node-id="node-3"]');
        
        // Simulate mouse enter
        const enterEvent = createMockEvent('mouseenter', { target: testNode });
        testNode.dispatchEvent(enterEvent);
        
        // Wait for hover delay
        await wait(TEST_CONFIG.hoverDelay + 50);
        
        console.assert(hoverEvents.length > 0, 'Hover enter event should be fired');
        console.assert(hoverEvents[0].type === 'enter', 'First event should be hover enter');
        console.assert(hoverEvents[0].data.nodeId === 'node-3', 'Hover event should have correct node ID');
        
        console.assert(testNode.classList.contains('hovered'), 'Hovered node should have hovered class');
        
        // Simulate mouse leave
        const leaveEvent = createMockEvent('mouseleave', { target: testNode });
        testNode.dispatchEvent(leaveEvent);
        
        // Wait for hover exit delay
        await wait(100 + 50);
        
        console.assert(hoverEvents.length === 2, 'Should have both enter and exit events');
        console.assert(hoverEvents[1].type === 'exit', 'Second event should be hover exit');
        
        console.log('✅ Node hover event tests passed');
        return true;
        
    } finally {
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: Node Expansion/Collapse
 */
function testNodeExpansion() {
    console.log('🔸 Testing Node Expansion/Collapse...');
    
    const container = createTestDOM();
    const NodeInteractions = window.TreeInteraction.NodeInteractions;
    const eventBus = window.MindmapEvents;
    
    try {
        NodeInteractions.registerNodeEvents(container);
        
        let expansionEvents = [];
        eventBus.on('node:expanded', (data) => expansionEvents.push({ type: 'expanded', data }));
        eventBus.on('node:collapsed', (data) => expansionEvents.push({ type: 'collapsed', data }));
        
        // Test expansion
        NodeInteractions.expandNode('node-2');
        
        console.assert(NodeInteractions.expandedNodes.length === 1, 'Should have one expanded node');
        console.assert(NodeInteractions.expandedNodes[0] === 'node-2', 'Should expand correct node');
        
        const node2Element = container.querySelector('[data-node-id="node-2"]');
        console.assert(node2Element.classList.contains('expanded'), 'Expanded node should have expanded class');
        console.assert(node2Element.getAttribute('aria-expanded') === 'true', 'Expanded node should have aria-expanded=true');
        
        console.assert(expansionEvents.length === 1, 'Should have one expansion event');
        console.assert(expansionEvents[0].type === 'expanded', 'Event should be expansion');
        
        // Test collapse
        NodeInteractions.collapseNode('node-2');
        
        console.assert(NodeInteractions.expandedNodes.length === 0, 'Should have no expanded nodes after collapse');
        console.assert(!node2Element.classList.contains('expanded'), 'Collapsed node should not have expanded class');
        console.assert(node2Element.getAttribute('aria-expanded') === 'false', 'Collapsed node should have aria-expanded=false');
        
        // Test toggle
        NodeInteractions.toggleNodeExpansion('node-3');
        console.assert(NodeInteractions.expandedNodes.includes('node-3'), 'Toggle should expand node');
        
        NodeInteractions.toggleNodeExpansion('node-3');
        console.assert(!NodeInteractions.expandedNodes.includes('node-3'), 'Toggle should collapse node');
        
        console.log('✅ Node expansion tests passed');
        return true;
        
    } finally {
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: Double-Click Events
 */
async function testDoubleClickEvents() {
    console.log('🔸 Testing Double-Click Events...');
    
    const container = createTestDOM();
    const NodeInteractions = window.TreeInteraction.NodeInteractions;
    const eventBus = window.MindmapEvents;
    
    try {
        NodeInteractions.registerNodeEvents(container);
        
        let doubleClickReceived = false;
        eventBus.on('node:double-click', () => { doubleClickReceived = true; });
        
        const testNode = container.querySelector('[data-node-id="node-4"]');
        
        // Simulate double-click
        const dblClickEvent = createMockEvent('dblclick', { target: testNode });
        testNode.dispatchEvent(dblClickEvent);
        
        await wait(50);
        
        console.assert(doubleClickReceived, 'Double-click event should be received');
        
        // Double-click should toggle expansion
        console.assert(NodeInteractions.expandedNodes.includes('node-4'), 'Double-click should expand node');
        
        console.log('✅ Double-click event tests passed');
        return true;
        
    } finally {
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: Context Menu Events
 */
function testContextMenuEvents() {
    console.log('🔸 Testing Context Menu Events...');
    
    const container = createTestDOM();
    const NodeInteractions = window.TreeInteraction.NodeInteractions;
    const eventBus = window.MindmapEvents;
    
    try {
        NodeInteractions.registerNodeEvents(container);
        
        let contextMenuReceived = false;
        let contextMenuData = null;
        
        eventBus.on('node:context-menu', (data) => {
            contextMenuReceived = true;
            contextMenuData = data;
        });
        
        const testNode = container.querySelector('[data-node-id="node-1"]');
        
        // Simulate right-click (context menu)
        const contextEvent = createMockEvent('contextmenu', { 
            target: testNode,
            clientX: 150,
            clientY: 200
        });
        testNode.dispatchEvent(contextEvent);
        
        console.assert(contextMenuReceived, 'Context menu event should be received');
        console.assert(contextMenuData?.nodeId === 'node-1', 'Context menu should have correct node ID');
        console.assert(contextMenuData?.position, 'Context menu should have position data');
        console.assert(contextMenuData?.position.x === 150, 'Context menu should have correct X position');
        console.assert(contextMenuData?.position.y === 200, 'Context menu should have correct Y position');
        
        console.log('✅ Context menu event tests passed');
        return true;
        
    } finally {
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: Keyboard Navigation
 */
async function testKeyboardNavigation() {
    console.log('🔸 Testing Keyboard Navigation...');
    
    const container = createTestDOM();
    const NodeInteractions = window.TreeInteraction.NodeInteractions;
    const eventBus = window.MindmapEvents;
    
    try {
        NodeInteractions.registerNodeEvents(container);
        
        let keyboardEvents = [];
        eventBus.on('keyboard:navigate', (data) => keyboardEvents.push(data));
        
        const testNode = container.querySelector('[data-node-id="node-2"]');
        testNode.focus();
        
        // Test Enter key (should toggle expansion)
        const enterEvent = new KeyboardEvent('keydown', { 
            key: 'Enter', 
            bubbles: true 
        });
        testNode.dispatchEvent(enterEvent);
        
        await wait(50);
        
        console.assert(NodeInteractions.expandedNodes.includes('node-2'), 'Enter key should expand node');
        
        // Test Escape key (should clear selection)
        NodeInteractions.selectNode('node-2');
        console.assert(NodeInteractions.selectedNodes.length === 1, 'Node should be selected');
        
        const escapeEvent = new KeyboardEvent('keydown', { 
            key: 'Escape', 
            bubbles: true 
        });
        testNode.dispatchEvent(escapeEvent);
        
        await wait(50);
        
        console.assert(NodeInteractions.selectedNodes.length === 0, 'Escape key should clear selection');
        
        // Test arrow key navigation
        const arrowEvent = new KeyboardEvent('keydown', { 
            key: 'ArrowDown', 
            bubbles: true 
        });
        testNode.dispatchEvent(arrowEvent);
        
        await wait(50);
        
        console.assert(keyboardEvents.length > 0, 'Arrow key should trigger navigation event');
        console.assert(keyboardEvents[0].direction === 'ArrowDown', 'Navigation event should have correct direction');
        
        console.log('✅ Keyboard navigation tests passed');
        return true;
        
    } finally {
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: Focus Management
 */
function testFocusManagement() {
    console.log('🔸 Testing Focus Management...');
    
    const container = createTestDOM();
    const NodeInteractions = window.TreeInteraction.NodeInteractions;
    const eventBus = window.MindmapEvents;
    
    try {
        NodeInteractions.registerNodeEvents(container);
        
        let focusEvents = [];
        eventBus.on('node:focus', (data) => focusEvents.push({ type: 'focus', data }));
        eventBus.on('node:blur', (data) => focusEvents.push({ type: 'blur', data }));
        
        const testNode = container.querySelector('[data-node-id="node-3"]');
        
        // Simulate focus
        const focusEvent = createMockEvent('focus', { target: testNode });
        testNode.dispatchEvent(focusEvent);
        
        console.assert(focusEvents.length === 1, 'Focus event should be fired');
        console.assert(focusEvents[0].type === 'focus', 'Event should be focus type');
        console.assert(focusEvents[0].data.nodeId === 'node-3', 'Focus event should have correct node ID');
        console.assert(testNode.classList.contains('focused'), 'Focused node should have focused class');
        
        // Simulate blur
        const blurEvent = createMockEvent('blur', { target: testNode });
        testNode.dispatchEvent(blurEvent);
        
        console.assert(focusEvents.length === 2, 'Blur event should be fired');
        console.assert(focusEvents[1].type === 'blur', 'Second event should be blur type');
        console.assert(!testNode.classList.contains('focused'), 'Blurred node should not have focused class');
        
        console.log('✅ Focus management tests passed');
        return true;
        
    } finally {
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: Performance and Statistics
 */
async function testPerformanceAndStats() {
    console.log('🔸 Testing Performance and Statistics...');
    
    const container = createTestDOM();
    const NodeInteractions = window.TreeInteraction.NodeInteractions;
    
    try {
        NodeInteractions.registerNodeEvents(container);
        
        // Get initial stats
        const initialStats = NodeInteractions.getStats();
        console.assert(typeof initialStats === 'object', 'Stats should be an object');
        console.assert(typeof initialStats.clickEvents === 'number', 'Stats should include click events count');
        console.assert(typeof initialStats.selectedCount === 'number', 'Stats should include selected count');
        
        // Perform some interactions
        NodeInteractions.selectNode('node-1');
        NodeInteractions.selectNode('node-2', true);
        NodeInteractions.expandNode('node-3');
        
        const updatedStats = NodeInteractions.getStats();
        console.assert(updatedStats.selectedCount === 2, 'Stats should reflect current selection count');
        console.assert(updatedStats.expandedCount === 1, 'Stats should reflect current expanded count');
        
        // Test performance with multiple rapid interactions
        const startTime = performance.now();
        
        for (let i = 0; i < 100; i++) {
            const nodeId = `node-${(i % 4) + 1}`;
            NodeInteractions.selectNode(nodeId);
            NodeInteractions.toggleNodeExpansion(nodeId);
        }
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.assert(duration < 1000, `100 interactions should complete in <1000ms, took ${duration.toFixed(2)}ms`);
        
        console.log(`✅ Performance tests passed (100 interactions in ${duration.toFixed(2)}ms)`);
        return true;
        
    } finally {
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: Accessibility Features
 */
function testAccessibilityFeatures() {
    console.log('🔸 Testing Accessibility Features...');
    
    const container = createTestDOM();
    const NodeInteractions = window.TreeInteraction.NodeInteractions;
    
    try {
        NodeInteractions.registerNodeEvents(container);
        
        // Test ARIA attributes
        const nodes = container.querySelectorAll('[data-node-id]');
        nodes.forEach(node => {
            console.assert(node.hasAttribute('role'), 'Node should have role attribute');
            console.assert(node.hasAttribute('tabindex'), 'Node should have tabindex attribute');
            console.assert(node.hasAttribute('aria-selected'), 'Node should have aria-selected attribute');
            console.assert(node.hasAttribute('aria-expanded'), 'Node should have aria-expanded attribute');
        });
        
        // Test selection ARIA updates
        NodeInteractions.selectNode('node-1');
        const selectedNode = container.querySelector('[data-node-id="node-1"]');
        console.assert(selectedNode.getAttribute('aria-selected') === 'true', 'Selected node should have aria-selected=true');
        
        // Test expansion ARIA updates
        NodeInteractions.expandNode('node-2');
        const expandedNode = container.querySelector('[data-node-id="node-2"]');
        console.assert(expandedNode.getAttribute('aria-expanded') === 'true', 'Expanded node should have aria-expanded=true');
        
        // Test live region creation for announcements
        NodeInteractions.selectNode('node-3');
        const liveRegion = document.getElementById('mindmap-live-region');
        console.assert(liveRegion, 'Live region should be created for screen reader announcements');
        console.assert(liveRegion.getAttribute('aria-live') === 'polite', 'Live region should have aria-live=polite');
        
        console.log('✅ Accessibility feature tests passed');
        return true;
        
    } finally {
        cleanupTestDOM(container);
        // Clean up live region
        const liveRegion = document.getElementById('mindmap-live-region');
        if (liveRegion) {
            liveRegion.remove();
        }
    }
}

/**
 * Main test runner
 */
async function runNodeInteractionTests() {
    console.log('🚀 Starting Node Interaction Events Tests...');
    
    const tests = [
        testEventBusIntegration,
        testNodeClickEvents,
        testNodeSelection,
        testNodeHoverEvents,
        testNodeExpansion,
        testDoubleClickEvents,
        testContextMenuEvents,
        testKeyboardNavigation,
        testFocusManagement,
        testPerformanceAndStats,
        testAccessibilityFeatures
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
        console.log('🎉 All node interaction tests passed!');
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
        if (window.TreeInteraction?.NodeInteractions && window.MindmapEvents) {
            runNodeInteractionTests();
        } else {
            console.error('Node interaction dependencies not loaded');
        }
    }, 100);
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runNodeInteractionTests,
        testEventBusIntegration,
        testNodeClickEvents,
        testNodeSelection,
        testNodeHoverEvents,
        testNodeExpansion,
        testDoubleClickEvents,
        testContextMenuEvents,
        testKeyboardNavigation,
        testFocusManagement,
        testPerformanceAndStats,
        testAccessibilityFeatures,
        createTestDOM,
        cleanupTestDOM,
        createMockEvent
    };
}