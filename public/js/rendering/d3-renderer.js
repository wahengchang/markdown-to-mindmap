/**
 * D3 Renderer Module - Refactored
 * Creates interactive SVG mindmap visualizations using D3.js
 * 
 * @module D3Renderer
 * @requires D3.js v7.9.0
 */

(function() {
    'use strict';

    // Constants
    const CONSTANTS = {
        DEFAULT_WIDTH: 800,
        DEFAULT_HEIGHT: 600,
        ZOOM_EXTENT: [0.1, 4],
        MIN_AUTO_SCALE: 0.5,
        MAX_AUTO_SCALE: 1.2,
        LAYOUT_PADDING: 80,
        LAYOUT_MARGIN: 160,
        ANIMATION_DURATION: 200,
        TOOLTIP_DELAY: 200,
        MAX_TEXT_LENGTH: 50,
        MAX_DETAIL_LINES: 4
    };

    const DEFAULT_COLORS = [
        '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'
    ];

    // Data Schema Validators
    const SchemaValidator = {
        validateNodeData(nodeData) {
            if (!nodeData || typeof nodeData !== 'object') {
                throw new Error('Invalid node data: must be an object');
            }
            return true;
        },

        validateRenderOptions(options) {
            const defaults = {
                width: CONSTANTS.DEFAULT_WIDTH,
                height: CONSTANTS.DEFAULT_HEIGHT,
                interactive: true,
                showTooltips: true
            };
            return { ...defaults, ...options };
        }
    };

    // Pure Logic Layer - No Browser Dependencies
    
    // Text wrapping utility
    const TextUtils = {
        /**
         * Wrap text to fit within specified length, breaking at word boundaries
         * @param {string} text - Text to wrap
         * @param {number} maxLength - Maximum line length
         * @returns {Object} Object with lines array and truncated flag
         */
        wrapText(text, maxLength = 50) {
            if (!text || text.length <= maxLength) {
                return { lines: [text], truncated: false };
            }
            
            const words = text.split(/\s+/);
            const lines = [];
            let currentLine = '';
            
            for (const word of words) {
                const testLine = currentLine + (currentLine ? ' ' : '') + word;
                
                if (testLine.length <= maxLength) {
                    currentLine = testLine;
                } else {
                    if (currentLine) {
                        lines.push(currentLine);
                    }
                    
                    // If a single word is longer than maxLength, truncate it
                    if (word.length > maxLength) {
                        lines.push(word.substring(0, maxLength - 3) + '...');
                        currentLine = '';
                    } else {
                        currentLine = word;
                    }
                }
                
                // Limit to 2 lines for nodes
                if (lines.length >= 2) {
                    if (currentLine) {
                        lines.push(currentLine.length > maxLength ? 
                            currentLine.substring(0, maxLength - 3) + '...' : currentLine);
                    }
                    break;
                }
            }
            
            if (currentLine && lines.length < 2) {
                lines.push(currentLine);
            }
            
            const hasMoreWords = words.length > words.findIndex(word => 
                lines.join(' ').includes(word)) + lines.join(' ').split(' ').length;
            
            return { 
                lines: lines.slice(0, 2), 
                truncated: hasMoreWords || text.length > lines.join(' ').length 
            };
        }
    };
    
    const ColorUtils = {
        /**
         * Shift hue of a hex color
         */
        shiftHue(hexColor, degrees) {
            if (!hexColor || hexColor === 'none' || !hexColor.startsWith('#')) {
                return '#3b82f6';
            }
            
            try {
                let r = parseInt(hexColor.slice(1, 3), 16);
                let g = parseInt(hexColor.slice(3, 5), 16);
                let b = parseInt(hexColor.slice(5, 7), 16);
                
                r /= 255; g /= 255; b /= 255;
                
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                let h, s, l = (max + min) / 2;
                
                if (max === min) {
                    h = s = 0;
                } else {
                    const d = max - min;
                    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                    
                    switch (max) {
                        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                        case g: h = (b - r) / d + 2; break;
                        case b: h = (r - g) / d + 4; break;
                    }
                    h /= 6;
                }
                
                h = (h * 360 + degrees) % 360 / 360;
                
                let r1, g1, b1;
                if (s === 0) {
                    r1 = g1 = b1 = l;
                } else {
                    const hue2rgb = (p, q, t) => {
                        if (t < 0) t += 1;
                        if (t > 1) t -= 1;
                        if (t < 1/6) return p + (q - p) * 6 * t;
                        if (t < 1/2) return q;
                        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                        return p;
                    };
                    
                    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                    const p = 2 * l - q;
                    
                    r1 = hue2rgb(p, q, h + 1/3);
                    g1 = hue2rgb(p, q, h);
                    b1 = hue2rgb(p, q, h - 1/3);
                }
                
                const toHex = x => {
                    const hex = Math.round(x * 255).toString(16);
                    return hex.length === 1 ? '0' + hex : hex;
                };
                
                return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
            } catch (e) {
                console.error('Error shifting hue:', e);
                return hexColor;
            }
        },

        validateHexColor(color) {
            return /^#[0-9A-F]{6}$/i.test(color);
        }
    };

    const DataTransformer = {
        /**
         * Transform TreeNode structure to d3.hierarchy format
         */
        transformToD3Format(root) {
            SchemaValidator.validateNodeData(root);

            const convertNode = (node) => {
                if (!node) return null;
                
                const name = node.text || '';
                const detail = node.detail || '';
                
                const codeBlockRegex = /^```([a-zA-Z0-9]*)?[\s\S]*```$/;
                const hasCodeBlock = detail && detail.match?.(codeBlockRegex);
                let contentType = node.contentType || 'text';
                let nodeType = node.type || 'text';
                
                let language = '';
                let content = '';
                if (hasCodeBlock) {
                    contentType = 'code';
                    const firstLine = detail.split('\n')[0];
                    language = firstLine.replace('```', '').trim();
                    
                    const lines = detail.split('\n');
                    content = lines.slice(1, lines.length - 1).join('\n');
                }
                
                const result = { 
                    name,
                    detail,
                    isLeaf: !node.children || node.children.length === 0,
                    contentType,
                    type: nodeType,
                    elements: node.elements || [],
                    nodeId: node.id,
                    headers: node.headers,
                    rows: node.rows,
                    language,
                    content
                };
                
                if (node.children?.length > 0) {
                    result.children = node.children.map(child => convertNode(child));
                }
                return result;
            };

            return convertNode(root);
        }
    };

    const NodeStyleCalculator = {
        /**
         * Calculate node styling based on content type
         */
        calculateStyling(nodeData, theme = {}) {
            const contentType = nodeData.contentType || 'text';
            const hasCodeChildren = nodeData.children?.some(child => 
                child.type === 'code' || child.contentType === 'code'
            );
            const detailHasCode = nodeData.detail?.includes('```');
            
            const stylingMap = {
                text: {
                    shape: 'circle',
                    fill: theme.nodeColors?.text || '#3b82f6',
                    stroke: theme.nodeStrokeColors?.text || '#3b82f6',
                    strokeWidth: 2,
                    radius: 8
                },
                table: {
                    shape: 'rect',
                    fill: theme.nodeColors?.table || '#10b981',
                    stroke: theme.nodeStrokeColors?.table || '#10b981',
                    strokeWidth: 2,
                    width: 22,
                    height: 16
                },
                code: {
                    shape: 'roundedRect',
                    fill: theme.nodeColors?.code || '#6366f1',
                    stroke: theme.nodeStrokeColors?.code || '#6366f1',
                    strokeWidth: 2,
                    width: 24,
                    height: 16,
                    rx: 4
                },
                list: {
                    shape: 'diamond',
                    fill: theme.nodeColors?.list || '#f59e0b',
                    stroke: theme.nodeStrokeColors?.list || '#f59e0b',
                    strokeWidth: 2,
                    size: 10
                },
                header: {
                    shape: 'circle',
                    fill: theme.nodeColors?.header || '#3b82f6',
                    stroke: theme.nodeStrokeColors?.header || '#3b82f6',
                    strokeWidth: 2,
                    radius: 8,
                    fontWeight: 'bold'
                }
            };
            
            if (contentType === 'code') {
                return stylingMap.code;
            } else if (nodeData.type === 'header' && (hasCodeChildren || detailHasCode)) {
                return { ...stylingMap.header, ...stylingMap.code };
            } else if (detailHasCode) {
                return { ...stylingMap[nodeData.type || 'text'], ...stylingMap.code };
            }
            
            return stylingMap[contentType] || stylingMap.text;
        },

        /**
         * Get node color based on level and theme
         */
        getNodeColor(level, theme = {}) {
            if (theme?.colors) {
                const color = theme.colors[level] || theme.colors.accent || DEFAULT_COLORS[level % DEFAULT_COLORS.length];
                return color;
            }
            
            return DEFAULT_COLORS[level % DEFAULT_COLORS.length];
        }
    };

    // Browser Interface Layer
    const ThemeProvider = {
        _cache: null,
        _cacheInvalidated: true,

        getCurrentTheme() {
            if (this._cache && !this._cacheInvalidated) {
                return this._cache;
            }

            if (typeof window === 'undefined' || !window.getComputedStyle) {
                return this._getDefaultTheme();
            }

            try {
                const root = document.documentElement;
                const style = getComputedStyle(root);
                
                const accent = style.getPropertyValue('--theme-accent').trim();
                const primary = style.getPropertyValue('--theme-primary').trim();
                const secondary = style.getPropertyValue('--theme-secondary').trim();
                
                if (accent && primary && secondary) {
                    const theme = {
                        colors: {
                            accent,
                            primary, 
                            secondary,
                            nodes: [
                                accent,
                                primary,
                                secondary,
                                ColorUtils.shiftHue(accent, 30),
                                ColorUtils.shiftHue(primary, 45)
                            ]
                        }
                    };
                    
                    this._cache = theme;
                    this._cacheInvalidated = false;
                    return theme;
                }
            } catch (e) {
                console.warn('Error accessing CSS theme variables:', e);
            }
            
            return this._getDefaultTheme();
        },

        _getDefaultTheme() {
            return {
                colors: {
                    accent: DEFAULT_COLORS[0],
                    primary: DEFAULT_COLORS[1],
                    secondary: DEFAULT_COLORS[2],
                    nodes: DEFAULT_COLORS
                }
            };
        },

        invalidateCache() {
            this._cacheInvalidated = true;
        },

        onThemeChange(callback) {
            if (typeof window !== 'undefined') {
                window.MarkdownMindmap = window.MarkdownMindmap || {};
                window.MarkdownMindmap.ThemeManager = window.MarkdownMindmap.ThemeManager || {};
                
                const originalCallback = window.MarkdownMindmap.ThemeManager.onThemeChange;
                if (typeof originalCallback === 'function') {
                    originalCallback((themeName, themeData) => {
                        this.invalidateCache();
                        callback(themeName, themeData);
                    });
                }
            }
        }
    };

    // DOM Renderer Class - Handles all browser interactions
    class DOMRenderer {
        constructor(d3Instance = window.d3) {
            if (!d3Instance) {
                throw new Error('D3.js library is required but not available');
            }
            this.d3 = d3Instance;
        }

        /**
         * Create SVG container with zoom behavior
         */
        createSVG(container, options) {
            if (!container) {
                throw new Error('Container element is required but was not found');
            }
            
            const validOptions = SchemaValidator.validateRenderOptions(options);
            const width = container.clientWidth || validOptions.width;
            const height = container.clientHeight || validOptions.height;
            
            this.d3.select(container).selectAll("*").remove();
            
            const svg = this.d3.select(container)
                .append("svg")
                .attr("width", width)
                .attr("height", height)
                .attr("viewBox", `0 0 ${width} ${height}`)
                .style("background", "transparent");
            
            if (validOptions.interactive) {
                this._addZoomBehavior(svg);
                this._addClickHandler(svg);
            }
            
            return { svg, width, height };
        }

        _addZoomBehavior(svg) {
            // Clear any existing zoom behavior to prevent multiple attachments
            svg.on('.zoom', null);
            
            const zoom = this.d3.zoom()
                .scaleExtent(CONSTANTS.ZOOM_EXTENT)
                .on("zoom", (event) => {
                    const mainGroup = svg.select(".main-group");
                    if (!mainGroup.empty()) {
                        mainGroup.attr("transform", event.transform);
                    }
                });
            
            svg.call(zoom);
        }

        _addClickHandler(svg) {
            svg.on("click", (event) => {
                if (event.target === event.currentTarget || event.target.tagName === 'svg') {
                    if (window.TreeInteraction?.TooltipManager) {
                        window.TreeInteraction.TooltipManager.hideAllTooltips();
                    } else {
                        this.d3.selectAll(".mindmap-tooltip").remove();
                    }
                }
            });
        }

        /**
         * Render tree layout with nodes and links
         */
        renderTreeLayout(data, svg, width, height, theme) {
            const g = svg.append("g").attr("class", "main-group");
            
            // Enhanced tree layout with proper centering considerations
            const tree = this.d3.tree()
                .nodeSize([80, 180]) // Slightly tighter spacing for better fit
                .separation((a, b) => {
                    // Dynamic separation based on node types and tree depth
                    const baseSeparation = a.parent === b.parent ? 1.0 : 1.3;
                    
                    // Reduce separation for deeper nodes to prevent excessive spread
                    const depthFactor = Math.max(0.8, 1 - (a.depth * 0.1));
                    
                    return baseSeparation * depthFactor;
                });
                
            const root = this.d3.hierarchy(data);
            tree(root);
            
            // Pre-process layout for better centering
            this._preprocessLayoutForCentering(root);
            
            this._renderLinks(g, root);
            const nodes = this._renderNodes(g, root, theme);
            
            // Enhanced centering with multiple strategies
            this._centerViewEnhanced(svg, g, width, height, root);
            
            return nodes;
        }

        _renderLinks(g, root) {
            // Filter links to only connect nodes that will be rendered
            const filteredLinks = root.links().filter(link => {
                // Don't render links to special content children that are hidden
                if (link.source.data.type === 'header' && 
                    (link.target.data.type === 'code' || link.target.data.contentType === 'code' ||
                     link.target.data.type === 'table' || link.target.data.contentType === 'table' ||
                     link.target.data.type === 'list-item' || link.target.data.contentType === 'list-item')) {
                    return false;
                }
                return true;
            });
            
            g.selectAll(".link")
                .data(filteredLinks)
                .enter().append("path")
                .attr("class", "link")
                .attr("d", this.d3.linkHorizontal()
                    .x(d => d.y + CONSTANTS.LAYOUT_PADDING)
                    .y(d => d.x + CONSTANTS.LAYOUT_PADDING))
                .style("fill", "none")
                .style("stroke", "#999")
                .style("stroke-width", 2)
                .style("stroke-opacity", 0.6);
        }

        _renderNodes(g, root, theme) {
            // Filter out special content children that should be rendered inline with their parent
            const filteredNodes = root.descendants().filter(d => {
                // Always render root node
                if (!d.parent) return true;
                
                // If parent is a header and this node is special content, don't render separately
                if (d.parent.data.type === 'header' && 
                    (d.data.type === 'code' || d.data.contentType === 'code' ||
                     d.data.type === 'table' || d.data.contentType === 'table' ||
                     d.data.type === 'list-item' || d.data.contentType === 'list-item')) {
                    console.log(`Hiding special content child: "${d.data.text}" (parent: "${d.parent.data.text}")`);
                    return false;
                }
                
                return true;
            });
            
            console.log(`Rendering ${filteredNodes.length} nodes (filtered from ${root.descendants().length})`);
            
            const nodes = g.selectAll(".node")
                .data(filteredNodes)
                .enter().append("g")
                .attr("class", "node")
                .attr("transform", d => 
                    `translate(${d.y + CONSTANTS.LAYOUT_PADDING},${d.x + CONSTANTS.LAYOUT_PADDING})`
                );

            nodes.each((d, i, nodeElements) => {
                const nodeGroup = this.d3.select(nodeElements[i]);
                const styling = NodeStyleCalculator.calculateStyling(d.data, theme);
                
                this._createNodeShape(nodeGroup, styling, d.data);
                this._addNodeText(nodeGroup, d, theme);
                this._addNodeInteractions(nodeGroup, d);
                
                nodeGroup.attr('data-node-id', d.data.nodeId || `node-${d.depth}-${i}`)
                        .attr('data-content-type', d.data.contentType || 'text');
            });

            return nodes;
        }

        _createNodeShape(nodeGroup, styling, nodeData) {
            let shape;
            
            switch (styling.shape) {
                case 'rect':
                    shape = nodeGroup.append('rect')
                        .attr('width', styling.width)
                        .attr('height', styling.height)
                        .attr('x', -styling.width / 2)
                        .attr('y', -styling.height / 2);
                    break;
                case 'roundedRect':
                    shape = nodeGroup.append('rect')
                        .attr('width', styling.width)
                        .attr('height', styling.height)
                        .attr('x', -styling.width / 2)
                        .attr('y', -styling.height / 2)
                        .attr('rx', styling.rx);
                    break;
                case 'diamond':
                    const size = styling.size;
                    const points = [[0, -size], [size, 0], [0, size], [-size, 0]];
                    shape = nodeGroup.append('polygon')
                        .attr('points', points.map(p => p.join(',')).join(' '));
                    break;
                case 'circle':
                default:
                    shape = nodeGroup.append('circle').attr('r', styling.radius);
                    break;
            }
            
            shape
                .style('fill', styling.fill)
                .style('stroke', styling.stroke)
                .style('stroke-width', styling.strokeWidth)
                .style('cursor', 'pointer')
                .attr('class', `mindmap-node-${nodeData.contentType || 'text'}`);
            
            return shape;
        }

        _addNodeText(nodeGroup, d, theme) {
            const fontSize = theme?.fonts?.size?.node || 12;
            const nodeData = d.data;
            
            // Check if we need to render HTML content inline
            if (this._shouldRenderInlineContent(nodeData)) {
                this._addInlineHTMLContent(nodeGroup, d, theme);
            } else {
                // Standard text rendering for simple nodes
                const textElement = nodeGroup.append("text")
                    .attr("dy", ".35em")
                    .attr("x", d => d.children ? -13 : 13)
                    .style("text-anchor", d => d.children ? "end" : "start")
                    .style("font-size", `${fontSize}px`)
                    .style("font-family", "system-ui, sans-serif")
                    .style("fill", "currentColor")
                    .style("user-select", "none")
                    .style("pointer-events", "none");
                    
                this._populateTextContent(textElement, nodeData, fontSize);
            }
        }
        
        _shouldRenderInlineContent(nodeData) {
            // Check if this is a header node with special content children (PRIMARY CASE)
            if (nodeData.type === 'header' && nodeData.children && nodeData.children.length > 0) {
                // Check if any child is a special content type
                const hasCodeChild = nodeData.children.some(child => child.contentType === 'code' || child.type === 'code');
                const hasTableChild = nodeData.children.some(child => child.contentType === 'table' || child.type === 'table');
                const hasListChildren = nodeData.children.every(child => child.contentType === 'list-item' || child.type === 'list-item');
                
                if (hasCodeChild) {
                    console.log(`✓ Header "${nodeData.text}" has code child`);
                    return true;
                }
                if (hasTableChild) {
                    console.log(`✓ Header "${nodeData.text}" has table child`);
                    return true;
                }
                if (hasListChildren && nodeData.children.length > 0) {
                    console.log(`✓ Header "${nodeData.text}" has ${nodeData.children.length} list item children`);
                    return true;
                }
            }
            
            // Secondary check: node itself has special content type (fallback)
            if (nodeData.contentType === 'code' || nodeData.contentType === 'table' || nodeData.contentType === 'paragraph') {
                console.log(`✓ Node "${nodeData.text || nodeData.name}" has direct contentType: ${nodeData.contentType}`);
                return true;
            }
            
            console.log(`✗ Node "${nodeData.text || nodeData.name}" NO inline content (type: ${nodeData.type}, contentType: ${nodeData.contentType || 'none'}, children: ${nodeData.children ? nodeData.children.length : 0})`);
            return false;
        }
        
        _addInlineHTMLContent(nodeGroup, d, theme) {
            const nodeData = d.data;
            const fontSize = theme?.fonts?.size?.node || 12;
            
            // Add the main node label first
            const labelText = nodeGroup.append("text")
                .attr("dy", ".35em")
                .attr("x", -10)  // Move slightly closer to the node
                .style("text-anchor", "end")
                .style("font-size", `${fontSize}px`)
                .style("font-family", "system-ui, sans-serif")
                .style("fill", "currentColor")
                .style("user-select", "none")
                .style("pointer-events", "none")
                .text(nodeData.name || nodeData.text || "");
            
            console.log(`Rendering inline content for "${nodeData.text || nodeData.name}" (type: ${nodeData.type}, contentType: ${nodeData.contentType})`);
            
            // Handle header nodes with special content children (PRIMARY CASE)
            if (nodeData.type === 'header' && nodeData.children && nodeData.children.length > 0) {
                // Find code child
                const codeChild = nodeData.children.find(child => child.contentType === 'code' || child.type === 'code');
                if (codeChild) {
                    console.log(`Adding inline code content from child: "${codeChild.text}"`);
                    this._addInlineCodeContent(nodeGroup, codeChild, 0, theme);
                    return;
                }
                
                // Find table child
                const tableChild = nodeData.children.find(child => child.contentType === 'table' || child.type === 'table');
                if (tableChild) {
                    console.log(`Adding inline table content from child: "${tableChild.text}"`);
                    this._addInlineTableContent(nodeGroup, tableChild, 0, theme);
                    return;
                }
                
                // Check for list item children
                const listChildren = nodeData.children.filter(child => child.contentType === 'list-item' || child.type === 'list-item');
                if (listChildren.length > 0) {
                    console.log(`Adding inline link content for ${listChildren.length} links`);
                    listChildren.forEach((child, index) => {
                        this._addInlineLinkContent(nodeGroup, child, index * 25, theme);
                    });
                    return;
                }
            }
            
            // Handle nodes with direct content types (FALLBACK CASE)
            if (nodeData.contentType === 'code') {
                console.log(`Adding inline code content (direct)`);
                this._addInlineCodeContent(nodeGroup, nodeData, 0, theme);
            } else if (nodeData.contentType === 'table') {
                console.log(`Adding inline table content (direct)`);
                this._addInlineTableContent(nodeGroup, nodeData, 0, theme);
            } else if (nodeData.contentType === 'paragraph') {
                console.log(`Adding inline paragraph content (direct)`);
                this._addInlineParagraphContent(nodeGroup, nodeData, 0, theme);
            } else {
                console.log(`No matching content type handler found`);
            }
        }

        _populateTextContent(textElement, nodeData, fontSize) {
            let displayName = nodeData.name || nodeData.text || "";
            
            // For nodes without special children, show enhanced content type display
            if (nodeData.contentType && nodeData.contentType !== 'text' && !this._shouldRenderInlineContent(nodeData)) {
                switch (nodeData.contentType) {
                    case 'code':
                        displayName = `${nodeData.language || 'Code'}: ${displayName.replace('Code: ', '')}`;
                        break;
                    case 'table':
                        const colCount = nodeData.headers ? nodeData.headers.length : (nodeData.rows && nodeData.rows[0] ? nodeData.rows[0].length : 0);
                        const rowCount = nodeData.rows ? nodeData.rows.length : 0;
                        displayName = `Table (${rowCount}×${colCount}): ${displayName.replace('Table: ', '')}`;
                        break;
                    case 'list-item':
                        const listType = nodeData.listType === 'ordered' ? '1.' : '-';
                        displayName = `${listType} ${displayName}`;
                        break;
                    case 'checkbox':
                        const checkIcon = nodeData.checked ? '[x]' : '[ ]';
                        displayName = `${checkIcon} ${displayName}`;
                        break;
                    case 'math':
                        displayName = `Math: ${displayName.replace('Math: ', '')}`;
                        break;
                    default:
                        // No prefix for default content
                        break;
                }
            }
            
            // Smart text wrapping - break at word boundaries when possible
            const wrappedName = this._wrapText(displayName, CONSTANTS.MAX_TEXT_LENGTH);
            if (wrappedName.lines.length === 1) {
                textElement.append("tspan")
                    .attr("x", nodeData.children ? -13 : 13)
                    .attr("dy", "0em")
                    .style("font-weight", "bold")
                    .text(wrappedName.lines[0]);
            } else {
                // Multi-line text
                wrappedName.lines.forEach((line, index) => {
                    textElement.append("tspan")
                        .attr("x", nodeData.children ? -13 : 13)
                        .attr("dy", index === 0 ? "0em" : "1.2em")
                        .style("font-weight", "bold")
                        .text(line);
                });
            }
            
            // Add content preview for special types (only for non-inline content)
            if (!this._shouldRenderInlineContent(nodeData)) {
                this._addContentPreview(textElement, nodeData, fontSize);
            }
        }

        _addContentPreview(textElement, nodeData, fontSize) {
            const detail = nodeData.detail || "";
            
            if (nodeData.contentType === 'code' && nodeData.content) {
                this._addCodePreview(textElement, nodeData, fontSize);
            } else if (nodeData.contentType === 'table' && nodeData.headers) {
                this._addTablePreview(textElement, nodeData, fontSize);
            } else if (nodeData.contentType === 'list' && nodeData.elements) {
                this._addListPreview(textElement, nodeData, fontSize);
            } else if (detail.trim()) {
                this._addRegularContent(textElement, detail, fontSize, nodeData.children);
            }
        }

        _addCodePreview(textElement, nodeData, fontSize) {
            const content = nodeData.content || "";
            const lines = content.split('\n').slice(0, 2); // Show first 2 lines
            
            lines.forEach((line, index) => {
                if (line.trim()) {
                    textElement.append("tspan")
                        .attr("x", nodeData.children ? -13 : 13)
                        .attr("dy", "1.2em")
                        .style("font-size", `${fontSize - 2}px`)
                        .style("font-family", "monospace")
                        .style("fill", "#666")
                        .text(line.length > 40 ? line.substring(0, 37) + "..." : line);
                }
            });
            
            if (content.split('\n').length > 2) {
                textElement.append("tspan")
                    .attr("x", nodeData.children ? -13 : 13)
                    .attr("dy", "1.2em")
                    .style("font-size", `${fontSize - 2}px`)
                    .style("fill", "#999")
                    .text("...");
            }
        }

        _addTablePreview(textElement, nodeData, fontSize) {
            if (nodeData.headers && nodeData.headers.length > 0) {
                const headerText = nodeData.headers.slice(0, 3).join(" | ");
                textElement.append("tspan")
                    .attr("x", nodeData.children ? -13 : 13)
                    .attr("dy", "1.2em")
                    .style("font-size", `${fontSize - 2}px`)
                    .style("font-weight", "bold")
                    .style("fill", "#666")
                    .text(headerText.length > 30 ? headerText.substring(0, 27) + "..." : headerText);
            }
            
            if (nodeData.rows && nodeData.rows.length > 0) {
                const firstRow = nodeData.rows[0].slice(0, 3).join(" | ");
                textElement.append("tspan")
                    .attr("x", nodeData.children ? -13 : 13)
                    .attr("dy", "1.2em")
                    .style("font-size", `${fontSize - 2}px`)
                    .style("fill", "#666")
                    .text(firstRow.length > 30 ? firstRow.substring(0, 27) + "..." : firstRow);
            }
        }

        _addListPreview(textElement, nodeData, fontSize) {
            if (nodeData.elements && nodeData.elements.length > 0) {
                const previewItems = nodeData.elements.slice(0, 2);
                previewItems.forEach(item => {
                    const bullet = nodeData.listType === 'ordered' ? '1.' : '•';
                    const itemText = item.content || item.text || '';
                    textElement.append("tspan")
                        .attr("x", nodeData.children ? -13 : 13)
                        .attr("dy", "1.2em")
                        .style("font-size", `${fontSize - 2}px`)
                        .style("fill", "#666")
                        .text(`${bullet} ${itemText.length > 25 ? itemText.substring(0, 22) + "..." : itemText}`);
                });
                
                if (nodeData.elements.length > 2) {
                    textElement.append("tspan")
                        .attr("x", nodeData.children ? -13 : 13)
                        .attr("dy", "1.2em")
                        .style("font-size", `${fontSize - 2}px`)
                        .style("fill", "#999")
                        .text("...");
                }
            }
        }

        _addInlineCodeContent(nodeGroup, nodeData, yOffset, theme) {
            // Extract content from elements array (new data structure)
            let content = nodeData.content || "";
            let language = nodeData.language || "";
            
            // Try to get content from elements array if direct properties don't exist
            if (!content && nodeData.elements && nodeData.elements.length > 0) {
                const codeElement = nodeData.elements.find(el => el.type === 'code-block');
                if (codeElement) {
                    content = codeElement.content || "";
                    language = codeElement.language || "";
                }
            }
            
            // Extract language from node text if not found (e.g., "Code: js")
            if (!language && nodeData.text) {
                const langMatch = nodeData.text.match(/Code:\s*(\w+)/i);
                if (langMatch) {
                    language = langMatch[1];
                }
            }
            
            console.log(`Code content: "${content}", language: "${language}", from elements: ${!!nodeData.elements}`);
            
            if (!content.trim()) {
                console.log(`No code content found, skipping render`);
                return;
            }
            
            const foreignObject = nodeGroup.append("foreignObject")
                .attr("x", 15)  // Position right next to the node label
                .attr("y", -12)  // Center vertically with the node
                .attr("width", 400)
                .attr("height", 30);
            
            const codeContainer = foreignObject.append("xhtml:div")
                .style("font-family", "Monaco, 'Courier New', monospace")
                .style("font-size", "14px")
                .style("color", "#f8f8f2")
                .style("padding", "4px 8px")
                .style("background", "rgba(45, 45, 45, 0.9)")
                .style("border-radius", "3px")
                .style("white-space", "nowrap")
                .style("display", "inline-block");
            
            // Basic syntax highlighting for JavaScript
            if (language === 'js' || language === 'javascript') {
                const highlightedCode = this._highlightJavaScript(content.trim());
                codeContainer.html(highlightedCode);
                console.log(`Applied JavaScript highlighting`);
            } else {
                codeContainer.text(content.trim());
                console.log(`Applied plain text (language: ${language || 'none'})`);
            }
        }
        
        _addInlineTableContent(nodeGroup, childData, yOffset, theme) {
            let headers = childData.headers || [];
            let rows = childData.rows || [];
            
            // If no direct headers/rows, try to extract from elements array
            if ((!headers.length || !rows.length) && childData.elements && childData.elements.length > 0) {
                const cellElements = childData.elements.filter(el => el.type === 'cell');
                if (cellElements.length >= 4) { // At least 2 headers + 2 data cells
                    headers = [cellElements[0].content, cellElements[1].content];
                    rows = [];
                    // Group remaining cells into rows
                    for (let i = 2; i < cellElements.length; i += 2) {
                        if (i + 1 < cellElements.length) {
                            rows.push([cellElements[i].content, cellElements[i + 1].content]);
                        }
                    }
                }
            }
            
            console.log(`Table headers: [${headers.join(', ')}], rows: ${rows.length}, from elements: ${!!childData.elements}`);
            
            const tableHeight = (rows.length + 1) * 22 + 10; // More compact
            const foreignObject = nodeGroup.append("foreignObject")
                .attr("x", 15)  // Position right next to the node label
                .attr("y", -tableHeight/2)  // Center vertically
                .attr("width", 150)
                .attr("height", tableHeight);
            
            const tableContainer = foreignObject.append("xhtml:div");
            
            const table = tableContainer.append("table")
                .style("border-collapse", "collapse")
                .style("font-size", "11px")
                .style("background", "white")
                .style("border", "1px solid #333");
            
            // Add header row
            if (headers.length > 0) {
                const headerRow = table.append("thead").append("tr");
                headers.forEach(header => {
                    headerRow.append("th")
                        .style("border", "1px solid #333")
                        .style("padding", "3px 6px")
                        .style("background", "#f0f0f0")
                        .style("font-weight", "bold")
                        .style("color", "black")
                        .text(header);
                });
            }
            
            // Add data rows
            if (rows.length > 0) {
                const tbody = table.append("tbody");
                rows.forEach(row => {
                    const tableRow = tbody.append("tr");
                    row.forEach(cell => {
                        tableRow.append("td")
                            .style("border", "1px solid #333")
                            .style("padding", "3px 6px")
                            .style("color", "black")
                            .text(cell);
                    });
                });
            }
        }
        
        _addInlineParagraphContent(nodeGroup, childData, yOffset, theme) {
            const content = childData.content || "";
            
            const foreignObject = nodeGroup.append("foreignObject")
                .attr("x", 15)  // Position right next to the node label
                .attr("y", -15)  // Center vertically with the node
                .attr("width", 400)
                .attr("height", 60);
            
            const paragraphContainer = foreignObject.append("xhtml:div")
                .style("font-family", "system-ui, sans-serif")
                .style("font-size", "12px")
                .style("color", "#e0e0e0")  // Light grey for good readability
                .style("padding", "4px 8px")
                .style("background", "rgba(0, 0, 0, 0.3)")
                .style("border-radius", "3px")
                .style("line-height", "1.4")
                .style("word-wrap", "break-word")
                .style("overflow-wrap", "break-word");
            
            paragraphContainer.text(content);
        }
        
        _addInlineLinkContent(nodeGroup, childData, yOffset, theme) {
            let linkText = "";
            let linkUrl = "";
            
            // Try to extract link data from elements array first (new data structure)
            if (childData.elements && childData.elements.length > 0) {
                const linkElement = childData.elements.find(el => el.type === 'link');
                if (linkElement) {
                    linkText = linkElement.text || "";
                    linkUrl = linkElement.url || "";
                }
            }
            
            // Fallback: try to extract from text using regex
            if (!linkText) {
                const text = childData.name || childData.text || "";
                const linkMatch = text.match(/\[(.+?)\]\((.+?)\)/);
                if (linkMatch) {
                    linkText = linkMatch[1];
                    linkUrl = linkMatch[2];
                } else {
                    linkText = text.replace(/[\[\]]/g, ''); // Remove brackets if present
                }
            }
            
            console.log(`Link: "${linkText}" -> ${linkUrl}, from elements: ${!!childData.elements}`);
            
            const foreignObject = nodeGroup.append("foreignObject")
                .attr("x", 15)  // Position right next to the node label
                .attr("y", yOffset - 10)  // Offset for multiple links
                .attr("width", 200)
                .attr("height", 20);
            
            const linkContainer = foreignObject.append("xhtml:div")
                .style("font-size", "12px")
                .style("line-height", "20px");
            
            if (linkUrl) {
                linkContainer.append("a")
                    .attr("href", linkUrl)
                    .attr("target", "_blank")
                    .style("color", "#4fc3f7")  // Light blue for better visibility
                    .style("text-decoration", "underline")
                    .style("cursor", "pointer")
                    .style("font-weight", "normal")
                    .text(linkText);  // Only show the link text, not the URL
            } else {
                // No URL found, just display as styled text
                linkContainer
                    .style("color", "#4fc3f7")
                    .style("text-decoration", "underline")
                    .text(linkText);
            }
        }
        
        _highlightJavaScript(code) {
            // Basic JavaScript syntax highlighting
            let highlighted = code;
            
            // Keywords
            highlighted = highlighted.replace(/\b(console|log|function|var|let|const|if|else|for|while|return)\b/g, '<span style="color: #66d9ef">$1</span>');
            
            // Strings
            highlighted = highlighted.replace(/'([^']*)'/g, '<span style="color: #e6db74">\'$1\'</span>');
            highlighted = highlighted.replace(/"([^"]*)"/g, '<span style="color: #e6db74">"$1"</span>');
            
            // Comments
            highlighted = highlighted.replace(/\/\/.*$/gm, '<span style="color: #75715e">$&</span>');
            
            // Methods and properties
            highlighted = highlighted.replace(/\.([a-zA-Z_][a-zA-Z0-9_]*)/g, '.<span style="color: #a6e22e">$1</span>');
            
            return highlighted;
        }

        _addCodeContent(textElement, detail, fontSize, hasChildren) {
            const lines = detail.split('\n');
            const firstLine = lines[0];
            
            if (firstLine.startsWith('```')) {
                const language = firstLine.replace('```', '').trim();
                if (language) {
                    textElement.append("tspan")
                        .attr("x", hasChildren ? -13 : 13)
                        .attr("dy", "1.2em")
                        .style("font-size", `${fontSize - 1}px`)
                        .style("fill", "#10b981")
                        .text(`Language: ${language}`);
                }
            }
            
            const codeLines = lines.slice(1, lines.length - 1);
            const displayLines = codeLines.slice(0, 2);
            displayLines.forEach(line => {
                textElement.append("tspan")
                    .attr("x", hasChildren ? -13 : 13)
                    .attr("dy", "1.2em")
                    .style("font-size", `${fontSize - 1}px`)
                    .style("font-family", "monospace")
                    .style("fill", "#666")
                    .text(line.length > CONSTANTS.MAX_TEXT_LENGTH ? 
                        line.substring(0, CONSTANTS.MAX_TEXT_LENGTH - 3) + "..." : line);
            });
            
            if (codeLines.length > 2) {
                textElement.append("tspan")
                    .attr("x", hasChildren ? -13 : 13)
                    .attr("dy", "1.2em")
                    .style("font-size", `${fontSize - 1}px`)
                    .style("fill", "#666")
                    .text("...");
            }
        }

        _addRegularContent(textElement, detail, fontSize, hasChildren) {
            const detailLines = detail.split('\n').filter(line => line.trim()).slice(0, CONSTANTS.MAX_DETAIL_LINES);
            detailLines.forEach(line => {
                const wrappedLine = TextUtils.wrapText(line, 35);
                wrappedLine.lines.forEach((wrappedText, lineIndex) => {
                    textElement.append("tspan")
                        .attr("x", hasChildren ? -13 : 13)
                        .attr("dy", "1.2em")
                        .style("font-size", `${fontSize - 1}px`)
                        .style("fill", "#666")
                        .text(wrappedText + (wrappedLine.truncated && lineIndex === wrappedLine.lines.length - 1 ? "..." : ""));
                });
            });
            
            if (detail.split('\n').filter(line => line.trim()).length > CONSTANTS.MAX_DETAIL_LINES) {
                textElement.append("tspan")
                    .attr("x", hasChildren ? -13 : 13)
                    .attr("dy", "1.2em")
                    .style("font-size", `${fontSize - 1}px`)
                    .style("fill", "#666")
                    .text("...");
            }
        }
        
        /**
         * Wrapper method to access TextUtils.wrapText
         */
        _wrapText(text, maxLength = CONSTANTS.MAX_TEXT_LENGTH) {
            return TextUtils.wrapText(text, maxLength);
        }
        
        /**
         * DISABLED: Preprocess layout to optimize for centering
         * This was interfering with the coordinate calculations
         */
        _preprocessLayoutForCentering(root) {
            // TEMPORARILY DISABLED - Let SVG handle natural coordinates
            // The centering should happen purely in the transform, not by moving the nodes
            
            const descendants = root.descendants();
            console.log(`🔍 LAYOUT INFO: ${descendants.length} nodes positioned by D3 tree algorithm`);
            
            // Log the natural layout bounds for debugging
            const xCoords = descendants.map(d => d.y); // D3 tree: y = horizontal
            const yCoords = descendants.map(d => d.x); // D3 tree: x = vertical
            
            const minX = Math.min(...xCoords);
            const maxX = Math.max(...xCoords);
            const minY = Math.min(...yCoords);
            const maxY = Math.max(...yCoords);
            
            console.log(`🔍 NATURAL LAYOUT BOUNDS:`);
            console.log(`  X (horizontal): ${minX.toFixed(1)} to ${maxX.toFixed(1)} (range: ${(maxX - minX).toFixed(1)})`);
            console.log(`  Y (vertical): ${minY.toFixed(1)} to ${maxY.toFixed(1)} (range: ${(maxY - minY).toFixed(1)})`);
            
            // Find root node position
            const rootNode = descendants.find(d => d.depth === 0);
            if (rootNode) {
                console.log(`🌳 ROOT NODE position: (${rootNode.y.toFixed(1)}, ${rootNode.x.toFixed(1)}) [D3 coordinates: y=horizontal, x=vertical]`);
            }
            
            // DO NOT modify coordinates here - let the transform handle centering
        }

        _addNodeInteractions(nodeGroup, d) {
            nodeGroup
                .on("mouseover", () => this._handleMouseOver(nodeGroup, d))
                .on("mouseout", () => this._handleMouseOut(nodeGroup, d))
                .on("click", (event) => this._handleClick(event, nodeGroup, d));
        }

        _handleMouseOver(nodeGroup, d) {
            const styling = NodeStyleCalculator.calculateStyling(d.data);
            this._animateNodeHover(nodeGroup, styling, true);
        }

        _handleMouseOut(nodeGroup, d) {
            const styling = NodeStyleCalculator.calculateStyling(d.data);
            this._animateNodeHover(nodeGroup, styling, false);
        }

        _animateNodeHover(nodeGroup, styling, isHover) {
            const duration = CONSTANTS.ANIMATION_DURATION;
            const scale = isHover ? 1.1 : 1;
            const strokeWidth = isHover ? 3 : styling.strokeWidth;
            
            if (styling.shape === 'circle') {
                nodeGroup.select("circle")
                    .transition()
                    .duration(duration)
                    .attr("r", (styling.radius || 8) * scale)
                    .style("stroke-width", strokeWidth);
            } else if (styling.shape === 'rect' || styling.shape === 'roundedRect') {
                nodeGroup.select("rect")
                    .transition()
                    .duration(duration)
                    .style("stroke-width", strokeWidth)
                    .style("filter", isHover ? "brightness(1.1)" : "none");
            } else if (styling.shape === 'diamond') {
                nodeGroup.select("polygon")
                    .transition()
                    .duration(duration)
                    .style("stroke-width", strokeWidth)
                    .style("filter", isHover ? "brightness(1.1)" : "none");
            }
        }

        _handleClick(event, nodeGroup, d) {
            event.stopPropagation();
            
            if (window.TreeInteraction?.TooltipManager) {
                window.TreeInteraction.TooltipManager.hideAllTooltips();
                window.TreeInteraction.TooltipManager.showTooltip(nodeGroup.node(), d.data, {
                    showDelay: 0,
                    maxWidth: 450,
                    maxHeight: 350,
                    allowInteraction: true
                });
            } else {
                this.d3.selectAll(".mindmap-tooltip").remove();
                this._showBasicTooltip(event, d.data);
            }
            
            if (window.MindmapEvents && (d.data.detail || d.data.contentType || d.children?.length > 0)) {
                window.MindmapEvents.emit('node:clicked', {
                    nodeId: d.data.id || d.data.name || `node-${d.depth}`,
                    nodeData: d.data,
                    hasExpandableContent: true,
                    position: { x: d.x, y: d.y }
                });
            }
        }

        _showBasicTooltip(event, data) {
            const tooltip = this.d3.select('body')
                .append('div')
                .attr('class', 'mindmap-tooltip')
                .style('position', 'absolute')
                .style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY + 10}px`)
                .style('background', 'white')
                .style('border', '1px solid #ddd')
                .style('border-radius', '4px')
                .style('padding', '8px')
                .style('font-size', '12px')
                .style('max-width', '300px')
                .style('z-index', '1000');
            
            tooltip.append('div')
                .style('font-weight', 'bold')
                .style('margin-bottom', '4px')
                .text(data.name || data.text || '');
            
            if (data.detail) {
                tooltip.append('div')
                    .style('white-space', 'pre-wrap')
                    .text(data.detail);
            }
            
            if (data.contentType && data.contentType !== 'text') {
                tooltip.append('div')
                    .style('margin-top', '4px')
                    .style('font-style', 'italic')
                    .style('color', '#666')
                    .text(`Type: ${data.contentType}`);
            }
        }

        _centerView(svg, g, width, height) {
            // Legacy method - now calls enhanced version
            this._centerViewEnhanced(svg, g, width, height, null);
        }
        
        /**
         * CORRECTED centering algorithm with proper D3 coordinate system handling
         */
        _centerViewEnhanced(svg, g, width, height, root = null) {
            try {
                // Wait for DOM to be ready
                setTimeout(() => {
                    const bounds = g.node().getBBox();
                    
                    // Handle empty or invalid bounds
                    if (!bounds || bounds.width === 0 || bounds.height === 0) {
                        console.warn('Invalid bounds for centering view, applying fallback');
                        this._applyFallbackCentering(svg, width, height);
                        return;
                    }
                    
                    console.log(`🔍 DEBUGGING - Original bounds: x=${bounds.x}, y=${bounds.y}, w=${bounds.width}, h=${bounds.height}`);
                    console.log(`🔍 DEBUGGING - Viewport: ${width}x${height}`);
                    
                    // Enhanced padding calculation based on viewport size
                    const padding = Math.min(60, Math.min(width, height) * 0.08);
                    const viewWidth = width - (padding * 2);
                    const viewHeight = height - (padding * 2);
                    
                    // Multi-strategy scale calculation
                    const scaleX = viewWidth / bounds.width;
                    const scaleY = viewHeight / bounds.height;
                    let scale = Math.min(scaleX, scaleY);
                    
                    // Enhanced scale constraints with dynamic ranges
                    const minScale = Math.max(0.3, Math.min(0.6, viewWidth / 1000));
                    const maxScale = Math.min(1.5, Math.max(0.8, viewWidth / 500));
                    
                    scale = Math.max(minScale, Math.min(maxScale, scale));
                    
                    // CORRECTED: Calculate precise center points for SVG coordinate system
                    const contentCenterX = bounds.x + bounds.width / 2;
                    const contentCenterY = bounds.y + bounds.height / 2;
                    
                    // CORRECTED: Calculate viewport center
                    const viewportCenterX = width / 2;
                    const viewportCenterY = height / 2;
                    
                    // CORRECTED: Translation to center content in viewport
                    // Formula: viewport_center - (scale * content_center)
                    const translateX = viewportCenterX - (scale * contentCenterX);
                    const translateY = viewportCenterY - (scale * contentCenterY);
                    
                    console.log(`🎯 CENTERING CALCULATION:`);
                    console.log(`  Content center: (${contentCenterX.toFixed(1)}, ${contentCenterY.toFixed(1)})`);
                    console.log(`  Viewport center: (${viewportCenterX.toFixed(1)}, ${viewportCenterY.toFixed(1)})`);
                    console.log(`  Scale: ${scale.toFixed(3)}`);
                    console.log(`  Scaled content center: (${(scale * contentCenterX).toFixed(1)}, ${(scale * contentCenterY).toFixed(1)})`);
                    console.log(`  Required translation: (${translateX.toFixed(1)}, ${translateY.toFixed(1)})`);
                    
                    // Apply transformation
                    const zoom = this.d3.zoom();
                    const transform = this.d3.zoomIdentity
                        .translate(translateX, translateY)
                        .scale(scale);
                    
                    // Apply immediately without transition for debugging
                    svg.call(zoom.transform, transform);
                    
                    // Update UI feedback
                    this._updateZoomDisplay(scale);
                    
                    console.log(`✅ CORRECTED centering applied successfully!`);
                    
                    // Validate the result
                    setTimeout(() => {
                        const newBounds = g.node().getBBox();
                        console.log(`🔍 POST-TRANSFORM bounds: x=${newBounds.x}, y=${newBounds.y}, w=${newBounds.width}, h=${newBounds.height}`);
                        
                        const currentTransform = this.d3.zoomTransform(svg.node());
                        console.log(`🔍 CURRENT transform: translate(${currentTransform.x}, ${currentTransform.y}) scale(${currentTransform.k})`);
                        
                        // Calculate where content center should be after transform
                        const transformedCenterX = currentTransform.x + (currentTransform.k * contentCenterX);
                        const transformedCenterY = currentTransform.y + (currentTransform.k * contentCenterY);
                        console.log(`🎯 Content center after transform: (${transformedCenterX.toFixed(1)}, ${transformedCenterY.toFixed(1)})`);
                        console.log(`🎯 Should match viewport center: (${viewportCenterX}, ${viewportCenterY})`);
                    }, 100);
                    
                }, 50);
                
            } catch (error) {
                console.error('Error in corrected centering:', error);
                this._applyFallbackCentering(svg, width, height);
            }
        }
        
        /**
         * Fallback centering when normal calculation fails
         */
        _applyFallbackCentering(svg, width, height) {
            console.log('Applying fallback centering');
            const zoom = this.d3.zoom();
            const fallbackScale = 0.7;
            const transform = this.d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(fallbackScale);
                
            svg.call(zoom.transform, transform);
            this._updateZoomDisplay(fallbackScale);
        }
        
        /**
         * Update zoom level display in UI
         */
        _updateZoomDisplay(scale) {
            try {
                const zoomPercentage = Math.round(scale * 100);
                const zoomElement = document.getElementById('zoomLevel');
                if (zoomElement) {
                    zoomElement.textContent = `${zoomPercentage}%`;
                }
                
                // Also trigger metric update if UIComponents is available
                if (window.MarkdownMindmap?.UIComponents?.updateMetrics) {
                    window.MarkdownMindmap.UIComponents.updateMetrics({
                        zoomLevel: zoomPercentage
                    });
                }
            } catch (error) {
                console.warn('Could not update zoom display:', error);
            }
        }

        /**
         * Main render method
         */
        render(data, container, options = {}) {
            const theme = ThemeProvider.getCurrentTheme();
            const { svg, width, height } = this.createSVG(container, options);
            
            // Render the tree layout
            const nodes = this.renderTreeLayout(data, svg, width, height, theme);
            
            // Initialize animations if available
            if (window.TreeInteraction?.D3Animations && !window.TreeInteraction.D3Animations.isInitialized) {
                try {
                    window.TreeInteraction.D3Animations.init(svg.node(), {
                        respectReducedMotion: true,
                        maxConcurrentAnimations: 10
                    });
                } catch (error) {
                    console.warn('Failed to initialize D3 animations:', error);
                }
            }
            
            // Ensure proper centering after render is complete
            setTimeout(() => {
                console.log('Post-render centering check...');
                const mainGroup = svg.select('.main-group');
                if (!mainGroup.empty()) {
                    this._centerViewEnhanced(svg, mainGroup, width, height);
                }
            }, 100);
            
            return svg.node();
        }
    }

    // Main Orchestrator Class - Coordinates all modules
    class D3MindmapRenderer {
        constructor(dependencies = {}) {
            this.domRenderer = dependencies.domRenderer || new DOMRenderer();
            this.dataTransformer = dependencies.dataTransformer || DataTransformer;
            this.themeProvider = dependencies.themeProvider || ThemeProvider;
        }

        /**
         * Main render method that coordinates all modules
         */
        render(data, container, options = {}) {
            try {
                const transformedData = this.dataTransformer.transformToD3Format(data);
                return this.domRenderer.render(transformedData, container, options);
            } catch (error) {
                this._handleRenderError(error, container);
                throw error;
            }
        }

        _handleRenderError(error, container) {
            console.error('Error rendering mindmap:', error);
            if (container) {
                container.innerHTML = `
                    <div class="flex items-center justify-center h-full text-gray-500">
                        <div class="text-center">
                            <p>Unable to render mindmap</p>
                            <p class="text-sm mt-2">${error.message}</p>
                        </div>
                    </div>`;
            }
        }

        /**
         * Update mindmap from markdown input
         */
        updateMindmapFromMarkdown(markdown, container = null) {
            if (!markdown.trim()) {
                const targetContainer = container || document.getElementById('mindmapContainer');
                if (targetContainer) {
                    targetContainer.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">Enter markdown to see the mindmap</div>';
                }
                return;
            }

            const targetContainer = container || document.getElementById('mindmapContainer');
            
            if (!targetContainer) {
                console.error('Mindmap container element not found');
                return;
            }
            
            // CRITICAL FIX: Always clear the container before rendering, just like theme change does
            console.log('🧹 Clearing container before render...');
            targetContainer.innerHTML = '';
            
            try {
                if (window.MarkdownMindmap?.Parser?.parseMarkdownToTree) {
                    const tree = window.MarkdownMindmap.Parser.parseMarkdownToTree(markdown);
                    
                    console.log('Parsed tree structure:', tree);
                    
                    // Debug specific nodes for inline content detection
                    tree.children?.forEach((child, index) => {
                        console.log(`Node ${index}: "${child.text || child.name}" (type: ${child.type}, contentType: ${child.contentType || 'none'})`);
                        if (child.content) {
                            console.log(`  Has content: ${child.content.substring(0, 50)}...`);
                        }
                        if (child.children && child.children.length > 0) {
                            child.children.forEach((grandchild, gIndex) => {
                                console.log(`  Child ${gIndex}: "${grandchild.text || grandchild.name}" (type: ${grandchild.type}, contentType: ${grandchild.contentType || 'none'})`);
                            });
                        }
                    });
                    this.render(tree, targetContainer);
                } else {
                    throw new Error('Markdown parser not available');
                }
            } catch (error) {
                console.error('Error updating mindmap:', error);
                this._handleRenderError(error, targetContainer);
            }
        }
    }

    // Factory for dependency injection and testing
    const MindmapRendererFactory = {
        create(overrides = {}) {
            return new D3MindmapRenderer(overrides);
        },

        // For backward compatibility - legacy function wrappers
        createD3Mindmap(data, container, options = {}) {
            const renderer = this.create();
            return renderer.domRenderer.render(data, container, options);
        },

        transformToD3Format(root) {
            return DataTransformer.transformToD3Format(root);
        },

        renderMindmap(root, container = null, options = {}) {
            const targetContainer = container || document.getElementById('mindmapContainer');
            if (!targetContainer) {
                throw new Error('Mindmap container not found');
            }

            try {
                if (window.TreeInteraction?.LayoutEngine) {
                    window.TreeInteraction.LayoutEngine.calculateLayout(root);
                }
                
                const renderer = this.create();
                renderer.render(root, targetContainer, options);
                
                const nodeCountElement = document.getElementById('nodeCount');
                if (nodeCountElement && root.getNodeCount) {
                    nodeCountElement.textContent = root.getNodeCount();
                }
            } catch (error) {
                console.error('Error rendering mindmap:', error);
                targetContainer.innerHTML = `<div class="flex items-center justify-center h-full text-gray-500">
                    <div class="text-center">
                        <p>Unable to render mindmap</p>
                        <p class="text-sm mt-2">${error.message}</p>
                    </div>
                </div>`;
            }
        },

        updateMindmapFromMarkdown(markdown, container = null) {
            const renderer = this.create();
            return renderer.updateMindmapFromMarkdown(markdown, container);
        },

        getNodeColor(level, theme = {}) {
            return NodeStyleCalculator.getNodeColor(level, theme);
        }
    };

    // Create global namespace with legacy API for backward compatibility
    if (typeof window !== 'undefined') {
        window.MarkdownMindmap = window.MarkdownMindmap || {};
        window.MarkdownMindmap.Renderer = {
            // New API
            create: MindmapRendererFactory.create.bind(MindmapRendererFactory),
            
            // Legacy API for backward compatibility
            createD3Mindmap: MindmapRendererFactory.createD3Mindmap.bind(MindmapRendererFactory),
            transformToD3Format: MindmapRendererFactory.transformToD3Format.bind(MindmapRendererFactory),
            renderMindmap: MindmapRendererFactory.renderMindmap.bind(MindmapRendererFactory),
            updateMindmapFromMarkdown: MindmapRendererFactory.updateMindmapFromMarkdown.bind(MindmapRendererFactory),
            getNodeColor: MindmapRendererFactory.getNodeColor.bind(MindmapRendererFactory)
        };
        
        // Theme change listener setup
        function registerThemeChangeListener() {
            if (window.MarkdownMindmap?.ThemeManager) {
                window.MarkdownMindmap.ThemeManager.onThemeChange((themeName, themeData) => {
                    console.log('%c[Theme Change] Received theme change event', 'background:#ff6600;color:white;padding:3px;font-weight:bold');
                    
                    ThemeProvider.invalidateCache();
                    
                    const markdownInput = document.getElementById('markdownInput');
                    if (markdownInput?.value) {
                        setTimeout(() => {
                            const container = document.getElementById('mindmapContainer');
                            if (container) {
                                container.innerHTML = '';
                                window.MarkdownMindmap.Renderer.updateMindmapFromMarkdown(
                                    markdownInput.value, 
                                    container
                                );
                            }
                        }, CONSTANTS.TOOLTIP_DELAY);
                    }
                });
                
                console.log('%c[INIT] Theme change listener registered successfully', 'background:green;color:white;padding:3px');
            } else {
                console.warn('%c[ERROR] ThemeManager not available', 'background:red;color:white;padding:3px');
            }
        }
        
        // Zoom event listener setup
        function registerZoomEventListeners() {
            // Listen for zoom events from UI components
            document.addEventListener('zoom', (event) => {
                const action = event.detail;
                const container = document.getElementById('mindmapContainer');
                if (!container) return;
                
                const svg = d3.select(container).select('svg');
                if (svg.empty()) return;
                
                const zoom = d3.zoom();
                const currentTransform = d3.zoomTransform(svg.node());
                
                let newTransform;
                switch (action) {
                    case 'in':
                        newTransform = currentTransform.scale(1.2);
                        break;
                    case 'out':
                        newTransform = currentTransform.scale(0.8);
                        break;
                    case 'reset':
                    case 'fit':
                        // CORRECTED fit-to-view using the fixed centering algorithm
                        const mainGroup = svg.select('.main-group');
                        if (!mainGroup.empty()) {
                            const bounds = mainGroup.node().getBBox();
                            const containerRect = container.getBoundingClientRect();
                            const width = containerRect.width;
                            const height = containerRect.height;
                            
                            console.log(`🔄 MANUAL FIT-TO-VIEW: bounds=(${bounds.x}, ${bounds.y}, ${bounds.width}, ${bounds.height})`);
                            
                            // Use corrected centering logic
                            const padding = Math.min(60, Math.min(width, height) * 0.08);
                            const viewWidth = width - (padding * 2);
                            const viewHeight = height - (padding * 2);
                            
                            const scaleX = viewWidth / bounds.width;
                            const scaleY = viewHeight / bounds.height;
                            let scale = Math.min(scaleX, scaleY);
                            
                            // Dynamic scale constraints
                            const minScale = Math.max(0.3, Math.min(0.6, viewWidth / 1000));
                            const maxScale = Math.min(1.5, Math.max(0.8, viewWidth / 500));
                            scale = Math.max(minScale, Math.min(maxScale, scale));
                            
                            // CORRECTED: Proper center calculation
                            const contentCenterX = bounds.x + bounds.width / 2;
                            const contentCenterY = bounds.y + bounds.height / 2;
                            const viewportCenterX = width / 2;
                            const viewportCenterY = height / 2;
                            
                            // CORRECTED: Proper translation calculation
                            const translateX = viewportCenterX - (scale * contentCenterX);
                            const translateY = viewportCenterY - (scale * contentCenterY);
                            
                            newTransform = d3.zoomIdentity
                                .translate(translateX, translateY)
                                .scale(scale);
                                
                            console.log(`🔄 MANUAL FIT CALCULATION: scale=${scale.toFixed(3)}, translate=(${translateX.toFixed(1)}, ${translateY.toFixed(1)})`);
                        } else {
                            // Enhanced fallback
                            const containerRect = container.getBoundingClientRect();
                            newTransform = d3.zoomIdentity
                                .translate(containerRect.width/2, containerRect.height/2)
                                .scale(0.7);
                            console.log(`🔄 FALLBACK FIT applied`);
                        }
                        break;
                    default:
                        return;
                }
                
                if (newTransform) {
                    svg.transition()
                        .duration(CONSTANTS.ANIMATION_DURATION)
                        .call(zoom.transform, newTransform);
                    
                    // Update zoom display
                    const zoomPercentage = Math.round(newTransform.k * 100);
                    const zoomElement = document.getElementById('zoomLevel');
                    if (zoomElement) {
                        zoomElement.textContent = `${zoomPercentage}%`;
                    }
                    
                    if (window.MarkdownMindmap?.UIComponents?.updateMetrics) {
                        window.MarkdownMindmap.UIComponents.updateMetrics({
                            zoomLevel: zoomPercentage
                        });
                    }
                }
            });
            
            console.log('%c[INIT] Zoom event listeners registered successfully', 'background:blue;color:white;padding:3px');
        }
        
        // Register theme listener
        registerThemeChangeListener();
        registerZoomEventListeners();
        document.addEventListener('DOMContentLoaded', () => {
            registerThemeChangeListener();
            registerZoomEventListeners();
        });
    }
    
    // Export for module systems
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            D3MindmapRenderer,
            MindmapRendererFactory,
            DOMRenderer,
            DataTransformer,
            NodeStyleCalculator,
            ColorUtils,
            ThemeProvider,
            
            // Legacy exports
            createD3Mindmap: MindmapRendererFactory.createD3Mindmap,
            transformToD3Format: MindmapRendererFactory.transformToD3Format,
            renderMindmap: MindmapRendererFactory.renderMindmap,
            updateMindmapFromMarkdown: MindmapRendererFactory.updateMindmapFromMarkdown,
            getNodeColor: MindmapRendererFactory.getNodeColor
        };
    }

})();
