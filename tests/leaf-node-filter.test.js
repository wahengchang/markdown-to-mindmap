const fs = require('fs');
const path = require('path');

// Load TreeNode mock first
require('./tree-node-mock');

// Load and execute the parser module
const parserPath = path.join(__dirname, '../public/js/core/parser.js');
const parserCode = fs.readFileSync(parserPath, 'utf8');
global.module = { exports: {} };
global.window = { MarkdownMindmap: {} };
eval(parserCode);
const { parseMarkdownToTree } = module.exports;

// Helper function to visualize tree structure with detail
function visualizeTreeWithDetail(node, indent = 0) {
    const spaces = '  '.repeat(indent);
    let result = `${spaces}├─ "${node.text}" (${node.type})`;
    
    if (node.detail && node.detail.trim()) {
        result += `\n${spaces}   detail: "${node.detail}"`;
    } else {
        result += '\n' + spaces + '   detail: (empty)';
    }
    
    result += '\n';
    
    node.children.forEach(child => {
        result += visualizeTreeWithDetail(child, indent + 1);
    });
    
    return result;
}

// Helper function to count nodes
function countNodes(node) {
    return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
}

describe('Leaf-Node Filtering Logic Tests', () => {
    
    describe('TreeNode Detail Property', () => {
        
        test('TreeNode should have detail property initialized', () => {
            const node = new TreeNode('Test', 1);
            expect(node.text).toBe('Test');
            expect(node.detail).toBe('');
            expect(node.level).toBe(1);
        });

        test('TreeNode toJSON should include detail property', () => {
            const node = new TreeNode('Test', 1);
            node.detail = 'Test detail content';
            
            const json = node.toJSON();
            expect(json.text).toBe('Test');
            expect(json.detail).toBe('Test detail content');
        });

        test('TreeNode fromJSON should restore detail property', () => {
            const json = {
                text: 'Test',
                detail: 'Test detail content',
                level: 1,
                type: 'header',
                children: []
            };
            
            const node = TreeNode.fromJSON(json);
            expect(node.text).toBe('Test');
            expect(node.detail).toBe('Test detail content');
        });
    });

    describe('Target Behavior: Exact Example', () => {
        
        test('Should match exact target behavior from user example', () => {
            const inputMarkdown = `# Chapter 1
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

            console.log('\n📥 INPUT MARKDOWN:');
            console.log(inputMarkdown);

            const filtered = parseMarkdownToTree(inputMarkdown, { filterForMindmap: true });

            console.log('\n📤 FILTERED OUTPUT (with detail):');
            console.log(visualizeTreeWithDetail(filtered));

            // Test structure
            expect(filtered.children).toHaveLength(1);
            
            const chapter1 = filtered.children[0];
            expect(chapter1.text).toBe('Chapter 1');
            expect(chapter1.detail).toBe(''); // Should be empty - has children
            expect(chapter1.children).toHaveLength(2); // Section 1.1, Section 1.2

            const section11 = chapter1.children[0];
            expect(section11.text).toBe('Section 1.1');
            expect(section11.detail).toBe(''); // Should be empty - has children
            expect(section11.children).toHaveLength(2); // Subsection 1.1.1, 1.1.2

            const subsection111 = section11.children[0];
            expect(subsection111.text).toBe('Subsection 1.1.1');
            expect(subsection111.detail).toBe('this is crazy'); // LEAF - has detail
            expect(subsection111.children).toHaveLength(0); // No children

            const subsection112 = section11.children[1];
            expect(subsection112.text).toBe('Subsection 1.1.2');
            expect(subsection112.detail).toBe('this is crazy'); // LEAF - has detail
            expect(subsection112.children).toHaveLength(0); // No children

            const section12 = chapter1.children[1];
            expect(section12.text).toBe('Section 1.2');
            expect(section12.detail).toContain('this is crazy'); // LEAF - has detail
            expect(section12.detail).toContain('- Item 1.2.1'); // Should include list items
            expect(section12.detail).toContain('- Item 1.2.2');
            expect(section12.detail).toContain('- Item 1.2.3');
            expect(section12.children).toHaveLength(0); // No children
        });

        test('Should remove list items and text from Chapter 1 (non-leaf)', () => {
            const inputMarkdown = `# Chapter 1
this is crazy
- Item 1
- Item 2
- Item 3

## Section 1.1
test`;

            const filtered = parseMarkdownToTree(inputMarkdown, { filterForMindmap: true });
            
            const chapter1 = filtered.children[0];
            // Chapter 1 has Section 1.1 as child, so should be clean
            expect(chapter1.text).toBe('Chapter 1');
            expect(chapter1.detail).toBe(''); // Should NOT contain "this is crazy" or list items
            expect(chapter1.children).toHaveLength(1); // Only Section 1.1
        });
    });

    describe('Leaf Detection Logic', () => {
        
        test('Node with only text and lists should be leaf', () => {
            const markdown = `# Header
Text content
- List item 1
- List item 2`;
            
            const filtered = parseMarkdownToTree(markdown, { filterForMindmap: true });
            
            expect(filtered.children).toHaveLength(1);
            const header = filtered.children[0];
            expect(header.text).toBe('Header');
            expect(header.detail).toContain('Text content');
            expect(header.detail).toContain('- List item 1');
            expect(header.detail).toContain('- List item 2');
            expect(header.children).toHaveLength(0); // No structural children
        });

        test('Node with sub-headers should NOT be leaf', () => {
            const markdown = `# Header
Text content
- List item

## Sub Header
More content`;
            
            const filtered = parseMarkdownToTree(markdown, { filterForMindmap: true });
            
            expect(filtered.children).toHaveLength(1);
            const header = filtered.children[0];
            expect(header.text).toBe('Header');
            expect(header.detail).toBe(''); // Should be empty - has sub-header
            expect(header.children).toHaveLength(1); // Has Sub Header
            
            const subHeader = header.children[0];
            expect(subHeader.text).toBe('Sub Header');
            expect(subHeader.detail).toBe('More content'); // Leaf - has detail
            expect(subHeader.children).toHaveLength(0);
        });

        test('Multiple levels of nesting', () => {
            const markdown = `# Level 1
## Level 2
### Level 3
Content here
#### Level 4
Final content`;
            
            const filtered = parseMarkdownToTree(markdown, { filterForMindmap: true });
            
            const level1 = filtered.children[0];
            expect(level1.text).toBe('Level 1');
            expect(level1.detail).toBe(''); // Has children
            
            const level2 = level1.children[0];
            expect(level2.text).toBe('Level 2');
            expect(level2.detail).toBe(''); // Has children
            
            const level3 = level2.children[0];
            expect(level3.text).toBe('Level 3');
            expect(level3.detail).toBe(''); // Has children
            
            const level4 = level3.children[0];
            expect(level4.text).toBe('Level 4');
            expect(level4.detail).toBe('Final content'); // Leaf - has detail
            expect(level4.children).toHaveLength(0);
        });
    });

    describe('Content Aggregation in Leaves', () => {
        
        test('Should aggregate text and lists in leaf nodes', () => {
            const markdown = `# Leaf Header
First text line
Second text line

- First item
- Second item
- Third item

More text content`;
            
            const filtered = parseMarkdownToTree(markdown, { filterForMindmap: true });
            
            const leaf = filtered.children[0];
            expect(leaf.text).toBe('Leaf Header');
            expect(leaf.detail).toContain('First text line');
            expect(leaf.detail).toContain('Second text line');
            expect(leaf.detail).toContain('- First item');
            expect(leaf.detail).toContain('- Second item');
            expect(leaf.detail).toContain('- Third item');
            expect(leaf.detail).toContain('More text content');
        });

        test('Should handle code blocks in leaf nodes', () => {
            const markdown = `# Code Example
Here's some code:

\`\`\`javascript
console.log('hello');
\`\`\`

And some explanation.`;
            
            const filtered = parseMarkdownToTree(markdown, { filterForMindmap: true });
            
            const leaf = filtered.children[0];
            expect(leaf.text).toBe('Code Example');
            expect(leaf.detail).toContain('Here\'s some code:');
            expect(leaf.detail).toContain('```javascript');
            expect(leaf.detail).toContain('console.log(\'hello\');');
            expect(leaf.detail).toContain('```');
            expect(leaf.detail).toContain('And some explanation.');
        });

        test('Should preserve empty detail for non-leaf headers', () => {
            const markdown = `# Parent Header
This text should be ignored

## Child Header
This text should be kept`;
            
            const filtered = parseMarkdownToTree(markdown, { filterForMindmap: true });
            
            const parent = filtered.children[0];
            expect(parent.text).toBe('Parent Header');
            expect(parent.detail).toBe(''); // Empty because it has children
            
            const child = parent.children[0];
            expect(child.text).toBe('Child Header');
            expect(child.detail).toBe('This text should be kept'); // Leaf - has detail
        });
    });

    describe('Edge Cases', () => {
        
        test('Empty markdown should return empty root', () => {
            const filtered = parseMarkdownToTree('', { filterForMindmap: true });
            expect(filtered.text).toBe('Root');
            expect(filtered.children).toHaveLength(0);
        });

        test('Only text content (no headers) should result in empty tree', () => {
            const markdown = `Just some text
More text here
- Some list items`;
            
            const filtered = parseMarkdownToTree(markdown, { filterForMindmap: true });
            expect(filtered.children).toHaveLength(0); // No headers to keep
        });

        test('Single header with no content', () => {
            const markdown = '# Empty Header';
            
            const filtered = parseMarkdownToTree(markdown, { filterForMindmap: true });
            
            expect(filtered.children).toHaveLength(1);
            const header = filtered.children[0];
            expect(header.text).toBe('Empty Header');
            expect(header.detail).toBe(''); // No content to add
            expect(header.children).toHaveLength(0);
        });

        test('Headers with only whitespace content', () => {
            const markdown = `# Header
   
   
   
## Sub Header
   `;
            
            const filtered = parseMarkdownToTree(markdown, { filterForMindmap: true });
            
            const header = filtered.children[0];
            expect(header.text).toBe('Header');
            expect(header.detail).toBe(''); // Has children
            
            const subHeader = header.children[0];
            expect(subHeader.text).toBe('Sub Header');
            expect(subHeader.detail).toBe(''); // Whitespace should be filtered
        });
    });

    describe('Performance and Structure Validation', () => {
        
        test('Should significantly reduce node count', () => {
            const complexMarkdown = `# Main
Text here
- Item 1
- Item 2

## Section A
More text
- List A1
- List A2

### Sub A1
Detail content

### Sub A2  
More details

## Section B
Final text
- List B1`;
            
            const unfiltered = parseMarkdownToTree(complexMarkdown);
            const filtered = parseMarkdownToTree(complexMarkdown, { filterForMindmap: true });
            
            const unfilteredCount = countNodes(unfiltered);
            const filteredCount = countNodes(filtered);
            
            console.log(`\n📊 Node count comparison:`);
            console.log(`   Unfiltered: ${unfilteredCount} nodes`);
            console.log(`   Filtered:   ${filteredCount} nodes`);
            console.log(`   Reduction:  ${Math.round((1 - filteredCount/unfilteredCount) * 100)}%`);
            
            expect(filteredCount).toBeLessThan(unfilteredCount);
            expect(filteredCount).toBeLessThanOrEqual(8); // Should be very clean
        });

        test('Should maintain correct hierarchy levels', () => {
            const markdown = `# Level 1
## Level 2
### Level 3
Content`;
            
            const filtered = parseMarkdownToTree(markdown, { filterForMindmap: true });
            
            const l1 = filtered.children[0];
            expect(l1.level).toBe(1);
            
            const l2 = l1.children[0];
            expect(l2.level).toBe(2);
            
            const l3 = l2.children[0];
            expect(l3.level).toBe(3);
            expect(l3.detail).toBe('Content');
        });
    });
});