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
            if (node.text === 'Root') {
                if (node.children.length === 0) {
                    return { name: 'Empty', children: [] };
                }
                if (node.children.length === 1) {
                    return convertNode(node.children[0]);
                }
                return {
                    name: 'Mind Map',
                    children: node.children.map(child => convertNode(child))
                };
            }
            
            const result = { name: node.text || 'Unnamed' };
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
        
        // Add circles for nodes
        node.append("circle")
            .attr("r", d => d.depth === 0 ? 8 : 6)
            .style("fill", d => {
                if (d.depth === 0) return "#4f46e5"; // Primary color for root
                return themeColors[d.depth % themeColors.length];
            })
            .style("stroke", "#fff")
            .style("stroke-width", 2)
            .style("cursor", "pointer");
        
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
            .text(d => {
                const text = d.data.name || d.data.text || "";
                return text.length > 30 ? text.substring(0, 27) + "..." : text;
            });
        
        // Add hover effects
        node
            .on("mouseover", function(event, d) {
                d3.select(this).select("circle")
                    .transition()
                    .duration(200)
                    .attr("r", d.depth === 0 ? 10 : 8)
                    .style("stroke-width", 3);
                
                // Show tooltip for long text
                const text = d.data.name || d.data.text || "";
                if (text.length > 30) {
                    const tooltip = d3.select("body").append("div")
                        .attr("class", "mindmap-tooltip")
                        .style("position", "absolute")
                        .style("background", "rgba(0,0,0,0.8)")
                        .style("color", "white")
                        .style("padding", "8px")
                        .style("border-radius", "4px")
                        .style("font-size", "12px")
                        .style("pointer-events", "none")
                        .style("z-index", "1000")
                        .text(text);
                    
                    tooltip
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px");
                }
            })
            .on("mouseout", function(event, d) {
                d3.select(this).select("circle")
                    .transition()
                    .duration(200)
                    .attr("r", d.depth === 0 ? 8 : 6)
                    .style("stroke-width", 2);
                
                // Remove tooltip
                d3.selectAll(".mindmap-tooltip").remove();
            })
            .on("click", function(event, d) {
                // Future: Add click handling for node expansion/collapse
                console.log("Node clicked:", d.data);
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
        
        return svg.node();
    }

    /**
     * Get node color based on level and theme
     * @param {number} level - Node depth level
     * @param {Object} theme - Theme configuration
     * @returns {string} Color hex code
     */
    function getNodeColor(level, theme = {}) {
        const colors = theme.colors?.nodes || ['#dbeafe', '#fef3c7', '#d1fae5', '#fce7f3', '#e0e7ff'];
        return colors[level % colors.length];
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
            if (window.MarkdownMindmap?.Parser?.parseMarkdownToTree) {
                const tree = window.MarkdownMindmap.Parser.parseMarkdownToTree(markdown);
                renderMindmap(tree, container);
            } else {
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