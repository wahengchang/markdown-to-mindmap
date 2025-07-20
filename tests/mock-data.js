// Mock data for parseMarkdownToTree() - Input/Output examples

const mockExamples = {
    
    // Example 1: Simple text
    simpleText: {
        input: 'Hello world',
        expectedTree: {
            text: 'Root',
            level: 0,
            children: [
                {
                    text: 'Hello world',
                    level: 1,
                    type: 'text',
                    children: []
                }
            ]
        }
    },

    // Example 2: Single header
    singleHeader: {
        input: '# Main Title',
        expectedTree: {
            text: 'Root',
            level: 0,
            children: [
                {
                    text: 'Main Title',
                    level: 1,
                    type: 'header',
                    children: []
                }
            ]
        }
    },

    // Example 3: Nested headers
    nestedHeaders: {
        input: `# Chapter 1
## Section 1.1
### Subsection 1.1.1
## Section 1.2`,
        expectedTree: {
            text: 'Root',
            level: 0,
            children: [
                {
                    text: 'Chapter 1',
                    level: 1,
                    type: 'header',
                    children: [
                        {
                            text: 'Section 1.1',
                            level: 2,
                            type: 'header',
                            children: [
                                {
                                    text: 'Subsection 1.1.1',
                                    level: 3,
                                    type: 'header',
                                    children: []
                                }
                            ]
                        },
                        {
                            text: 'Section 1.2',
                            level: 2,
                            type: 'header',
                            children: []
                        }
                    ]
                }
            ]
        }
    },

    // Example 4: Simple list
    simpleList: {
        input: `- Item 1
- Item 2
- Item 3`,
        expectedTree: {
            text: 'Root',
            level: 0,
            children: [
                {
                    text: 'Item 1',
                    level: 1,
                    type: 'list-item',
                    listType: 'unordered',
                    children: []
                },
                {
                    text: 'Item 2',
                    level: 1,
                    type: 'list-item',
                    listType: 'unordered',
                    children: []
                },
                {
                    text: 'Item 3',
                    level: 1,
                    type: 'list-item',
                    listType: 'unordered',
                    children: []
                }
            ]
        }
    },

    // Example 5: Ordered list
    orderedList: {
        input: `1. First step
2. Second step
3. Third step`,
        expectedTree: {
            text: 'Root',
            level: 0,
            children: [
                {
                    text: 'First step',
                    level: 1,
                    type: 'list-item',
                    listType: 'ordered',
                    children: []
                },
                {
                    text: 'Second step',
                    level: 1,
                    type: 'list-item',
                    listType: 'ordered',
                    children: []
                },
                {
                    text: 'Third step',
                    level: 1,
                    type: 'list-item',
                    listType: 'ordered',
                    children: []
                }
            ]
        }
    },

    // Example 6: Code block
    codeBlock: {
        input: `\`\`\`javascript
console.log('Hello World');
function test() { return true; }
\`\`\``,
        expectedTree: {
            text: 'Root',
            level: 0,
            children: [
                {
                    text: 'Code: javascript',
                    level: 1,
                    type: 'code',
                    language: 'javascript',
                    content: "console.log('Hello World');\nfunction test() { return true; }\n",
                    children: []
                }
            ]
        }
    },

    // Example 7: Table
    table: {
        input: 'Name | Age | City',
        expectedTree: {
            text: 'Root',
            level: 0,
            children: [
                {
                    text: 'Table: Name | Age',
                    level: 1,
                    type: 'table',
                    cells: ['Name', 'Age', 'City'],
                    children: []
                }
            ]
        }
    },

    // Example 8: Math expression
    mathExpression: {
        input: 'The formula $E = mc^2$ is famous',
        expectedTree: {
            text: 'Root',
            level: 0,
            children: [
                {
                    text: 'Math: E = mc^2',
                    level: 1,
                    type: 'math',
                    formula: 'E = mc^2',
                    children: []
                }
            ]
        }
    },

    // Example 9: Mixed content with header and list
    mixedContent: {
        input: `# Project Features
This project includes several features:
- Feature A
- Feature B
- Feature C`,
        expectedTree: {
            text: 'Root',
            level: 0,
            children: [
                {
                    text: 'Project Features',
                    level: 1,
                    type: 'header',
                    children: [
                        {
                            text: 'This project includes several features:',
                            level: 2,
                            type: 'text',
                            children: []
                        },
                        {
                            text: 'Feature A',
                            level: 2,
                            type: 'list-item',
                            listType: 'unordered',
                            children: []
                        },
                        {
                            text: 'Feature B',
                            level: 2,
                            type: 'list-item',
                            listType: 'unordered',
                            children: []
                        },
                        {
                            text: 'Feature C',
                            level: 2,
                            type: 'list-item',
                            listType: 'unordered',
                            children: []
                        }
                    ]
                }
            ]
        }
    },

    // Example 10: Checkbox-style lists (parsed as regular lists)
    checkboxLists: {
        input: `- [x] Completed task
- [ ] Pending task
- [X] Another completed task`,
        expectedTree: {
            text: 'Root',
            level: 0,
            children: [
                {
                    text: '[x] Completed task',
                    level: 1,
                    type: 'list-item',
                    listType: 'unordered',
                    children: []
                },
                {
                    text: '[ ] Pending task',
                    level: 1,
                    type: 'list-item',
                    listType: 'unordered',
                    children: []
                },
                {
                    text: '[X] Another completed task',
                    level: 1,
                    type: 'list-item',
                    listType: 'unordered',
                    children: []
                }
            ]
        }
    },

    // Example 11: Complex nested structure
    complexStructure: {
        input: `# Documentation
## Getting Started
### Installation
Run the following command:
\`\`\`bash
npm install
\`\`\`
### Configuration
Set up your config:
- Database settings
- API keys
- Environment variables
## Usage
Basic usage example:
1. Import the library
2. Initialize the client
3. Make API calls`,
        expectedTree: {
            text: 'Root',
            level: 0,
            children: [
                {
                    text: 'Documentation',
                    level: 1,
                    type: 'header',
                    children: [
                        {
                            text: 'Getting Started',
                            level: 2,
                            type: 'header',
                            children: [
                                {
                                    text: 'Installation',
                                    level: 3,
                                    type: 'header',
                                    children: [
                                        {
                                            text: 'Run the following command:',
                                            level: 4,
                                            type: 'text',
                                            children: []
                                        },
                                        {
                                            text: 'Code: bash',
                                            level: 4,
                                            type: 'code',
                                            language: 'bash',
                                            content: 'npm install\n',
                                            children: []
                                        }
                                    ]
                                },
                                {
                                    text: 'Configuration',
                                    level: 3,
                                    type: 'header',
                                    children: [
                                        {
                                            text: 'Set up your config:',
                                            level: 4,
                                            type: 'text',
                                            children: []
                                        },
                                        {
                                            text: 'Database settings',
                                            level: 4,
                                            type: 'list-item',
                                            listType: 'unordered',
                                            children: []
                                        },
                                        {
                                            text: 'API keys',
                                            level: 4,
                                            type: 'list-item',
                                            listType: 'unordered',
                                            children: []
                                        },
                                        {
                                            text: 'Environment variables',
                                            level: 4,
                                            type: 'list-item',
                                            listType: 'unordered',
                                            children: []
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            text: 'Usage',
                            level: 2,
                            type: 'header',
                            children: [
                                {
                                    text: 'Basic usage example:',
                                    level: 3,
                                    type: 'text',
                                    children: []
                                },
                                {
                                    text: 'Import the library',
                                    level: 3,
                                    type: 'list-item',
                                    listType: 'ordered',
                                    children: []
                                },
                                {
                                    text: 'Initialize the client',
                                    level: 3,
                                    type: 'list-item',
                                    listType: 'ordered',
                                    children: []
                                },
                                {
                                    text: 'Make API calls',
                                    level: 3,
                                    type: 'list-item',
                                    listType: 'ordered',
                                    children: []
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    }
};

module.exports = { mockExamples };