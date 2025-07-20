// Simple TreeNode mock for testing
class TreeNode {
    constructor(text, level = 0) {
        this.text = text;
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
}

// Make TreeNode available globally
global.TreeNode = TreeNode;

module.exports = { TreeNode };