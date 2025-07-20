// Simple TreeNode mock for testing
class TreeNode {
    constructor(text, level = 0) {
        this.text = text;              // Title/heading for display
        this.detail = '';              // Detailed content for leaf nodes
        this.level = level;
        this.children = [];
        this.parent = null;
        this.type = 'text';
        this.id = 'test_' + Math.random().toString(36).substr(2, 9);
    }

    addChild(node) {
        if (!(node instanceof TreeNode)) {
            throw new Error('Child must be a TreeNode instance');
        }
        node.parent = this;
        this.children.push(node);
    }

    toJSON() {
        return {
            id: this.id,
            text: this.text,
            detail: this.detail,
            level: this.level,
            type: this.type,
            children: this.children.map(child => child.toJSON())
        };
    }

    static fromJSON(json) {
        if (!json || typeof json !== 'object') {
            throw new Error('Invalid JSON data for TreeNode deserialization');
        }

        const node = new TreeNode(json.text || '', json.level || 0);
        node.id = json.id || TreeNode.generateId();
        node.detail = json.detail || '';
        node.type = json.type || 'text';
        
        if (json.children && Array.isArray(json.children)) {
            for (let childData of json.children) {
                const child = TreeNode.fromJSON(childData);
                node.addChild(child);
            }
        }
        
        return node;
    }

    static generateId() {
        return 'test_' + Math.random().toString(36).substr(2, 9);
    }
}

// Make TreeNode available globally
global.TreeNode = TreeNode;

module.exports = { TreeNode };