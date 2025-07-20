/**
 * Table Renderer Component - T009
 * Renders table content with formatting preservation for mindmap visualization
 * 
 * @module TableRenderer
 * @requires CSS styling from components.css
 */

(function() {
    'use strict';

    /**
     * Table Renderer class for displaying table content in mindmap nodes
     * @class TableRenderer
     */
    class TableRenderer {
        
        /**
         * Initialize table renderer with configuration options
         * @param {Object} options - Renderer configuration
         * @param {boolean} options.preserveFormatting - Maintain original table formatting (default: true)
         * @param {boolean} options.enableSorting - Allow column sorting (default: false)
         * @param {number} options.maxRows - Maximum rows to display before truncation (default: 10)
         * @param {number} options.maxColumns - Maximum columns to display (default: 5)
         * @param {string} options.theme - Theme for table styling (default: 'default')
         */
        constructor(options = {}) {
            this.config = {
                preserveFormatting: options.preserveFormatting !== false,
                enableSorting: options.enableSorting || false,
                maxRows: options.maxRows || 10,
                maxColumns: options.maxColumns || 5,
                theme: options.theme || 'default',
                enableTruncation: options.enableTruncation !== false,
                cellPadding: options.cellPadding || 8,
                ...options
            };
            
            this.tableCache = new Map();
        }

        /**
         * Render table data into HTML element
         * @param {Object} tableData - Table data from content analysis
         * @param {Array<string>} tableData.headers - Table headers
         * @param {Array<Array<string>>} tableData.rows - Table rows
         * @param {HTMLElement} container - Container element for the table
         * @param {Object} options - Rendering options
         * @returns {HTMLElement} Rendered table element
         */
        renderTable(tableData, container, options = {}) {
            if (!this.validateTableData(tableData)) {
                throw new Error('Invalid table data provided');
            }

            const renderConfig = { ...this.config, ...options };
            const tableId = this.generateTableId(tableData);
            
            // Check cache for performance
            if (this.tableCache.has(tableId) && !renderConfig.forceRefresh) {
                const cachedTable = this.tableCache.get(tableId).cloneNode(true);
                container.appendChild(cachedTable);
                return cachedTable;
            }

            const tableElement = this.createTableElement(tableData, renderConfig);
            
            // Cache the rendered table
            this.tableCache.set(tableId, tableElement.cloneNode(true));
            
            container.appendChild(tableElement);
            
            // Add event listeners if sorting is enabled
            if (renderConfig.enableSorting) {
                this.enableSorting(tableElement, tableData);
            }
            
            return tableElement;
        }

        /**
         * Create the complete table HTML structure
         * @param {Object} tableData - Table data to render
         * @param {Object} config - Rendering configuration
         * @returns {HTMLElement} Complete table element
         */
        createTableElement(tableData, config) {
            const table = document.createElement('table');
            table.className = `mindmap-table theme-${config.theme}`;
            table.setAttribute('data-table-id', this.generateTableId(tableData));
            
            // Apply responsive design attributes
            table.setAttribute('role', 'table');
            table.setAttribute('aria-label', 'Data table');
            
            // Create and append thead
            const thead = this.createTableHeader(tableData.headers, config);
            table.appendChild(thead);
            
            // Create and append tbody
            const tbody = this.createTableBody(tableData.rows, config);
            table.appendChild(tbody);
            
            // Add truncation indicator if needed
            if (config.enableTruncation && tableData.rows.length > config.maxRows) {
                const tfoot = this.createTableFooter(tableData.rows.length, config);
                table.appendChild(tfoot);
            }
            
            return table;
        }

        /**
         * Create table header with proper formatting
         * @param {Array<string>} headers - Header row data
         * @param {Object} config - Rendering configuration
         * @returns {HTMLElement} Table header element
         */
        createTableHeader(headers, config) {
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            headerRow.className = 'table-header-row';
            
            const displayHeaders = config.maxColumns > 0 ? 
                headers.slice(0, config.maxColumns) : headers;
            
            displayHeaders.forEach((header, index) => {
                const th = document.createElement('th');
                th.className = 'table-header-cell';
                th.setAttribute('data-column', index);
                th.setAttribute('scope', 'col');
                
                // Handle sorting if enabled
                if (config.enableSorting) {
                    th.className += ' sortable';
                    th.setAttribute('tabindex', '0');
                    th.setAttribute('role', 'button');
                    th.setAttribute('aria-sort', 'none');
                    
                    const sortIcon = document.createElement('span');
                    sortIcon.className = 'sort-icon';
                    sortIcon.innerHTML = '↕️';
                    th.appendChild(sortIcon);
                }
                
                const headerText = this.formatCellContent(header, 'header', config);
                const textNode = document.createElement('span');
                textNode.className = 'header-text';
                textNode.textContent = headerText;
                th.appendChild(textNode);
                
                headerRow.appendChild(th);
            });
            
            // Add truncation indicator for columns if needed
            if (config.maxColumns > 0 && headers.length > config.maxColumns) {
                const th = document.createElement('th');
                th.className = 'table-header-cell truncated';
                th.textContent = `+${headers.length - config.maxColumns} more`;
                th.setAttribute('title', `${headers.length - config.maxColumns} additional columns`);
                headerRow.appendChild(th);
            }
            
            thead.appendChild(headerRow);
            return thead;
        }

        /**
         * Create table body with row data
         * @param {Array<Array<string>>} rows - Table row data
         * @param {Object} config - Rendering configuration
         * @returns {HTMLElement} Table body element
         */
        createTableBody(rows, config) {
            const tbody = document.createElement('tbody');
            
            const displayRows = config.maxRows > 0 ? 
                rows.slice(0, config.maxRows) : rows;
            
            displayRows.forEach((row, rowIndex) => {
                const tr = document.createElement('tr');
                tr.className = `table-row ${rowIndex % 2 === 0 ? 'even' : 'odd'}`;
                tr.setAttribute('data-row', rowIndex);
                
                const displayCells = config.maxColumns > 0 ? 
                    row.slice(0, config.maxColumns) : row;
                
                displayCells.forEach((cell, cellIndex) => {
                    const td = document.createElement('td');
                    td.className = 'table-cell';
                    td.setAttribute('data-column', cellIndex);
                    td.setAttribute('data-row', rowIndex);
                    
                    const cellContent = this.formatCellContent(cell, 'data', config);
                    td.textContent = cellContent;
                    
                    // Add cell type detection for styling
                    const cellType = this.detectCellType(cell);
                    td.setAttribute('data-cell-type', cellType);
                    
                    tr.appendChild(td);
                });
                
                // Add truncation indicator for cells if needed
                if (config.maxColumns > 0 && row.length > config.maxColumns) {
                    const td = document.createElement('td');
                    td.className = 'table-cell truncated';
                    td.textContent = '...';
                    td.setAttribute('title', `${row.length - config.maxColumns} additional cells`);
                    tr.appendChild(td);
                }
                
                tbody.appendChild(tr);
            });
            
            return tbody;
        }

        /**
         * Create table footer with truncation information
         * @param {number} totalRows - Total number of rows in data
         * @param {Object} config - Rendering configuration
         * @returns {HTMLElement} Table footer element
         */
        createTableFooter(totalRows, config) {
            const tfoot = document.createElement('tfoot');
            const footerRow = document.createElement('tr');
            footerRow.className = 'table-footer-row';
            
            const td = document.createElement('td');
            td.className = 'table-footer-cell';
            td.setAttribute('colspan', config.maxColumns + 1);
            td.textContent = `Showing ${config.maxRows} of ${totalRows} rows`;
            
            footerRow.appendChild(td);
            tfoot.appendChild(footerRow);
            
            return tfoot;
        }

        /**
         * Format cell content based on configuration and content type
         * @param {string} content - Raw cell content
         * @param {string} type - Cell type ('header' or 'data')
         * @param {Object} config - Rendering configuration
         * @returns {string} Formatted cell content
         */
        formatCellContent(content, type, config) {
            if (!content || typeof content !== 'string') {
                return '';
            }
            
            let formatted = content.trim();
            
            // Preserve formatting if enabled
            if (config.preserveFormatting) {
                // Handle common markdown formatting within cells
                formatted = formatted
                    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers for plain text
                    .replace(/\*(.*?)\*/g, '$1')     // Remove italic markers
                    .replace(/`(.*?)`/g, '$1');      // Remove code markers
            }
            
            // Truncate long content
            const maxLength = type === 'header' ? 20 : 30;
            if (formatted.length > maxLength) {
                formatted = formatted.substring(0, maxLength - 3) + '...';
            }
            
            return formatted;
        }

        /**
         * Detect cell content type for styling purposes
         * @param {string} content - Cell content
         * @returns {string} Cell type classification
         */
        detectCellType(content) {
            if (!content || typeof content !== 'string') return 'empty';
            
            const trimmed = content.trim();
            
            // Numeric detection
            if (/^\d+(\.\d+)?$/.test(trimmed)) return 'number';
            if (/^\d+%$/.test(trimmed)) return 'percentage';
            if (/^\$\d+(\.\d+)?$/.test(trimmed)) return 'currency';
            
            // Date detection
            if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return 'date';
            
            // Boolean detection
            if (/^(true|false|yes|no)$/i.test(trimmed)) return 'boolean';
            
            // URL detection
            if (/^https?:\/\//.test(trimmed)) return 'url';
            
            // Email detection
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'email';
            
            return 'text';
        }

        /**
         * Enable sorting functionality for table columns
         * @param {HTMLElement} tableElement - Table element to enhance
         * @param {Object} tableData - Original table data
         */
        enableSorting(tableElement, tableData) {
            const headers = tableElement.querySelectorAll('th.sortable');
            
            headers.forEach((header, columnIndex) => {
                header.addEventListener('click', () => {
                    this.sortTable(tableElement, columnIndex, tableData);
                });
                
                header.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.sortTable(tableElement, columnIndex, tableData);
                    }
                });
            });
        }

        /**
         * Sort table by column
         * @param {HTMLElement} tableElement - Table to sort
         * @param {number} columnIndex - Column index to sort by
         * @param {Object} tableData - Original table data
         */
        sortTable(tableElement, columnIndex, tableData) {
            const tbody = tableElement.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr'));
            const header = tableElement.querySelector(`th[data-column="${columnIndex}"]`);
            
            // Determine sort direction
            const currentSort = header.getAttribute('aria-sort');
            const ascending = currentSort !== 'ascending';
            
            // Reset all sort indicators
            tableElement.querySelectorAll('th[aria-sort]').forEach(th => {
                th.setAttribute('aria-sort', 'none');
                th.querySelector('.sort-icon').innerHTML = '↕️';
            });
            
            // Set current sort indicator
            header.setAttribute('aria-sort', ascending ? 'ascending' : 'descending');
            header.querySelector('.sort-icon').innerHTML = ascending ? '↑' : '↓';
            
            // Sort rows
            rows.sort((a, b) => {
                const aCell = a.querySelector(`td[data-column="${columnIndex}"]`);
                const bCell = b.querySelector(`td[data-column="${columnIndex}"]`);
                const aValue = aCell ? aCell.textContent.trim() : '';
                const bValue = bCell ? bCell.textContent.trim() : '';
                
                // Numeric comparison
                const aNum = parseFloat(aValue);
                const bNum = parseFloat(bValue);
                if (!isNaN(aNum) && !isNaN(bNum)) {
                    return ascending ? aNum - bNum : bNum - aNum;
                }
                
                // String comparison
                return ascending ? 
                    aValue.localeCompare(bValue) : 
                    bValue.localeCompare(aValue);
            });
            
            // Reorder DOM elements
            rows.forEach(row => tbody.appendChild(row));
        }

        /**
         * Validate table data structure
         * @param {Object} tableData - Table data to validate
         * @returns {boolean} True if valid
         */
        validateTableData(tableData) {
            if (!tableData || typeof tableData !== 'object') return false;
            if (!Array.isArray(tableData.headers)) return false;
            if (!Array.isArray(tableData.rows)) return false;
            if (tableData.headers.length === 0) return false;
            
            // Validate each row has appropriate structure
            return tableData.rows.every(row => Array.isArray(row));
        }

        /**
         * Generate unique ID for table caching
         * @param {Object} tableData - Table data
         * @returns {string} Unique table identifier
         */
        generateTableId(tableData) {
            const content = JSON.stringify(tableData);
            let hash = 0;
            for (let i = 0; i < content.length; i++) {
                const char = content.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return `table_${Math.abs(hash)}`;
        }

        /**
         * Render table from TreeNode data
         * @param {TreeNode} node - Tree node containing table data
         * @param {HTMLElement} container - Container element
         * @param {Object} options - Rendering options
         * @returns {HTMLElement} Rendered table element
         */
        renderFromNode(node, container, options = {}) {
            if (!node || node.type !== 'table') {
                throw new Error('Node must be of type "table"');
            }
            
            const tableData = {
                headers: node.headers || [],
                rows: node.rows || []
            };
            
            return this.renderTable(tableData, container, options);
        }

        /**
         * Clear renderer cache
         */
        clearCache() {
            this.tableCache.clear();
        }

        /**
         * Get renderer statistics
         * @returns {Object} Renderer statistics
         */
        getStats() {
            return {
                cachedTables: this.tableCache.size,
                config: { ...this.config },
                supportedCellTypes: [
                    'text', 'number', 'percentage', 'currency', 
                    'date', 'boolean', 'url', 'email', 'empty'
                ]
            };
        }
    }

    // Export TableRenderer
    if (typeof window !== 'undefined') {
        window.MarkdownMindmap = window.MarkdownMindmap || {};
        window.MarkdownMindmap.TableRenderer = TableRenderer;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { TableRenderer };
    }

})();