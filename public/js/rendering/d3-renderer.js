/**
 * D3 Renderer Module
 * Creates interactive SVG mindmap visualizations using D3.js
 * 
 * @module D3Renderer
 * @requires D3.js v7.9.0
 * @requires TreeNode class from tree-node.js
 * @requires LayoutEngine from layout-engine.js
 * @requires ConfigManager from config.js
 */

(function() {
    'use strict';

    /**
     * Transform TreeNode structure to d3.hierarchy format
     * @param {TreeNode} root - Root node from parser
     * @returns {Object} D3-compatible hierarchical data
     */
    function transformToD3Format(root) {
        function convertNode(node) {
            if (!node) return null;
            
            const name = node.text || '';
            const detail = node.detail || '';
            
            // Detect code blocks in detail content
            const codeBlockRegex = /^```([a-zA-Z0-9]*)?[\s\S]*```$/;
            const hasCodeBlock = detail && detail.match && detail.match(codeBlockRegex);
            let contentType = node.contentType || 'text';
            let nodeType = node.type || 'text';
            
            // If detail contains code block, extract language and content
            let language = '';
            let content = '';
            if (hasCodeBlock) {
                contentType = 'code';
                const firstLine = detail.split('\n')[0];
                language = firstLine.replace('```', '').trim();
                
                // Extract code content (without backticks)
                const lines = detail.split('\n');
                content = lines.slice(1, lines.length - 1).join('\n');
            }
            
            const result = { 
                name: name,
                detail: detail,
                isLeaf: !node.children || node.children.length === 0,
                // Enhanced with content type data for multi-node styling
                contentType: contentType,
                type: nodeType,
                elements: node.elements || [],
                nodeId: node.id,
                headers: node.headers,
                rows: node.rows,
                language: language,
                content: content
            };
            if (node.children && node.children.length > 0) {
                result.children = node.children.map(child => convertNode(child));
            }
            return result;
        }

        return convertNode(root);
    }

    /**
     * Create D3.js mindmap visualization
     * @param {Object} data - Hierarchical data in d3.hierarchy format
     * @param {HTMLElement} container - DOM container for SVG
     * @param {Object} options - Rendering options from config
     * @returns {SVGElement} Created SVG element
     */
    function createD3Mindmap(data, container, options = {}) {
        // Force theme cache invalidation on new mindmap creation
        window.MarkdownMindmap = window.MarkdownMindmap || {};
        window.MarkdownMindmap.Renderer = window.MarkdownMindmap.Renderer || {};
        window.MarkdownMindmap.Renderer._themeCacheInvalidated = true;
        // Ensure D3 is available
        if (typeof d3 === 'undefined') {
            throw new Error('D3.js library is required but not available');
        }

        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;
        
        // Get theme configuration
        const config = window.MarkdownMindmap?.Config || {};
        const themeColors = config.get ? config.get('theme.colors.nodes', ['#dbeafe', '#fef3c7', '#d1fae5', '#fce7f3', '#e0e7ff']) : 
                           ['#dbeafe', '#fef3c7', '#d1fae5', '#fce7f3', '#e0e7ff'];
        const fontSize = config.get ? config.get('theme.fonts.size.node', 12) : 12;
        
        // Clear container
        d3.select(container).selectAll("*").remove();
        
        // Create SVG with zoom behavior
        const svg = d3.select(container)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", `0 0 ${width} ${height}`)
            .style("background", "transparent");
        
        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });
        
        svg.call(zoom);
        
        // Add click handler to hide tooltips when clicking on empty space
        svg.on("click", function(event) {
            // Only hide if clicking directly on SVG (not on nodes)
            if (event.target === this || event.target.tagName === 'svg') {
                if (window.TreeInteraction?.TooltipManager) {
                    window.TreeInteraction.TooltipManager.hideAllTooltips();
                } else {
                    d3.selectAll(".mindmap-tooltip").remove();
                }
            }
        });
        
        const g = svg.append("g");
        
        // Create tree layout
        const tree = d3.tree().size([width - 160, height - 160]);
        
        // Convert data to hierarchy
        const root = d3.hierarchy(data);
        tree(root);
        
        // Create links with curved paths
        const link = g.selectAll(".link")
            .data(root.links())
            .enter().append("path")
            .attr("class", "link")
            .attr("d", d3.linkHorizontal()
                .x(d => d.y + 80)
                .y(d => d.x + 80))
            .style("fill", "none")
            .style("stroke", "#999")
            .style("stroke-width", 2)
            .style("stroke-opacity", 0.6);
        
        // Create node groups
        const node = g.selectAll(".node")
            .data(root.descendants())
            .enter().append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${d.y + 80},${d.x + 80})`);
        
        // Enhanced node creation with multi-type styling
        node.each(function(d) {
            const nodeGroup = d3.select(this);
            const styling = getNodeStyling(d.data, d.depth, { colors: { nodes: themeColors } });
            
            // Create shape based on content type
            const shape = createNodeShape(nodeGroup, styling, d.data);
            shape.style("cursor", "pointer");
            
            // Add content-specific enhancements
            addContentEnhancements(nodeGroup, d.data, styling);
            
            // Store node data for interactions
            nodeGroup.attr('data-node-id', d.data.nodeId || `node-${d.depth}-${d.index}`)
                     .attr('data-content-type', d.data.contentType || 'text');
        });
        
        // Add text labels
        node.append("text")
            .attr("dy", ".35em")
            .attr("x", d => d.children ? -13 : 13)
            .style("text-anchor", d => d.children ? "end" : "start")
            .style("font-size", `${fontSize}px`)
            .style("font-family", "system-ui, sans-serif")
            .style("fill", "currentColor")
            .style("user-select", "none")
            .style("pointer-events", "none")
            .each(function(d) {
                const textElement = d3.select(this);
                const name = d.data.name || d.data.text || "";
                const detail = d.data.detail || "";
                const isLeaf = d.data.isLeaf;
                
                // For leaf nodes with detail, show both name and detail
                // Check if we're dealing with a code block
                const isCodeBlock = d.data.contentType === 'code' || 
                                  (detail && detail.trim && detail.trim().startsWith('```'));
                
                // Always add the main title/name
                textElement.append("tspan")
                    .attr("x", d.children ? -13 : 13)
                    .attr("dy", "0em")
                    .style("font-weight", "bold")
                    .text(name.length > 25 ? name.substring(0, 22) + "..." : name);
                
                if (detail && detail.trim && detail.trim()) {
                    if (isCodeBlock) {
                        // Extract language if present
                        let language = '';
                        const firstLine = detail.split('\n')[0];
                        if (firstLine.startsWith('```')) {
                            language = firstLine.replace('```', '').trim();
                            
                            // Add language indicator
                            if (language) {
                                textElement.append("tspan")
                                    .attr("x", d.children ? -13 : 13)
                                    .attr("dy", "1.2em")
                                    .style("font-size", `${fontSize - 1}px`)
                                    .style("font-weight", "normal")
                                    .style("fill", "#10b981")
                                    .text(`Language: ${language}`);
                            }
                        }
                        
                        // Get code content (skip first and last line with ```)  
                        const lines = detail.split('\n');
                        const codeLines = lines.slice(1, lines.length - 1);
                        
                        // Show at most 2 lines of code
                        const displayLines = codeLines.slice(0, 2);
                        displayLines.forEach((line) => {
                            textElement.append("tspan")
                                .attr("x", d.children ? -13 : 13)
                                .attr("dy", "1.2em")
                                .style("font-size", `${fontSize - 1}px`)
                                .style("font-weight", "normal")
                                .style("font-family", "monospace")
                                .style("fill", "#666")
                                .text(line.length > 25 ? line.substring(0, 22) + "..." : line);
                        });
                        
                        // Add ellipsis if there are more lines
                        if (codeLines.length > 2) {
                            textElement.append("tspan")
                                .attr("x", d.children ? -13 : 13)
                                .attr("dy", "1.2em")
                                .style("font-size", `${fontSize - 1}px`)
                                .style("fill", "#666")
                                .text("...");
                        }
                    } else {
                        // Regular detail content
                        const detailLines = detail.split('\n').filter(line => line.trim()).slice(0, 3);
                        detailLines.forEach((line) => {
                            textElement.append("tspan")
                                .attr("x", d.children ? -13 : 13)
                                .attr("dy", "1.2em")
                                .style("font-size", `${fontSize - 1}px`)
                                .style("font-weight", "normal")
                                .style("fill", "#666")
                                .text(line.length > 30 ? line.substring(0, 27) + "..." : line);
                        });
                        
                        // Add ellipsis if there are more lines
                        if (detail.split('\n').filter(line => line.trim()).length > 3) {
                            textElement.append("tspan")
                                .attr("x", d.children ? -13 : 13)
                                .attr("dy", "1.2em")
                                .style("font-size", `${fontSize - 1}px`)
                                .style("fill", "#666")
                                .text("...");
                        }
                    }
                }
            });
        
        // Add hover effects (no tooltips on hover)
        node
            .on("mouseover", function(event, d) {
                const nodeGroup = d3.select(this);
                const styling = getNodeStyling(d.data, d.depth);
                
                // Enhanced hover effects based on shape type
                if (styling.shape === 'circle') {
                    nodeGroup.select("circle")
                        .transition()
                        .duration(200)
                        .attr("r", d.depth === 0 ? 10 : 8)
                        .style("stroke-width", 3);
                } else if (styling.shape === 'rect' || styling.shape === 'roundedRect') {
                    nodeGroup.select("rect")
                        .transition()
                        .duration(200)
                        .style("stroke-width", 3)
                        .style("filter", "brightness(1.1)");
                } else if (styling.shape === 'diamond') {
                    nodeGroup.select("polygon")
                        .transition()
                        .duration(200)
                        .style("stroke-width", 3)
                        .style("filter", "brightness(1.1)");
                }
            })
            .on("mouseout", function(event, d) {
                const nodeGroup = d3.select(this);
                const styling = getNodeStyling(d.data, d.depth);
                
                // Reset hover effects based on shape type
                if (styling.shape === 'circle') {
                    nodeGroup.select("circle")
                        .transition()
                        .duration(200)
                        .attr("r", d.depth === 0 ? 8 : 6)
                        .style("stroke-width", 2);
                } else if (styling.shape === 'rect' || styling.shape === 'roundedRect') {
                    nodeGroup.select("rect")
                        .transition()
                        .duration(200)
                        .style("stroke-width", styling.strokeWidth)
                        .style("filter", "none");
                } else if (styling.shape === 'diamond') {
                    nodeGroup.select("polygon")
                        .transition()
                        .duration(200)
                        .style("stroke-width", styling.strokeWidth)
                        .style("filter", "none");
                }
            })
            .on("click", function(event, d) {
                event.stopPropagation(); // Prevent event bubbling
                
                // Show enhanced tooltip on click
                if (window.TreeInteraction?.TooltipManager) {
                    // Hide any existing tooltips first
                    window.TreeInteraction.TooltipManager.hideAllTooltips();
                    
                    // Show tooltip for this node
                    window.TreeInteraction.TooltipManager.showTooltip(this, d.data, {
                        showDelay: 0, // Show immediately on click
                        maxWidth: 450,
                        maxHeight: 350,
                        allowInteraction: true // Allow tooltip interaction
                    });
                } else {
                    // Fallback to basic tooltip
                    d3.selectAll(".mindmap-tooltip").remove(); // Remove existing
                    showBasicTooltip(event, d.data);
                }
                
                // Integrate with animation system and expansion controls
                if (window.TreeInteraction?.D3Animations?.isInitialized) {
                    const nodeId = d.data.id || d.data.name || `node-${d.depth}-${d.index}`;
                    
                    // Check if node has expandable content
                    if (d.data.detail || d.data.contentType || (d.children && d.children.length > 0)) {
                        // Emit expansion event for coordination
                        if (window.MindmapEvents) {
                            window.MindmapEvents.emit('node:clicked', {
                                nodeId,
                                nodeData: d.data,
                                hasExpandableContent: true,
                                position: { x: d.x, y: d.y }
                            });
                        }
                    }
                }
            });
        
        // Center the view
        const bounds = g.node().getBBox();
        const fullWidth = width;
        const fullHeight = height;
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        const scale = Math.min(fullWidth / bounds.width, fullHeight / bounds.height) * 0.8;
        const translate = [fullWidth / 2 - scale * centerX, fullHeight / 2 - scale * centerY];
        
        svg.call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
        
        // Initialize animation coordinator if available
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
        
        return svg.node();
    }

    /**
     * Get node color based on level and theme
     * @param {number} level - Node depth level
     * @param {Object} theme - Theme configuration
     * @returns {string} Color hex code
     */
    function getNodeColor(level, theme = {}) {
        console.log('%c[4] D3 Renderer → getNodeColor for level: ' + level, 'background:#9933cc;color:white;padding:3px;font-weight:bold');
        
        // Default colors if no theme or level-specific colors
        const defaultColors = [
            '#3b82f6', // blue
            '#10b981', // emerald
            '#f59e0b', // amber
            '#8b5cf6', // violet
            '#ec4899', // pink
        ];
        
        // If we have theme node colors, use them
        if (theme && theme.colors) {
            console.log('  Using theme object colors');
            const color = theme.colors[level] || theme.colors.accent || defaultColors[level % defaultColors.length];
            console.log('  → Selected color from theme object:', color);
            return color;
        }
        
        // Check if we have CSS custom properties for theme - ALWAYS CHECK FRESH
        if (typeof window !== 'undefined' && window.getComputedStyle) {
            try {
                console.log('  Checking CSS custom properties for theme colors');
                const root = document.documentElement;
                console.log('  Current theme from HTML data attribute:', root.getAttribute('data-theme'));
                const style = getComputedStyle(root);
                
                // Get theme colors from CSS variables
                const accent = style.getPropertyValue('--theme-accent').trim();
                const primary = style.getPropertyValue('--theme-primary').trim();
                const secondary = style.getPropertyValue('--theme-secondary').trim();
                
                console.log('  CSS Variables:', {
                    accent: accent || 'not set',
                    primary: primary || 'not set',
                    secondary: secondary || 'not set'
                });
                
                if (accent && primary && secondary) {
                    // Create a palette from theme colors
                    const themePalette = [
                        accent,
                        primary,
                        secondary,
                        shiftHue(accent, 30),  // Shifted version of accent
                        shiftHue(primary, 45)  // Shifted version of primary
                    ];
                    const color = themePalette[level % themePalette.length];
                    console.log('  → Selected color from CSS variables:', color);
                    return color;
                }
            } catch (e) {
                console.warn('  Error accessing CSS theme variables:', e);
            }
        }
        
        // Fallback to default colors
        const fallbackColor = defaultColors[level % defaultColors.length];
        console.log('  → Using fallback color:', fallbackColor);
        return fallbackColor;
    }
    
    /**
     * Helper function to shift hue of a color
     * @param {string} hexColor - Hex color code
     * @param {number} degrees - Degrees to shift hue
     * @returns {string} New hex color
     */
    function shiftHue(hexColor, degrees) {
        // Default if invalid input
        if (!hexColor || hexColor === 'none' || !hexColor.startsWith('#')) {
            return '#3b82f6';
        }
        
        try {
            // Convert hex to RGB
            let r = parseInt(hexColor.slice(1, 3), 16);
            let g = parseInt(hexColor.slice(3, 5), 16);
            let b = parseInt(hexColor.slice(5, 7), 16);
            
            // Convert RGB to HSL
            r /= 255;
            g /= 255;
            b /= 255;
            
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            let h, s, l = (max + min) / 2;
            
            if (max === min) {
                h = s = 0; // achromatic
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
            
            // Shift hue
            h = (h * 360 + degrees) % 360 / 360;
            
            // Convert back to RGB
            let r1, g1, b1;
            
            if (s === 0) {
                r1 = g1 = b1 = l; // achromatic
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
            
            // Convert to hex
            const toHex = x => {
                const hex = Math.round(x * 255).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            };
            
            return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
        } catch (e) {
            console.error('Error shifting hue:', e);
            return hexColor; // Return original if error
        }
    }

    /**
     * Get node styling based on node data
     * @param {Object} nodeData - Node data
     * @param {number} level - Node level
     * @param {Object} theme - Theme configuration
     * @returns {Object} Node styling information
     */
    function getNodeStyling(nodeData, level, theme = {}) {
        // Prioritize explicit code contentType or code in detail
        const contentType = nodeData.contentType || 'text';
        
        // Check if node has code children
        const hasCodeChildren = nodeData.children && nodeData.children.some(child => {
            return child.type === 'code' || child.contentType === 'code';
        });
        
        // Check if detail contains code block
        const detailHasCode = nodeData.detail && nodeData.detail.includes('```');
        
        // Create base styling map
        const stylingMap = {
            text: {
                shape: 'circle',
                fill: theme.nodeColors?.text || '#3b82f6',
                stroke: theme.nodeStrokeColors?.text || '#3b82f6',
                strokeWidth: 2,
                textAnchor: 'start',
                fontSize: '12px',
                fontWeight: 'normal',
                textColor: theme.textColor || 'currentcolor',
                detailColor: theme.detailColor || '#666',
                icon: null,
                radius: 8 // Default circle radius
            },
            table: {
                shape: 'rect',
                fill: theme.nodeColors?.table || '#10b981',
                stroke: theme.nodeStrokeColors?.table || '#10b981',
                strokeWidth: 2,
                textAnchor: 'start',
                fontSize: '12px',
                fontWeight: 'normal',
                textColor: theme.textColor || 'currentcolor',
                detailColor: theme.detailColor || '#666',
                icon: 'table',
                width: 22,  // Default width for tables
                height: 16  // Default height for tables
            },
            code: {
                shape: 'roundedRect',
                fill: theme.nodeColors?.code || '#6366f1',
                stroke: theme.nodeStrokeColors?.code || '#6366f1',
                strokeWidth: 2,
                textAnchor: 'start',
                fontSize: '12px',
                fontWeight: 'normal',
                textColor: theme.textColor || 'currentcolor',
                detailColor: theme.detailColor || '#666',
                icon: 'code',
                width: 24,  // Default width for code blocks
                height: 16, // Default height for code blocks
                rx: 4      // Corner radius for rounded rectangles
            },
            list: {
                shape: 'diamond',
                fill: theme.nodeColors?.list || '#f59e0b',
                stroke: theme.nodeStrokeColors?.list || '#f59e0b',
                strokeWidth: 2,
                textAnchor: 'start',
                fontSize: '12px',
                fontWeight: 'normal',
                textColor: theme.textColor || 'currentcolor',
                detailColor: theme.detailColor || '#666',
                icon: 'list',
                size: 10  // Size of diamond shape
            },
            header: {
                shape: 'circle',
                fill: theme.nodeColors?.header || '#3b82f6',
                stroke: theme.nodeStrokeColors?.header || '#3b82f6',
                strokeWidth: 2,
                textAnchor: 'start',
                fontSize: '12px',
                fontWeight: 'bold',
                textColor: theme.textColor || 'currentcolor',
                detailColor: theme.detailColor || '#666',
                icon: null,
                radius: 8 // Default circle radius
            }
        };
        
        // Determine the most appropriate styling based on content
        if (contentType === 'code') {
            // Pure code node
            return stylingMap.code;
        } else if (nodeData.type === 'header' && (hasCodeChildren || detailHasCode)) {
            // Header with code content
            return {
                ...stylingMap.header,
                shape: 'roundedRect',
                fill: theme.nodeColors?.code || '#6366f1',
                stroke: theme.nodeStrokeColors?.code || '#6366f1',
                icon: 'code',
                width: 24,
                height: 16,
                rx: 4
            };
        } else if (detailHasCode) {
            // Any node with code in detail
            return {
                ...stylingMap[nodeData.type || 'text'],
                shape: 'roundedRect',
                fill: theme.nodeColors?.code || '#6366f1',
                stroke: theme.nodeStrokeColors?.code || '#6366f1',
                icon: 'code',
                width: 24,
                height: 16,
                rx: 4
            };
        }
        
        // Fall back to standard styling
        return stylingMap[contentType] || stylingMap.text;
    }

    /**
     * Create SVG shape based on node styling
     * @param {d3.Selection} nodeSelection - D3 selection for node group
     * @param {Object} styling - Styling properties
     * @param {Object} nodeData - Node data
     */
    function createNodeShape(nodeSelection, styling, nodeData) {
        let shape;
        
        switch (styling.shape) {
            case 'rect':
                shape = nodeSelection.append('rect')
                    .attr('width', styling.width)
                    .attr('height', styling.height)
                    .attr('x', -styling.width / 2)
                    .attr('y', -styling.height / 2);
                break;
                
            case 'roundedRect':
                shape = nodeSelection.append('rect')
                    .attr('width', styling.width)
                    .attr('height', styling.height)
                    .attr('x', -styling.width / 2)
                    .attr('y', -styling.height / 2)
                    .attr('rx', styling.rx);
                break;
                
            case 'diamond':
                const size = styling.size;
                const points = [
                    [0, -size],
                    [size, 0],
                    [0, size],
                    [-size, 0]
                ];
                shape = nodeSelection.append('polygon')
                    .attr('points', points.map(p => p.join(',')).join(' '));
                break;
                
            case 'circle':
            default:
                shape = nodeSelection.append('circle')
                    .attr('r', styling.radius);
                break;
        }
        
        // Apply common styling
        shape
            .style('fill', styling.fill)
            .style('stroke', styling.stroke)
            .style('stroke-width', styling.strokeWidth)
            .attr('class', `mindmap-node-${nodeData.contentType || 'text'}`);
            
        return shape;
    }

    /**
     * Add content-specific visual enhancements to nodes
     * @param {d3.Selection} nodeSelection - D3 selection for node group
     * @param {Object} nodeData - Node data
     * @param {Object} styling - Node styling properties
     */
    function addContentEnhancements(nodeSelection, nodeData, styling) {
        // Add icon if specified
        if (styling.icon) {
            nodeSelection.append('text')
                .text(function() {
                    // Use icon mapping or fallback to icon name
                    const iconMap = {
                        'code': '⌨',
                        'table': '⊞',
                        'list': '≡'
                    };
                    return iconMap[styling.icon] || styling.icon;
                })
                .attr('x', 0)
                .attr('y', 0)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'central')
                .attr('font-size', '8px')
                .attr('class', 'node-icon');
        }
        
        // First check for explicit node type
        const nodeType = nodeData.type || nodeData.contentType || 'text';
        
        // Add type-specific indicators
        switch (nodeType) {
            case 'table':
                if (nodeData.headers && nodeData.rows) {
                    const indicator = nodeSelection.append('text')
                        .text(`${nodeData.headers.length}×${nodeData.rows.length}`)
                        .attr('x', 0)
                        .attr('y', 12)
                        .attr('text-anchor', 'middle')
                        .attr('font-size', '6px')
                        .attr('fill', '#6b7280')
                        .attr('class', 'table-indicator');
                }
                break;
                
            case 'code':
                if (nodeData.language) {
                    nodeSelection.append('text')
                        .text(nodeData.language.toUpperCase())
                        .attr('x', 0)
                        .attr('y', 12)
                        .attr('text-anchor', 'middle')
                        .attr('font-size', '5px')
                        .attr('fill', '#10b981')
                        .attr('class', 'code-indicator');
                }
                break;
                
            case 'list':
                if (nodeData.elements && nodeData.elements.length > 0) {
                    nodeSelection.append('text')
                        .text(`${nodeData.elements.length}`)
                        .attr('x', 0)
                        .attr('y', 12)
                        .attr('text-anchor', 'middle')
                        .attr('font-size', '6px')
                        .attr('fill', '#f59e0b')
                        .attr('class', 'list-indicator');
                }
                break;
        }
        
        // Special handling for nodes that contain code blocks
        if (nodeData.hasCodeChildren || (nodeData.content && nodeData.content.includes('```'))) {
            nodeSelection.append('text')
                .text('CODE')
                .attr('x', 0)
                .attr('y', 12)
                .attr('text-anchor', 'middle')
                .attr('font-size', '5px')
                .attr('fill', '#10b981')
                .attr('class', 'code-parent-indicator');
        }
    }

    /**
     * Create enhanced tooltip content based on node type
     * @param {Object} nodeData - Node data
     * @param {string} text - Node text
     * @param {string} detail - Node detail
     * @param {boolean} isLeaf - Whether node is a leaf
     * @returns {string} Formatted tooltip content
     */
    function createTooltipContent(nodeData, text, detail, isLeaf) {
        let content = text;
        const contentType = nodeData.contentType || 'text';
        
        // Add content type indicator
        if (contentType !== 'text') {
            content = `[${contentType.toUpperCase()}] ${content}`;
        }
        
        // Add type-specific information
        switch (contentType) {
            case 'table':
                if (nodeData.headers && nodeData.rows) {
                    content += `\n\nTable: ${nodeData.headers.length} columns, ${nodeData.rows.length} rows`;
                    if (nodeData.headers.length > 0) {
                        content += `\nColumns: ${nodeData.headers.slice(0, 3).join(', ')}${nodeData.headers.length > 3 ? '...' : ''}`;
                    }
                }
                break;
                
            case 'code':
                if (nodeData.language) {
                    content += `\n\nLanguage: ${nodeData.language}`;
                }
                if (nodeData.content) {
                    const lines = nodeData.content.split('\n').length;
                    content += `\nLines: ${lines}`;
                    // Show first few lines of code
                    const preview = nodeData.content.split('\n').slice(0, 3).join('\n');
                    content += `\n\nPreview:\n${preview}${lines > 3 ? '\n...' : ''}`;
                }
                break;
                
            case 'list':
                if (nodeData.elements && nodeData.elements.length > 0) {
                    content += `\n\nList items: ${nodeData.elements.length}`;
                    // Show first few list items
                    const items = nodeData.elements.slice(0, 3);
                    if (items.length > 0) {
                        content += `\nItems:\n• ${items.join('\n• ')}${nodeData.elements.length > 3 ? '\n• ...' : ''}`;
                    }
                }
                break;
        }
        
        // Add detail content for leaf nodes
        if (isLeaf && detail.trim() && contentType === 'text') {
            content += `\n\n${detail}`;
        }
        
        return content;
    }

    // Previous basic tooltip function removed to prevent duplication

    /**
     * Show basic tooltip on hover
     * @param {MouseEvent} event - Mouse event
     * @param {Object} data - Node data
     */
    function showBasicTooltip(event, data) {
        // Create tooltip
        const tooltip = d3.select('body')
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
        
        // Add title
        tooltip.append('div')
            .style('font-weight', 'bold')
            .style('margin-bottom', '4px')
            .text(data.name || data.text || '');
        
        // Add detail if present
        if (data.detail) {
            // Special handling for code blocks
            if (data.type === 'code' || data.contentType === 'code' || 
                (data.content && data.content.includes('```'))) {
                
                // Try to render code block with specialized renderer if available
                const codeContainer = tooltip.append('div')
                    .attr('class', 'code-container')
                    .style('margin-top', '8px')
                    .style('max-height', '300px')
                    .style('overflow', 'auto')
                    .style('background', '#f5f5f5')
                    .style('border-radius', '4px')
                    .style('padding', '8px')
                    .style('font-family', 'monospace');
                    
                // Try to use CodeBlockDisplay if available
                if (window.MarkdownMindmap?.CodeBlockDisplay) {
                    try {
                        const codeRenderer = new window.MarkdownMindmap.CodeBlockDisplay();
                        const content = data.content || data.detail;
                        const language = data.language || '';
                        
                        codeRenderer.renderCodeBlock({ content, language }, codeContainer.node());
                    } catch (e) {
                        // Fallback to simple display
                        codeContainer.style('white-space', 'pre-wrap')
                            .text(data.detail || data.content);
                    }
                } else {
                    // Simple code block display
                    codeContainer.style('white-space', 'pre-wrap')
                        .text(data.detail || data.content);
                }
            } else {
                // Regular detail display
                tooltip.append('div')
                    .style('white-space', 'pre-wrap')
                    .text(data.detail);
            }
        }
        
        // Add content type indicator
        if (data.contentType && data.contentType !== 'text') {
            tooltip.append('div')
                .style('margin-top', '4px')
                .style('font-style', 'italic')
                .style('color', '#666')
                .text(`Type: ${data.contentType}`);
        }
    }

    /**
     * Main render function - integrates parsing, layout, and visualization
     * @param {TreeNode} root - Parsed tree structure
     * @param {HTMLElement} container - Target container (optional, uses default if not provided)
     * @param {Object} options - Rendering options from config
     */
    function renderMindmap(root, container = null, options = {}) {
        // Use default container if not provided
        if (!container) {
            container = document.getElementById('mindmapContainer');
        }
        
        if (!container) {
            throw new Error('Mindmap container not found');
        }
        console.log('-=-=-=-=-=3.1 root', root);
        console.log('-=-=-=-=-=3.1', container);
        try {
            // Apply layout if LayoutEngine is available
            if (window.TreeInteraction?.LayoutEngine) {
                window.TreeInteraction.LayoutEngine.calculateLayout(root);
            }
            
            // Transform data to d3 format
            const d3Data = transformToD3Format(root);
            console.log('Rendering mindmap with data:', d3Data);
            
            // Create mindmap
            createD3Mindmap(d3Data, container, options);
            
            // Update node count if element exists
            const nodeCountElement = document.getElementById('nodeCount');
            if (nodeCountElement && root.getNodeCount) {
                nodeCountElement.textContent = root.getNodeCount();
            }
            
        } catch (error) {
            console.error('Error rendering mindmap:', error);
            container.innerHTML = `<div class="flex items-center justify-center h-full text-gray-500">
                <div class="text-center">
                    <p>Unable to render mindmap</p>
                    <p class="text-sm mt-2">${error.message}</p>
                </div>
            </div>`;
        }
    }

    /**
     * Update mindmap from markdown input
     * @param {string} markdown - Markdown content
     * @param {HTMLElement} container - Target container
     */
    function updateMindmapFromMarkdown(markdown, container = null) {
        if (!markdown.trim()) {
            const targetContainer = container || document.getElementById('mindmapContainer');
            if (targetContainer) {
                targetContainer.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">Enter markdown to see the mindmap</div>';
            }
            return;
        }

        try {
            // Use parser if available
            console.log('-=-=-=-=-=1 ');
            if (window.MarkdownMindmap?.Parser?.parseMarkdownToTree) {
                console.log('-=-=-=-=-=2 ');
                // Enable filtering for cleaner mindmap visualization (matches target behavior)
                const tree = window.MarkdownMindmap.Parser.parseMarkdownToTree(markdown, { 
                    filterForMindmap: true 
                });
                renderMindmap(tree, container);
            } else {
                console.log('-=-=-=-=-=3 ');
                throw new Error('Markdown parser not available');
            }
        } catch (error) {
            console.error('Error updating mindmap:', error);
        }
    }

    // Create global namespace
    if (typeof window !== 'undefined') {
        window.MarkdownMindmap = window.MarkdownMindmap || {};
        window.MarkdownMindmap.Renderer = {
            createD3Mindmap,
            transformToD3Format,
            renderMindmap,
            updateMindmapFromMarkdown,
            getNodeColor
        };
        
        // Listen for theme changes and re-render the mindmap
        function registerThemeChangeListener() {
            if (window.MarkdownMindmap?.ThemeManager) {
                // Register callback to update the mindmap when theme changes
                window.MarkdownMindmap.ThemeManager.onThemeChange(function(themeName, themeData) {
                    console.log('%c[2.1] Theme Change Callback → Received theme change event', 'background:#ff6600;color:white;padding:3px;font-weight:bold');
                    console.log('  New theme:', themeName);
                    console.log('  Theme data:', themeData);
                    
                    // Get the current markdown content
                    const markdownInput = document.getElementById('markdownInput');
                    if (markdownInput && markdownInput.value) {
                        console.log('  Found markdown input with content length:', markdownInput.value.length);
                        
                        setTimeout(function() {
                            // Re-render the mindmap with new theme after a slight delay
                            // to ensure CSS variables have been applied
                            const container = document.getElementById('mindmapContainer');
                            if (container) {
                                console.log('  Found container element:', container.id);
                                // Clean the container completely
                                container.innerHTML = '';
                                
                                console.log('  Container cleared, starting redraw with theme:', themeName);
                                
                                // Check if CSS variables are properly set
                                const style = getComputedStyle(document.documentElement);
                                const accent = style.getPropertyValue('--theme-accent').trim();
                                console.log('  Current CSS accent color variable:', accent || 'not set');
                                
                                // Force a complete reparse and redraw
                                window.MarkdownMindmap.Renderer.updateMindmapFromMarkdown(
                                    markdownInput.value, 
                                    container
                                );
                            } else {
                                console.error('  Container element not found');
                            }
                        }, 200); // Increased delay to ensure CSS variables are fully applied
                    } else {
                        console.error('  Markdown input not found or empty');
                    }
                });
                
                console.log('%c[INIT] Theme change listener registered successfully', 'background:green;color:white;padding:3px');
            } else {
                console.warn('%c[ERROR] ThemeManager not available to register theme change listener', 'background:red;color:white;padding:3px');
            }
        }
        
        // Register theme listener both immediately and on DOMContentLoaded
        registerThemeChangeListener();
        document.addEventListener('DOMContentLoaded', registerThemeChangeListener);
    }
    
    // Export for module systems if available
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            createD3Mindmap,
            transformToD3Format,
            renderMindmap,
            updateMindmapFromMarkdown,
            getNodeColor
        };
    }
})();