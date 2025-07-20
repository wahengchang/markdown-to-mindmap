/**
 * Markdown Parser Module
 * Converts markdown text into hierarchical tree structure for mindmap visualization
 * 
 * @module MarkdownParser
 * @requires TreeNode class from tree-node.js
 */

(function() {
    'use strict';

    /**
     * Parse markdown text into a hierarchical tree structure
     * @param {string} markdown - Raw markdown content
     * @param {Object} options - Parsing options
     * @param {boolean} options.filterForMindmap - Filter out text nodes for cleaner mindmap (default: false)
     * @param {Array<string>} options.includeTypes - Node types to include in mindmap mode (default: ['header', 'list-item', 'code', 'table', 'math'])
     * @returns {TreeNode} Root node containing parsed tree structure
     * @throws {Error} If TreeNode class is not available
     */
    function parseMarkdownToTree(markdown, options = {}) {
        // Ensure TreeNode is available
        if (typeof TreeNode === 'undefined') {
            throw new Error('TreeNode class is required but not available');
        }

        const lines = markdown.split('\n');
        const root = new TreeNode('Root', 0);
        const stack = [root];
        let inCodeBlock = false;
        let codeBlockContent = '';
        let codeBlockLanguage = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Skip empty lines
            if (!trimmedLine) continue;

            // Handle code blocks
            if (trimmedLine.startsWith('```')) {
                if (!inCodeBlock) {
                    // Start of code block
                    inCodeBlock = true;
                    codeBlockLanguage = trimmedLine.substring(3).trim();
                    codeBlockContent = '';
                } else {
                    // End of code block
                    inCodeBlock = false;
                    const codeNode = new TreeNode(`Code: ${codeBlockLanguage}`, stack[stack.length - 1].level + 1);
                    codeNode.type = 'code';
                    codeNode.language = codeBlockLanguage;
                    codeNode.content = codeBlockContent;
                    stack[stack.length - 1].addChild(codeNode);
                    codeBlockContent = '';
                }
                continue;
            }

            // If inside code block, accumulate content
            if (inCodeBlock) {
                codeBlockContent += line + '\n';
                continue;
            }

            // Handle headers
            const headerMatch = line.match(/^(#+)\s+(.+)$/);
            if (headerMatch) {
                const level = headerMatch[1].length;
                const text = headerMatch[2];
                const node = new TreeNode(text, level);
                node.type = 'header';

                // Find correct parent
                while (stack.length > 1 && stack[stack.length - 1].level >= level) {
                    stack.pop();
                }

                stack[stack.length - 1].addChild(node);
                stack.push(node);
                continue;
            }

            // Handle unordered lists
            const unorderedListMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
            if (unorderedListMatch) {
                const indent = unorderedListMatch[1].length;
                const text = unorderedListMatch[2];
                const listLevel = Math.floor(indent / 2) + stack[stack.length - 1].level + 1;
                const node = new TreeNode(text, listLevel);
                node.type = 'list-item';
                node.listType = 'unordered';

                // Find correct parent based on indentation
                while (stack.length > 1 && stack[stack.length - 1].level >= listLevel) {
                    stack.pop();
                }

                stack[stack.length - 1].addChild(node);
                continue;
            }

            // Handle ordered lists
            const orderedListMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
            if (orderedListMatch) {
                const indent = orderedListMatch[1].length;
                const text = orderedListMatch[2];
                const listLevel = Math.floor(indent / 2) + stack[stack.length - 1].level + 1;
                const node = new TreeNode(text, listLevel);
                node.type = 'list-item';
                node.listType = 'ordered';

                // Find correct parent based on indentation
                while (stack.length > 1 && stack[stack.length - 1].level >= listLevel) {
                    stack.pop();
                }

                stack[stack.length - 1].addChild(node);
                continue;
            }

            // Handle checkboxes
            const checkboxMatch = line.match(/^(\s*)[-*+]\s+\[([x\s])\]\s+(.+)$/);
            if (checkboxMatch) {
                const indent = checkboxMatch[1].length;
                const isChecked = checkboxMatch[2].toLowerCase() === 'x';
                const text = checkboxMatch[3];
                const listLevel = Math.floor(indent / 2) + stack[stack.length - 1].level + 1;
                const node = new TreeNode(text, listLevel);
                node.type = 'checkbox';
                node.checked = isChecked;

                // Find correct parent based on indentation
                while (stack.length > 1 && stack[stack.length - 1].level >= listLevel) {
                    stack.pop();
                }

                stack[stack.length - 1].addChild(node);
                continue;
            }

            // Handle table rows (simple detection)
            if (line.includes('|') && !line.startsWith('|')) {
                const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
                if (cells.length > 1) {
                    const tableNode = new TreeNode(`Table: ${cells[0]} | ${cells[1]}`, stack[stack.length - 1].level + 1);
                    tableNode.type = 'table';
                    tableNode.cells = cells;
                    stack[stack.length - 1].addChild(tableNode);
                    continue;
                }
            }

            // Handle math expressions (LaTeX)
            if (line.includes('$') && !line.startsWith('$')) {
                const mathMatch = line.match(/\$(.*?)\$/);
                if (mathMatch) {
                    const mathNode = new TreeNode(`Math: ${mathMatch[1]}`, stack[stack.length - 1].level + 1);
                    mathNode.type = 'math';
                    mathNode.formula = mathMatch[1];
                    stack[stack.length - 1].addChild(mathNode);
                    continue;
                }
            }

            // Handle regular text paragraphs
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const textNode = new TreeNode(trimmedLine, stack[stack.length - 1].level + 1);
                textNode.type = 'text';
                stack[stack.length - 1].addChild(textNode);
            }
        }

        // Apply filtering if requested
        if (options.filterForMindmap) {
            return filterTreeForMindmap(root, options);
        }

        return root;
    }

    /**
     * Filter tree nodes for mindmap visualization
     * Only keeps structural headers and moves detailed content to leaf nodes
     * @param {TreeNode} root - Root node of the tree
     * @param {Object} options - Filtering options
     * @returns {TreeNode} Filtered tree with clean structure
     */
    function filterTreeForMindmap(root, options = {}) {
        // Step 1: Identify leaf nodes (nodes that will have no structural children)
        function identifyLeafNodes(node) {
            if (node.text === 'Root') {
                // Process children to identify leaves
                for (let child of node.children) {
                    identifyLeafNodes(child);
                }
                return;
            }
            
            // Count structural children (headers only)
            let structuralChildrenCount = 0;
            for (let child of node.children) {
                if (child.type === 'header') {
                    structuralChildrenCount++;
                    identifyLeafNodes(child);
                }
            }
            
            // Mark as leaf if no structural children
            node._isLeaf = (structuralChildrenCount === 0);
        }
        
        // Step 2: Build filtered tree with detail property
        function buildFilteredTree(node) {
            if (node.text === 'Root') {
                const filteredRoot = new TreeNode(node.text, node.level);
                filteredRoot.type = node.type;
                filteredRoot.id = node.id;
                
                // Only add header children
                for (let child of node.children) {
                    if (child.type === 'header') {
                        const filteredChild = buildFilteredTree(child);
                        if (filteredChild) {
                            filteredRoot.addChild(filteredChild);
                        }
                    }
                }
                return filteredRoot;
            }
            
            // Only process header nodes
            if (node.type !== 'header') {
                return null;
            }
            
            // Create filtered header node
            const filteredNode = new TreeNode(node.text, node.level);
            filteredNode.type = node.type;
            filteredNode.id = node.id;
            
            // If this is a leaf node, collect all detailed content
            if (node._isLeaf) {
                const detailParts = [];
                
                // Collect text content
                for (let child of node.children) {
                    if (child.type === 'text') {
                        detailParts.push(child.text);
                    } else if (child.type === 'list-item') {
                        detailParts.push(`- ${child.text}`);
                    } else if (child.type === 'code') {
                        detailParts.push(`\`\`\`${child.language || ''}\n${child.content}\`\`\``);
                    }
                }
                
                // Set detail property
                filteredNode.detail = detailParts.join('\n');
            } else {
                // Non-leaf: only add header children, no detail
                for (let child of node.children) {
                    if (child.type === 'header') {
                        const filteredChild = buildFilteredTree(child);
                        if (filteredChild) {
                            filteredNode.addChild(filteredChild);
                        }
                    }
                }
            }
            
            return filteredNode;
        }
        
        // Execute the algorithm
        identifyLeafNodes(root);
        const result = buildFilteredTree(root);
        
        // Clean up temporary markers
        function cleanupMarkers(node) {
            delete node._isLeaf;
            if (node.children) {
                for (let child of node.children) {
                    cleanupMarkers(child);
                }
            }
        }
        cleanupMarkers(root);
        
        return result;
    }

    /**
     * Validate markdown syntax and return parsing warnings
     * @param {string} markdown - Raw markdown content
     * @returns {Array<string>} Array of warning messages
     */
    function validateMarkdown(markdown) {
        const warnings = [];
        const lines = markdown.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNum = i + 1;
            
            // Check for unclosed code blocks
            if (line.trim().startsWith('```')) {
                let hasClosing = false;
                for (let j = i + 1; j < lines.length; j++) {
                    if (lines[j].trim().startsWith('```')) {
                        hasClosing = true;
                        break;
                    }
                }
                if (!hasClosing) {
                    warnings.push(`Line ${lineNum}: Unclosed code block`);
                }
            }
            
            // Check for malformed headers
            if (line.match(/^#{7,}/)) {
                warnings.push(`Line ${lineNum}: Headers deeper than 6 levels are not standard`);
            }
        }
        
        return warnings;
    }

    /**
     * Get parsing statistics for performance monitoring
     * @param {TreeNode} root - Parsed tree root
     * @returns {Object} Statistics object
     */
    function getParsingStats(root) {
        const stats = {
            totalNodes: 0,
            nodeTypes: {},
            maxDepth: 0
        };
        
        function traverse(node, depth = 0) {
            stats.totalNodes++;
            stats.maxDepth = Math.max(stats.maxDepth, depth);
            
            const type = node.type || 'text';
            stats.nodeTypes[type] = (stats.nodeTypes[type] || 0) + 1;
            
            if (node.children) {
                node.children.forEach(child => traverse(child, depth + 1));
            }
        }
        
        traverse(root);
        return stats;
    }

    // Create global namespace
    if (typeof window !== 'undefined') {
        window.MarkdownMindmap = window.MarkdownMindmap || {};
        window.MarkdownMindmap.Parser = {
            parseMarkdownToTree,
            validateMarkdown,
            getParsingStats,
            filterTreeForMindmap
        };
    }

    // Export for module systems if available
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            parseMarkdownToTree,
            validateMarkdown,
            getParsingStats,
            filterTreeForMindmap
        };
    }

})();