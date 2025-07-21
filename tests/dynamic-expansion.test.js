const fs = require('fs');
const path = require('path');

// Load TreeNode mock first
require('./tree-node-mock');

// Load and execute the parser module
const parserPath = path.join(__dirname, '../public/js/core/parser.js');
const parserCode = fs.readFileSync(parserPath, 'utf8');

// Set up global module for the parser IIFE
global.module = { exports: {} };
global.window = { MarkdownMindmap: {} };

// Execute parser code
eval(parserCode);

// Extract the dynamic expansion functions we want to test
const { 
    analyzeLeafForExpansion, 
    extractContentForExpansion, 
    expandComplexContent,
    parseMarkdownToTree 
} = module.exports;

describe('Dynamic Node Expansion (T008)', () => {
    
    describe('analyzeLeafForExpansion()', () => {
        
        test('should detect table content as expandable', () => {
            const leafNode = new TreeNode('Table Header', 1);
            leafNode.detail = '| Name | Age | Role |\n|------|-----|------|\n| John | 30 | Dev |';
            
            const analysis = analyzeLeafForExpansion(leafNode);
            
            expect(analysis.shouldExpand).toBe(true);
            expect(analysis.contentType).toBe('table');
            expect(analysis.complexity).toBeGreaterThan(0.3);
            expect(analysis.reason).toBe('complex_content');
        });

        test('should detect code block content as expandable', () => {
            const leafNode = new TreeNode('Code Section', 1);
            leafNode.detail = '```javascript\nfunction test() {\n  return true;\n}\n```';
            
            const analysis = analyzeLeafForExpansion(leafNode);
            
            expect(analysis.shouldExpand).toBe(true);
            expect(analysis.contentType).toBe('code');
            expect(analysis.complexity).toBeGreaterThan(0.3);
        });

        test('should detect list content as expandable', () => {
            const leafNode = new TreeNode('Task List', 1);
            leafNode.detail = '- Task 1: Complete project\n- Task 2: Write tests\n- Task 3: Deploy application';
            
            const analysis = analyzeLeafForExpansion(leafNode);
            
            expect(analysis.shouldExpand).toBe(true);
            expect(analysis.contentType).toBe('list');
            expect(analysis.complexity).toBeGreaterThan(0.3);
        });

        test('should not expand simple text content', () => {
            const leafNode = new TreeNode('Simple Header', 1);
            leafNode.detail = 'This is just plain text content without any complex elements.';
            
            const analysis = analyzeLeafForExpansion(leafNode);
            
            expect(analysis.shouldExpand).toBe(false);
            expect(analysis.contentType).toBe('text');
            expect(analysis.complexity).toBeLessThanOrEqual(0.3);
            expect(analysis.reason).toBe('simple_content');
        });

        test('should handle empty detail gracefully', () => {
            const leafNode = new TreeNode('Empty Header', 1);
            leafNode.detail = '';
            
            const analysis = analyzeLeafForExpansion(leafNode);
            
            expect(analysis.shouldExpand).toBe(false);
            expect(analysis.reason).toBe('no_content');
        });

        test('should handle null detail gracefully', () => {
            const leafNode = new TreeNode('Null Header', 1);
            leafNode.detail = null;
            
            const analysis = analyzeLeafForExpansion(leafNode);
            
            expect(analysis.shouldExpand).toBe(false);
            expect(analysis.reason).toBe('no_content');
        });
    });

    describe('extractContentForExpansion()', () => {
        
        test('should extract table elements correctly', () => {
            const detail = '| Name | Age | Role |\n|------|-----|------|\n| John | 30 | Dev |\n| Jane | 25 | Designer |';
            
            const elements = extractContentForExpansion(detail);
            
            expect(elements).toHaveLength(1);
            expect(elements[0].type).toBe('table');
            expect(elements[0].data.headers).toEqual(['Name', 'Age', 'Role']);
            expect(elements[0].data.rows).toHaveLength(2);
            expect(elements[0].nodeText).toBe('Table: Name | Age');
            expect(elements[0].priority).toBe(1);
        });

        test('should extract code block elements correctly', () => {
            const detail = 'Here is some code:\n```javascript\nfunction test() {\n  return true;\n}\n```\nEnd of code.';
            
            const elements = extractContentForExpansion(detail);
            
            expect(elements).toHaveLength(1);
            expect(elements[0].type).toBe('code');
            expect(elements[0].data.language).toBe('javascript');
            expect(elements[0].data.content).toContain('function test()');
            expect(elements[0].nodeText).toBe('Code: javascript');
            expect(elements[0].priority).toBe(2);
        });

        test('should extract list elements correctly', () => {
            const detail = 'Task list:\n- Task 1: Complete project\n- Task 2: Write tests\n- Task 3: Deploy application';
            
            const elements = extractContentForExpansion(detail);
            
            expect(elements).toHaveLength(1);
            expect(elements[0].type).toBe('list');
            expect(elements[0].data.items).toHaveLength(3);
            expect(elements[0].data.ordered).toBe(false);
            expect(elements[0].nodeText).toBe('List (3 items)');
            expect(elements[0].priority).toBe(3);
        });

        test('should extract multiple content types in priority order', () => {
            const detail = `
# Mixed Content
- Item 1
- Item 2

\`\`\`python
print("hello")
\`\`\`

| Col1 | Col2 |
|------|------|
| A    | B    |
`;
            
            const elements = extractContentForExpansion(detail);
            
            expect(elements.length).toBeGreaterThan(1);
            // Should be sorted by priority: table (1), code (2), list (3)
            expect(elements[0].type).toBe('table');
            expect(elements[1].type).toBe('code');
        });

        test('should handle empty content gracefully', () => {
            const elements = extractContentForExpansion('');
            expect(elements).toEqual([]);
        });

        test('should handle content with only single list item', () => {
            const detail = '- Single item';
            const elements = extractContentForExpansion(detail);
            // Single item shouldn't create a list expansion
            expect(elements).toEqual([]);
        });
    });

    describe('expandComplexContent()', () => {
        
        test('should expand leaf nodes with table content', () => {
            // Create a tree with filtered structure (like from filterTreeForMindmap)
            const root = new TreeNode('Root', 0);
            const header = new TreeNode('Data Section', 1);
            header.detail = '| Name | Age | Role |\n|------|-----|------|\n| John | 30 | Dev |';
            root.addChild(header);
            
            const expandedTree = expandComplexContent(root);
            
            expect(expandedTree.children[0].children).toHaveLength(1);
            expect(expandedTree.children[0].children[0].type).toBe('table');
            expect(expandedTree.children[0].children[0].text).toBe('Table: Name | Age');
            expect(expandedTree.children[0].detail).toBe(''); // Should be cleared after expansion
        });

        test('should expand leaf nodes with code content', () => {
            const root = new TreeNode('Root', 0);
            const header = new TreeNode('Code Section', 1);
            header.detail = '```javascript\nfunction test() {\n  return true;\n}\n```';
            root.addChild(header);
            
            const expandedTree = expandComplexContent(root);
            
            expect(expandedTree.children[0].children).toHaveLength(1);
            expect(expandedTree.children[0].children[0].type).toBe('code');
            expect(expandedTree.children[0].children[0].language).toBe('javascript');
            expect(expandedTree.children[0].children[0].content).toContain('function test()');
        });

        test('should expand leaf nodes with list content', () => {
            const root = new TreeNode('Root', 0);
            const header = new TreeNode('Task Section', 1);
            header.detail = '- Task 1: Complete project\n- Task 2: Write tests\n- Task 3: Deploy';
            root.addChild(header);
            
            const expandedTree = expandComplexContent(root);
            
            expect(expandedTree.children[0].children).toHaveLength(1);
            expect(expandedTree.children[0].children[0].type).toBe('list');
            expect(expandedTree.children[0].children[0].listType).toBe('unordered');
            expect(expandedTree.children[0].children[0].items).toHaveLength(3);
        });

        test('should not expand simple text content', () => {
            const root = new TreeNode('Root', 0);
            const header = new TreeNode('Simple Section', 1);
            header.detail = 'This is just plain text content.';
            root.addChild(header);
            
            const expandedTree = expandComplexContent(root);
            
            expect(expandedTree.children[0].children).toHaveLength(0);
            expect(expandedTree.children[0].detail).toBe('This is just plain text content.');
        });

        test('should respect maxExpansionDepth option', () => {
            const root = new TreeNode('Root', 0);
            for (let i = 0; i < 5; i++) {
                const header = new TreeNode(`Level ${i}`, i + 1);
                header.detail = '| Col1 | Col2 |\n|------|------|\n| A | B |';
                if (i === 0) {
                    root.addChild(header);
                } else {
                    root.children[0].addChild(header);
                }
            }
            
            const expandedTree = expandComplexContent(root, { maxExpansionDepth: 2 });
            
            // Should only expand nodes at depth < 2
            expect(expandedTree.children[0].children[0].children).toHaveLength(0);
        });

        test('should respect enabledTypes option', () => {
            const root = new TreeNode('Root', 0);
            const tableHeader = new TreeNode('Table Section', 1);
            tableHeader.detail = '| Col1 | Col2 |\n|------|------|\n| A | B |';
            const codeHeader = new TreeNode('Code Section', 1);
            codeHeader.detail = '```js\nconsole.log("test");\n```';
            
            root.addChild(tableHeader);
            root.addChild(codeHeader);
            
            const expandedTree = expandComplexContent(root, { 
                enabledTypes: ['table'] // Only expand tables
            });
            
            expect(expandedTree.children[0].children).toHaveLength(1); // Table expanded
            expect(expandedTree.children[1].children).toHaveLength(0); // Code not expanded
        });

        test('should handle nested expansion correctly', () => {
            const root = new TreeNode('Root', 0);
            const chapter = new TreeNode('Chapter 1', 1);
            const section = new TreeNode('Section 1.1', 2);
            section.detail = '| Name | Value |\n|------|-------|\n| Test | 123 |';
            
            chapter.addChild(section);
            root.addChild(chapter);
            
            const expandedTree = expandComplexContent(root);
            
            expect(expandedTree.children[0].children[0].children).toHaveLength(1);
            expect(expandedTree.children[0].children[0].children[0].type).toBe('table');
        });
    });

    describe('Integration with parseMarkdownToTree()', () => {
        
        test('should integrate expansion with filtering workflow', () => {
            const markdown = `
# Project Overview
This project has several components:
- Component A: Frontend
- Component B: Backend  
- Component C: Database

## Database Schema
| Table | Columns | Purpose |
|-------|---------|---------|
| users | id, name, email | User management |
| posts | id, title, content | Content storage |

## Code Examples
\`\`\`javascript
function connectDB() {
  return mongoose.connect(url);
}
\`\`\`
`;
            
            const tree = parseMarkdownToTree(markdown, {
                filterForMindmap: true,
                expandComplexContent: true,
                enableExpansionLogging: false
            });
            
            // Should have filtered structure with expanded content
            expect(tree.children[0].text).toBe('Project Overview');
            expect(tree.children[0].children.length).toBe(2);
            
            // Find Database Schema and Code Examples nodes
            const dbNode = tree.children[0].children.find(child => 
                child.text === 'Database Schema');
            const codeNode = tree.children[0].children.find(child => 
                child.text === 'Code Examples');
            
            expect(dbNode).toBeDefined();
            expect(codeNode).toBeDefined();
            
            // Database Schema node has aggregated table content that should be expandable
            // The detail contains the table content from filtering
            expect(dbNode.detail).toContain('Table:'); // Should have table content from filtering
            
            // Code Examples should have expanded code block
            expect(codeNode.children).toHaveLength(1);
            expect(codeNode.children[0].type).toBe('code');
            expect(codeNode.children[0].language).toBe('javascript');
        });

        test('should work with expansion only (no filtering)', () => {
            const markdown = `
# Header
Content here.

| Name | Age |
|------|-----|
| John | 30  |
`;
            
            const tree = parseMarkdownToTree(markdown, {
                expandComplexContent: true
            });
            
            // Should have all original structure plus expansions
            expect(tree.children[0].text).toBe('Header');
            expect(tree.children[0].children.length).toBeGreaterThan(0);
        });

        test('should handle performance logging option', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            const markdown = `
# Test
| A | B |
|---|---|
| 1 | 2 |
`;
            
            parseMarkdownToTree(markdown, {
                filterForMindmap: true,
                expandComplexContent: true,
                enableExpansionLogging: true
            });
            
            expect(consoleSpy).toHaveBeenCalledWith(
                'Dynamic Expansion Stats:',
                expect.objectContaining({
                    nodesProcessed: expect.any(Number),
                    nodesExpanded: expect.any(Number),
                    elementsCreated: expect.any(Number),
                    expansionRate: expect.any(String)
                })
            );
            
            consoleSpy.mockRestore();
        });
    });

    describe('Performance and Edge Cases', () => {
        
        test('should handle large content efficiently', () => {
            const root = new TreeNode('Root', 0);
            const header = new TreeNode('Large Section', 1);
            
            // Create large table content
            let tableContent = '| Col1 | Col2 | Col3 |\n|------|------|------|\n';
            for (let i = 0; i < 100; i++) {
                tableContent += `| Row${i} | Data${i} | Value${i} |\n`;
            }
            header.detail = tableContent;
            root.addChild(header);
            
            const startTime = performance.now();
            const expandedTree = expandComplexContent(root);
            const processingTime = performance.now() - startTime;
            
            expect(processingTime).toBeLessThan(50); // Should process in <50ms
            expect(expandedTree.children[0].children).toHaveLength(1);
        });

        test('should handle malformed content gracefully', () => {
            const root = new TreeNode('Root', 0);
            const header = new TreeNode('Malformed Section', 1);
            header.detail = '| Incomplete table\n| Missing separator\n```\nUnclosed code block\n- Broken list';
            root.addChild(header);
            
            expect(() => {
                const expandedTree = expandComplexContent(root);
                expect(expandedTree).toBeDefined();
            }).not.toThrow();
        });

        test('should handle mixed content types correctly', () => {
            const root = new TreeNode('Root', 0);
            const header = new TreeNode('Mixed Section', 1);
            header.detail = `
Table data:
| Name | Age |
|------|-----|
| John | 30  |

Code sample:
\`\`\`python
print("hello")
\`\`\`

Task list:
- Task 1
- Task 2
- Task 3
`;
            root.addChild(header);
            
            const expandedTree = expandComplexContent(root);
            
            // Should create multiple child nodes for different content types
            expect(expandedTree.children[0].children.length).toBeGreaterThan(1);
            expect(expandedTree.children[0].children.some(child => child.type === 'table')).toBe(true);
            expect(expandedTree.children[0].children.some(child => child.type === 'code')).toBe(true);
            expect(expandedTree.children[0].children.some(child => child.type === 'list')).toBe(true);
        });

        test('should respect complexity threshold option', () => {
            const root = new TreeNode('Root', 0);
            const header = new TreeNode('Table Section', 1);
            header.detail = '| Name | Age |\n|------|-----|\n| John | 30 |'; // Table has complexity 0.8
            root.addChild(header);
            
            // With high threshold (0.9), should not expand table (0.8 complexity)
            const notExpanded = expandComplexContent(root, { 
                minComplexityThreshold: 0.9 
            });
            expect(notExpanded.children[0].children).toHaveLength(0);
            
            // With low threshold (0.5), should expand table (0.8 complexity)
            const expanded = expandComplexContent(root, { 
                minComplexityThreshold: 0.5 
            });
            expect(expanded.children[0].children.length).toBeGreaterThan(0);
        });
    });
});