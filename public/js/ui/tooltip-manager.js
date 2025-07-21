/**
 * Enhanced Tooltip Manager - T021 Implementation  
 * Advanced tooltip system with rich content previews for mindmap nodes
 * 
 * @module TooltipManager
 * @requires EventBus from event-manager.js
 * @requires CodeBlockDisplay from code-block-display.js (optional)
 */

(function() {
    'use strict';

    // Import dependencies
    const EventBus = (typeof window !== 'undefined' && window.MindmapEvents) || null;
    const CodeBlockDisplay = (typeof window !== 'undefined' && window.MarkdownMindmap?.CodeBlockDisplay) || null;
    const Debug = (typeof window !== 'undefined' && window.TreeInteraction?.Utils?.Debug) || {};

    /**
     * Enhanced Tooltip Configuration
     */
    const TooltipConfig = {
        // Display settings
        maxWidth: 400,
        maxHeight: 300,
        showDelay: 0, // Show immediately on click
        hideDelay: 100, // Quick hide when needed
        fadeInDuration: 150, // Faster fade in
        fadeOutDuration: 200, // Slightly slower fade out
        
        // Positioning
        offsetX: 15,
        offsetY: -10,
        screenPadding: 20,
        followCursor: false,
        
        // Content settings
        maxTextPreview: 200,
        maxCodeLines: 10,
        maxTableRows: 8,
        maxListItems: 10,
        enableSyntaxHighlighting: true,
        
        // Interactive features
        allowInteraction: true,
        closeOnScroll: true,
        closeOnResize: true,
        
        // Performance
        debounceTime: 50,
        maxConcurrentTooltips: 3,
        cacheTooltips: true,
        
        // Accessibility
        useAriaDescribedBy: true,
        announceToScreenReader: true,
        keyboardDismissible: true
    };

    /**
     * Enhanced Tooltip Manager Class
     */
    class TooltipManager {
        constructor(options = {}) {
            this.config = { ...TooltipConfig, ...options };
            this.activeTooltips = new Map();
            this.tooltipCache = new Map();
            this.showTimers = new Map();
            this.hideTimers = new Map();
            
            // Performance tracking
            this.stats = {
                tooltipsShown: 0,
                tooltipsHidden: 0,
                averageShowTime: 0,
                cacheHits: 0
            };
            
            // State management
            this.isEnabled = true;
            this.currentZIndex = 10000;
            
            this.initializeTooltipManager();
        }

        /**
         * Initialize tooltip manager with global event listeners
         */
        initializeTooltipManager() {
            // Global event listeners
            if (this.config.closeOnScroll) {
                document.addEventListener('scroll', () => this.hideAllTooltips(), { passive: true });
            }
            
            if (this.config.closeOnResize) {
                window.addEventListener('resize', () => this.hideAllTooltips());
            }
            
            if (this.config.keyboardDismissible) {
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') this.hideAllTooltips();
                });
            }
            
            // Hide tooltips when clicking anywhere outside
            document.addEventListener('click', (e) => {
                // Check if click is inside a tooltip or on a node
                const tooltip = e.target.closest('.mindmap-tooltip-enhanced');
                const node = e.target.closest('.node');
                
                if (!tooltip && !node) {
                    this.hideAllTooltips();
                }
            });

            // Initialize with EventBus if available
            if (EventBus) {
                EventBus.on('tooltip:show', (data) => {
                    this.showTooltip(data.element, data.content, data.options);
                });
                
                EventBus.on('tooltip:hide', (data) => {
                    this.hideTooltip(data.element || data.tooltipId);
                });
                
                EventBus.on('tooltip:update', (data) => {
                    this.updateTooltip(data.tooltipId, data.content);
                });
                
                EventBus.emit('tooltip-manager:initialized', { config: this.config });
            }

            if (Debug?.log) {
                Debug.log('info', 'Enhanced Tooltip Manager initialized', {
                    maxTooltips: this.config.maxConcurrentTooltips,
                    caching: this.config.cacheTooltips
                });
            }
        }

        /**
         * Show enhanced tooltip for a node element
         * @param {HTMLElement} element - Target element
         * @param {Object} nodeData - Node data for content generation
         * @param {Object} options - Display options
         */
        showTooltip(element, nodeData, options = {}) {
            if (!this.isEnabled || !element || !nodeData) return;

            const tooltipOptions = { ...this.config, ...options };
            const tooltipId = this.generateTooltipId(element, nodeData);
            
            // Clear any existing hide timer
            if (this.hideTimers.has(tooltipId)) {
                clearTimeout(this.hideTimers.get(tooltipId));
                this.hideTimers.delete(tooltipId);
            }

            // Check if tooltip already exists
            if (this.activeTooltips.has(tooltipId)) {
                return;
            }

            // Enforce concurrent tooltip limit
            if (this.activeTooltips.size >= this.config.maxConcurrentTooltips) {
                this.hideOldestTooltip();
            }

            // Set show timer
            const showTimer = setTimeout(() => {
                this.createAndShowTooltip(element, nodeData, tooltipOptions, tooltipId);
                this.showTimers.delete(tooltipId);
            }, tooltipOptions.showDelay);

            this.showTimers.set(tooltipId, showTimer);
        }

        /**
         * Create and display tooltip with rich content
         * @param {HTMLElement} element - Target element  
         * @param {Object} nodeData - Node data
         * @param {Object} options - Display options
         * @param {string} tooltipId - Unique tooltip identifier
         */
        createAndShowTooltip(element, nodeData, options, tooltipId) {
            const startTime = performance.now();

            // Check cache first
            let tooltipElement;
            if (this.config.cacheTooltips && this.tooltipCache.has(tooltipId)) {
                tooltipElement = this.tooltipCache.get(tooltipId).cloneNode(true);
                this.stats.cacheHits++;
            } else {
                tooltipElement = this.buildTooltipElement(nodeData, options);
                if (this.config.cacheTooltips) {
                    this.tooltipCache.set(tooltipId, tooltipElement.cloneNode(true));
                }
            }

            // Configure tooltip
            tooltipElement.id = tooltipId;
            tooltipElement.style.zIndex = this.currentZIndex++;
            
            // Add accessibility attributes
            if (this.config.useAriaDescribedBy) {
                element.setAttribute('aria-describedby', tooltipId);
            }

            // Position tooltip
            document.body.appendChild(tooltipElement);
            this.positionTooltip(tooltipElement, element, options);

            // Add to active tooltips
            this.activeTooltips.set(tooltipId, {
                element: tooltipElement,
                target: element,
                startTime,
                nodeData
            });

            // Animate in
            this.animateTooltipIn(tooltipElement, options);

            // Track stats
            this.stats.tooltipsShown++;
            
            // Event bus notification
            if (EventBus) {
                EventBus.emit('tooltip:shown', { 
                    tooltipId, 
                    nodeData, 
                    renderTime: performance.now() - startTime 
                });
            }

            // Add interaction handlers if enabled
            if (options.allowInteraction) {
                this.addTooltipInteractionHandlers(tooltipElement, tooltipId);
            }
        }

        /**
         * Build rich content tooltip element
         * @param {Object} nodeData - Node data
         * @param {Object} options - Display options
         * @returns {HTMLElement} Built tooltip element
         */
        buildTooltipElement(nodeData, options) {
            const tooltip = document.createElement('div');
            tooltip.className = 'mindmap-tooltip-enhanced';
            
            // Base styles
            Object.assign(tooltip.style, {
                position: 'absolute',
                background: 'rgba(0, 0, 0, 0.95)',
                color: 'white',
                borderRadius: '8px',
                padding: '16px',
                fontSize: '13px',
                lineHeight: '1.4',
                fontFamily: 'system-ui, sans-serif',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                maxWidth: options.maxWidth + 'px',
                maxHeight: options.maxHeight + 'px',
                overflowY: 'auto',
                overflowX: 'hidden',
                zIndex: '10000',
                opacity: '0',
                pointerEvents: options.allowInteraction ? 'auto' : 'none',
                wordWrap: 'break-word'
            });

            // Build content sections
            this.buildTooltipHeader(tooltip, nodeData);
            this.buildTooltipContent(tooltip, nodeData, options);
            this.buildTooltipFooter(tooltip, nodeData);

            return tooltip;
        }

        /**
         * Build tooltip header section
         * @param {HTMLElement} tooltip - Tooltip container
         * @param {Object} nodeData - Node data
         */
        buildTooltipHeader(tooltip, nodeData) {
            const header = document.createElement('div');
            header.className = 'tooltip-header';
            header.style.cssText = 'margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2);';
            
            // Title
            const title = document.createElement('div');
            title.className = 'tooltip-title';
            title.style.cssText = 'font-weight: 600; font-size: 14px; color: #ffffff; margin-bottom: 4px;';
            title.textContent = nodeData.name || nodeData.text || 'Unnamed Node';
            
            // Content type badge
            const contentType = nodeData.contentType || 'text';
            const badge = document.createElement('span');
            badge.className = 'tooltip-badge';
            badge.style.cssText = 'display: inline-block; background: rgba(59, 130, 246, 0.8); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;';
            
            const badgeColors = {
                'text': 'rgba(59, 130, 246, 0.8)',
                'code': 'rgba(16, 185, 129, 0.8)', 
                'table': 'rgba(107, 114, 128, 0.8)',
                'list': 'rgba(245, 158, 11, 0.8)'
            };
            badge.style.background = badgeColors[contentType] || badgeColors.text;
            badge.textContent = contentType;
            
            header.appendChild(title);
            header.appendChild(badge);
            tooltip.appendChild(header);
        }

        /**
         * Build tooltip main content section
         * @param {HTMLElement} tooltip - Tooltip container
         * @param {Object} nodeData - Node data
         * @param {Object} options - Display options
         */
        buildTooltipContent(tooltip, nodeData, options) {
            const content = document.createElement('div');
            content.className = 'tooltip-content';
            content.style.cssText = 'margin-bottom: 12px;';
            
            const contentType = nodeData.contentType || 'text';
            
            switch (contentType) {
                case 'code':
                    this.buildCodePreview(content, nodeData, options);
                    break;
                case 'table':
                    this.buildTablePreview(content, nodeData, options);
                    break;
                case 'list':
                    this.buildListPreview(content, nodeData, options);
                    break;
                default:
                    this.buildTextPreview(content, nodeData, options);
            }
            
            tooltip.appendChild(content);
        }

        /**
         * Build code preview in tooltip
         * @param {HTMLElement} container - Content container
         * @param {Object} nodeData - Node data
         * @param {Object} options - Display options
         */
        buildCodePreview(container, nodeData, options) {
            const codeContainer = document.createElement('div');
            codeContainer.className = 'tooltip-code-preview';
            codeContainer.style.cssText = 'background: rgba(0, 0, 0, 0.6); border-radius: 4px; padding: 12px; margin: 8px 0;';
            
            // Language indicator
            if (nodeData.language) {
                const langLabel = document.createElement('div');
                langLabel.className = 'code-language';
                langLabel.style.cssText = 'color: #10b981; font-size: 11px; font-weight: 500; margin-bottom: 6px;';
                langLabel.textContent = nodeData.language.toUpperCase();
                codeContainer.appendChild(langLabel);
            }
            
            // Code content
            const codeElement = document.createElement('pre');
            codeElement.style.cssText = 'margin: 0; font-family: monospace; font-size: 11px; line-height: 1.4; color: #e5e5e5; white-space: pre-wrap; word-break: break-all;';
            
            let code = nodeData.content || nodeData.detail || '';
            const lines = code.split('\n');
            
            if (lines.length > options.maxCodeLines) {
                code = lines.slice(0, options.maxCodeLines).join('\n') + 
                       `\n... (${lines.length - options.maxCodeLines} more lines)`;
            }
            
            // Apply basic syntax highlighting if enabled
            if (options.enableSyntaxHighlighting && nodeData.language) {
                codeElement.innerHTML = this.basicSyntaxHighlight(code, nodeData.language);
            } else {
                codeElement.textContent = code;
            }
            
            codeContainer.appendChild(codeElement);
            container.appendChild(codeContainer);
        }

        /**
         * Build table preview in tooltip
         * @param {HTMLElement} container - Content container
         * @param {Object} nodeData - Node data
         * @param {Object} options - Display options
         */
        buildTablePreview(container, nodeData, options) {
            const tableContainer = document.createElement('div');
            tableContainer.className = 'tooltip-table-preview';
            tableContainer.style.cssText = 'background: rgba(0, 0, 0, 0.4); border-radius: 4px; padding: 12px; margin: 8px 0;';
            
            if (nodeData.headers && nodeData.rows) {
                // Table info
                const tableInfo = document.createElement('div');
                tableInfo.style.cssText = 'color: #6b7280; font-size: 11px; margin-bottom: 8px;';
                tableInfo.textContent = `Table: ${nodeData.headers.length} columns × ${nodeData.rows.length} rows`;
                tableContainer.appendChild(tableInfo);
                
                // Simple table structure
                const table = document.createElement('div');
                table.className = 'simple-table';
                table.style.cssText = 'font-size: 11px; line-height: 1.3;';
                
                // Headers
                const headerRow = document.createElement('div');
                headerRow.style.cssText = 'font-weight: 600; color: #f3f4f6; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.2);';
                headerRow.textContent = nodeData.headers.slice(0, 3).join(' • ') + 
                    (nodeData.headers.length > 3 ? ' • ...' : '');
                table.appendChild(headerRow);
                
                // Sample rows
                const maxRows = Math.min(nodeData.rows.length, options.maxTableRows);
                for (let i = 0; i < maxRows; i++) {
                    const row = document.createElement('div');
                    row.style.cssText = 'color: #d1d5db; margin: 2px 0;';
                    const rowData = nodeData.rows[i] || [];
                    row.textContent = rowData.slice(0, 3).join(' • ') + 
                        (rowData.length > 3 ? ' • ...' : '');
                    table.appendChild(row);
                }
                
                if (nodeData.rows.length > maxRows) {
                    const moreRows = document.createElement('div');
                    moreRows.style.cssText = 'color: #6b7280; font-style: italic; margin-top: 4px;';
                    moreRows.textContent = `... ${nodeData.rows.length - maxRows} more rows`;
                    table.appendChild(moreRows);
                }
                
                tableContainer.appendChild(table);
            } else {
                const tableText = document.createElement('div');
                tableText.style.cssText = 'color: #d1d5db;';
                tableText.textContent = 'Table content preview not available';
                tableContainer.appendChild(tableText);
            }
            
            container.appendChild(tableContainer);
        }

        /**
         * Build list preview in tooltip
         * @param {HTMLElement} container - Content container
         * @param {Object} nodeData - Node data
         * @param {Object} options - Display options
         */
        buildListPreview(container, nodeData, options) {
            const listContainer = document.createElement('div');
            listContainer.className = 'tooltip-list-preview';
            listContainer.style.cssText = 'background: rgba(0, 0, 0, 0.4); border-radius: 4px; padding: 12px; margin: 8px 0;';
            
            if (nodeData.elements && nodeData.elements.length > 0) {
                // List info
                const listInfo = document.createElement('div');
                listInfo.style.cssText = 'color: #6b7280; font-size: 11px; margin-bottom: 8px;';
                listInfo.textContent = `List: ${nodeData.elements.length} items`;
                listContainer.appendChild(listInfo);
                
                // List items
                const maxItems = Math.min(nodeData.elements.length, options.maxListItems);
                for (let i = 0; i < maxItems; i++) {
                    const item = document.createElement('div');
                    item.style.cssText = 'color: #d1d5db; margin: 3px 0; padding-left: 12px; position: relative; font-size: 11px;';
                    
                    // Bullet point
                    const bullet = document.createElement('span');
                    bullet.style.cssText = 'position: absolute; left: 0; color: #f59e0b;';
                    bullet.textContent = '•';
                    item.appendChild(bullet);
                    
                    // Item text
                    const text = document.createTextNode(
                        typeof nodeData.elements[i] === 'string' 
                            ? nodeData.elements[i] 
                            : nodeData.elements[i]?.text || 'List item'
                    );
                    item.appendChild(text);
                    
                    listContainer.appendChild(item);
                }
                
                if (nodeData.elements.length > maxItems) {
                    const moreItems = document.createElement('div');
                    moreItems.style.cssText = 'color: #6b7280; font-style: italic; margin-top: 6px;';
                    moreItems.textContent = `... ${nodeData.elements.length - maxItems} more items`;
                    listContainer.appendChild(moreItems);
                }
            } else {
                const listText = document.createElement('div');
                listText.style.cssText = 'color: #d1d5db;';
                listText.textContent = 'List content preview not available';
                listContainer.appendChild(listText);
            }
            
            container.appendChild(listContainer);
        }

        /**
         * Build text preview in tooltip
         * @param {HTMLElement} container - Content container
         * @param {Object} nodeData - Node data
         * @param {Object} options - Display options
         */
        buildTextPreview(container, nodeData, options) {
            const detail = nodeData.detail || nodeData.content || '';
            
            if (detail.trim()) {
                const textContainer = document.createElement('div');
                textContainer.className = 'tooltip-text-preview';
                textContainer.style.cssText = 'color: #e5e5e5; line-height: 1.5; margin: 8px 0;';
                
                let previewText = detail;
                if (detail.length > options.maxTextPreview) {
                    previewText = detail.substring(0, options.maxTextPreview) + '...';
                }
                
                textContainer.textContent = previewText;
                container.appendChild(textContainer);
            }
        }

        /**
         * Build tooltip footer section
         * @param {HTMLElement} tooltip - Tooltip container
         * @param {Object} nodeData - Node data
         */
        buildTooltipFooter(tooltip, nodeData) {
            const footer = document.createElement('div');
            footer.className = 'tooltip-footer';
            footer.style.cssText = 'margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; align-items: center;';
            
            // Node info
            const nodeInfo = document.createElement('span');
            if (nodeData.isLeaf) {
                nodeInfo.textContent = 'Leaf node';
            } else {
                const childCount = nodeData.children ? nodeData.children.length : 0;
                nodeInfo.textContent = `${childCount} children`;
            }
            
            // Interaction hint
            const interactionHint = document.createElement('span');
            interactionHint.textContent = 'Click to expand';
            interactionHint.style.cssText = 'opacity: 0.7;';
            
            footer.appendChild(nodeInfo);
            footer.appendChild(interactionHint);
            tooltip.appendChild(footer);
        }

        /**
         * Basic syntax highlighting for tooltip previews
         * @param {string} code - Code content
         * @param {string} language - Programming language
         * @returns {string} Highlighted HTML
         */
        basicSyntaxHighlight(code, language) {
            // Escape HTML first
            code = code.replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m]);
            
            // Apply basic highlighting based on language
            switch (language.toLowerCase()) {
                case 'javascript':
                case 'js':
                    return code
                        .replace(/\b(function|const|let|var|if|else|for|while|return)\b/g, '<span style="color: #9333ea;">$1</span>')
                        .replace(/(['"`])(.*?)\1/g, '<span style="color: #059669;">$1$2$1</span>')
                        .replace(/\/\/(.*$)/gm, '<span style="color: #6b7280;">//$1</span>');
                        
                case 'python':
                    return code
                        .replace(/\b(def|import|from|if|else|for|while|return|class)\b/g, '<span style="color: #9333ea;">$1</span>')
                        .replace(/(['"`])(.*?)\1/g, '<span style="color: #059669;">$1$2$1</span>')
                        .replace(/#(.*$)/gm, '<span style="color: #6b7280;">#$1</span>');
                        
                default:
                    return code;
            }
        }

        /**
         * Position tooltip relative to target element
         * @param {HTMLElement} tooltip - Tooltip element
         * @param {HTMLElement} target - Target element
         * @param {Object} options - Positioning options
         */
        positionTooltip(tooltip, target, options) {
            const targetRect = target.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            let left = targetRect.left + targetRect.width + options.offsetX;
            let top = targetRect.top + options.offsetY;
            
            // Horizontal positioning
            if (left + tooltipRect.width > viewportWidth - options.screenPadding) {
                left = targetRect.left - tooltipRect.width - options.offsetX;
            }
            
            // Vertical positioning
            if (top + tooltipRect.height > viewportHeight - options.screenPadding) {
                top = viewportHeight - tooltipRect.height - options.screenPadding;
            }
            
            if (top < options.screenPadding) {
                top = options.screenPadding;
            }
            
            tooltip.style.left = Math.max(options.screenPadding, left) + 'px';
            tooltip.style.top = Math.max(options.screenPadding, top) + 'px';
        }

        /**
         * Animate tooltip appearance
         * @param {HTMLElement} tooltip - Tooltip element
         * @param {Object} options - Animation options
         */
        animateTooltipIn(tooltip, options) {
            tooltip.style.transition = `opacity ${options.fadeInDuration}ms ease-out, transform ${options.fadeInDuration}ms ease-out`;
            tooltip.style.transform = 'translateY(-5px)';
            
            requestAnimationFrame(() => {
                tooltip.style.opacity = '1';
                tooltip.style.transform = 'translateY(0)';
            });
        }

        /**
         * Hide tooltip with animation
         * @param {HTMLElement|string} target - Target element or tooltip ID
         */
        hideTooltip(target) {
            let tooltipId;
            
            if (typeof target === 'string') {
                tooltipId = target;
            } else {
                tooltipId = Array.from(this.activeTooltips.keys()).find(id => 
                    this.activeTooltips.get(id).target === target
                );
            }
            
            if (!tooltipId || !this.activeTooltips.has(tooltipId)) return;
            
            // Clear show timer if exists
            if (this.showTimers.has(tooltipId)) {
                clearTimeout(this.showTimers.get(tooltipId));
                this.showTimers.delete(tooltipId);
                return;
            }
            
            const hideTimer = setTimeout(() => {
                this.performHideTooltip(tooltipId);
                this.hideTimers.delete(tooltipId);
            }, this.config.hideDelay);
            
            this.hideTimers.set(tooltipId, hideTimer);
        }

        /**
         * Actually hide and remove tooltip
         * @param {string} tooltipId - Tooltip identifier
         */
        performHideTooltip(tooltipId) {
            const tooltipData = this.activeTooltips.get(tooltipId);
            if (!tooltipData) return;
            
            const { element, target } = tooltipData;
            
            // Animate out
            element.style.transition = `opacity ${this.config.fadeOutDuration}ms ease-in`;
            element.style.opacity = '0';
            
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
                
                // Remove accessibility attributes
                if (this.config.useAriaDescribedBy) {
                    target.removeAttribute('aria-describedby');
                }
                
                this.activeTooltips.delete(tooltipId);
                this.stats.tooltipsHidden++;
                
                if (EventBus) {
                    EventBus.emit('tooltip:hidden', { tooltipId });
                }
            }, this.config.fadeOutDuration);
        }

        /**
         * Hide all active tooltips
         */
        hideAllTooltips() {
            Array.from(this.activeTooltips.keys()).forEach(tooltipId => {
                this.performHideTooltip(tooltipId);
            });
        }

        /**
         * Hide oldest tooltip to enforce limit
         */
        hideOldestTooltip() {
            let oldestId = null;
            let oldestTime = Infinity;
            
            this.activeTooltips.forEach((data, id) => {
                if (data.startTime < oldestTime) {
                    oldestTime = data.startTime;
                    oldestId = id;
                }
            });
            
            if (oldestId) {
                this.performHideTooltip(oldestId);
            }
        }

        /**
         * Generate unique tooltip ID
         * @param {HTMLElement} element - Target element
         * @param {Object} nodeData - Node data
         * @returns {string} Unique identifier
         */
        generateTooltipId(element, nodeData) {
            const elementId = element.getAttribute('data-node-id') || element.id || 'unknown';
            const contentHash = this.hashContent(nodeData);
            return `tooltip-${elementId}-${contentHash}`;
        }

        /**
         * Hash content for caching
         * @param {Object} nodeData - Node data
         * @returns {string} Content hash
         */
        hashContent(nodeData) {
            const str = JSON.stringify(nodeData);
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return Math.abs(hash).toString(16);
        }

        /**
         * Add interaction handlers to tooltip
         * @param {HTMLElement} tooltip - Tooltip element
         * @param {string} tooltipId - Tooltip identifier
         */
        addTooltipInteractionHandlers(tooltip, tooltipId) {
            tooltip.addEventListener('mouseenter', () => {
                if (this.hideTimers.has(tooltipId)) {
                    clearTimeout(this.hideTimers.get(tooltipId));
                    this.hideTimers.delete(tooltipId);
                }
            });
            
            tooltip.addEventListener('mouseleave', () => {
                this.hideTooltip(tooltipId);
            });
        }

        /**
         * Enable/disable tooltip system
         * @param {boolean} enabled - Enable state
         */
        setEnabled(enabled) {
            this.isEnabled = enabled;
            if (!enabled) {
                this.hideAllTooltips();
            }
        }

        /**
         * Update tooltip configuration
         * @param {Object} newConfig - Configuration updates
         */
        updateConfig(newConfig) {
            this.config = { ...this.config, ...newConfig };
        }

        /**
         * Get tooltip statistics
         * @returns {Object} Performance statistics
         */
        getStats() {
            return {
                ...this.stats,
                activeTooltips: this.activeTooltips.size,
                cachedTooltips: this.tooltipCache.size,
                pendingShows: this.showTimers.size,
                pendingHides: this.hideTimers.size
            };
        }

        /**
         * Clear all caches and reset state
         */
        clear() {
            this.hideAllTooltips();
            this.tooltipCache.clear();
            this.showTimers.clear();
            this.hideTimers.clear();
            this.stats = {
                tooltipsShown: 0,
                tooltipsHidden: 0,
                averageShowTime: 0,
                cacheHits: 0
            };
        }

        /**
         * Destroy tooltip manager
         */
        destroy() {
            this.clear();
            document.removeEventListener('scroll', this.hideAllTooltips);
            window.removeEventListener('resize', this.hideAllTooltips);
            document.removeEventListener('keydown', this.hideAllTooltips);
        }
    }

    // Create global instance
    const tooltipManager = new TooltipManager();

    // Expose to global namespace
    if (typeof window !== 'undefined') {
        window.TreeInteraction = window.TreeInteraction || {};
        
        // Enhanced Tooltip Manager interface
        window.TreeInteraction.TooltipManager = {
            showTooltip: tooltipManager.showTooltip.bind(tooltipManager),
            hideTooltip: tooltipManager.hideTooltip.bind(tooltipManager),
            hideAllTooltips: tooltipManager.hideAllTooltips.bind(tooltipManager),
            updateConfig: tooltipManager.updateConfig.bind(tooltipManager),
            setEnabled: tooltipManager.setEnabled.bind(tooltipManager),
            getStats: tooltipManager.getStats.bind(tooltipManager),
            clear: tooltipManager.clear.bind(tooltipManager),
            destroy: tooltipManager.destroy.bind(tooltipManager),
            
            // Getters
            get isEnabled() { return tooltipManager.isEnabled; },
            get config() { return tooltipManager.config; },
            get stats() { return tooltipManager.getStats(); }
        };

        if (Debug?.log) {
            Debug.log('info', 'Enhanced Tooltip Manager module loaded', {
                globalInterface: 'window.TreeInteraction.TooltipManager'
            });
        }
    } else if (typeof module !== 'undefined' && module.exports) {
        // Node.js environment support
        module.exports = { 
            TooltipManager, 
            TooltipConfig 
        };
    }

})();