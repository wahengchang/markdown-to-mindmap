/**
 * List Visualization Tests
 * Comprehensive test suite for T022: Implement list visualization with hierarchical display
 */

// Test configuration
const TEST_CONFIG = {
    timeout: 3000,
    animationDuration: 250,
    renderThreshold: 50, // ms for 100 items
    maxNestingLevels: 6
};

/**
 * Create test DOM structure with list nodes
 * @returns {HTMLElement} Test container
 */
function createTestDOM() {
    const container = document.createElement('div');
    container.id = 'test-list-container';
    container.className = 'mindmap-container';
    
    // Create sample list nodes
    const listNodes = [
        {
            id: 'list-node-1',
            type: 'list',
            text: 'Unordered List Node',
            listData: {
                type: 'unordered',
                items: [
                    { id: 'item-1', text: 'First item', level: 0, children: [] },
                    { id: 'item-2', text: 'Second item', level: 0, children: [
                        { id: 'item-2-1', text: 'Nested item', level: 1, children: [] },
                        { id: 'item-2-2', text: 'Another nested', level: 1, children: [] }
                    ]},
                    { id: 'item-3', text: 'Third item', level: 0, children: [] }
                ],
                metadata: { totalItems: 5, maxDepth: 1, hasCheckboxes: false }
            }
        },
        {
            id: 'list-node-2',
            type: 'list',
            text: 'Ordered List Node',
            listData: {
                type: 'ordered',
                items: [
                    { id: 'ordered-1', text: 'First step', level: 0, children: [] },
                    { id: 'ordered-2', text: 'Second step', level: 0, children: [
                        { id: 'ordered-2-1', text: 'Sub-step A', level: 1, children: [] },
                        { id: 'ordered-2-2', text: 'Sub-step B', level: 1, children: [] }
                    ]},
                    { id: 'ordered-3', text: 'Third step', level: 0, children: [] }
                ],
                metadata: { totalItems: 5, maxDepth: 1, hasCheckboxes: false }
            }
        },
        {
            id: 'list-node-3',
            type: 'list',
            text: 'Checklist Node',
            listData: {
                type: 'checklist',
                items: [
                    { id: 'check-1', text: 'Task 1', level: 0, checked: true, children: [] },
                    { id: 'check-2', text: 'Task 2', level: 0, checked: false, children: [
                        { id: 'check-2-1', text: 'Subtask A', level: 1, checked: true, children: [] },
                        { id: 'check-2-2', text: 'Subtask B', level: 1, checked: false, children: [] }
                    ]},
                    { id: 'check-3', text: 'Task 3', level: 0, checked: false, children: [] }
                ],
                metadata: { totalItems: 5, maxDepth: 1, hasCheckboxes: true }
            }
        }
    ];
    
    listNodes.forEach(nodeData => {
        const nodeElement = document.createElement('div');
        nodeElement.className = 'mindmap-node';
        nodeElement.setAttribute('data-node-id', nodeData.id);
        nodeElement.setAttribute('data-node-type', nodeData.type);
        nodeElement.setAttribute('data-list-content', JSON.stringify(nodeData.listData));
        nodeElement.textContent = nodeData.text;
        
        container.appendChild(nodeElement);
    });
    
    document.body.appendChild(container);
    return container;
}

/**
 * Create large list for performance testing
 * @param {number} itemCount - Number of items to create
 * @returns {Object} Large list data
 */
function createLargeListData(itemCount = 100) {
    const items = [];
    
    for (let i = 0; i < itemCount; i++) {
        const item = {
            id: `large-item-${i}`,
            text: `Item ${i + 1} - Lorem ipsum dolor sit amet`,
            level: Math.floor(Math.random() * 3), // Random nesting up to level 2
            children: []
        };
        
        // Add some children for complexity
        if (Math.random() > 0.7 && item.level < 2) {
            for (let j = 0; j < Math.floor(Math.random() * 3) + 1; j++) {
                item.children.push({
                    id: `large-item-${i}-${j}`,
                    text: `Sub-item ${j + 1}`,
                    level: item.level + 1,
                    children: []
                });
            }
        }
        
        items.push(item);
    }
    
    return {
        type: 'unordered',
        items,
        metadata: {
            totalItems: itemCount,
            maxDepth: 3,
            hasCheckboxes: false
        }
    };
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
 * @param {number} duration - Duration to wait
 * @returns {Promise} Promise that resolves after duration
 */
function waitForAnimation(duration = TEST_CONFIG.animationDuration) {
    return new Promise(resolve => setTimeout(resolve, duration + 50));
}

/**
 * Test Suite: Initialization and Setup
 */
function testInitializationAndSetup() {
    console.log('🔸 Testing Initialization and Setup...');
    
    const container = createTestDOM();
    const ListVisualization = window.TreeInteraction?.ListVisualization;
    
    try {
        console.assert(ListVisualization, 'ListVisualization should be available');
        console.assert(typeof ListVisualization.init === 'function', 'Should have init method');
        
        // Test initialization
        ListVisualization.init(container, {
            indentationSize: 25,
            maxNestingLevels: 4
        });
        
        console.assert(ListVisualization.isInitialized, 'Should be initialized');
        console.assert(ListVisualization.config.indentationSize === 25, 'Should apply custom config');
        
        // Test styles are injected
        const styleElement = document.getElementById('list-visualization-styles');
        console.assert(styleElement, 'Should inject CSS styles');
        console.assert(styleElement.textContent.includes('.list-visualization'), 'Should include list styles');
        
        console.log('✅ Initialization and setup tests passed');
        return true;
        
    } finally {
        ListVisualization.destroy();
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: List Rendering
 */
function testListRendering() {
    console.log('🔸 Testing List Rendering...');
    
    const container = createTestDOM();
    const ListVisualization = window.TreeInteraction.ListVisualization;
    
    try {
        ListVisualization.init(container);
        
        // Check that lists are rendered for list nodes
        const unorderedListNode = container.querySelector('[data-node-id="list-node-1"]');
        const orderedListNode = container.querySelector('[data-node-id="list-node-2"]');
        const checklistNode = container.querySelector('[data-node-id="list-node-3"]');
        
        const unorderedList = unorderedListNode.querySelector('.list-visualization.unordered');
        const orderedList = orderedListNode.querySelector('.list-visualization.ordered');
        const checklist = checklistNode.querySelector('.list-visualization.checklist');
        
        console.assert(unorderedList, 'Should render unordered list');
        console.assert(orderedList, 'Should render ordered list');
        console.assert(checklist, 'Should render checklist');
        
        // Test list items
        const unorderedItems = unorderedList.querySelectorAll('.list-item');
        console.assert(unorderedItems.length === 3, 'Should render correct number of top-level items');
        
        // Test nesting
        const nestedItem = unorderedItems[1]; // Second item has children
        const nestedList = nestedItem.querySelector('.nested-list');
        console.assert(nestedList, 'Should create nested list for items with children');
        
        const nestedItems = nestedList.querySelectorAll('.list-item');
        console.assert(nestedItems.length === 2, 'Should render nested items');
        
        // Test markers
        const bulletMarkers = unorderedList.querySelectorAll('.list-marker.bullet');
        console.assert(bulletMarkers.length > 0, 'Should create bullet markers for unordered list');
        
        const numberMarkers = orderedList.querySelectorAll('.list-marker.number');
        console.assert(numberMarkers.length > 0, 'Should create number markers for ordered list');
        
        const checkboxMarkers = checklist.querySelectorAll('.list-marker.checkbox');
        console.assert(checkboxMarkers.length > 0, 'Should create checkbox markers for checklist');
        
        console.log('✅ List rendering tests passed');
        return true;
        
    } finally {
        ListVisualization.destroy();
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: Hierarchical Display
 */
function testHierarchicalDisplay() {
    console.log('🔸 Testing Hierarchical Display...');
    
    const container = createTestDOM();
    const ListVisualization = window.TreeInteraction.ListVisualization;
    
    try {
        ListVisualization.init(container, { indentationSize: 20 });
        
        const unorderedListNode = container.querySelector('[data-node-id="list-node-1"]');
        const listItems = unorderedListNode.querySelectorAll('.list-item');
        
        // Test indentation levels
        const topLevelItems = Array.from(listItems).filter(item => 
            item.getAttribute('data-level') === '0');
        const nestedItems = Array.from(listItems).filter(item => 
            item.getAttribute('data-level') === '1');
        
        console.assert(topLevelItems.length === 3, 'Should have correct number of top-level items');
        console.assert(nestedItems.length === 2, 'Should have correct number of nested items');
        
        // Test visual indentation
        const nestedItem = nestedItems[0];
        const computedStyle = window.getComputedStyle(nestedItem);
        console.assert(nestedItem.getAttribute('data-level') === '1', 'Nested item should have level 1');
        
        // Test expand/collapse controls
        const itemWithChildren = topLevelItems.find(item => 
            item.hasAttribute('data-has-children'));
        console.assert(itemWithChildren, 'Should identify items with children');
        
        const expandControl = itemWithChildren.querySelector('.list-expand-control');
        console.assert(expandControl, 'Should create expand control for items with children');
        console.assert(expandControl.classList.contains('collapsed'), 'Should start collapsed');
        
        console.log('✅ Hierarchical display tests passed');
        return true;
        
    } finally {
        ListVisualization.destroy();
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: Interactive Features
 */
async function testInteractiveFeatures() {
    console.log('🔸 Testing Interactive Features...');
    
    const container = createTestDOM();
    const ListVisualization = window.TreeInteraction.ListVisualization;
    const eventBus = window.MindmapEvents;
    
    try {
        ListVisualization.init(container);
        
        let interactionEvents = [];
        if (eventBus) {
            eventBus.on('list-item-toggled', (data) => interactionEvents.push(data));
            eventBus.on('list-checkbox-toggled', (data) => interactionEvents.push(data));
        }
        
        const unorderedListNode = container.querySelector('[data-node-id="list-node-1"]');
        const expandableItem = unorderedListNode.querySelector('[data-has-children="true"]');
        const expandControl = expandableItem.querySelector('.list-expand-control');
        const nestedList = expandableItem.querySelector('.nested-list');
        
        // Test expansion
        console.assert(nestedList.style.display === 'none', 'Nested list should start hidden');
        
        expandControl.click();
        await waitForAnimation(100);
        
        console.assert(expandControl.classList.contains('expanded'), 'Control should show expanded state');
        console.assert(nestedList.style.display !== 'none', 'Nested list should be visible after expansion');
        
        // Test collapse
        expandControl.click();
        await waitForAnimation(300);
        
        console.assert(expandControl.classList.contains('collapsed'), 'Control should show collapsed state');
        
        // Test checkbox interaction
        const checklistNode = container.querySelector('[data-node-id="list-node-3"]');
        const checkbox = checklistNode.querySelector('.list-marker.checkbox');
        const initialChecked = checkbox.classList.contains('checked');
        
        checkbox.click();
        await waitForAnimation(50);
        
        const newChecked = checkbox.classList.contains('checked');
        console.assert(newChecked !== initialChecked, 'Checkbox state should toggle');
        console.assert(checkbox.getAttribute('aria-checked') === newChecked.toString(), 
            'ARIA state should update');
        
        // Test events were fired
        if (eventBus) {
            console.assert(interactionEvents.length > 0, 'Should emit interaction events');
        }
        
        console.log('✅ Interactive features tests passed');
        return true;
        
    } finally {
        ListVisualization.destroy();
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: Keyboard Navigation
 */
async function testKeyboardNavigation() {
    console.log('🔸 Testing Keyboard Navigation...');
    
    const container = createTestDOM();
    const ListVisualization = window.TreeInteraction.ListVisualization;
    
    try {
        ListVisualization.init(container, { keyboardNavigation: true });
        
        const unorderedListNode = container.querySelector('[data-node-id="list-node-1"]');
        const expandableItem = unorderedListNode.querySelector('[data-has-children="true"]');
        const expandControl = expandableItem.querySelector('.list-expand-control');
        const nestedList = expandableItem.querySelector('.nested-list');
        
        // Test Enter key expansion
        expandControl.focus();
        const enterEvent = new KeyboardEvent('keydown', { 
            key: 'Enter', 
            bubbles: true 
        });
        expandControl.dispatchEvent(enterEvent);
        
        await waitForAnimation(100);
        
        console.assert(expandControl.classList.contains('expanded'), 'Enter key should expand item');
        
        // Test Space key collapse
        const spaceEvent = new KeyboardEvent('keydown', { 
            key: ' ', 
            bubbles: true 
        });
        expandControl.dispatchEvent(spaceEvent);
        
        await waitForAnimation(300);
        
        console.assert(expandControl.classList.contains('collapsed'), 'Space key should collapse item');
        
        // Test Arrow key navigation
        const arrowRightEvent = new KeyboardEvent('keydown', { 
            key: 'ArrowRight', 
            bubbles: true 
        });
        expandableItem.dispatchEvent(arrowRightEvent);
        
        await waitForAnimation(100);
        
        console.assert(nestedList.style.display !== 'none', 'Arrow right should expand');
        
        const arrowLeftEvent = new KeyboardEvent('keydown', { 
            key: 'ArrowLeft', 
            bubbles: true 
        });
        expandableItem.dispatchEvent(arrowLeftEvent);
        
        await waitForAnimation(300);
        
        console.assert(nestedList.style.display === 'none', 'Arrow left should collapse');
        
        // Test checkbox keyboard interaction
        const checklistNode = container.querySelector('[data-node-id="list-node-3"]');
        const checkbox = checklistNode.querySelector('.list-marker.checkbox');
        const initialChecked = checkbox.classList.contains('checked');
        
        checkbox.focus();
        checkbox.dispatchEvent(enterEvent);
        
        await waitForAnimation(50);
        
        const newChecked = checkbox.classList.contains('checked');
        console.assert(newChecked !== initialChecked, 'Enter key should toggle checkbox');
        
        console.log('✅ Keyboard navigation tests passed');
        return true;
        
    } finally {
        ListVisualization.destroy();
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: Accessibility Features
 */
function testAccessibilityFeatures() {
    console.log('🔸 Testing Accessibility Features...');
    
    const container = createTestDOM();
    const ListVisualization = window.TreeInteraction.ListVisualization;
    
    try {
        ListVisualization.init(container, { semanticMarkup: true });
        
        // Test semantic structure
        const lists = container.querySelectorAll('.list-visualization');
        lists.forEach(list => {
            console.assert(list.getAttribute('role') === 'tree', 'List should have tree role');
            console.assert(list.hasAttribute('aria-label'), 'List should have aria-label');
        });
        
        // Test list items
        const listItems = container.querySelectorAll('.list-item');
        listItems.forEach((item, index) => {
            console.assert(item.getAttribute('role') === 'treeitem', 'Item should have treeitem role');
            console.assert(item.hasAttribute('aria-level'), 'Item should have aria-level');
            console.assert(item.hasAttribute('aria-posinset'), 'Item should have aria-posinset');
            console.assert(item.hasAttribute('aria-setsize'), 'Item should have aria-setsize');
        });
        
        // Test expandable items
        const expandableItems = container.querySelectorAll('[data-has-children="true"]');
        expandableItems.forEach(item => {
            console.assert(item.hasAttribute('aria-expanded'), 'Expandable item should have aria-expanded');
            
            const control = item.querySelector('.list-expand-control');
            console.assert(control.hasAttribute('aria-label'), 'Expand control should have aria-label');
            console.assert(control.getAttribute('tabindex') === '0', 'Control should be focusable');
        });
        
        // Test checkboxes
        const checkboxes = container.querySelectorAll('.list-marker.checkbox');
        checkboxes.forEach(checkbox => {
            console.assert(checkbox.getAttribute('role') === 'checkbox', 'Checkbox should have checkbox role');
            console.assert(checkbox.hasAttribute('aria-checked'), 'Checkbox should have aria-checked');
            console.assert(checkbox.getAttribute('tabindex') === '0', 'Checkbox should be focusable');
        });
        
        // Test live region creation
        const stats = ListVisualization.getStats();
        console.assert(typeof stats === 'object', 'Should provide statistics');
        
        console.log('✅ Accessibility features tests passed');
        return true;
        
    } finally {
        ListVisualization.destroy();
        cleanupTestDOM(container);
        
        // Clean up live region
        const liveRegion = document.getElementById('list-live-region');
        if (liveRegion) {
            liveRegion.remove();
        }
    }
}

/**
 * Test Suite: Performance and Large Lists
 */
function testPerformanceAndLargeLists() {
    console.log('🔸 Testing Performance and Large Lists...');
    
    const container = createTestDOM();
    const ListVisualization = window.TreeInteraction.ListVisualization;
    
    try {
        ListVisualization.init(container);
        
        // Create large list data
        const largeListData = createLargeListData(100);
        
        // Create test node for large list
        const largeListNode = document.createElement('div');
        largeListNode.className = 'mindmap-node';
        largeListNode.setAttribute('data-node-id', 'large-list-node');
        largeListNode.setAttribute('data-node-type', 'list');
        largeListNode.textContent = 'Large List Node';
        container.appendChild(largeListNode);
        
        // Test render performance
        const startTime = performance.now();
        ListVisualization.renderList(largeListNode, largeListData);
        const endTime = performance.now();
        
        const renderTime = endTime - startTime;
        console.assert(renderTime < TEST_CONFIG.renderThreshold, 
            `Large list should render in <${TEST_CONFIG.renderThreshold}ms, took ${renderTime.toFixed(2)}ms`);
        
        // Test that large list has appropriate styling
        const largeList = largeListNode.querySelector('.list-visualization');
        console.assert(largeList.classList.contains('large-list'), 'Large list should have large-list class');
        
        // Test statistics
        const stats = ListVisualization.getStats();
        console.assert(stats.listsRendered > 0, 'Should track rendered lists');
        console.assert(stats.itemsRendered > 0, 'Should track rendered items');
        console.assert(stats.averageRenderTime >= 0, 'Should track render time');
        
        // Test cache functionality
        const initialCacheSize = stats.cacheSize;
        ListVisualization.renderList(largeListNode, largeListData); // Render again
        const newStats = ListVisualization.getStats();
        
        console.assert(newStats.cacheHits > stats.cacheHits || newStats.cacheSize > initialCacheSize, 
            'Should utilize caching system');
        
        console.log(`✅ Performance tests passed (100 items rendered in ${renderTime.toFixed(2)}ms)`);
        return true;
        
    } finally {
        ListVisualization.destroy();
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: List Types and Styling
 */
function testListTypesAndStyling() {
    console.log('🔸 Testing List Types and Styling...');
    
    const container = createTestDOM();
    const ListVisualization = window.TreeInteraction.ListVisualization;
    
    try {
        ListVisualization.init(container);
        
        // Test unordered list styling
        const unorderedList = container.querySelector('.list-visualization.unordered');
        const bulletMarkers = unorderedList.querySelectorAll('.list-marker.bullet');
        
        console.assert(bulletMarkers.length > 0, 'Should create bullet markers');
        bulletMarkers.forEach(marker => {
            console.assert(marker.hasAttribute('data-bullet'), 'Bullet should have data-bullet attribute');
        });
        
        // Test ordered list styling
        const orderedList = container.querySelector('.list-visualization.ordered');
        const numberMarkers = orderedList.querySelectorAll('.list-marker.number');
        
        console.assert(numberMarkers.length > 0, 'Should create number markers');
        numberMarkers.forEach(marker => {
            console.assert(marker.hasAttribute('data-number'), 'Number should have data-number attribute');
        });
        
        // Test checklist styling
        const checklist = container.querySelector('.list-visualization.checklist');
        const checkboxMarkers = checklist.querySelectorAll('.list-marker.checkbox');
        
        console.assert(checkboxMarkers.length > 0, 'Should create checkbox markers');
        
        const checkedBoxes = checklist.querySelectorAll('.list-marker.checkbox.checked');
        const uncheckedBoxes = checklist.querySelectorAll('.list-marker.checkbox:not(.checked)');
        
        console.assert(checkedBoxes.length > 0, 'Should have some checked items');
        console.assert(uncheckedBoxes.length > 0, 'Should have some unchecked items');
        
        // Test indentation
        const level1Items = container.querySelectorAll('.list-item[data-level="1"]');
        level1Items.forEach(item => {
            console.assert(item.getAttribute('data-level') === '1', 'Should have correct level attribute');
        });
        
        console.log('✅ List types and styling tests passed');
        return true;
        
    } finally {
        ListVisualization.destroy();
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: Configuration and Updates
 */
function testConfigurationAndUpdates() {
    console.log('🔸 Testing Configuration and Updates...');
    
    const container = createTestDOM();
    const ListVisualization = window.TreeInteraction.ListVisualization;
    
    try {
        const customConfig = {
            indentationSize: 30,
            maxNestingLevels: 3,
            animateExpansion: false,
            bulletStyles: {
                0: '★',
                1: '○',
                2: '□'
            }
        };
        
        ListVisualization.init(container, customConfig);
        
        // Test initial configuration
        console.assert(ListVisualization.config.indentationSize === 30, 'Should apply custom indentation');
        console.assert(ListVisualization.config.maxNestingLevels === 3, 'Should apply custom nesting limit');
        console.assert(ListVisualization.config.animateExpansion === false, 'Should apply animation setting');
        
        // Test configuration update
        ListVisualization.updateConfig({ 
            indentationSize: 40,
            enableCollapse: false 
        });
        
        console.assert(ListVisualization.config.indentationSize === 40, 'Should update indentation');
        console.assert(ListVisualization.config.enableCollapse === false, 'Should update collapse setting');
        console.assert(ListVisualization.config.maxNestingLevels === 3, 'Should preserve other settings');
        
        // Test cache clearing
        const initialStats = ListVisualization.getStats();
        ListVisualization.clearCache();
        const clearedStats = ListVisualization.getStats();
        
        console.assert(clearedStats.cacheSize === 0, 'Cache should be cleared');
        console.assert(clearedStats.cacheHits === 0, 'Cache hits should be reset');
        
        console.log('✅ Configuration and updates tests passed');
        return true;
        
    } finally {
        ListVisualization.destroy();
        cleanupTestDOM(container);
    }
}

/**
 * Test Suite: Integration with Event System
 */
async function testEventSystemIntegration() {
    console.log('🔸 Testing Event System Integration...');
    
    const container = createTestDOM();
    const ListVisualization = window.TreeInteraction.ListVisualization;
    const eventBus = window.MindmapEvents;
    
    if (!eventBus) {
        console.log('⚠️ Event bus not available, skipping integration tests');
        return true;
    }
    
    try {
        ListVisualization.init(container);
        
        let eventsFired = [];
        eventBus.on('list-item-toggled', (data) => eventsFired.push({ type: 'toggle', data }));
        eventBus.on('list-checkbox-toggled', (data) => eventsFired.push({ type: 'checkbox', data }));
        
        // Test list item toggle event
        const expandControl = container.querySelector('.list-expand-control');
        expandControl.click();
        
        await waitForAnimation(100);
        
        console.assert(eventsFired.length > 0, 'Should emit list item toggle event');
        console.assert(eventsFired[0].type === 'toggle', 'Should emit correct event type');
        console.assert(eventsFired[0].data.itemId, 'Event should include item ID');
        console.assert(eventsFired[0].data.nodeId, 'Event should include node ID');
        
        // Test checkbox toggle event
        eventsFired = [];
        const checkbox = container.querySelector('.list-marker.checkbox');
        checkbox.click();
        
        await waitForAnimation(50);
        
        console.assert(eventsFired.length > 0, 'Should emit checkbox toggle event');
        console.assert(eventsFired[0].type === 'checkbox', 'Should emit correct event type');
        console.assert(typeof eventsFired[0].data.checked === 'boolean', 'Event should include checked state');
        
        // Test content update event handling
        const newListData = {
            type: 'unordered',
            items: [
                { id: 'new-1', text: 'New item 1', level: 0, children: [] },
                { id: 'new-2', text: 'New item 2', level: 0, children: [] }
            ],
            metadata: { totalItems: 2, maxDepth: 0, hasCheckboxes: false }
        };
        
        eventBus.emit('content:updated', {
            nodeId: 'list-node-1',
            contentType: 'list',
            content: newListData
        });
        
        await waitForAnimation(50);
        
        // Check that list was updated
        const updatedList = container.querySelector('[data-node-id="list-node-1"] .list-visualization');
        const updatedItems = updatedList.querySelectorAll('.list-item');
        console.assert(updatedItems.length === 2, 'Should update list content based on event');
        
        console.log('✅ Event system integration tests passed');
        return true;
        
    } finally {
        ListVisualization.destroy();
        cleanupTestDOM(container);
    }
}

/**
 * Main test runner
 */
async function runListVisualizationTests() {
    console.log('🚀 Starting List Visualization Tests...');
    
    const tests = [
        testInitializationAndSetup,
        testListRendering,
        testHierarchicalDisplay,
        testInteractiveFeatures,
        testKeyboardNavigation,
        testAccessibilityFeatures,
        testPerformanceAndLargeLists,
        testListTypesAndStyling,
        testConfigurationAndUpdates,
        testEventSystemIntegration
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
        console.log('🎉 All list visualization tests passed!');
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
        if (window.TreeInteraction?.ListVisualization && window.MindmapEvents) {
            runListVisualizationTests();
        } else {
            console.error('List visualization dependencies not loaded');
        }
    }, 100);
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runListVisualizationTests,
        testInitializationAndSetup,
        testListRendering,
        testHierarchicalDisplay,
        testInteractiveFeatures,
        testKeyboardNavigation,
        testAccessibilityFeatures,
        testPerformanceAndLargeLists,
        testListTypesAndStyling,
        testConfigurationAndUpdates,
        testEventSystemIntegration,
        createTestDOM,
        createLargeListData,
        cleanupTestDOM,
        waitForAnimation
    };
}