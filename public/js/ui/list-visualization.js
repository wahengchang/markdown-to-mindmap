/**
 * List Visualization Module - T022 Implementation
 * Hierarchical list visualization system for mindmap nodes containing list content
 * Integrates with T008 content analysis, T019 events, and T013 expansion controls
 */
(function() {
    'use strict';

    // Import dependencies
    const EventBus = (typeof window !== 'undefined' && window.MindmapEvents) || null;
    const NodeInteractions = (typeof window !== 'undefined' && window.TreeInteraction?.NodeInteractions) || null;
    const ExpansionControls = (typeof window !== 'undefined' && window.TreeInteraction?.ExpansionControls) || null;
    const EVENT_TYPES = (typeof window !== 'undefined' && window.TreeInteraction?.EVENT_TYPES) || {};
    const Debug = (typeof window !== 'undefined' && window.TreeInteraction?.Utils?.Debug) || {};

    /**
     * List Visualization Configuration
     */
    const ListConfig = {
        // Visual settings
        indentationSize: 20,
        maxNestingLevels: 6,
        showBulletPoints: true,
        animateExpansion: true,
        
        // List type styling
        orderedListStyle: 'decimal',
        unorderedListStyle: 'disc',
        checklistStyle: 'custom',
        
        // Interactive features
        clickToExpand: true,
        hoverPreview: true,
        keyboardNavigation: true,
        
        // Performance
        virtualizeThreshold: 100,
        lazyRender: true,
        maxDisplayItems: 50,
        
        // Accessibility
        announceChanges: true,
        semanticMarkup: true,
        focusManagement: true,
        
        // Bullet styles by level
        bulletStyles: {
            0: '•',  // Primary
            1: '◦',  // Secondary  
            2: '▪',  // Tertiary
            3: '‣',  // Quaternary
            4: '⁃',  // Quinary
            5: '·'   // Fallback
        },
        
        // Numbering styles
        numberingStyles: {
            decimal: '1.',
            lowerAlpha: 'a)',
            upperAlpha: 'A)',
            lowerRoman: 'i.',
            upperRoman: 'I.'
        }
    };

    /**
     * List Visualization Manager Class
     */
    class ListVisualizationManager {
        constructor() {
            this.container = null;
            this.isInitialized = false;
            this.listStates = new Map(); // nodeId -> list state
            this.renderCache = new Map(); // Cache rendered elements
            
            this.config = { ...ListConfig };
            
            // Performance tracking
            this.stats = {
                listsRendered: 0,
                itemsRendered: 0,
                averageRenderTime: 0,
                cacheHits: 0,
                cacheMisses: 0
            };
        }

        /**
         * Initialize list visualization manager
         * @param {HTMLElement} container - Container element
         * @param {Object} options - Configuration options
         */
        init(container, options = {}) {
            if (!container) {
                throw new Error('Container element is required');
            }

            this.container = container;
            this.config = { ...this.config, ...options };
            
            this.setupStyles();
            this.setupEventListeners();
            this.scanAndRenderLists();
            
            this.isInitialized = true;

            if (EventBus) {
                EventBus.emit('list-visualization:initialized', {
                    container: container.id || 'unnamed',
                    config: this.config
                });
            }

            if (Debug?.log) {
                Debug.log('info', 'ListVisualizationManager initialized', {
                    container: container.id,
                    maxNestingLevels: this.config.maxNestingLevels
                });
            }
        }

        /**
         * Setup CSS styles for list visualization
         */
        setupStyles() {
            const styleId = 'list-visualization-styles';
            if (document.getElementById(styleId)) return;

            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = this.getListStyles();
            document.head.appendChild(style);
        }

        /**
         * Get CSS styles for list visualization
         * @returns {string} CSS styles
         */
        getListStyles() {
            return `
                /* List Visualization Base Styles */
                .list-visualization {
                    font-family: inherit;
                    line-height: 1.6;
                    margin: 8px 0;
                    color: inherit;
                }

                .list-visualization.large-list {
                    max-height: 300px;
                    overflow-y: auto;
                    border: 1px solid rgba(0, 0, 0, 0.1);
                    border-radius: 4px;
                    padding: 8px;
                }

                /* List Items */
                .list-item {
                    display: flex;
                    align-items: flex-start;
                    margin: 2px 0;
                    padding: 2px 0;
                    min-height: 1.6em;
                    position: relative;
                    transition: background-color 150ms ease;
                }

                .list-item:hover {
                    background-color: rgba(0, 0, 0, 0.05);
                    border-radius: 3px;
                }

                .list-item.interactive {
                    cursor: pointer;
                }

                .list-item.selected {
                    background-color: rgba(74, 144, 226, 0.1);
                    border-radius: 3px;
                }

                .list-item.collapsed > .nested-list {
                    display: none;
                }

                /* Indentation */
                .list-item[data-level="0"] { padding-left: 0; }
                .list-item[data-level="1"] { padding-left: 20px; }
                .list-item[data-level="2"] { padding-left: 40px; }
                .list-item[data-level="3"] { padding-left: 60px; }
                .list-item[data-level="4"] { padding-left: 80px; }
                .list-item[data-level="5"] { padding-left: 100px; }

                /* List Markers */
                .list-marker {
                    flex-shrink: 0;
                    width: 20px;
                    text-align: center;
                    margin-right: 8px;
                    color: var(--text-secondary, #666);
                    font-weight: normal;
                    line-height: inherit;
                    user-select: none;
                }

                .list-marker.bullet::before {
                    content: attr(data-bullet);
                }

                .list-marker.number::before {
                    content: attr(data-number);
                }

                .list-marker.checkbox {
                    position: relative;
                    cursor: pointer;
                }

                .list-marker.checkbox::before {
                    content: '';
                    display: inline-block;
                    width: 14px;
                    height: 14px;
                    border: 1px solid #ccc;
                    border-radius: 2px;
                    background: white;
                    transition: all 150ms ease;
                }

                .list-marker.checkbox.checked::before {
                    background: #4A90E2;
                    border-color: #4A90E2;
                }

                .list-marker.checkbox.checked::after {
                    content: '✓';
                    position: absolute;
                    left: 3px;
                    top: -1px;
                    color: white;
                    font-size: 10px;
                    font-weight: bold;
                }

                /* List Content */
                .list-content {
                    flex: 1;
                    min-width: 0;
                    word-wrap: break-word;
                    line-height: inherit;
                }

                .list-content.with-children {
                    cursor: pointer;
                }

                /* Expand/Collapse Controls */
                .list-expand-control {
                    position: absolute;
                    left: -16px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 12px;
                    height: 12px;
                    border: none;
                    background: rgba(255, 255, 255, 0.9);
                    border-radius: 2px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 8px;
                    color: #666;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                    transition: all 150ms ease;
                    z-index: 5;
                }

                .list-expand-control:hover {
                    background: white;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
                    transform: translateY(-50%) scale(1.1);
                }

                .list-expand-control.expanded::before {
                    content: '−';
                }

                .list-expand-control.collapsed::before {
                    content: '+';
                }

                /* Nested Lists */
                .nested-list {
                    margin-top: 4px;
                    border-left: 1px solid rgba(0, 0, 0, 0.1);
                    margin-left: 10px;
                    padding-left: 10px;
                }

                .nested-list.animating {
                    overflow: hidden;
                    transition: max-height 250ms ease-out, opacity 250ms ease-out;
                }

                .nested-list.expanding {
                    animation: expandList 250ms ease-out forwards;
                }

                .nested-list.collapsing {
                    animation: collapseList 250ms ease-in forwards;
                }

                /* Animations */
                @keyframes expandList {
                    from {
                        max-height: 0;
                        opacity: 0;
                    }
                    to {
                        max-height: 500px;
                        opacity: 1;
                    }
                }

                @keyframes collapseList {
                    from {
                        max-height: 500px;
                        opacity: 1;
                    }
                    to {
                        max-height: 0;
                        opacity: 0;
                    }
                }

                /* List Types */
                .list-visualization.ordered .list-marker.number {
                    font-variant-numeric: tabular-nums;
                }

                .list-visualization.unordered .list-marker.bullet {
                    font-size: 1.2em;
                    line-height: 0.8;
                }

                .list-visualization.checklist .list-item {
                    padding: 3px 0;
                }

                /* Accessibility */
                .list-item:focus-within {
                    outline: 2px solid #4A90E2;
                    outline-offset: 1px;
                    border-radius: 3px;
                }

                .list-visualization[role="tree"] .list-item {
                    role: "treeitem";
                }

                /* Reduced Motion Support */
                @media (prefers-reduced-motion: reduce) {
                    .list-item,
                    .list-expand-control,
                    .nested-list {
                        transition: none !important;
                        animation: none !important;
                    }
                }

                /* High Contrast Support */
                @media (prefers-contrast: high) {
                    .list-item:hover {
                        background-color: rgba(0, 0, 0, 0.15);
                    }
                    
                    .list-marker.checkbox::before {
                        border-width: 2px;
                    }
                    
                    .nested-list {
                        border-left-width: 2px;
                    }
                }

                /* Mobile Responsive */
                @media (max-width: 768px) {
                    .list-visualization {
                        font-size: 14px;
                    }
                    
                    .list-item[data-level="1"] { padding-left: 15px; }
                    .list-item[data-level="2"] { padding-left: 30px; }
                    .list-item[data-level="3"] { padding-left: 45px; }
                    .list-item[data-level="4"] { padding-left: 60px; }
                    .list-item[data-level="5"] { padding-left: 75px; }
                }
            `;
        }

        /**
         * Setup event listeners
         */
        setupEventListeners() {
            if (!EventBus) return;

            // Listen for content updates
            EventBus.on(EVENT_TYPES.CONTENT_UPDATED, (data) => {
                if (data.contentType === 'list') {
                    this.updateListDisplay(data.nodeId, data.content);
                }
            });

            // Handle list item interactions
            this.container?.addEventListener('click', (event) => {
                this.handleListInteraction(event);
            });

            // Handle keyboard navigation
            this.container?.addEventListener('keydown', (event) => {
                if (this.config.keyboardNavigation) {
                    this.handleKeyboardNavigation(event);
                }
            });
        }

        /**
         * Scan container and render existing lists
         */
        scanAndRenderLists() {
            if (!this.container) return;

            const nodes = this.container.querySelectorAll('[data-node-type="list"]');
            nodes.forEach(nodeElement => {
                const nodeId = nodeElement.getAttribute('data-node-id');
                const listData = this.extractListData(nodeElement);
                
                if (listData && listData.items && listData.items.length > 0) {
                    this.renderList(nodeElement, listData);
                }
            });
        }

        /**
         * Extract list data from node element
         * @param {HTMLElement} nodeElement - Node element
         * @returns {Object|null} List data
         */
        extractListData(nodeElement) {
            try {
                // Check for data attribute with list data
                const listDataAttr = nodeElement.getAttribute('data-list-content');
                if (listDataAttr) {
                    return JSON.parse(listDataAttr);
                }

                // Check for TreeNode-style elements data
                const elementsAttr = nodeElement.getAttribute('data-elements');
                if (elementsAttr) {
                    const elements = JSON.parse(elementsAttr);
                    return this.convertElementsToListData(elements);
                }

                // Fallback: parse existing list content
                const existingList = nodeElement.querySelector('ul, ol');
                if (existingList) {
                    return this.parseExistingList(existingList);
                }

                return null;
            } catch (error) {
                if (Debug?.log) {
                    Debug.log('warn', 'Failed to extract list data', { nodeId: nodeElement.getAttribute('data-node-id'), error });
                }
                return null;
            }
        }

        /**
         * Convert elements array to list data format
         * @param {Array} elements - Elements from content analysis
         * @returns {Object} List data
         */
        convertElementsToListData(elements) {
            const listItems = elements.filter(el => el.type === 'list-item');
            if (listItems.length === 0) return null;

            // Determine list type from first item
            const firstItem = listItems[0];
            const listType = firstItem.metadata?.ordered ? 'ordered' : 
                           firstItem.metadata?.checked !== undefined ? 'checklist' : 'unordered';

            return {
                type: listType,
                items: this.buildHierarchicalItems(listItems),
                metadata: {
                    totalItems: listItems.length,
                    maxDepth: Math.max(...listItems.map(item => item.level || 0)),
                    hasCheckboxes: listType === 'checklist'
                }
            };
        }

        /**
         * Build hierarchical item structure
         * @param {Array} flatItems - Flat array of list items
         * @returns {Array} Hierarchical items
         */
        buildHierarchicalItems(flatItems) {
            const items = [];
            const itemMap = new Map();

            // Create item map
            flatItems.forEach((item, index) => {
                const listItem = {
                    id: item.id || `item-${index}`,
                    text: item.content || item.text || '',
                    level: item.level || 0,
                    checked: item.metadata?.checked,
                    children: [],
                    metadata: item.metadata || {}
                };
                itemMap.set(listItem.id, listItem);
            });

            // Build hierarchy
            flatItems.forEach((item, index) => {
                const listItem = itemMap.get(item.id || `item-${index}`);
                const level = listItem.level;

                if (level === 0) {
                    items.push(listItem);
                } else {
                    // Find parent at previous level
                    let parent = null;
                    for (let i = index - 1; i >= 0; i--) {
                        const prevItem = flatItems[i];
                        if (prevItem.level === level - 1) {
                            parent = itemMap.get(prevItem.id || `item-${i}`);
                            break;
                        }
                    }
                    
                    if (parent) {
                        parent.children.push(listItem);
                    } else {
                        // Orphaned item, add to root
                        items.push(listItem);
                    }
                }
            });

            return items;
        }

        /**
         * Render list in container
         * @param {HTMLElement} container - Container element
         * @param {Object} listData - List data
         * @param {Object} config - Rendering configuration
         */
        renderList(container, listData, config = {}) {
            const startTime = performance.now();
            
            const renderConfig = { ...this.config, ...config };
            const nodeId = container.getAttribute('data-node-id');

            // Check cache first
            const cacheKey = this.generateCacheKey(listData, renderConfig);
            let listElement = this.renderCache.get(cacheKey);
            
            if (listElement) {
                this.stats.cacheHits++;
                container.appendChild(listElement.cloneNode(true));
            } else {
                this.stats.cacheMisses++;
                listElement = this.createListElement(listData, renderConfig);
                this.renderCache.set(cacheKey, listElement.cloneNode(true));
                container.appendChild(listElement);
            }

            // Store list state
            this.listStates.set(nodeId, {
                data: listData,
                config: renderConfig,
                expandedItems: new Set(),
                selectedItems: new Set()
            });

            // Setup accessibility
            this.setupListAccessibility(listElement, listData);

            // Update statistics
            const endTime = performance.now();
            const renderTime = endTime - startTime;
            this.updateRenderStats(renderTime, listData.items.length);
            this.stats.listsRendered++;

            if (Debug?.log) {
                Debug.log('debug', `Rendered list for node ${nodeId}`, {
                    items: listData.items.length,
                    renderTime: renderTime.toFixed(2) + 'ms',
                    cached: !!this.renderCache.get(cacheKey)
                });
            }
        }

        /**
         * Create list element
         * @param {Object} listData - List data
         * @param {Object} config - Rendering configuration
         * @returns {HTMLElement} List element
         */
        createListElement(listData, config) {
            const listElement = document.createElement('div');
            listElement.className = `list-visualization ${listData.type}`;
            
            if (listData.metadata.totalItems > config.virtualizeThreshold) {
                listElement.classList.add('large-list');
            }

            // Render items
            listData.items.forEach((item, index) => {
                const itemElement = this.renderListItem(item, 0, config, index);
                listElement.appendChild(itemElement);
            });

            return listElement;
        }

        /**
         * Render individual list item
         * @param {Object} item - List item data
         * @param {number} level - Nesting level
         * @param {Object} config - Rendering configuration
         * @param {number} index - Item index
         * @returns {HTMLElement} Item element
         */
        renderListItem(item, level, config, index) {
            const itemElement = document.createElement('div');
            itemElement.className = 'list-item';
            itemElement.setAttribute('data-level', level);
            itemElement.setAttribute('data-item-id', item.id);
            
            if (item.children && item.children.length > 0) {
                itemElement.classList.add('interactive');
                itemElement.setAttribute('data-has-children', 'true');
            }

            // Add expand/collapse control for items with children
            if (item.children && item.children.length > 0) {
                const expandControl = document.createElement('button');
                expandControl.className = 'list-expand-control collapsed';
                expandControl.setAttribute('type', 'button');
                expandControl.setAttribute('aria-label', 'Expand item');
                expandControl.setAttribute('tabindex', '0');
                itemElement.appendChild(expandControl);
            }

            // Create marker
            const marker = this.createListMarker(item, level, index, config);
            itemElement.appendChild(marker);

            // Create content
            const content = document.createElement('div');
            content.className = 'list-content';
            content.textContent = item.text;
            
            if (item.children && item.children.length > 0) {
                content.classList.add('with-children');
            }
            
            itemElement.appendChild(content);

            // Render children if present
            if (item.children && item.children.length > 0) {
                const nestedList = document.createElement('div');
                nestedList.className = 'nested-list';
                nestedList.style.display = 'none'; // Start collapsed
                
                item.children.forEach((child, childIndex) => {
                    const childElement = this.renderListItem(child, level + 1, config, childIndex);
                    nestedList.appendChild(childElement);
                });
                
                itemElement.appendChild(nestedList);
            }

            this.stats.itemsRendered++;
            return itemElement;
        }

        /**
         * Create list marker (bullet, number, or checkbox)
         * @param {Object} item - List item
         * @param {number} level - Nesting level
         * @param {number} index - Item index
         * @param {Object} config - Configuration
         * @returns {HTMLElement} Marker element
         */
        createListMarker(item, level, index, config) {
            const marker = document.createElement('div');
            marker.className = 'list-marker';

            if (item.checked !== undefined) {
                // Checkbox
                marker.classList.add('checkbox');
                if (item.checked) {
                    marker.classList.add('checked');
                }
                marker.setAttribute('role', 'checkbox');
                marker.setAttribute('aria-checked', item.checked.toString());
                marker.setAttribute('tabindex', '0');
            } else if (config.orderedListStyle && item.metadata?.ordered !== false) {
                // Numbered
                marker.classList.add('number');
                marker.setAttribute('data-number', `${index + 1}.`);
            } else {
                // Bullet
                marker.classList.add('bullet');
                const bulletStyle = config.bulletStyles[level] || config.bulletStyles[5];
                marker.setAttribute('data-bullet', bulletStyle);
            }

            return marker;
        }

        /**
         * Handle list interactions (clicks, etc.)
         * @param {Event} event - Click event
         */
        handleListInteraction(event) {
            const listItem = event.target.closest('.list-item');
            if (!listItem) return;

            const expandControl = event.target.closest('.list-expand-control');
            const checkbox = event.target.closest('.list-marker.checkbox');
            const content = event.target.closest('.list-content');

            if (expandControl) {
                event.preventDefault();
                event.stopPropagation();
                this.toggleListItem(listItem);
            } else if (checkbox) {
                event.preventDefault();
                event.stopPropagation();
                this.toggleCheckbox(listItem);
            } else if (content && content.classList.contains('with-children') && this.config.clickToExpand) {
                event.preventDefault();
                this.toggleListItem(listItem);
            }
        }

        /**
         * Toggle list item expansion
         * @param {HTMLElement} listItem - List item element
         */
        toggleListItem(listItem) {
            const nestedList = listItem.querySelector('.nested-list');
            const expandControl = listItem.querySelector('.list-expand-control');
            
            if (!nestedList || !expandControl) return;

            const isExpanded = !nestedList.style.display || nestedList.style.display === 'none';
            
            if (isExpanded) {
                this.expandListItem(listItem);
            } else {
                this.collapseListItem(listItem);
            }

            // Update node state
            const nodeElement = listItem.closest('[data-node-id]');
            if (nodeElement) {
                const nodeId = nodeElement.getAttribute('data-node-id');
                const itemId = listItem.getAttribute('data-item-id');
                const listState = this.listStates.get(nodeId);
                
                if (listState) {
                    if (isExpanded) {
                        listState.expandedItems.add(itemId);
                    } else {
                        listState.expandedItems.delete(itemId);
                    }
                }
            }

            // Emit event
            if (EventBus) {
                EventBus.emit('list-item-toggled', {
                    itemId: listItem.getAttribute('data-item-id'),
                    expanded: isExpanded,
                    nodeId: nodeElement?.getAttribute('data-node-id')
                });
            }
        }

        /**
         * Expand list item
         * @param {HTMLElement} listItem - List item element
         */
        expandListItem(listItem) {
            const nestedList = listItem.querySelector('.nested-list');
            const expandControl = listItem.querySelector('.list-expand-control');
            
            if (!nestedList || !expandControl) return;

            expandControl.classList.remove('collapsed');
            expandControl.classList.add('expanded');
            expandControl.setAttribute('aria-label', 'Collapse item');

            if (this.config.animateExpansion) {
                nestedList.classList.add('animating', 'expanding');
                nestedList.style.display = 'block';
                
                // Remove animation classes after completion
                setTimeout(() => {
                    nestedList.classList.remove('animating', 'expanding');
                }, 250);
            } else {
                nestedList.style.display = 'block';
            }
        }

        /**
         * Collapse list item
         * @param {HTMLElement} listItem - List item element
         */
        collapseListItem(listItem) {
            const nestedList = listItem.querySelector('.nested-list');
            const expandControl = listItem.querySelector('.list-expand-control');
            
            if (!nestedList || !expandControl) return;

            expandControl.classList.remove('expanded');
            expandControl.classList.add('collapsed');
            expandControl.setAttribute('aria-label', 'Expand item');

            if (this.config.animateExpansion) {
                nestedList.classList.add('animating', 'collapsing');
                
                // Hide after animation
                setTimeout(() => {
                    nestedList.style.display = 'none';
                    nestedList.classList.remove('animating', 'collapsing');
                }, 250);
            } else {
                nestedList.style.display = 'none';
            }
        }

        /**
         * Toggle checkbox state
         * @param {HTMLElement} listItem - List item element
         */
        toggleCheckbox(listItem) {
            const checkbox = listItem.querySelector('.list-marker.checkbox');
            if (!checkbox) return;

            const isChecked = checkbox.classList.contains('checked');
            const newChecked = !isChecked;

            checkbox.classList.toggle('checked', newChecked);
            checkbox.setAttribute('aria-checked', newChecked.toString());

            // Update node state
            const nodeElement = listItem.closest('[data-node-id]');
            if (nodeElement) {
                const nodeId = nodeElement.getAttribute('data-node-id');
                const itemId = listItem.getAttribute('data-item-id');
                
                // Emit checkbox change event
                if (EventBus) {
                    EventBus.emit('list-checkbox-toggled', {
                        nodeId,
                        itemId,
                        checked: newChecked
                    });
                }
            }

            // Announce change for accessibility
            if (this.config.announceChanges) {
                this.announceCheckboxChange(listItem, newChecked);
            }
        }

        /**
         * Handle keyboard navigation
         * @param {KeyboardEvent} event - Keyboard event
         */
        handleKeyboardNavigation(event) {
            const listItem = event.target.closest('.list-item');
            if (!listItem) return;

            switch (event.key) {
                case 'Enter':
                case ' ':
                    if (event.target.classList.contains('list-expand-control')) {
                        event.preventDefault();
                        this.toggleListItem(listItem);
                    } else if (event.target.classList.contains('checkbox')) {
                        event.preventDefault();
                        this.toggleCheckbox(listItem);
                    }
                    break;
                    
                case 'ArrowRight':
                    if (listItem.querySelector('.nested-list[style*="none"]')) {
                        event.preventDefault();
                        this.expandListItem(listItem);
                    }
                    break;
                    
                case 'ArrowLeft':
                    if (listItem.querySelector('.nested-list:not([style*="none"])')) {
                        event.preventDefault();
                        this.collapseListItem(listItem);
                    }
                    break;
            }
        }

        /**
         * Setup accessibility features for list
         * @param {HTMLElement} listElement - List element
         * @param {Object} listData - List data
         */
        setupListAccessibility(listElement, listData) {
            if (!this.config.semanticMarkup) return;

            listElement.setAttribute('role', 'tree');
            listElement.setAttribute('aria-label', `List with ${listData.metadata.totalItems} items`);

            const items = listElement.querySelectorAll('.list-item');
            items.forEach((item, index) => {
                item.setAttribute('role', 'treeitem');
                item.setAttribute('aria-posinset', index + 1);
                item.setAttribute('aria-setsize', items.length);
                
                const level = parseInt(item.getAttribute('data-level')) + 1;
                item.setAttribute('aria-level', level);
                
                const hasChildren = item.hasAttribute('data-has-children');
                if (hasChildren) {
                    const nestedList = item.querySelector('.nested-list');
                    const isExpanded = nestedList && nestedList.style.display !== 'none';
                    item.setAttribute('aria-expanded', isExpanded.toString());
                }
            });
        }

        /**
         * Announce checkbox change for screen readers
         * @param {HTMLElement} listItem - List item element
         * @param {boolean} checked - New checked state
         */
        announceCheckboxChange(listItem, checked) {
            const content = listItem.querySelector('.list-content');
            const text = content?.textContent || 'Item';
            const message = `${text} ${checked ? 'checked' : 'unchecked'}`;
            
            // Create live region for announcement
            let liveRegion = document.getElementById('list-live-region');
            if (!liveRegion) {
                liveRegion = document.createElement('div');
                liveRegion.id = 'list-live-region';
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
         * Update list display
         * @param {string} nodeId - Node ID
         * @param {Object} listData - New list data
         */
        updateListDisplay(nodeId, listData) {
            const nodeElement = this.container?.querySelector(`[data-node-id="${nodeId}"]`);
            if (!nodeElement) return;

            // Clear existing list
            const existingList = nodeElement.querySelector('.list-visualization');
            if (existingList) {
                existingList.remove();
            }

            // Render new list
            this.renderList(nodeElement, listData);
        }

        /**
         * Generate cache key for list rendering
         * @param {Object} listData - List data
         * @param {Object} config - Configuration
         * @returns {string} Cache key
         */
        generateCacheKey(listData, config) {
            const dataHash = JSON.stringify(listData);
            const configHash = JSON.stringify(config);
            return `${dataHash}-${configHash}`;
        }

        /**
         * Update render statistics
         * @param {number} renderTime - Render time in ms
         * @param {number} itemCount - Number of items rendered
         */
        updateRenderStats(renderTime, itemCount) {
            const currentAvg = this.stats.averageRenderTime;
            const count = this.stats.listsRendered;
            this.stats.averageRenderTime = ((currentAvg * count) + renderTime) / (count + 1);
        }

        /**
         * Get visualization statistics
         * @returns {Object} Statistics
         */
        getStats() {
            return {
                ...this.stats,
                activeListStates: this.listStates.size,
                cacheSize: this.renderCache.size,
                cacheHitRatio: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) || 0
            };
        }

        /**
         * Update configuration
         * @param {Object} newConfig - New configuration
         */
        updateConfig(newConfig) {
            this.config = { ...this.config, ...newConfig };
            
            // Clear cache if visual settings changed
            if (newConfig.indentationSize || newConfig.bulletStyles || newConfig.numberingStyles) {
                this.renderCache.clear();
            }
        }

        /**
         * Clear render cache
         */
        clearCache() {
            this.renderCache.clear();
            this.stats.cacheHits = 0;
            this.stats.cacheMisses = 0;
        }

        /**
         * Destroy list visualization manager
         */
        destroy() {
            // Clear all state
            this.listStates.clear();
            this.renderCache.clear();
            
            // Remove live region
            const liveRegion = document.getElementById('list-live-region');
            if (liveRegion) {
                liveRegion.remove();
            }

            // Remove styles
            const styleElement = document.getElementById('list-visualization-styles');
            if (styleElement) {
                styleElement.remove();
            }

            this.container = null;
            this.isInitialized = false;
        }
    }

    // Create global instance
    const listVisualizationManager = new ListVisualizationManager();

    // Expose to global namespace
    if (typeof window !== 'undefined') {
        window.TreeInteraction = window.TreeInteraction || {};
        
        // List visualization interface
        window.TreeInteraction.ListVisualization = {
            init: listVisualizationManager.init.bind(listVisualizationManager),
            renderList: listVisualizationManager.renderList.bind(listVisualizationManager),
            updateListDisplay: listVisualizationManager.updateListDisplay.bind(listVisualizationManager),
            toggleListItem: listVisualizationManager.toggleListItem.bind(listVisualizationManager),
            updateConfig: listVisualizationManager.updateConfig.bind(listVisualizationManager),
            clearCache: listVisualizationManager.clearCache.bind(listVisualizationManager),
            getStats: listVisualizationManager.getStats.bind(listVisualizationManager),
            destroy: listVisualizationManager.destroy.bind(listVisualizationManager),
            
            // Getters
            get isInitialized() { return listVisualizationManager.isInitialized; },
            get config() { return listVisualizationManager.config; },
            get stats() { return listVisualizationManager.getStats(); }
        };

        if (Debug?.log) {
            Debug.log('info', 'List Visualization module loaded', {
                globalInterface: 'window.TreeInteraction.ListVisualization'
            });
        }
    } else if (typeof module !== 'undefined' && module.exports) {
        // Node.js environment support
        module.exports = { 
            ListVisualizationManager, 
            ListConfig 
        };
    }

})();