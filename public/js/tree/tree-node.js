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
         * Create a new TreeNode
         * @param {string} text - The text content of the node
         * @param {number} level - The depth level in the tree (default: 0)
         */
        constructor(text, level = 0) {
            this.text = text;              // Title/heading for display
            this.detail = '';              // Detailed content for leaf nodes
            this.level = level;
            this.children = [];
            this.parent = null;
            
            // Spatial coordinates for layout
            this.x = 0;
            this.y = 0;
            
            // Node properties
            this.type = 'text'; // Default type: text, code, list, etc.
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
                type: this.type,
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

            const node = new TreeNode(json.text || '', json.level || 0);
            node.id = json.id || TreeNode.generateId();
            node.detail = json.detail || '';
            node.type = json.type || 'text';
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