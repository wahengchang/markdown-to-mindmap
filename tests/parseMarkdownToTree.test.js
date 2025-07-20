const fs = require('fs');
const path = require('path');
const { mockExamples } = require('./mock-data');

// Load TreeNode mock
require('./tree-node-mock');

// Load and execute the parser module
const parserPath = path.join(__dirname, '../public/js/core/parser.js');
const parserCode = fs.readFileSync(parserPath, 'utf8');
global.module = { exports: {} };
global.window = { MarkdownMindmap: {} };
eval(parserCode);
const { parseMarkdownToTree } = module.exports;

// Helper function to compare tree structures (ignoring dynamic properties like id)
function compareTreeStructure(actual, expected, path = 'root') {
    // Check basic properties
    expect(actual.text).toBe(expected.text);
    expect(actual.level).toBe(expected.level);
    
    // Check type if specified
    if (expected.type) {
        expect(actual.type).toBe(expected.type);
    }
    
    // Check list type if specified
    if (expected.listType) {
        expect(actual.listType).toBe(expected.listType);
    }
    
    // Check code properties if specified
    if (expected.language !== undefined) {
        expect(actual.language).toBe(expected.language);
    }
    if (expected.content !== undefined) {
        expect(actual.content).toBe(expected.content);
    }
    
    // Check table properties if specified
    if (expected.cells) {
        expect(actual.cells).toEqual(expected.cells);
    }
    
    // Check math properties if specified
    if (expected.formula) {
        expect(actual.formula).toBe(expected.formula);
    }
    
    // Check children
    expect(actual.children).toHaveLength(expected.children.length);
    
    expected.children.forEach((expectedChild, index) => {
        const actualChild = actual.children[index];
        compareTreeStructure(actualChild, expectedChild, `${path}.children[${index}]`);
    });
}

// Helper function to visualize tree structure for debugging
function visualizeTree(node, indent = 0) {
    const spaces = '  '.repeat(indent);
    let result = `${spaces}├─ "${node.text}" (level: ${node.level}, type: ${node.type || 'text'})`;
    
    if (node.listType) result += ` [${node.listType}]`;
    if (node.language) result += ` [lang: ${node.language}]`;
    if (node.formula) result += ` [formula: ${node.formula}]`;
    if (node.cells) result += ` [cells: ${node.cells.length}]`;
    
    result += '\n';
    
    node.children.forEach(child => {
        result += visualizeTree(child, indent + 1);
    });
    
    return result;
}

describe('parseMarkdownToTree() - Input/Output Examples', () => {
    
    describe('📝 Basic Text Processing', () => {
        
        test('Simple text → Single text node', () => {
            const { input, expectedTree } = mockExamples.simpleText;
            
            console.log('\n📥 INPUT:');
            console.log(`"${input}"`);
            
            const result = parseMarkdownToTree(input);
            
            console.log('\n📤 OUTPUT TREE:');
            console.log(visualizeTree(result));
            
            compareTreeStructure(result, expectedTree);
        });
    });

    describe('📋 Header Processing', () => {
        
        test('Single header → Header node', () => {
            const { input, expectedTree } = mockExamples.singleHeader;
            
            console.log('\n📥 INPUT:');
            console.log(`"${input}"`);
            
            const result = parseMarkdownToTree(input);
            
            console.log('\n📤 OUTPUT TREE:');
            console.log(visualizeTree(result));
            
            compareTreeStructure(result, expectedTree);
        });

        test('Nested headers → Hierarchical tree', () => {
            const { input, expectedTree } = mockExamples.nestedHeaders;
            
            console.log('\n📥 INPUT:');
            console.log(input);
            
            const result = parseMarkdownToTree(input);
            
            console.log('\n📤 OUTPUT TREE:');
            console.log(visualizeTree(result));
            
            compareTreeStructure(result, expectedTree);
        });
    });

    describe('📄 List Processing', () => {
        
        test('Unordered list → List item nodes', () => {
            const { input, expectedTree } = mockExamples.simpleList;
            
            console.log('\n📥 INPUT:');
            console.log(input);
            
            const result = parseMarkdownToTree(input);
            
            console.log('\n📤 OUTPUT TREE:');
            console.log(visualizeTree(result));
            
            compareTreeStructure(result, expectedTree);
        });

        test('Ordered list → Numbered list items', () => {
            const { input, expectedTree } = mockExamples.orderedList;
            
            console.log('\n📥 INPUT:');
            console.log(input);
            
            const result = parseMarkdownToTree(input);
            
            console.log('\n📤 OUTPUT TREE:');
            console.log(visualizeTree(result));
            
            compareTreeStructure(result, expectedTree);
        });

        test('Checkbox lists → Regular list items (due to parser order)', () => {
            const { input, expectedTree } = mockExamples.checkboxLists;
            
            console.log('\n📥 INPUT:');
            console.log(input);
            
            const result = parseMarkdownToTree(input);
            
            console.log('\n📤 OUTPUT TREE:');
            console.log(visualizeTree(result));
            
            compareTreeStructure(result, expectedTree);
        });
    });

    describe('💻 Code & Special Content', () => {
        
        test('Code block → Code node with language and content', () => {
            const { input, expectedTree } = mockExamples.codeBlock;
            
            console.log('\n📥 INPUT:');
            console.log(input);
            
            const result = parseMarkdownToTree(input);
            
            console.log('\n📤 OUTPUT TREE:');
            console.log(visualizeTree(result));
            
            compareTreeStructure(result, expectedTree);
        });

        test('Table → Table node with cells', () => {
            const { input, expectedTree } = mockExamples.table;
            
            console.log('\n📥 INPUT:');
            console.log(`"${input}"`);
            
            const result = parseMarkdownToTree(input);
            
            console.log('\n📤 OUTPUT TREE:');
            console.log(visualizeTree(result));
            
            compareTreeStructure(result, expectedTree);
        });

        test('Math expression → Math node with formula', () => {
            const { input, expectedTree } = mockExamples.mathExpression;
            
            console.log('\n📥 INPUT:');
            console.log(`"${input}"`);
            
            const result = parseMarkdownToTree(input);
            
            console.log('\n📤 OUTPUT TREE:');
            console.log(visualizeTree(result));
            
            compareTreeStructure(result, expectedTree);
        });
    });

    describe('🔀 Mixed Content', () => {
        
        test('Header with text and list → Nested structure', () => {
            const { input, expectedTree } = mockExamples.mixedContent;
            
            console.log('\n📥 INPUT:');
            console.log(input);
            
            const result = parseMarkdownToTree(input);
            
            console.log('\n📤 OUTPUT TREE:');
            console.log(visualizeTree(result));
            
            compareTreeStructure(result, expectedTree);
        });

        test('Complex documentation structure → Deep nested tree', () => {
            const { input, expectedTree } = mockExamples.complexStructure;
            
            console.log('\n📥 INPUT:');
            console.log(input);
            
            const result = parseMarkdownToTree(input);
            
            console.log('\n📤 OUTPUT TREE:');
            console.log(visualizeTree(result));
            
            compareTreeStructure(result, expectedTree);
        });
    });

    describe('🔍 Key Parser Behaviors', () => {
        
        test('Empty input → Root node only', () => {
            const result = parseMarkdownToTree('');
            
            console.log('\n📥 INPUT: (empty string)');
            console.log('\n📤 OUTPUT TREE:');
            console.log(visualizeTree(result));
            
            expect(result.text).toBe('Root');
            expect(result.level).toBe(0);
            expect(result.children).toHaveLength(0);
        });

        test('Whitespace and empty lines are ignored', () => {
            const input = `# Header

   
Text content

- List item`;
            
            console.log('\n📥 INPUT (with empty lines):');
            console.log(JSON.stringify(input));
            
            const result = parseMarkdownToTree(input);
            
            console.log('\n📤 OUTPUT TREE:');
            console.log(visualizeTree(result));
            
            expect(result.children).toHaveLength(1);
            expect(result.children[0].text).toBe('Header');
            expect(result.children[0].children).toHaveLength(2); // Text + List item
        });
    });
});

// Additional helper test to show raw structure
describe('🔧 Debug Helpers', () => {
    test('Show raw tree structure for complex example', () => {
        const input = `# Main
## Sub
Text here
- Item 1
- Item 2`;
        
        const result = parseMarkdownToTree(input);
        
        console.log('\n📥 INPUT:');
        console.log(input);
        
        console.log('\n📤 RAW STRUCTURE:');
        console.log(JSON.stringify(result, (key, value) => {
            // Filter out parent references and IDs for cleaner output
            if (key === 'parent' || key === 'id' || key === 'x' || key === 'y' || key === 'collapsed' || key === 'metadata') {
                return undefined;
            }
            return value;
        }, 2));
        
        console.log('\n📤 VISUAL TREE:');
        console.log(visualizeTree(result));
    });
});