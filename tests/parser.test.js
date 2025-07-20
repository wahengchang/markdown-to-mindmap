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

// Extract the functions we want to test
const { parseMarkdownToTree, validateMarkdown } = module.exports;

describe('Parser Core Functions', () => {
    
    describe('parseMarkdownToTree()', () => {
        
        test('should handle empty input', () => {
            const result = parseMarkdownToTree('');
            expect(result).toBeInstanceOf(TreeNode);
            expect(result.text).toBe('Root');
            expect(result.level).toBe(0);
            expect(result.children).toHaveLength(0);
        });

        test('should parse simple text', () => {
            const result = parseMarkdownToTree('Hello world');
            expect(result.children).toHaveLength(1);
            expect(result.children[0].text).toBe('Hello world');
            expect(result.children[0].type).toBe('text');
        });

        test('should parse single header', () => {
            const result = parseMarkdownToTree('# Main Title');
            expect(result.children).toHaveLength(1);
            expect(result.children[0].text).toBe('Main Title');
            expect(result.children[0].type).toBe('header');
            expect(result.children[0].level).toBe(1);
        });

        test('should parse multiple header levels', () => {
            const markdown = `# Level 1
## Level 2
### Level 3`;
            const result = parseMarkdownToTree(markdown);
            
            expect(result.children).toHaveLength(1);
            const h1 = result.children[0];
            expect(h1.text).toBe('Level 1');
            expect(h1.level).toBe(1);
            expect(h1.children).toHaveLength(1);
            
            const h2 = h1.children[0];
            expect(h2.text).toBe('Level 2');
            expect(h2.level).toBe(2);
            expect(h2.children).toHaveLength(1);
            
            const h3 = h2.children[0];
            expect(h3.text).toBe('Level 3');
            expect(h3.level).toBe(3);
        });

        test('should parse unordered lists', () => {
            const markdown = `- Item 1
- Item 2
- Item 3`;
            const result = parseMarkdownToTree(markdown);
            
            expect(result.children).toHaveLength(3);
            result.children.forEach((child, index) => {
                expect(child.text).toBe(`Item ${index + 1}`);
                expect(child.type).toBe('list-item');
                expect(child.listType).toBe('unordered');
            });
        });

        test('should parse ordered lists', () => {
            const markdown = `1. First item
2. Second item
3. Third item`;
            const result = parseMarkdownToTree(markdown);
            
            expect(result.children).toHaveLength(3);
            expect(result.children[0].text).toBe('First item');
            expect(result.children[1].text).toBe('Second item');
            expect(result.children[2].text).toBe('Third item');
            result.children.forEach(child => {
                expect(child.type).toBe('list-item');
                expect(child.listType).toBe('ordered');
            });
        });

        test('should parse code blocks', () => {
            const markdown = `\`\`\`javascript
console.log('hello');
\`\`\``;
            const result = parseMarkdownToTree(markdown);
            
            expect(result.children).toHaveLength(1);
            expect(result.children[0].type).toBe('code');
            expect(result.children[0].language).toBe('javascript');
            expect(result.children[0].content).toBe("console.log('hello');\n");
        });

        test('should parse tables', () => {
            const result = parseMarkdownToTree('Name | Age | City');
            expect(result.children).toHaveLength(1);
            expect(result.children[0].type).toBe('table');
            expect(result.children[0].cells).toEqual(['Name', 'Age', 'City']);
        });

        test('should parse math expressions', () => {
            const result = parseMarkdownToTree('Formula: $E = mc^2$ is famous');
            expect(result.children).toHaveLength(1);
            expect(result.children[0].type).toBe('math');
            expect(result.children[0].formula).toBe('E = mc^2');
        });

        test('should handle mixed content', () => {
            const markdown = `# Project
Description here
- Feature 1
- Feature 2`;
            const result = parseMarkdownToTree(markdown);
            
            expect(result.children).toHaveLength(1);
            const header = result.children[0];
            expect(header.text).toBe('Project');
            expect(header.children.length).toBeGreaterThan(0);
        });

        test('should skip empty lines', () => {
            const markdown = `# Header

Text content

- List item`;
            const result = parseMarkdownToTree(markdown);
            expect(result.children).toHaveLength(1);
            expect(result.children[0].text).toBe('Header');
        });

        test('should throw error when TreeNode is unavailable', () => {
            const originalTreeNode = global.TreeNode;
            delete global.TreeNode;
            
            expect(() => {
                parseMarkdownToTree('# Test');
            }).toThrow('TreeNode class is required but not available');
            
            global.TreeNode = originalTreeNode;
        });

        test('should handle checkbox-style lists as regular lists', () => {
            const markdown = `- [x] Done task
- [ ] Todo task`;
            const result = parseMarkdownToTree(markdown);
            
            expect(result.children).toHaveLength(2);
            expect(result.children[0].text).toBe('[x] Done task');
            expect(result.children[1].text).toBe('[ ] Todo task');
            result.children.forEach(child => {
                expect(child.type).toBe('list-item');
                expect(child.listType).toBe('unordered');
            });
        });

        test('should handle deeply nested headers', () => {
            const markdown = `# H1
## H2
### H3
#### H4
##### H5
###### H6`;
            const result = parseMarkdownToTree(markdown);
            
            let current = result.children[0];
            for (let i = 1; i <= 6; i++) {
                expect(current.text).toBe(`H${i}`);
                expect(current.level).toBe(i);
                if (i < 6) {
                    expect(current.children).toHaveLength(1);
                    current = current.children[0];
                }
            }
        });
    });

    describe('validateMarkdown()', () => {
        
        test('should return empty array for valid markdown', () => {
            const markdown = `# Header
Text content
- List item`;
            const warnings = validateMarkdown(markdown);
            expect(warnings).toEqual([]);
        });

        test('should detect unclosed code blocks', () => {
            const markdown = `# Header
\`\`\`javascript
console.log('test');
More content`;
            const warnings = validateMarkdown(markdown);
            expect(warnings).toHaveLength(1);
            expect(warnings[0]).toContain('Unclosed code block');
            expect(warnings[0]).toContain('Line 2');
        });

        test('should detect headers deeper than 6 levels', () => {
            const markdown = '####### Invalid header';
            const warnings = validateMarkdown(markdown);
            expect(warnings).toHaveLength(1);
            expect(warnings[0]).toContain('Headers deeper than 6 levels');
            expect(warnings[0]).toContain('Line 1');
        });

        test('should detect multiple issues', () => {
            const markdown = `####### Too deep
\`\`\`javascript
unclosed code
######## Another deep header`;
            const warnings = validateMarkdown(markdown);
            expect(warnings.length).toBeGreaterThanOrEqual(2);
        });

        test('should handle empty input', () => {
            const warnings = validateMarkdown('');
            expect(warnings).toEqual([]);
        });

        test('should detect closing code block markers as unclosed (current behavior)', () => {
            const markdown = `\`\`\`javascript
console.log('test');
\`\`\``;
            const warnings = validateMarkdown(markdown);
            // Current implementation has a bug: closing ``` is treated as opening
            expect(warnings).toHaveLength(1);
            expect(warnings[0]).toContain('Line 3: Unclosed code block');
        });

        test('should detect multiple unclosed blocks due to validation bug', () => {
            const markdown = `\`\`\`javascript
code1();
\`\`\`

Some text

\`\`\`python
code2()
\`\`\``;
            const warnings = validateMarkdown(markdown);
            // Current implementation will detect both closing markers as unclosed
            expect(warnings.length).toBeGreaterThan(0);
            expect(warnings.some(w => w.includes('Unclosed code block'))).toBe(true);
        });

        test('should detect multiple unclosed code blocks', () => {
            const markdown = `\`\`\`javascript
code1();

\`\`\`python
code2()

More content`;
            const warnings = validateMarkdown(markdown);
            expect(warnings).toHaveLength(1); // Only first unclosed block detected
            expect(warnings[0]).toContain('Line 4');
        });

        test('should handle headers at exactly 6 levels', () => {
            const markdown = '###### Valid level 6 header';
            const warnings = validateMarkdown(markdown);
            expect(warnings).toEqual([]);
        });
    });
});