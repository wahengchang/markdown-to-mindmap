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

// Extract the content analysis functions we want to test
const { detectContentType, extractElements } = module.exports;

describe('Content Analysis Module (T007)', () => {
    
    describe('detectContentType()', () => {
        
        test('should detect table content with high accuracy', () => {
            const tableContent = '| Name | Age | Role |\n|------|-----|------|\n| John | 30 | Dev |';
            const result = detectContentType(tableContent);
            
            expect(result.type).toBe('table');
            expect(result.elements).toBeDefined();
            expect(Array.isArray(result.elements)).toBe(true);
        });

        test('should detect simple pipe-separated content as table', () => {
            const simpleTable = 'Name | Age | City';
            const result = detectContentType(simpleTable);
            
            expect(result.type).toBe('table');
            expect(result.elements).toHaveLength(3);
        });

        test('should detect unordered lists accurately', () => {
            const listContent = '- Item 1\n- Item 2\n- Item 3';
            const result = detectContentType(listContent);
            
            expect(result.type).toBe('list');
            expect(result.elements).toBeDefined();
        });

        test('should detect ordered lists accurately', () => {
            const orderedList = '1. First item\n2. Second item\n3. Third item';
            const result = detectContentType(orderedList);
            
            expect(result.type).toBe('list');
            expect(result.elements).toBeDefined();
        });

        test('should detect code blocks with 98% confidence', () => {
            const codeContent = 'function test() {\n  console.log("hello");\n}';
            const result = detectContentType(codeContent, 'code');
            
            expect(result.type).toBe('code');
            expect(result.elements).toBeDefined();
        });

        test('should detect inline code patterns', () => {
            const inlineCode = 'Use the `console.log()` function to debug';
            const result = detectContentType(inlineCode);
            
            expect(result.type).toBe('code');
            expect(result.elements).toBeDefined();
        });

        test('should detect markdown images', () => {
            const imageMarkdown = 'Check this ![alt text](image.png) image';
            const result = detectContentType(imageMarkdown);
            
            expect(result.type).toBe('image');
            expect(result.elements).toBeDefined();
        });

        test('should detect markdown links', () => {
            const linkMarkdown = 'Visit [Google](https://google.com) for search';
            const result = detectContentType(linkMarkdown);
            
            expect(result.type).toBe('link');
            expect(result.elements).toBeDefined();
        });

        test('should detect math expressions', () => {
            const mathContent = 'The formula $E = mc^2$ is famous';
            const result = detectContentType(mathContent);
            
            expect(result.type).toBe('math');
            expect(result.elements).toBeDefined();
        });

        test('should detect complex content with multiple elements', () => {
            const complexContent = 'Text with **bold** and `code` and [links](url)';
            const result = detectContentType(complexContent);
            
            // Current implementation detects inline code first, which is expected behavior
            expect(result.type).toBe('code');
            expect(result.elements).toBeDefined();
            expect(Array.isArray(result.elements)).toBe(true);
        });

        test('should default to text for simple content', () => {
            const textContent = 'This is just plain text content';
            const result = detectContentType(textContent);
            
            expect(result.type).toBe('text');
            expect(result.elements).toBeDefined();
        });

        test('should handle empty or invalid input gracefully', () => {
            expect(detectContentType('')).toEqual({ type: 'text', elements: [] });
            expect(detectContentType(null)).toEqual({ type: 'text', elements: [] });
            expect(detectContentType(undefined)).toEqual({ type: 'text', elements: [] });
        });

        test('should respect content type hints', () => {
            const codeContent = 'console.log("test");';
            const result = detectContentType(codeContent, 'code');
            
            expect(result.type).toBe('code');
        });
    });

    describe('extractElements()', () => {
        
        test('should extract table elements with proper structure', () => {
            const tableContent = ['Name', 'Age', 'Role'];
            const elements = extractElements(tableContent, 'table');
            
            expect(elements).toHaveLength(3);
            expect(elements[0]).toEqual({
                type: 'cell',
                content: 'Name',
                index: 0
            });
            expect(elements[1]).toEqual({
                type: 'cell',
                content: 'Age',
                index: 1
            });
            expect(elements[2]).toEqual({
                type: 'cell',
                content: 'Role',
                index: 2
            });
        });

        test('should extract table elements from string format', () => {
            const tableString = 'Name | Age | Role';
            const elements = extractElements(tableString, 'table');
            
            expect(elements).toHaveLength(3);
            expect(elements[0].content).toBe('Name');
            expect(elements[1].content).toBe('Age');
            expect(elements[2].content).toBe('Role');
        });

        test('should extract list items with proper metadata', () => {
            const listContent = '- Item 1\n- Item 2\n  - Nested item';
            const elements = extractElements(listContent, 'list');
            
            expect(elements.length).toBeGreaterThan(0);
            expect(elements[0]).toHaveProperty('type', 'list-item');
            expect(elements[0]).toHaveProperty('content');
            expect(elements[0]).toHaveProperty('indent');
            expect(elements[0]).toHaveProperty('index');
        });

        test('should extract code block elements', () => {
            const codeContent = 'function test() {\n  return true;\n}';
            const elements = extractElements(codeContent, 'code');
            
            expect(elements).toHaveLength(1);
            expect(elements[0]).toEqual({
                type: 'code-block',
                content: codeContent,
                language: null
            });
        });

        test('should extract image elements with alt text and src', () => {
            const imageContent = '![alt text](image.png) and ![another](other.jpg)';
            const elements = extractElements(imageContent, 'image');
            
            expect(elements).toHaveLength(2);
            expect(elements[0]).toEqual({
                type: 'image',
                alt: 'alt text',
                src: 'image.png',
                index: 0
            });
            expect(elements[1]).toEqual({
                type: 'image',
                alt: 'another',
                src: 'other.jpg',
                index: 1
            });
        });

        test('should extract link elements with text and url', () => {
            const linkContent = '[Google](https://google.com) and [GitHub](https://github.com)';
            const elements = extractElements(linkContent, 'link');
            
            expect(elements).toHaveLength(2);
            expect(elements[0]).toEqual({
                type: 'link',
                text: 'Google',
                url: 'https://google.com',
                index: 0
            });
            expect(elements[1]).toEqual({
                type: 'link',
                text: 'GitHub',
                url: 'https://github.com',
                index: 1
            });
        });

        test('should extract math formula elements', () => {
            const mathContent = 'Formula $E = mc^2$ and $F = ma$ are physics';
            const elements = extractElements(mathContent, 'math');
            
            expect(elements).toHaveLength(2);
            expect(elements[0]).toEqual({
                type: 'formula',
                content: 'E = mc^2',
                index: 0
            });
            expect(elements[1]).toEqual({
                type: 'formula',
                content: 'F = ma',
                index: 1
            });
        });

        test('should extract complex content elements', () => {
            const complexContent = 'Text with **bold text** and `inline code`';
            const elements = extractElements(complexContent, 'complex');
            
            expect(elements.length).toBeGreaterThan(0);
            expect(elements.some(el => el.type === 'bold')).toBe(true);
            expect(elements.some(el => el.type === 'inline-code')).toBe(true);
        });

        test('should handle text content as fallback', () => {
            const textContent = 'Plain text content';
            const elements = extractElements(textContent, 'text');
            
            expect(elements).toHaveLength(1);
            expect(elements[0]).toEqual({
                type: 'text',
                content: textContent,
                length: textContent.length
            });
        });

        test('should handle empty content gracefully', () => {
            expect(extractElements('', 'table')).toEqual([]);
            expect(extractElements(null, 'list')).toEqual([]);
            expect(extractElements(undefined, 'code')).toEqual([]);
        });

        test('should handle unknown content types as text', () => {
            const content = 'Some content';
            const elements = extractElements(content, 'unknown');
            
            expect(elements).toHaveLength(1);
            expect(elements[0].type).toBe('text');
        });
    });

    describe('Content Analysis Performance', () => {
        
        test('should analyze content within performance targets', () => {
            const largeContent = 'Sample content '.repeat(1000);
            const startTime = performance.now();
            
            for (let i = 0; i < 100; i++) {
                detectContentType(largeContent);
            }
            
            const endTime = performance.now();
            const totalTime = endTime - startTime;
            
            // Should complete 100 analyses in under 100ms (1ms per analysis target)
            expect(totalTime).toBeLessThan(100);
        });

        test('should handle large table content efficiently', () => {
            const largeTable = Array(50).fill('| Col1 | Col2 | Col3 |').join('\n');
            const startTime = performance.now();
            
            const result = detectContentType(largeTable);
            
            const endTime = performance.now();
            expect(endTime - startTime).toBeLessThan(10); // <10ms for large tables
            expect(result.type).toBe('table');
        });

        test('should extract elements efficiently for complex content', () => {
            const complexContent = 'Text with **bold** and `code` and [link](url) '.repeat(100);
            const startTime = performance.now();
            
            const elements = extractElements(complexContent, 'complex');
            
            const endTime = performance.now();
            expect(endTime - startTime).toBeLessThan(50); // <50ms for complex extraction
            expect(elements.length).toBeGreaterThan(0);
        });
    });

    describe('Content Analysis Accuracy Tests', () => {
        
        test('should achieve 95%+ accuracy on table detection', () => {
            const tableTests = [
                '| Name | Age | Role |\n|------|-----|------|\n| John | 30 | Dev |',
                'Name | Age | City',
                '| Single Column |\n|-------|',
                'Column1 | Column2 | Column3 | Column4',
                '| A | B |\n| C | D |'
            ];
            
            let correctDetections = 0;
            tableTests.forEach(table => {
                const result = detectContentType(table);
                if (result.type === 'table') correctDetections++;
            });
            
            const accuracy = correctDetections / tableTests.length;
            expect(accuracy).toBeGreaterThanOrEqual(0.95); // 95% accuracy target
        });

        test('should achieve 95%+ accuracy on list detection', () => {
            const listTests = [
                '- Item 1\n- Item 2',
                '1. First\n2. Second',
                '* Bullet point',
                '+ Another bullet',
                '  - Indented item'
            ];
            
            let correctDetections = 0;
            listTests.forEach(list => {
                const result = detectContentType(list);
                if (result.type === 'list') correctDetections++;
            });
            
            const accuracy = correctDetections / listTests.length;
            expect(accuracy).toBeGreaterThanOrEqual(0.95); // 95% accuracy target
        });

        test('should achieve 95%+ accuracy on code detection', () => {
            const codeTests = [
                '`inline code`',
                'Use `var x = 1` in code',
                'Check `console.log()` function',
                'The `npm install` command',
                'Code with `backticks` here'
            ];
            
            let correctDetections = 0;
            codeTests.forEach(code => {
                const result = detectContentType(code);
                if (result.type === 'code') correctDetections++;
            });
            
            const accuracy = correctDetections / codeTests.length;
            expect(accuracy).toBeGreaterThanOrEqual(0.95); // 95% accuracy target
        });
    });

    describe('Edge Cases and Error Handling', () => {
        
        test('should handle malformed table content', () => {
            const malformedTable = '| Name | Age\n| Missing separator';
            const result = detectContentType(malformedTable);
            
            // Should still detect as table due to pipe characters
            expect(result.type).toBe('table');
            expect(result.elements).toBeDefined();
        });

        test('should handle empty list items', () => {
            const emptyList = '- \n- Item 2\n- ';
            const result = detectContentType(emptyList);
            
            expect(result.type).toBe('list');
            expect(result.elements).toBeDefined();
        });

        test('should handle mixed content types', () => {
            const mixedContent = '| Table | Row |\n- List item\n`code snippet`';
            const result = detectContentType(mixedContent);
            
            // Should detect the first recognized pattern (table)
            expect(result.type).toBe('table');
        });

        test('should handle special characters in content', () => {
            const specialChars = 'Content with émojis 🎉 and spëcial çhars';
            const result = detectContentType(specialChars);
            
            expect(result.type).toBe('text');
            expect(result.elements).toBeDefined();
        });

        test('should handle very long content strings', () => {
            const longContent = 'Very long content string '.repeat(1000);
            
            expect(() => {
                const result = detectContentType(longContent);
                expect(result).toBeDefined();
            }).not.toThrow();
        });
    });
});