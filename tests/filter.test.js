const fs = require('fs');
const path = require('path');

// Load TreeNode mock
require('./tree-node-mock');

// Load and execute the parser module
const parserPath = path.join(__dirname, '../public/js/core/parser.js');
const parserCode = fs.readFileSync(parserPath, 'utf8');
global.module = { exports: {} };
global.window = { MarkdownMindmap: {} };
eval(parserCode);
const { parseMarkdownToTree } = module.exports;

// Helper function to visualize tree structure
function visualizeTree(node, indent = 0) {
    const spaces = '  '.repeat(indent);
    let result = `${spaces}├─ "${node.text}" (level: ${node.level}, type: ${node.type || 'text'})`;
    
    if (node.listType) result += ` [${node.listType}]`;
    if (node.language) result += ` [lang: ${node.language}]`;
    
    result += '\n';
    
    node.children.forEach(child => {
        result += visualizeTree(child, indent + 1);
    });
    
    return result;
}

describe('Filter Functionality Tests', () => {
    
    const testMarkdown = `# Chapter 1
this is crazy
- Item 1
- Item 2
- Item 3

## Section 1.1
this is crazy

### Subsection 1.1.1
this is crazy

### Subsection 1.1.2
this is crazy

## Section 1.2
this is crazy
- Item 1.2.1
- Item 1.2.2
- Item 1.2.3`;

    test('Default behavior (no filtering) - shows all nodes', () => {
        const result = parseMarkdownToTree(testMarkdown);
        
        console.log('\n📥 INPUT MARKDOWN:');
        console.log(testMarkdown);
        
        console.log('\n📤 DEFAULT OUTPUT (No Filtering):');
        console.log(visualizeTree(result));
        
        // Count all nodes including text nodes
        function countNodes(node) {
            return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
        }
        
        const totalNodes = countNodes(result);
        console.log(`\n📊 Total nodes: ${totalNodes}`);
        
        // Should include text nodes
        expect(totalNodes).toBeGreaterThan(10); // Lots of text nodes
    });

    test('Filtered behavior - shows only structural nodes', () => {
        const result = parseMarkdownToTree(testMarkdown, { filterForMindmap: true });
        
        console.log('\n📥 INPUT MARKDOWN:');
        console.log(testMarkdown);
        
        console.log('\n📤 FILTERED OUTPUT (Mindmap Mode):');
        console.log(visualizeTree(result));
        
        // Count filtered nodes
        function countNodes(node) {
            return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
        }
        
        const totalNodes = countNodes(result);
        console.log(`\n📊 Total nodes: ${totalNodes}`);
        
        // New leaf-node filtering creates very clean structure
        expect(totalNodes).toBeLessThan(15);
        expect(totalNodes).toBeGreaterThan(4); // Reduced expectation for cleaner structure
        
        // Verify no text nodes exist (except root)
        function hasTextNodes(node) {
            if (node.text !== 'Root' && node.type === 'text') {
                return true;
            }
            return node.children.some(child => hasTextNodes(child));
        }
        
        expect(hasTextNodes(result)).toBe(false);
    });

    test('Compare node counts: unfiltered vs filtered', () => {
        const unfiltered = parseMarkdownToTree(testMarkdown);
        const filtered = parseMarkdownToTree(testMarkdown, { filterForMindmap: true });
        
        function countNodes(node) {
            return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
        }
        
        const unfilteredCount = countNodes(unfiltered);
        const filteredCount = countNodes(filtered);
        
        console.log(`\n📊 Comparison:`);
        console.log(`   Unfiltered: ${unfilteredCount} nodes`);
        console.log(`   Filtered:   ${filteredCount} nodes`);
        console.log(`   Reduction:  ${unfilteredCount - filteredCount} nodes (${Math.round((1 - filteredCount/unfilteredCount) * 100)}%)`);
        
        expect(filteredCount).toBeLessThan(unfilteredCount);
    });

    test('Preserve hierarchy in filtered output', () => {
        const result = parseMarkdownToTree(testMarkdown, { filterForMindmap: true });
        
        // Should have Chapter 1 as main child
        expect(result.children).toHaveLength(1);
        expect(result.children[0].text).toBe('Chapter 1');
        expect(result.children[0].type).toBe('header');
        
        const chapter1 = result.children[0];
        
        // Chapter 1 should only have header sections (new leaf-node behavior)
        // List items are now moved to detail property of leaf nodes
        const sections = chapter1.children.filter(child => child.type === 'header');
        
        expect(sections).toHaveLength(2); // Section 1.1, Section 1.2
        expect(chapter1.children).toHaveLength(2); // Only structural children
        
        console.log('\n📋 Chapter 1 children:');
        chapter1.children.forEach(child => {
            console.log(`   - ${child.text} (${child.type})`);
        });
    });

    test('Custom filter types', () => {
        const markdown = `# Header
Text content
- List item
\`\`\`javascript
code here
\`\`\`
Math: $E = mc^2$
Name | Age | City`;
        
        // Only include headers and code
        const result = parseMarkdownToTree(markdown, { 
            filterForMindmap: true,
            includeTypes: ['header', 'code']
        });
        
        console.log('\n📤 CUSTOM FILTER (headers + code only):');
        console.log(visualizeTree(result));
        
        // Should only have header and code nodes
        function checkTypes(node, allowedTypes = ['header', 'code']) {
            if (node.text === 'Root') return true; // Root is always allowed
            
            if (!allowedTypes.includes(node.type)) {
                return false;
            }
            
            return node.children.every(child => checkTypes(child, allowedTypes));
        }
        
        expect(checkTypes(result)).toBe(true);
    });

    test('Empty input with filtering', () => {
        const result = parseMarkdownToTree('', { filterForMindmap: true });
        
        expect(result.text).toBe('Root');
        expect(result.children).toHaveLength(0);
    });

    test('Only text nodes - should result in empty mindmap', () => {
        const markdown = `Just some text
More text here
Another paragraph`;
        
        const result = parseMarkdownToTree(markdown, { filterForMindmap: true });
        
        console.log('\n📤 TEXT-ONLY INPUT FILTERED:');
        console.log(visualizeTree(result));
        
        expect(result.children).toHaveLength(0);
    });
});

describe('Real-world Example: Target Behavior Match', () => {
    test('Match target image behavior exactly', () => {
        // This is the exact markdown from the images
        const markdown = `# Chapter 1
this is crazy
- Item 1
- Item 2
- Item 3

## Section 1.1
this is crazy

### Subsection 1.1.1
this is crazy

### Subsection 1.1.2
this is crazy

## Section 1.2
this is crazy
- Item 1.2.1
- Item 1.2.2
- Item 1.2.3`;

        const filtered = parseMarkdownToTree(markdown, { filterForMindmap: true });
        
        console.log('\n🎯 TARGET BEHAVIOR OUTPUT:');
        console.log(visualizeTree(filtered));
        
        // Should match target: Chapter 1 → Sections → Subsections and Items
        expect(filtered.children).toHaveLength(1);
        
        const chapter1 = filtered.children[0];
        expect(chapter1.text).toBe('Chapter 1');
        
        // Chapter 1 should only have 2 sections (new leaf-node behavior)
        expect(chapter1.children).toHaveLength(2);
        
        // Verify structure matches new target behavior (clean headers only)
        const childTypes = chapter1.children.map(child => ({ text: child.text, type: child.type }));
        console.log('\n🔍 Chapter 1 structure:');
        childTypes.forEach(child => {
            console.log(`   - "${child.text}" (${child.type})`);
        });
        
        // Should have clean header structure (list items moved to leaf detail)
        expect(childTypes).toEqual([
            { text: 'Section 1.1', type: 'header' },
            { text: 'Section 1.2', type: 'header' }
        ]);
        
        // Verify that Section 1.2 (leaf) has the list items in detail
        const section12 = chapter1.children[1];
        expect(section12.detail).toContain('- Item 1.2.1');
        expect(section12.detail).toContain('- Item 1.2.2'); 
        expect(section12.detail).toContain('- Item 1.2.3');
    });
});