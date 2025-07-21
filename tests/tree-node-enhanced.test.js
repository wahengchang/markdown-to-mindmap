/**
 * Enhanced TreeNode Tests (T002)
 * Tests for contentType, elements properties and content expansion functionality
 */

const { TreeNode } = require('../public/js/tree/tree-node.js');

describe('Enhanced TreeNode (T002)', () => {
    
    describe('Constructor Enhancement', () => {
        test('should create TreeNode with contentType and elements', () => {
            const elements = [
                { type: 'cell', content: 'Name', index: 0 },
                { type: 'cell', content: 'Age', index: 1 }
            ];
            
            const node = new TreeNode('Table Data', 1, 'table', elements);
            
            expect(node.text).toBe('Table Data');
            expect(node.level).toBe(1);
            expect(node.contentType).toBe('table');
            expect(node.elements).toEqual(elements);
            expect(node.type).toBe('text'); // Legacy field defaults to 'text'
        });
        
        test('should work with legacy constructor (backward compatibility)', () => {
            const node = new TreeNode('Simple Text', 2);
            
            expect(node.text).toBe('Simple Text');
            expect(node.level).toBe(2);
            expect(node.contentType).toBe('text');
            expect(node.elements).toEqual([]);
        });
    });
    
    describe('Content Data Management', () => {
        test('setContentData should update contentType and elements', () => {
            const node = new TreeNode('Test Node');
            const elements = [
                { type: 'list-item', content: 'Item 1', index: 0 },
                { type: 'list-item', content: 'Item 2', index: 1 }
            ];
            
            node.setContentData('list', elements);
            
            expect(node.contentType).toBe('list');
            expect(node.elements).toEqual(elements);
            expect(node.type).toBe('list'); // Legacy field should be updated
        });
        
        test('setContentData should handle null elements gracefully', () => {
            const node = new TreeNode('Test Node');
            
            node.setContentData('text', null);
            
            expect(node.contentType).toBe('text');
            expect(node.elements).toEqual([]);
        });
    });
    
    describe('Content Expansion Detection', () => {
        test('hasExpandableContent should return true for table content', () => {
            const elements = [
                { type: 'cell', content: 'Name', index: 0 },
                { type: 'cell', content: 'Age', index: 1 }
            ];
            const node = new TreeNode('Table', 1, 'table', elements);
            
            expect(node.hasExpandableContent()).toBe(true);
        });
        
        test('hasExpandableContent should return true for list content', () => {
            const elements = [
                { type: 'list-item', content: 'Item 1', index: 0 }
            ];
            const node = new TreeNode('List', 1, 'list', elements);
            
            expect(node.hasExpandableContent()).toBe(true);
        });
        
        test('hasExpandableContent should return false for simple text', () => {
            const node = new TreeNode('Simple Text', 1, 'text', []);
            
            expect(node.hasExpandableContent()).toBe(false);
        });
        
        test('hasExpandableContent should return false for empty elements', () => {
            const node = new TreeNode('Empty Table', 1, 'table', []);
            
            expect(node.hasExpandableContent()).toBe(false);
        });
    });
    
    describe('Content Type Search', () => {
        test('findByContentType should find matching nodes', () => {
            const root = new TreeNode('Root', 0, 'text');
            const tableNode = new TreeNode('Table', 1, 'table', []);
            const codeNode = new TreeNode('Code', 1, 'code', []);
            const textNode = new TreeNode('Text', 1, 'text', []);
            
            root.addChild(tableNode);
            root.addChild(codeNode);
            root.addChild(textNode);
            
            const tableNodes = root.findByContentType('table');
            const codeNodes = root.findByContentType('code');
            const textNodes = root.findByContentType('text');
            
            expect(tableNodes).toHaveLength(1);
            expect(tableNodes[0]).toBe(tableNode);
            expect(codeNodes).toHaveLength(1);
            expect(codeNodes[0]).toBe(codeNode);
            expect(textNodes).toHaveLength(2); // root + textNode
        });
        
        test('findByContentType should search recursively', () => {
            const root = new TreeNode('Root', 0, 'text');
            const parent = new TreeNode('Parent', 1, 'header');
            const child = new TreeNode('Child', 2, 'table', []);
            
            root.addChild(parent);
            parent.addChild(child);
            
            const tableNodes = root.findByContentType('table');
            
            expect(tableNodes).toHaveLength(1);
            expect(tableNodes[0]).toBe(child);
        });
    });
    
    describe('Content Expansion', () => {
        test('expandContent should create child nodes from table elements', () => {
            const elements = [
                { type: 'cell', content: 'Name', index: 0 },
                { type: 'cell', content: 'Age', index: 1 },
                { type: 'cell', content: 'City', index: 2 }
            ];
            const tableNode = new TreeNode('Table', 1, 'table', elements);
            
            const newNodes = tableNode.expandContent();
            
            expect(newNodes).toHaveLength(3);
            expect(tableNode.children).toHaveLength(3);
            
            expect(newNodes[0].text).toBe('Name');
            expect(newNodes[0].contentType).toBe('text');
            expect(newNodes[0].level).toBe(2);
            
            expect(newNodes[1].text).toBe('Age');
            expect(newNodes[2].text).toBe('City');
        });
        
        test('expandContent should create child nodes from list elements', () => {
            const elements = [
                { type: 'list-item', content: 'First item', indent: 0, index: 0 },
                { type: 'list-item', content: 'Second item', indent: 0, index: 1 }
            ];
            const listNode = new TreeNode('List', 1, 'list', elements);
            
            const newNodes = listNode.expandContent();
            
            expect(newNodes).toHaveLength(2);
            expect(newNodes[0].text).toBe('First item');
            expect(newNodes[0].contentType).toBe('list-item');
            expect(newNodes[1].text).toBe('Second item');
        });
        
        test('expandContent should handle code blocks', () => {
            const elements = [
                { type: 'code-block', content: 'console.log("hello");', language: 'javascript' }
            ];
            const codeNode = new TreeNode('Code Section', 1, 'code', elements);
            
            const newNodes = codeNode.expandContent();
            
            expect(newNodes).toHaveLength(1);
            expect(newNodes[0].text).toBe('Code: javascript');
            expect(newNodes[0].contentType).toBe('code');
            expect(newNodes[0].content).toBe('console.log("hello");');
            expect(newNodes[0].language).toBe('javascript');
        });
        
        test('expandContent should handle math formulas', () => {
            const elements = [
                { type: 'formula', content: 'E = mc^2', index: 0 }
            ];
            const mathNode = new TreeNode('Physics', 1, 'math', elements);
            
            const newNodes = mathNode.expandContent();
            
            expect(newNodes).toHaveLength(1);
            expect(newNodes[0].text).toBe('Math: E = mc^2');
            expect(newNodes[0].contentType).toBe('math');
            expect(newNodes[0].formula).toBe('E = mc^2');
        });
        
        test('expandContent should return empty array for non-expandable content', () => {
            const textNode = new TreeNode('Simple Text', 1, 'text', []);
            
            const newNodes = textNode.expandContent();
            
            expect(newNodes).toHaveLength(0);
            expect(textNode.children).toHaveLength(0);
        });
    });
    
    describe('JSON Serialization with New Properties', () => {
        test('toJSON should include contentType and elements', () => {
            const elements = [
                { type: 'cell', content: 'Test', index: 0 }
            ];
            const node = new TreeNode('Table Node', 1, 'table', elements);
            
            const json = node.toJSON();
            
            expect(json.contentType).toBe('table');
            expect(json.elements).toEqual(elements);
            expect(json.type).toBe('text'); // Legacy field
        });
        
        test('fromJSON should restore contentType and elements', () => {
            const json = {
                text: 'Restored Node',
                level: 2,
                contentType: 'list',
                elements: [
                    { type: 'list-item', content: 'Item', index: 0 }
                ]
            };
            
            const node = TreeNode.fromJSON(json);
            
            expect(node.text).toBe('Restored Node');
            expect(node.level).toBe(2);
            expect(node.contentType).toBe('list');
            expect(node.elements).toEqual(json.elements);
        });
        
        test('fromJSON should handle legacy JSON without contentType', () => {
            const legacyJson = {
                text: 'Legacy Node',
                level: 1,
                type: 'code'
                // No contentType or elements
            };
            
            const node = TreeNode.fromJSON(legacyJson);
            
            expect(node.text).toBe('Legacy Node');
            expect(node.contentType).toBe('code'); // Should use type as fallback
            expect(node.elements).toEqual([]);
        });
    });
    
    describe('Memory Efficiency Tests', () => {
        test('should handle 500 nodes efficiently', () => {
            const startMemory = process.memoryUsage().heapUsed;
            const nodes = [];
            
            // Create 500 nodes with complex content
            for (let i = 0; i < 500; i++) {
                const elements = [
                    { type: 'cell', content: `Cell ${i}-1`, index: 0 },
                    { type: 'cell', content: `Cell ${i}-2`, index: 1 },
                    { type: 'cell', content: `Cell ${i}-3`, index: 2 }
                ];
                const node = new TreeNode(`Node ${i}`, 1, 'table', elements);
                nodes.push(node);
            }
            
            const endMemory = process.memoryUsage().heapUsed;
            const memoryUsed = endMemory - startMemory;
            
            // Should be well under 50MB (52,428,800 bytes)
            expect(memoryUsed).toBeLessThan(10 * 1024 * 1024); // 10MB limit for 500 nodes
            expect(nodes).toHaveLength(500);
        });
    });
    
    describe('Integration with Existing API', () => {
        test('should maintain compatibility with existing TreeNode methods', () => {
            const elements = [
                { type: 'list-item', content: 'Item 1', index: 0 }
            ];
            const parent = new TreeNode('Parent', 1, 'list', elements);
            const child = new TreeNode('Child', 2, 'text', []);
            
            // Test existing methods still work
            parent.addChild(child);
            expect(parent.children).toHaveLength(1);
            expect(child.parent).toBe(parent);
            
            expect(parent.getNodeCount()).toBe(2);
            expect(parent.getAllDescendants()).toHaveLength(1);
            
            // Test findByType (legacy method) still works
            const textNodes = parent.findByType('text');
            expect(textNodes).toHaveLength(2); // parent (legacy type) + child
            expect(textNodes).toContain(child);
        });
    });
});