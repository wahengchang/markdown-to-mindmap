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

// Extract the pipeline functions we want to test
const { 
    parseMarkdownToTree,
    enhanceTreeWithContentAnalysis,
    calculateContentComplexity,
    getPipelineStats
} = module.exports;

describe('Pipeline Integration (T011)', () => {
    
    describe('enhanceTreeWithContentAnalysis()', () => {
        
        test('should analyze content types across entire tree', () => {
            const root = new TreeNode('Root', 0);
            const header1 = new TreeNode('Project Overview', 1);
            const header2 = new TreeNode('Code Examples', 1);
            
            // Add nodes with different content types
            const tableNode = new TreeNode('Table: Users | Roles', 2);
            tableNode.detail = '| User | Role | Access |\n|------|------|--------|\n| John | Admin | Full |';
            
            const codeNode = new TreeNode('Code: javascript', 2);
            codeNode.detail = '```javascript\nfunction test() {\n  return true;\n}\n```';
            
            header1.addChild(tableNode);
            header2.addChild(codeNode);
            root.addChild(header1);
            root.addChild(header2);
            
            const enhancedTree = enhanceTreeWithContentAnalysis(root, {
                includePerformanceMetrics: false
            });
            
            // Check that content analysis was applied
            expect(enhancedTree).toBeDefined();
            expect(tableNode.metadata).toBeDefined();
            expect(tableNode.metadata.detailAnalysis).toBeDefined();
            expect(tableNode.metadata.detailAnalysis.contentType).toBe('table');
            expect(tableNode.metadata.detailAnalysis.complexity).toBeGreaterThan(0.5);
            
            expect(codeNode.metadata).toBeDefined();
            expect(codeNode.metadata.detailAnalysis).toBeDefined();
            expect(codeNode.metadata.detailAnalysis.contentType).toBe('code');
        });
        
        test('should respect analysis depth configuration', () => {
            const root = new TreeNode('Root', 0);
            let currentNode = root;
            
            // Create deep tree structure (6 levels)
            for (let i = 1; i <= 6; i++) {
                const newNode = new TreeNode(`Level ${i}`, i);
                newNode.detail = '| Col1 | Col2 |\n|------|------|\n| A | B |';
                currentNode.addChild(newNode);
                currentNode = newNode;
            }
            
            // Surface analysis (depth <= 2)
            const surfaceAnalyzed = enhanceTreeWithContentAnalysis(root, {
                analysisDepth: 'surface'
            });
            
            // Check that only surface nodes have metadata
            const level3Node = root.children[0].children[0].children[0];
            const level1Node = root.children[0];
            
            expect(level1Node.metadata).toBeDefined();
            expect(level3Node.metadata).toBeUndefined();
        });
        
        test('should cache analysis results for performance', () => {
            const root = new TreeNode('Root', 0);
            
            // Create multiple nodes with identical content
            for (let i = 0; i < 5; i++) {
                const node = new TreeNode('Identical Content', 1);
                node.detail = '| Same | Table |\n|------|-------|\n| Data | Here |';
                root.addChild(node);
            }
            
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            enhanceTreeWithContentAnalysis(root, {
                includePerformanceMetrics: true,
                cacheAnalysisResults: true
            });
            
            expect(consoleSpy).toHaveBeenCalledWith(
                'Content Analysis Pipeline Stats:',
                expect.objectContaining({
                    cacheHitRate: expect.stringMatching(/\d+\.\d+%/)
                })
            );
            
            consoleSpy.mockRestore();
        });
        
        test('should handle large trees efficiently', () => {
            const root = new TreeNode('Root', 0);
            
            // Create large tree with 100+ nodes
            for (let i = 0; i < 50; i++) {
                const chapter = new TreeNode(`Chapter ${i}`, 1);
                for (let j = 0; j < 3; j++) {
                    const section = new TreeNode(`Section ${i}.${j}`, 2);
                    section.detail = '| Data | Value |\n|------|-------|\n| Test | 123 |';
                    chapter.addChild(section);
                }
                root.addChild(chapter);
            }
            
            const startTime = performance.now();
            const enhancedTree = enhanceTreeWithContentAnalysis(root);
            const analysisTime = performance.now() - startTime;
            
            expect(analysisTime).toBeLessThan(100); // Should complete in <100ms
            expect(enhancedTree.children.length).toBe(50);
        });
    });
    
    describe('calculateContentComplexity()', () => {
        
        test('should calculate table complexity correctly', () => {
            const analysis = {
                type: 'table',
                elements: [
                    { type: 'cell', content: 'Name' },
                    { type: 'cell', content: 'Age' },
                    { type: 'cell', content: 'Role' }
                ]
            };
            
            const complexity = calculateContentComplexity(analysis);
            expect(complexity).toBeGreaterThan(0.7);
            expect(complexity).toBeLessThanOrEqual(1);
        });
        
        test('should calculate code complexity correctly', () => {
            const analysis = {
                type: 'code',
                elements: [
                    { type: 'code-block', content: 'function test() { return true; }' }
                ]
            };
            
            const complexity = calculateContentComplexity(analysis);
            expect(complexity).toBeGreaterThan(0.5);
            expect(complexity).toBeLessThanOrEqual(1);
        });
        
        test('should handle mixed content complexity', () => {
            const analysis = {
                type: 'complex',
                elements: [
                    { type: 'bold', content: 'Important' },
                    { type: 'inline-code', content: 'function()' },
                    { type: 'link', content: 'Documentation' }
                ]
            };
            
            const complexity = calculateContentComplexity(analysis);
            expect(complexity).toBeGreaterThan(0.3);
            expect(complexity).toBeLessThan(0.8);
        });
        
        test('should handle empty analysis gracefully', () => {
            expect(calculateContentComplexity(null)).toBe(0);
            expect(calculateContentComplexity({})).toBe(0);
            expect(calculateContentComplexity({ elements: [] })).toBe(0);
        });
    });
    
    describe('getPipelineStats()', () => {
        
        test('should generate comprehensive statistics', () => {
            const root = new TreeNode('Root', 0);
            const header = new TreeNode('Section', 1);
            header.contentType = 'table';
            header.elements = [{ type: 'cell' }, { type: 'cell' }];
            
            const leaf = new TreeNode('Details', 2);
            leaf.metadata = {
                detailAnalysis: {
                    contentType: 'code',
                    complexity: 0.8
                }
            };
            
            header.addChild(leaf);
            root.addChild(header);
            
            const stats = getPipelineStats(root);
            
            expect(stats.totalNodes).toBe(3);
            expect(stats.contentAnalysis.typesDetected.table).toBe(1);
            expect(stats.contentAnalysis.complexNodes).toBe(1);
            expect(stats.contentAnalysis.elementsExtracted).toBe(2);
            expect(stats.structure.maxDepth).toBe(2);
            expect(stats.structure.leafNodes).toBe(1);
        });
        
        test('should handle empty tree', () => {
            const root = new TreeNode('Root', 0);
            const stats = getPipelineStats(root);
            
            expect(stats.totalNodes).toBe(1);
            expect(stats.structure.leafNodes).toBe(1);
            expect(stats.structure.maxDepth).toBe(0);
        });
    });
    
    describe('Full Pipeline Integration', () => {
        
        test('should integrate filtering, expansion, and content analysis', () => {
            const markdown = `
# Project Documentation

This project contains several important components:

## Database Schema
The database consists of multiple tables:

| Table | Columns | Purpose |
|-------|---------|---------|
| users | id, name, email | User management |
| posts | id, title, content | Content storage |
| tags  | id, name | Content tagging |

## Code Examples
Here are key implementation examples:

\`\`\`javascript
function connectDB() {
    return mongoose.connect(process.env.DB_URL);
}

function createUser(userData) {
    return User.create(userData);
}
\`\`\`

## Implementation Tasks
Development tasks include:
- Set up database connections
- Implement user authentication
- Create content management API
- Add search functionality
`;
            
            const tree = parseMarkdownToTree(markdown, {
                filterForMindmap: true,
                expandComplexContent: true,
                enableContentAnalysis: true,
                includeAnalysisMetrics: true
            });
            
            expect(tree).toBeDefined();
            expect(tree.children.length).toBeGreaterThan(0);
            
            // Should have filtered structure
            expect(tree.children[0].text).toBe('Project Documentation');
            
            // Should have expanded complex content
            const dbSchemaNode = tree.children[0].children.find(child => 
                child.text === 'Database Schema');
            expect(dbSchemaNode).toBeDefined();
            
            // Should have content analysis metadata
            if (dbSchemaNode.metadata) {
                expect(dbSchemaNode.metadata.detailAnalysis).toBeDefined();
            }
        });
        
        test('should maintain performance with all pipeline features enabled', () => {
            const largeMarkdown = `
# Large Document

${Array.from({length: 20}, (_, i) => `
## Section ${i + 1}
Content for section ${i + 1} with complex elements:

| Item | Value | Status |
|------|-------|--------|
| A${i} | ${i * 10} | Active |
| B${i} | ${i * 20} | Pending |

\`\`\`javascript
function process${i}() {
    return data.filter(item => item.value > ${i * 5});
}
\`\`\`

- Task ${i}.1: Complete implementation
- Task ${i}.2: Write tests
- Task ${i}.3: Document API
`).join('')}
`;
            
            const startTime = performance.now();
            const tree = parseMarkdownToTree(largeMarkdown, {
                filterForMindmap: true,
                expandComplexContent: true,
                enableContentAnalysis: true,
                maxExpansionDepth: 2,
                analysisDepth: 'moderate'
            });
            const processingTime = performance.now() - startTime;
            
            expect(processingTime).toBeLessThan(200); // <200ms for large document
            expect(tree.children.length).toBeGreaterThan(0);
        });
        
        test('should handle malformed content gracefully', () => {
            const malformedMarkdown = `
# Malformed Document

| Incomplete table
| Missing separators

\`\`\`
Unclosed code block

- Broken list
  - Missing structure
    Random text without formatting
`;
            
            expect(() => {
                const tree = parseMarkdownToTree(malformedMarkdown, {
                    filterForMindmap: true,
                    expandComplexContent: true,
                    enableContentAnalysis: true
                });
                expect(tree).toBeDefined();
            }).not.toThrow();
        });
        
        test('should provide meaningful error handling', () => {
            // Test with null/undefined input
            expect(() => {
                parseMarkdownToTree(null);
            }).toThrow();
            
            expect(() => {
                parseMarkdownToTree(undefined);
            }).toThrow();
            
            // Test with empty string should work
            expect(() => {
                const tree = parseMarkdownToTree('');
                expect(tree.children.length).toBe(0);
            }).not.toThrow();
        });
    });
    
    describe('Performance and Monitoring', () => {
        
        test('should log performance metrics when requested', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            const markdown = `
# Test Document
| Name | Value |
|------|-------|
| Test | 123   |
`;
            
            parseMarkdownToTree(markdown, {
                enableContentAnalysis: true,
                includeAnalysisMetrics: true
            });
            
            expect(consoleSpy).toHaveBeenCalledWith(
                'Content Analysis Pipeline Stats:',
                expect.objectContaining({
                    nodesAnalyzed: expect.any(Number),
                    analysisTime: expect.stringMatching(/\d+\.\d+ms/),
                    avgTimePerNode: expect.stringMatching(/\d+\.\d+ms/)
                })
            );
            
            consoleSpy.mockRestore();
        });
        
        test('should maintain compatibility with existing API', () => {
            const markdown = '# Simple Header\nSome content here.';
            
            // Old API should still work
            const basicTree = parseMarkdownToTree(markdown);
            expect(basicTree).toBeDefined();
            expect(basicTree.children[0].text).toBe('Simple Header');
            
            // New options should be optional
            const enhancedTree = parseMarkdownToTree(markdown, {
                filterForMindmap: false,
                expandComplexContent: false,
                enableContentAnalysis: false
            });
            expect(enhancedTree).toBeDefined();
            expect(enhancedTree.children[0].text).toBe('Simple Header');
        });
    });
});