/**
 * Content Display Integrator - Module
 * Integrates specialized content renderers (code blocks, tables, lists, images) with D3 visualization
 * Part of Task #9: Content Display Module implementation
 */
(function() {
    'use strict';

    // Import dependencies
    const EventBus = (typeof window !== 'undefined' && window.MindmapEvents) || { on: () => {}, emit: () => {} };
    const CodeBlockDisplay = (typeof window !== 'undefined' && window.MarkdownMindmap?.CodeBlockDisplay);
    const TableRenderer = (typeof window !== 'undefined' && window.MarkdownMindmap?.TableRenderer);
    const ListVisualization = (typeof window !== 'undefined' && window.TreeInteraction?.ListVisualization);
    
    /**
     * Content Display Integrator
     * Handles integration between specialized content renderers and D3 visualization
     */
    class ContentDisplayIntegrator {
        constructor() {
            this.codeRenderer = null;
            this.tableRenderer = null;
            this.listRenderer = null;
            this.contentCache = new Map();
            this.initialized = false;
            
            // Default configuration
            this.config = {
                enableCodeHighlighting: true,
                preserveTableFormatting: true,
                enableNestedLists: true,
                lazyLoadImages: true,
                maxContentHeight: 350,
                enableTooltipInteraction: true,
                showLineNumbers: true,
                enableCopyButton: true
            };
        }
        
        /**
         * Initialize the Content Display Integrator
         * @param {Object} options - Configuration options
         */
        init(options = {}) {
            if (this.initialized) return;
            
            // Merge configuration
            this.config = { ...this.config, ...options };
            
            // Initialize renderers
            this.initializeRenderers();
            
            // Register event listeners
            this.registerEventListeners();
            
            this.initialized = true;
            
            if (EventBus) {
                EventBus.emit('content-display:initialized', { 
                    renderers: {
                        code: !!this.codeRenderer,
                        table: !!this.tableRenderer,
                        list: !!this.listRenderer
                    }
                });
            }
            
            return this;
        }
        
        /**
         * Initialize specialized content renderers
         */
        initializeRenderers() {
            // Initialize code block renderer if available
            if (CodeBlockDisplay) {
                this.codeRenderer = new CodeBlockDisplay({
                    showLineNumbers: this.config.showLineNumbers,
                    enableCopy: this.config.enableCopyButton,
                    maxLines: 15,
                    theme: 'default'
                });
            }
            
            // Initialize table renderer if available
            if (TableRenderer) {
                this.tableRenderer = new TableRenderer({
                    preserveFormatting: this.config.preserveTableFormatting,
                    enableSorting: false,
                    maxRows: 10,
                    maxColumns: 5
                });
            }
            
            // Initialize list visualization if available
            if (ListVisualization && typeof ListVisualization.init === 'function') {
                this.listRenderer = ListVisualization;
            }
        }
        
        /**
         * Register event listeners for content updates
         */
        registerEventListeners() {
            if (EventBus) {
                // Listen for node click events to enhance with content
                EventBus.on('node:clicked', this.handleNodeClicked.bind(this));
                
                // Listen for tooltip creation to inject content
                EventBus.on('tooltip:created', this.enhanceTooltipContent.bind(this));
                
                // Listen for theme changes to update content styling
                EventBus.on('theme:changed', this.handleThemeChanged.bind(this));
            }
        }

        /**
         * Handle node click event
         * @param {Object} event - Node click event data
         */
        handleNodeClicked(event) {
            if (!event || !event.nodeData) return;
            
            const nodeData = event.nodeData;
            if (nodeData.contentType && nodeData.contentType !== 'text') {
                // Prepare specialized content for this node if needed
                this.prepareSpecializedContent(nodeData);
            }
        }
        
        /**
         * Handle theme change event
         * @param {Object} event - Theme change event data
         */
        handleThemeChanged(event) {
            // Clear cache to ensure content is re-rendered with new theme
            this.contentCache.clear();
        }
        
        /**
         * Enhance tooltip content with specialized renderers
         * @param {Object} event - Tooltip event data
         */
        enhanceTooltipContent(event) {
            if (!event || !event.nodeData || !event.container) return;
            
            const { nodeData, container } = event;
            this.renderSpecializedContent(nodeData, container);
        }
        
        /**
         * Prepare specialized content for rendering
         * @param {Object} nodeData - Node data with content information
         */
        prepareSpecializedContent(nodeData) {
            if (!nodeData || !nodeData.contentType) return;
            
            // Skip if content is already in cache
            const nodeId = nodeData.nodeId || nodeData.id;
            if (nodeId && this.contentCache.has(nodeId)) return;
            
            // Prepare content based on type
            if (nodeData.contentType === 'code' && nodeData.content) {
                // Pre-process code content
                const codeData = {
                    content: nodeData.content,
                    language: nodeData.language || null
                };
                this.contentCache.set(nodeId, { type: 'code', data: codeData });
            }
            else if (nodeData.contentType === 'table' && nodeData.headers && nodeData.rows) {
                // Pre-process table content
                const tableData = {
                    headers: nodeData.headers,
                    rows: nodeData.rows
                };
                this.contentCache.set(nodeId, { type: 'table', data: tableData });
            }
            else if (nodeData.contentType === 'list' && nodeData.items) {
                // Pre-process list content
                const listData = {
                    type: nodeData.listType || 'unordered',
                    items: nodeData.items,
                    metadata: nodeData.listMetadata || {}
                };
                this.contentCache.set(nodeId, { type: 'list', data: listData });
            }
            else if (nodeData.contentType === 'image' && nodeData.src) {
                // Pre-process image content
                const imageData = {
                    src: nodeData.src,
                    alt: nodeData.alt || '',
                    width: nodeData.width,
                    height: nodeData.height
                };
                this.contentCache.set(nodeId, { type: 'image', data: imageData });
            }
        }
        
        /**
         * Render specialized content in container
         * @param {Object} nodeData - Node data with content information
         * @param {HTMLElement} container - Container element for content
         */
        renderSpecializedContent(nodeData, container) {
            if (!nodeData || !container) return;
            
            // Create content container
            const contentContainer = document.createElement('div');
            contentContainer.className = 'mindmap-specialized-content';
            
            // Set max height for scrollable content
            contentContainer.style.maxHeight = `${this.config.maxContentHeight}px`;
            contentContainer.style.overflow = 'auto';
            
            // Handle content based on type
            if (nodeData.contentType === 'code' && this.codeRenderer) {
                this.renderCodeContent(nodeData, contentContainer);
            }
            else if (nodeData.contentType === 'table' && this.tableRenderer) {
                this.renderTableContent(nodeData, contentContainer);
            }
            else if (nodeData.contentType === 'list' && this.listRenderer) {
                this.renderListContent(nodeData, contentContainer);
            }
            else if (nodeData.contentType === 'image') {
                this.renderImageContent(nodeData, contentContainer);
            }
            
            // Only append if we added specialized content
            if (contentContainer.children.length > 0) {
                container.appendChild(contentContainer);
            }
        }
        
        /**
         * Render code block content
         * @param {Object} nodeData - Node data with code information
         * @param {HTMLElement} container - Container element
         */
        renderCodeContent(nodeData, container) {
            if (!this.codeRenderer || !nodeData.content) return;
            
            const codeData = {
                content: nodeData.content,
                language: nodeData.language || null
            };
            
            try {
                this.codeRenderer.renderCodeBlock(codeData, container, {
                    showLineNumbers: this.config.showLineNumbers,
                    enableCopy: this.config.enableCopyButton
                });
            } catch (error) {
                console.error('Error rendering code block:', error);
                // Fallback to simple code display
                const pre = document.createElement('pre');
                pre.textContent = nodeData.content;
                container.appendChild(pre);
            }
        }
        
        /**
         * Render table content
         * @param {Object} nodeData - Node data with table information
         * @param {HTMLElement} container - Container element
         */
        renderTableContent(nodeData, container) {
            if (!this.tableRenderer || !nodeData.headers || !nodeData.rows) return;
            
            const tableData = {
                headers: nodeData.headers,
                rows: nodeData.rows
            };
            
            try {
                this.tableRenderer.renderTable(tableData, container, {
                    preserveFormatting: this.config.preserveTableFormatting
                });
            } catch (error) {
                console.error('Error rendering table:', error);
                // Fallback to simple text representation
                const pre = document.createElement('pre');
                pre.textContent = `Headers: ${nodeData.headers.join(', ')}\nRows: ${nodeData.rows.length}`;
                container.appendChild(pre);
            }
        }
        
        /**
         * Render list content
         * @param {Object} nodeData - Node data with list information
         * @param {HTMLElement} container - Container element
         */
        renderListContent(nodeData, container) {
            if (!this.listRenderer || !nodeData.items) return;
            
            const listData = {
                type: nodeData.listType || 'unordered',
                items: nodeData.items,
                metadata: nodeData.listMetadata || {}
            };
            
            try {
                this.listRenderer.renderList(container, listData, {
                    showBulletPoints: true,
                    maxNestingLevels: this.config.enableNestedLists ? 6 : 1
                });
            } catch (error) {
                console.error('Error rendering list:', error);
                // Fallback to simple text representation
                const ul = document.createElement('ul');
                nodeData.items.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = typeof item === 'string' ? item : item.text || '';
                    ul.appendChild(li);
                });
                container.appendChild(ul);
            }
        }
        
        /**
         * Render image content
         * @param {Object} nodeData - Node data with image information
         * @param {HTMLElement} container - Container element
         */
        renderImageContent(nodeData, container) {
            if (!nodeData.src) return;
            
            // Create wrapper for image (enables responsive sizing)
            const wrapper = document.createElement('div');
            wrapper.className = 'mindmap-image-wrapper';
            
            // Create image element with lazy loading
            const img = document.createElement('img');
            img.className = 'mindmap-image';
            img.src = nodeData.src;
            img.alt = nodeData.alt || '';
            
            // Add lazy loading if enabled
            if (this.config.lazyLoadImages) {
                img.loading = 'lazy';
            }
            
            // Add responsive sizing
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            
            // Add title if available
            if (nodeData.title) {
                img.title = nodeData.title;
            }
            
            // Add error handling
            img.onerror = () => {
                img.style.display = 'none';
                const error = document.createElement('div');
                error.className = 'mindmap-image-error';
                error.textContent = 'Image could not be loaded';
                wrapper.appendChild(error);
            };
            
            wrapper.appendChild(img);
            container.appendChild(wrapper);
        }
    }

    // Create singleton instance
    const contentDisplayIntegrator = new ContentDisplayIntegrator();

    // Export module
    if (typeof window !== 'undefined') {
        window.MarkdownMindmap = window.MarkdownMindmap || {};
        window.MarkdownMindmap.ContentDisplayIntegrator = contentDisplayIntegrator;
        
        // Auto-initialize on DOMContentLoaded
        document.addEventListener('DOMContentLoaded', () => {
            contentDisplayIntegrator.init();
            console.log('Content Display Integrator initialized');
        });
    }
})();
