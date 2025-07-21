/**
 * List Visualization Module
 * Implements T022: List visualization with hierarchical display
 * Handles ordered, unordered, and checkbox lists with proper nesting
 */
(function() {
    'use strict';

    // Import dependencies
    const EventBus = (typeof window !== 'undefined' && window.MindmapEvents) || null;
    const ExpansionControls = (typeof window !== 'undefined' && window.MarkdownMindmap?.UIComponents?.expansionControls) || null;

    /**
     * List Visualization Manager Class
     * Implements hierarchical list rendering with interactions
     */
    class ListVisualizationManager {
        constructor() {
            this.eventBus = EventBus;
            this.expansionControls = ExpansionControls;
            this.expandedLevels = new Map(); // nodeId -> Set of expanded level paths
            
            this.config = {
                indentationSize: 20,
                maxNestingLevels: 6,
                showBulletPoints: true,
                animateExpansion: true,
                orderedListStyle: 'decimal',
                unorderedListStyle: 'disc',
                checklistStyle: 'custom',
                clickToExpand: true,
                hoverPreview: true,
                keyboardNavigation: true,
                announceChanges: true,
                semanticMarkup: true,
                focusManagement: true
            };

            this.setupCSS();
            this.registerEventHandlers();
        }

        /**
         * Setup CSS for list visualization
         */
        setupCSS() {
            const style = document.createElement('style');
            style.id = 'list-visualization-styles';
            style.textContent = `
                /* List Visualization Styles */
                .list-container {
                    margin: 8px 0;
                    font-size: 14px;
                    line-height: 1.4;
                }

                .list-item {
                    position: relative;
                    margin: 2px 0;
                    padding: 2px 0;
                    cursor: pointer;
                    border-radius: 3px;
                    transition: background-color 0.15s ease;
                }

                .list-item:hover {
                    background-color: rgba(59, 130, 246, 0.05);
                }

                .list-item.focused {
                    background-color: rgba(59, 130, 246, 0.1);
                    outline: 1px solid #3b82f6;
                    outline-offset: 1px;
                }

                .list-item-content {
                    display: flex;
                    align-items: flex-start;
                    padding-left: var(--indent-level, 0px);
                }

                .list-item-marker {
                    min-width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 8px;
                    font-size: 12px;
                    font-weight: 500;
                    flex-shrink: 0;
                }

                .list-item-text {
                    flex: 1;
                    min-width: 0;
                    word-wrap: break-word;
                    color: #374151;
                }

                .dark .list-item-text {
                    color: #d1d5db;
                }

                .list-item-expand {
                    width: 16px;
                    height: 16px;
                    margin-right: 4px;
                    border: none;
                    background: none;
                    cursor: pointer;
                    font-size: 10px;
                    color: #6b7280;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 2px;
                    transition: all 0.15s ease;
                }

                .list-item-expand:hover {
                    background-color: #e5e7eb;
                    color: #374151;
                }

                .dark .list-item-expand:hover {
                    background-color: #4b5563;
                    color: #d1d5db;
                }

                .list-item-expand.expanded {
                    transform: rotate(90deg);
                }

                /* Ordered list markers */
                .list-marker-ordered {
                    color: #6b7280;
                    font-weight: 600;
                }

                /* Unordered list markers */
                .list-marker-unordered {
                    color: #3b82f6;
                }

                .list-marker-unordered.level-0::before { content: '•'; }
                .list-marker-unordered.level-1::before { content: '◦'; }
                .list-marker-unordered.level-2::before { content: '▪'; }
                .list-marker-unordered.level-3::before { content: '▫'; }
                .list-marker-unordered.level-4::before { content: '‣'; }
                .list-marker-unordered.level-5::before { content: '⁃'; }

                /* Checkbox styling */
                .list-checkbox {
                    width: 16px;
                    height: 16px;
                    border: 2px solid #d1d5db;
                    border-radius: 3px;
                    background: white;
                    cursor: pointer;
                    position: relative;
                    transition: all 0.15s ease;
                }

                .list-checkbox:hover {
                    border-color: #3b82f6;
                }

                .list-checkbox.checked {
                    background-color: #3b82f6;
                    border-color: #3b82f6;
                }

                .list-checkbox.checked::after {
                    content: '✓';
                    position: absolute;
                    top: -1px;
                    left: 2px;
                    color: white;
                    font-size: 12px;
                    font-weight: bold;
                }

                .dark .list-checkbox {
                    border-color: #6b7280;
                    background: #374151;
                }

                .dark .list-checkbox.checked {
                    background-color: #3b82f6;
                    border-color: #3b82f6;
                }

                /* Nested list containers */
                .nested-list {
                    overflow: hidden;
                    transition: all var(--expansion-duration, 200ms) ease;
                    transform-origin: top;
                }

                .nested-list.collapsed {
                    max-height: 0;
                    opacity: 0;
                    transform: scaleY(0);
                }

                .nested-list.expanded {
                    max-height: 2000px;
                    opacity: 1;
                    transform: scaleY(1);
                }

                /* Indentation guides */
                .list-item::before {
                    content: '';
                    position: absolute;
                    left: calc(var(--indent-level, 0px) + 10px);
                    top: 0;
                    bottom: 0;
                    width: 1px;
                    background-color: #e5e7eb;
                    opacity: 0.5;
                }

                .dark .list-item::before {
                    background-color: #4b5563;
                }

                /* Hide guide for top-level items */
                .list-item[data-level="0"]::before {
                    display: none;
                }

                /* Completed checklist items */
                .list-item.completed .list-item-text {
                    text-decoration: line-through;
                    opacity: 0.6;
                }

                /* Accessibility */
                .list-item[aria-expanded="true"] .list-item-expand {
                    transform: rotate(90deg);
                }

                /* Reduced motion support */
                @media (prefers-reduced-motion: reduce) {
                    .list-item, .list-item-expand, .nested-list, .list-checkbox {
                        transition: none !important;
                        animation: none !important;
                    }
                }

                /* High contrast support */
                @media (prefers-contrast: high) {
                    .list-item:hover {
                        background-color: rgba(0, 0, 0, 0.1);
                    }
                    
                    .list-checkbox {
                        border-width: 3px;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        /**
         * Register event handlers
         */
        registerEventHandlers() {
            if (this.eventBus) {
                this.eventBus.on('content:updated', this.handleContentUpdate.bind(this));
                this.eventBus.on('node:expanded', this.handleNodeExpanded.bind(this));
                this.eventBus.on('node:collapsed', this.handleNodeCollapsed.bind(this));
            }
        }

        /**
         * Render a list in the given container
         * @param {HTMLElement} container - Container element
         * @param {Object} listData - List data from content analysis
         * @param {Object} config - Rendering configuration
         */
        renderList(container, listData, config = {}) {
            if (!container || !listData) return;

            const renderConfig = { ...this.config, ...config };
            const listContainer = document.createElement('div');
            listContainer.className = 'list-container';
            listContainer.setAttribute('role', 'tree');
            listContainer.setAttribute('aria-label', `${listData.type} list with ${listData.metadata?.totalItems || 0} items`);

            // Set up keyboard navigation
            if (renderConfig.keyboardNavigation) {
                listContainer.setAttribute('tabindex', '0');
                this.setupKeyboardNavigation(listContainer);
            }

            // Render list items
            if (listData.items && listData.items.length > 0) {
                listData.items.forEach((item, index) => {
                    const itemElement = this.renderListItem(item, 0, renderConfig, listData.type);
                    if (itemElement) {
                        listContainer.appendChild(itemElement);
                    }
                });
            }

            // Clear container and add new list
            container.innerHTML = '';
            container.appendChild(listContainer);

            // Initialize expanded state tracking
            const nodeId = container.getAttribute('data-node-id') || 'unknown';
            if (!this.expandedLevels.has(nodeId)) {
                this.expandedLevels.set(nodeId, new Set());
            }
        }

        /**
         * Render a single list item
         * @param {Object} item - List item data
         * @param {number} level - Nesting level
         * @param {Object} config - Rendering configuration
         * @param {string} listType - Type of list (ordered, unordered, checklist)
         * @returns {HTMLElement} List item element
         */
        renderListItem(item, level, config, listType) {
            if (!item || level > config.maxNestingLevels) return null;

            const itemElement = document.createElement('div');
            itemElement.className = 'list-item';
            itemElement.setAttribute('data-item-id', item.id);
            itemElement.setAttribute('data-level', level.toString());
            itemElement.setAttribute('role', 'treeitem');
            itemElement.setAttribute('aria-level', (level + 1).toString());

            // Set indentation
            itemElement.style.setProperty('--indent-level', `${level * config.indentationSize}px`);

            // Create item content container
            const contentElement = document.createElement('div');
            contentElement.className = 'list-item-content';

            // Add expand/collapse button for items with children
            if (item.children && item.children.length > 0) {
                const expandButton = this.createExpandButton(item, level);
                contentElement.appendChild(expandButton);
                itemElement.setAttribute('aria-expanded', 'false');
            }

            // Add marker (bullet, number, or checkbox)
            const marker = this.createListMarker(item, level, listType, config);
            if (marker) {
                contentElement.appendChild(marker);
            }

            // Add item text
            const textElement = document.createElement('span');
            textElement.className = 'list-item-text';
            textElement.textContent = item.text || '';
            contentElement.appendChild(textElement);

            itemElement.appendChild(contentElement);

            // Add checked class for completed checklist items
            if (listType === 'checklist' && item.checked) {
                itemElement.classList.add('completed');
            }

            // Render nested items if present
            if (item.children && item.children.length > 0) {
                const nestedContainer = document.createElement('div');
                nestedContainer.className = 'nested-list collapsed';
                nestedContainer.setAttribute('role', 'group');

                item.children.forEach(childItem => {
                    const childElement = this.renderListItem(childItem, level + 1, config, listType);
                    if (childElement) {
                        nestedContainer.appendChild(childElement);
                    }
                });

                itemElement.appendChild(nestedContainer);
            }

            // Add click handler
            this.addItemClickHandler(itemElement, item, level, listType);

            return itemElement;
        }

        /**
         * Create expand/collapse button for list items with children
         * @param {Object} item - List item data
         * @param {number} level - Nesting level
         * @returns {HTMLElement} Expand button element
         */
        createExpandButton(item, level) {
            const button = document.createElement('button');
            button.className = 'list-item-expand';
            button.setAttribute('aria-label', 'Expand/Collapse nested items');
            button.textContent = '▶';
            
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleListLevel(item.id, level);
            });

            return button;
        }

        /**
         * Create list marker (bullet, number, or checkbox)
         * @param {Object} item - List item data
         * @param {number} level - Nesting level
         * @param {string} listType - Type of list
         * @param {Object} config - Configuration
         * @returns {HTMLElement} Marker element
         */
        createListMarker(item, level, listType, config) {
            const marker = document.createElement('span');
            marker.className = 'list-item-marker';

            switch (listType) {
                case 'ordered':
                    marker.className += ' list-marker-ordered';
                    marker.textContent = `${item.index || 1}.`;
                    break;

                case 'unordered':
                    marker.className += ` list-marker-unordered level-${Math.min(level, 5)}`;
                    break;

                case 'checklist':
                    const checkbox = document.createElement('div');
                    checkbox.className = 'list-checkbox';
                    if (item.checked) {
                        checkbox.classList.add('checked');
                    }
                    
                    checkbox.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.handleCheckboxToggle(item.id, !item.checked);
                    });
                    
                    marker.appendChild(checkbox);
                    break;

                default:
                    return null;
            }

            return marker;
        }

        /**
         * Add click handler to list item
         * @param {HTMLElement} element - Item element
         * @param {Object} item - Item data
         * @param {number} level - Nesting level
         * @param {string} listType - List type
         */
        addItemClickHandler(element, item, level, listType) {
            element.addEventListener('click', (e) => {
                if (e.target.closest('.list-item-expand') || e.target.closest('.list-checkbox')) {
                    return; // Let specific handlers deal with these
                }

                // Focus the item
                if (this.config.focusManagement) {
                    element.focus();
                    element.classList.add('focused');
                    
                    // Remove focus from siblings
                    element.parentElement?.querySelectorAll('.list-item.focused')
                        .forEach(sibling => {
                            if (sibling !== element) {
                                sibling.classList.remove('focused');
                            }
                        });
                }

                // Emit click event
                if (this.eventBus) {
                    this.eventBus.emit('list:item:click', {
                        itemId: item.id,
                        level,
                        listType,
                        element,
                        originalEvent: e
                    });
                }

                // Expand if configured
                if (this.config.clickToExpand && item.children?.length > 0) {
                    this.toggleListLevel(item.id, level);
                }
            });
        }

        /**
         * Setup keyboard navigation for list container
         * @param {HTMLElement} container - List container
         */
        setupKeyboardNavigation(container) {
            container.addEventListener('keydown', (e) => {
                const focusedItem = container.querySelector('.list-item.focused');
                if (!focusedItem) return;

                switch (e.key) {
                    case 'ArrowDown':
                        e.preventDefault();
                        this.focusNextItem(focusedItem);
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        this.focusPreviousItem(focusedItem);
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.expandCurrentItem(focusedItem);
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.collapseCurrentItem(focusedItem);
                        break;
                    case 'Enter':
                    case ' ':
                        e.preventDefault();
                        focusedItem.click();
                        break;
                }
            });
        }

        /**
         * Focus next item in the list
         * @param {HTMLElement} currentItem - Currently focused item
         */
        focusNextItem(currentItem) {
            const allItems = Array.from(currentItem.closest('.list-container').querySelectorAll('.list-item'));
            const currentIndex = allItems.indexOf(currentItem);
            const nextItem = allItems[currentIndex + 1];
            
            if (nextItem) {
                currentItem.classList.remove('focused');
                nextItem.classList.add('focused');
                nextItem.focus();
            }
        }

        /**
         * Focus previous item in the list
         * @param {HTMLElement} currentItem - Currently focused item
         */
        focusPreviousItem(currentItem) {
            const allItems = Array.from(currentItem.closest('.list-container').querySelectorAll('.list-item'));
            const currentIndex = allItems.indexOf(currentItem);
            const previousItem = allItems[currentIndex - 1];
            
            if (previousItem) {
                currentItem.classList.remove('focused');
                previousItem.classList.add('focused');
                previousItem.focus();
            }
        }

        /**
         * Expand current item
         * @param {HTMLElement} currentItem - Currently focused item
         */
        expandCurrentItem(currentItem) {
            const expandButton = currentItem.querySelector('.list-item-expand');
            if (expandButton && !expandButton.classList.contains('expanded')) {
                expandButton.click();
            }
        }

        /**
         * Collapse current item
         * @param {HTMLElement} currentItem - Currently focused item
         */
        collapseCurrentItem(currentItem) {
            const expandButton = currentItem.querySelector('.list-item-expand');
            if (expandButton && expandButton.classList.contains('expanded')) {
                expandButton.click();
            }
        }

        /**
         * Toggle list level expansion
         * @param {string} itemId - Item ID
         * @param {number} level - Nesting level
         */
        toggleListLevel(itemId, level) {
            const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
            if (!itemElement) return;

            const nestedContainer = itemElement.querySelector('.nested-list');
            const expandButton = itemElement.querySelector('.list-item-expand');
            
            if (!nestedContainer || !expandButton) return;

            const isExpanded = nestedContainer.classList.contains('expanded');
            
            if (isExpanded) {
                this.collapseListLevel(itemId, level);
            } else {
                this.expandListLevel(itemId, level);
            }
        }

        /**
         * Expand list level
         * @param {string} itemId - Item ID
         * @param {number} level - Nesting level
         */
        expandListLevel(itemId, level) {
            const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
            if (!itemElement) return;

            const nestedContainer = itemElement.querySelector('.nested-list');
            const expandButton = itemElement.querySelector('.list-item-expand');
            
            if (!nestedContainer || !expandButton) return;

            // Animate expansion
            if (this.config.animateExpansion) {
                nestedContainer.style.setProperty('--expansion-duration', '200ms');
            }

            nestedContainer.classList.remove('collapsed');
            nestedContainer.classList.add('expanded');
            expandButton.classList.add('expanded');
            itemElement.setAttribute('aria-expanded', 'true');

            // Announce to screen readers
            if (this.config.announceChanges) {
                this.announceToScreenReader(`Expanded: ${itemElement.querySelector('.list-item-text')?.textContent}`);
            }

            // Update expanded state tracking
            const nodeId = itemElement.closest('[data-node-id]')?.getAttribute('data-node-id');
            if (nodeId) {
                const expandedSet = this.expandedLevels.get(nodeId) || new Set();
                expandedSet.add(`${itemId}-${level}`);
                this.expandedLevels.set(nodeId, expandedSet);
            }

            // Emit event
            if (this.eventBus) {
                this.eventBus.emit('list:level:expanded', { itemId, level });
            }
        }

        /**
         * Collapse list level
         * @param {string} itemId - Item ID
         * @param {number} level - Nesting level
         */
        collapseListLevel(itemId, level) {
            const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
            if (!itemElement) return;

            const nestedContainer = itemElement.querySelector('.nested-list');
            const expandButton = itemElement.querySelector('.list-item-expand');
            
            if (!nestedContainer || !expandButton) return;

            // Animate collapse
            if (this.config.animateExpansion) {
                nestedContainer.style.setProperty('--expansion-duration', '200ms');
            }

            nestedContainer.classList.remove('expanded');
            nestedContainer.classList.add('collapsed');
            expandButton.classList.remove('expanded');
            itemElement.setAttribute('aria-expanded', 'false');

            // Announce to screen readers
            if (this.config.announceChanges) {
                this.announceToScreenReader(`Collapsed: ${itemElement.querySelector('.list-item-text')?.textContent}`);
            }

            // Update expanded state tracking
            const nodeId = itemElement.closest('[data-node-id]')?.getAttribute('data-node-id');
            if (nodeId) {
                const expandedSet = this.expandedLevels.get(nodeId) || new Set();
                expandedSet.delete(`${itemId}-${level}`);
                this.expandedLevels.set(nodeId, expandedSet);
            }

            // Emit event
            if (this.eventBus) {
                this.eventBus.emit('list:level:collapsed', { itemId, level });
            }
        }

        /**
         * Handle checkbox toggle
         * @param {string} itemId - Item ID
         * @param {boolean} checked - New checked state
         */
        handleCheckboxToggle(itemId, checked) {
            const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
            if (!itemElement) return;

            const checkbox = itemElement.querySelector('.list-checkbox');
            if (!checkbox) return;

            // Update checkbox visual state
            if (checked) {
                checkbox.classList.add('checked');
                itemElement.classList.add('completed');
            } else {
                checkbox.classList.remove('checked');
                itemElement.classList.remove('completed');
            }

            // Announce to screen readers
            if (this.config.announceChanges) {
                const itemText = itemElement.querySelector('.list-item-text')?.textContent;
                this.announceToScreenReader(`${checked ? 'Checked' : 'Unchecked'}: ${itemText}`);
            }

            // Emit event
            if (this.eventBus) {
                this.eventBus.emit('list:checkbox:toggled', { itemId, checked });
            }
        }

        /**
         * Update list display for a node
         * @param {string} nodeId - Node ID
         * @param {Object} listData - Updated list data
         */
        updateListDisplay(nodeId, listData) {
            const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
            const container = nodeElement?.querySelector('.expandable-content');
            
            if (container && listData) {
                this.renderList(container, listData);
            }
        }

        /**
         * Set visualization configuration
         * @param {Object} config - New configuration
         */
        setVisualizationConfig(config) {
            this.config = { ...this.config, ...config };
        }

        /**
         * Get list hierarchy information
         * @param {Object} listData - List data
         * @returns {Object} Hierarchy information
         */
        getListHierarchy(listData) {
            if (!listData?.items) return { maxDepth: 0, totalItems: 0 };

            let maxDepth = 0;
            let totalItems = 0;

            const traverse = (items, depth = 0) => {
                maxDepth = Math.max(maxDepth, depth);
                items.forEach(item => {
                    totalItems++;
                    if (item.children?.length > 0) {
                        traverse(item.children, depth + 1);
                    }
                });
            };

            traverse(listData.items);
            return { maxDepth, totalItems };
        }

        /**
         * Handle content update events
         * @param {Object} eventData - Event data
         */
        handleContentUpdate(eventData) {
            if (eventData.contentType === 'list') {
                this.updateListDisplay(eventData.nodeId, eventData.content);
            }
        }

        /**
         * Handle node expanded events
         * @param {Object} eventData - Event data
         */
        handleNodeExpanded(eventData) {
            // Sync with expansion controls if needed
        }

        /**
         * Handle node collapsed events
         * @param {Object} eventData - Event data
         */
        handleNodeCollapsed(eventData) {
            // Sync with expansion controls if needed
        }

        /**
         * Announce message to screen readers
         * @param {string} message - Message to announce
         */
        announceToScreenReader(message) {
            const announcer = document.createElement('div');
            announcer.setAttribute('aria-live', 'polite');
            announcer.setAttribute('aria-atomic', 'true');
            announcer.style.position = 'absolute';
            announcer.style.left = '-10000px';
            announcer.textContent = message;
            
            document.body.appendChild(announcer);
            setTimeout(() => document.body.removeChild(announcer), 1000);
        }
    }

    // Create global instance
    const listVisualizationManager = new ListVisualizationManager();

    // Expose to global namespace
    if (typeof window !== 'undefined') {
        window.MarkdownMindmap = window.MarkdownMindmap || {};
        window.MarkdownMindmap.ListVisualizer = {
            renderList: listVisualizationManager.renderList.bind(listVisualizationManager),
            updateListDisplay: listVisualizationManager.updateListDisplay.bind(listVisualizationManager),
            setVisualizationConfig: listVisualizationManager.setVisualizationConfig.bind(listVisualizationManager),
            getListHierarchy: listVisualizationManager.getListHierarchy.bind(listVisualizationManager),
            
            // Direct access to manager
            manager: listVisualizationManager
        };
    } else if (typeof module !== 'undefined' && module.exports) {
        // Node.js environment support
        module.exports = { ListVisualizationManager };
    }

})();