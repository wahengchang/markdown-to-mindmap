/**
 * TreeNode Module - Core tree data structure for mindmap visualization
 * Extracted from index.html lines 289-402
 * Performance optimized for large trees (1000+ nodes)
 */
(function() {
    'use strict';

    /**
     * TreeNode class for hierarchical mindmap data structure
     * @class TreeNode
     */
    class TreeNode {
        /**
         * Create a new TreeNode with enhanced content support
         * @param {string} text - The text content of the node
         * @param {number} level - The depth level in the tree (default: 0)
         * @param {string} contentType - Content classification (default: 'text')
         * @param {Array} elements - Structured content elements (default: [])
         */
        constructor(text, level = 0, contentType = 'text', elements = []) {
            this.text = text;              // Title/heading for display
            this.detail = '';              // Detailed content for leaf nodes
            this.level = level;
            this.children = [];
            this.parent = null;
            
            // Spatial coordinates for layout
            this.x = 0;
            this.y = 0;
            
            // Node properties
            this.type = 'text'; // Default type: text, code, list, etc. (legacy)
            this.contentType = contentType; // Enhanced content classification
            this.elements = elements || []; // Structured content elements
            this.id = TreeNode.generateId();
            this.collapsed = false;
            this.metadata = {};
        }

        /**
         * Generate a unique ID for the node
         * @returns {string} Unique node identifier
         */
        static generateId() {
            return 'node_' + Math.random().toString(36).substr(2, 9);
        }

        /**
         * Add a child node to this node
         * @param {TreeNode} node - The child node to add
         */
        addChild(node) {
            if (!(node instanceof TreeNode)) {
                throw new Error('Child must be a TreeNode instance');
            }
            node.parent = this;
            this.children.push(node);
        }

        /**
         * Remove a child node from this node
         * @param {TreeNode} node - The child node to remove
         */
        removeChild(node) {
            const index = this.children.indexOf(node);
            if (index > -1) {
                this.children.splice(index, 1);
                node.parent = null;
            }
        }

        /**
         * Find all nodes of a specific type in the subtree
         * @param {string} type - The node type to search for
         * @returns {TreeNode[]} Array of matching nodes
         */
        findByType(type) {
            let results = [];
            if (this.type === type) {
                results.push(this);
            }
            for (let child of this.children) {
                results = results.concat(child.findByType(type));
            }
            return results;
        }

        /**
         * Set content type and elements for this node
         * @param {string} contentType - Content type classification
         * @param {Array} elements - Structured content elements
         */
        setContentData(contentType, elements) {
            this.contentType = contentType;
            this.elements = elements || [];
            // Update legacy type for backward compatibility
            this.type = contentType;
        }

        /**
         * Check if node has expandable content
         * @returns {boolean} True if node contains complex content that can be expanded
         */
        hasExpandableContent() {
            return this.elements && this.elements.length > 0 && 
                   ['table', 'list', 'complex', 'code', 'math'].includes(this.contentType);
        }

        /**
         * Get all nodes with specific content type in subtree
         * @param {string} contentType - Content type to search for
         * @returns {TreeNode[]} Array of matching nodes
         */
        findByContentType(contentType) {
            let results = [];
            if (this.contentType === contentType) {
                results.push(this);
            }
            for (let child of this.children) {
                results = results.concat(child.findByContentType(contentType));
            }
            return results;
        }

        /**
         * Expand complex content into child nodes
         * @returns {TreeNode[]} Array of new child nodes created from elements
         */
        expandContent() {
            const newNodes = [];
            
            if (!this.hasExpandableContent()) {
                return newNodes;
            }

            for (let element of this.elements) {
                let childNode;
                
                switch (element.type) {
                    case 'cell':
                        childNode = new TreeNode(
                            element.content, 
                            this.level + 1, 
                            'text', 
                            []
                        );
                        break;
                        
                    case 'list-item':
                        childNode = new TreeNode(
                            element.content, 
                            this.level + 1, 
                            'list-item', 
                            []
                        );
                        break;
                        
                    case 'code-block':
                        childNode = new TreeNode(
                            `Code: ${element.language || 'text'}`, 
                            this.level + 1, 
                            'code', 
                            [element]
                        );
                        childNode.content = element.content;
                        childNode.language = element.language;
                        break;
                        
                    case 'image':
                        childNode = new TreeNode(
                            `Image: ${element.alt}`, 
                            this.level + 1, 
                            'image', 
                            [element]
                        );
                        break;
                        
                    case 'link':
                        childNode = new TreeNode(
                            element.text, 
                            this.level + 1, 
                            'link', 
                            [element]
                        );
                        break;
                        
                    case 'formula':
                        childNode = new TreeNode(
                            `Math: ${element.content}`, 
                            this.level + 1, 
                            'math', 
                            [element]
                        );
                        childNode.formula = element.content;
                        break;
                        
                    default:
                        childNode = new TreeNode(
                            element.content || 'Unknown Element', 
                            this.level + 1, 
                            'text', 
                            []
                        );
                }
                
                if (childNode) {
                    this.addChild(childNode);
                    newNodes.push(childNode);
                }
            }
            
            return newNodes;
        }

        /**
         * Get all descendant nodes in depth-first order
         * @returns {TreeNode[]} Array of all descendant nodes
         */
        getAllDescendants() {
            let descendants = [];
            for (let child of this.children) {
                descendants.push(child);
                descendants = descendants.concat(child.getAllDescendants());
            }
            return descendants;
        }

        /**
         * Get the path from root to this node
         * @returns {TreeNode[]} Array representing the path from root
         */
        getPath() {
            let path = [];
            let current = this;
            while (current && current.parent) {
                path.unshift(current);
                current = current.parent;
            }
            return path;
        }

        /**
         * Toggle the collapse state of this node
         */
        toggleCollapse() {
            this.collapsed = !this.collapsed;
        }

        /**
         * Get visible children (respects collapsed state)
         * @returns {TreeNode[]} Array of visible child nodes
         */
        getVisibleChildren() {
            return this.collapsed ? [] : this.children;
        }

        /**
         * Get total node count in subtree including this node
         * @returns {number} Total number of nodes in subtree
         */
        getNodeCount() {
            let count = 1; // Count this node
            for (let child of this.children) {
                count += child.getNodeCount();
            }
            return count;
        }

        /**
         * Serialize node and its subtree to JSON
         * @returns {Object} JSON representation of the node tree
         */
        toJSON() {
            return {
                id: this.id,
                text: this.text,
                detail: this.detail,
                level: this.level,
                type: this.type, // Legacy field
                contentType: this.contentType,
                elements: this.elements,
                collapsed: this.collapsed,
                metadata: this.metadata,
                children: this.children.map(child => child.toJSON())
            };
        }

        /**
         * Create a TreeNode from JSON data
         * @param {Object} json - JSON representation of a node tree
         * @returns {TreeNode} Reconstructed TreeNode instance
         */
        static fromJSON(json) {
            if (!json || typeof json !== 'object') {
                throw new Error('Invalid JSON data for TreeNode deserialization');
            }

            const node = new TreeNode(
                json.text || '', 
                json.level || 0,
                json.contentType || json.type || 'text', // Support both new and legacy
                json.elements || []
            );
            
            node.id = json.id || TreeNode.generateId();
            node.detail = json.detail || '';
            node.type = json.type || json.contentType || 'text'; // Legacy support
            node.collapsed = json.collapsed || false;
            node.metadata = json.metadata || {};
            
            if (json.children && Array.isArray(json.children)) {
                for (let childData of json.children) {
                    const child = TreeNode.fromJSON(childData);
                    node.addChild(child);
                }
            }
            
            return node;
        }
    }

    // Expose TreeNode class to global namespace
    if (typeof window !== 'undefined') {
        window.TreeInteraction = window.TreeInteraction || {};
        window.TreeInteraction.TreeNode = TreeNode;
    } else if (typeof module !== 'undefined' && module.exports) {
        // Node.js environment support
        module.exports = { TreeNode };
    }

})();