/**
 * Unit Tests for D3 Renderer Pure Logic
 * Tests only the pure functions without browser dependencies
 */

// Mock D3 for testing environment
const mockD3 = {
    hierarchy: jest.fn(),
    tree: jest.fn(() => ({ size: jest.fn() })),
    zoom: jest.fn(),
    select: jest.fn(),
    zoomIdentity: { translate: jest.fn(), scale: jest.fn() }
};

// Import the module (would need to be adapted for actual test runner)
const { 
    ColorUtils, 
    DataTransformer, 
    NodeStyleCalculator,
    SchemaValidator,
    MindmapRendererFactory 
} = require('./d3-renderer.js');

describe('ColorUtils', () => {
    describe('shiftHue', () => {
        test('should return blue fallback for invalid colors', () => {
            expect(ColorUtils.shiftHue('', 30)).toBe('#3b82f6');
            expect(ColorUtils.shiftHue('none', 30)).toBe('#3b82f6');
            expect(ColorUtils.shiftHue('invalid', 30)).toBe('#3b82f6');
        });

        test('should shift valid hex colors', () => {
            const result = ColorUtils.shiftHue('#ff0000', 30);
            expect(result).toMatch(/^#[0-9a-f]{6}$/i);
            expect(result).not.toBe('#ff0000');
        });

        test('should handle edge cases gracefully', () => {
            expect(ColorUtils.shiftHue('#000000', 0)).toBe('#000000');
            expect(ColorUtils.shiftHue('#ffffff', 360)).toBe('#ffffff');
        });
    });

    describe('validateHexColor', () => {
        test('should validate correct hex colors', () => {
            expect(ColorUtils.validateHexColor('#ff0000')).toBe(true);
            expect(ColorUtils.validateHexColor('#FFFFFF')).toBe(true);
            expect(ColorUtils.validateHexColor('#123ABC')).toBe(true);
        });

        test('should reject invalid hex colors', () => {
            expect(ColorUtils.validateHexColor('ff0000')).toBe(false);
            expect(ColorUtils.validateHexColor('#ff00')).toBe(false);
            expect(ColorUtils.validateHexColor('#gggggg')).toBe(false);
            expect(ColorUtils.validateHexColor('')).toBe(false);
        });
    });
});

describe('SchemaValidator', () => {
    describe('validateNodeData', () => {
        test('should accept valid node objects', () => {
            const validNode = { text: 'test', children: [] };
            expect(() => SchemaValidator.validateNodeData(validNode)).not.toThrow();
        });

        test('should reject invalid node data', () => {
            expect(() => SchemaValidator.validateNodeData(null)).toThrow('Invalid node data: must be an object');
            expect(() => SchemaValidator.validateNodeData('string')).toThrow('Invalid node data: must be an object');
            expect(() => SchemaValidator.validateNodeData(123)).toThrow('Invalid node data: must be an object');
        });
    });

    describe('validateRenderOptions', () => {
        test('should return defaults for empty options', () => {
            const result = SchemaValidator.validateRenderOptions({});
            expect(result).toEqual({
                width: 800,
                height: 600,
                interactive: true,
                showTooltips: true
            });
        });

        test('should merge with provided options', () => {
            const options = { width: 1000, interactive: false };
            const result = SchemaValidator.validateRenderOptions(options);
            expect(result).toEqual({
                width: 1000,
                height: 600,
                interactive: false,
                showTooltips: true
            });
        });
    });
});

describe('DataTransformer', () => {
    describe('transformToD3Format', () => {
        test('should transform simple node structure', () => {
            const input = {
                text: 'Root',
                detail: '',
                children: [
                    { text: 'Child 1', detail: '' },
                    { text: 'Child 2', detail: '' }
                ]
            };

            const result = DataTransformer.transformToD3Format(input);

            expect(result.name).toBe('Root');
            expect(result.children).toHaveLength(2);
            expect(result.children[0].name).toBe('Child 1');
            expect(result.children[1].name).toBe('Child 2');
        });

        test('should detect code blocks in detail', () => {
            const input = {
                text: 'Code Node',
                detail: '```javascript\nconsole.log("hello");\n```',
                children: []
            };

            const result = DataTransformer.transformToD3Format(input);

            expect(result.contentType).toBe('code');
            expect(result.language).toBe('javascript');
            expect(result.content).toBe('console.log("hello");');
        });

        test('should handle nodes without children', () => {
            const input = {
                text: 'Leaf Node',
                detail: 'Some detail'
            };

            const result = DataTransformer.transformToD3Format(input);

            expect(result.isLeaf).toBe(true);
            expect(result.children).toBeUndefined();
        });

        test('should preserve node metadata', () => {
            const input = {
                text: 'Test Node',
                id: 'test-123',
                contentType: 'table',
                elements: ['item1', 'item2'],
                headers: ['col1', 'col2'],
                rows: [['val1', 'val2']]
            };

            const result = DataTransformer.transformToD3Format(input);

            expect(result.nodeId).toBe('test-123');
            expect(result.contentType).toBe('table');
            expect(result.elements).toEqual(['item1', 'item2']);
            expect(result.headers).toEqual(['col1', 'col2']);
            expect(result.rows).toEqual([['val1', 'val2']]);
        });
    });
});

describe('NodeStyleCalculator', () => {
    describe('calculateStyling', () => {
        test('should return default text styling', () => {
            const nodeData = { contentType: 'text' };
            const result = NodeStyleCalculator.calculateStyling(nodeData);

            expect(result.shape).toBe('circle');
            expect(result.fill).toBe('#3b82f6');
            expect(result.strokeWidth).toBe(2);
            expect(result.radius).toBe(8);
        });

        test('should return code styling for code nodes', () => {
            const nodeData = { contentType: 'code' };
            const result = NodeStyleCalculator.calculateStyling(nodeData);

            expect(result.shape).toBe('roundedRect');
            expect(result.fill).toBe('#6366f1');
            expect(result.width).toBe(24);
            expect(result.height).toBe(16);
            expect(result.rx).toBe(4);
        });

        test('should return table styling for table nodes', () => {
            const nodeData = { contentType: 'table' };
            const result = NodeStyleCalculator.calculateStyling(nodeData);

            expect(result.shape).toBe('rect');
            expect(result.fill).toBe('#10b981');
            expect(result.width).toBe(22);
            expect(result.height).toBe(16);
        });

        test('should return diamond styling for list nodes', () => {
            const nodeData = { contentType: 'list' };
            const result = NodeStyleCalculator.calculateStyling(nodeData);

            expect(result.shape).toBe('diamond');
            expect(result.fill).toBe('#f59e0b');
            expect(result.size).toBe(10);
        });

        test('should detect code in detail and override styling', () => {
            const nodeData = { 
                contentType: 'text',
                detail: '```python\nprint("hello")\n```'
            };
            const result = NodeStyleCalculator.calculateStyling(nodeData);

            expect(result.shape).toBe('roundedRect');
            expect(result.fill).toBe('#6366f1');
        });

        test('should use theme colors when provided', () => {
            const nodeData = { contentType: 'text' };
            const theme = {
                nodeColors: { text: '#custom-color' },
                nodeStrokeColors: { text: '#custom-stroke' }
            };
            const result = NodeStyleCalculator.calculateStyling(nodeData, theme);

            expect(result.fill).toBe('#custom-color');
            expect(result.stroke).toBe('#custom-stroke');
        });
    });

    describe('getNodeColor', () => {
        test('should return default colors by level', () => {
            expect(NodeStyleCalculator.getNodeColor(0)).toBe('#3b82f6');
            expect(NodeStyleCalculator.getNodeColor(1)).toBe('#10b981');
            expect(NodeStyleCalculator.getNodeColor(2)).toBe('#f59e0b');
        });

        test('should cycle through colors for high levels', () => {
            const color5 = NodeStyleCalculator.getNodeColor(5);
            const color0 = NodeStyleCalculator.getNodeColor(0);
            expect(color5).toBe(color0);
        });

        test('should use theme colors when provided', () => {
            const theme = {
                colors: {
                    accent: '#theme-accent',
                    nodes: ['#theme1', '#theme2']
                }
            };
            
            expect(NodeStyleCalculator.getNodeColor(0, theme)).toBe('#theme1');
            expect(NodeStyleCalculator.getNodeColor(1, theme)).toBe('#theme2');
        });
    });
});

describe('MindmapRendererFactory', () => {
    describe('create', () => {
        test('should create renderer with default dependencies', () => {
            const renderer = MindmapRendererFactory.create();
            expect(renderer).toBeDefined();
            expect(renderer.domRenderer).toBeDefined();
            expect(renderer.dataTransformer).toBe(DataTransformer);
        });

        test('should accept dependency overrides', () => {
            const mockDOMRenderer = { render: jest.fn() };
            const overrides = { domRenderer: mockDOMRenderer };
            
            const renderer = MindmapRendererFactory.create(overrides);
            expect(renderer.domRenderer).toBe(mockDOMRenderer);
        });
    });

    describe('legacy API compatibility', () => {
        test('should provide transformToD3Format function', () => {
            const input = { text: 'test', children: [] };
            const result = MindmapRendererFactory.transformToD3Format(input);
            expect(result.name).toBe('test');
        });

        test('should provide getNodeColor function', () => {
            const color = MindmapRendererFactory.getNodeColor(0);
            expect(color).toBe('#3b82f6');
        });
    });
});

// Integration Tests
describe('Integration Tests', () => {
    test('should transform and style node data correctly', () => {
        const input = {
            text: 'Code Example',
            detail: '```javascript\nconst x = 1;\n```',
            children: []
        };

        // Transform data
        const transformed = DataTransformer.transformToD3Format(input);
        expect(transformed.contentType).toBe('code');
        expect(transformed.language).toBe('javascript');

        // Calculate styling
        const styling = NodeStyleCalculator.calculateStyling(transformed);
        expect(styling.shape).toBe('roundedRect');
        expect(styling.fill).toBe('#6366f1');
    });

    test('should handle complex nested structures', () => {
        const input = {
            text: 'Root',
            children: [
                {
                    text: 'Table Section',
                    contentType: 'table',
                    headers: ['Name', 'Value'],
                    rows: [['test', '123']],
                    children: [
                        {
                            text: 'Code Block',
                            detail: '```python\nprint("nested")\n```'
                        }
                    ]
                }
            ]
        };

        const transformed = DataTransformer.transformToD3Format(input);
        expect(transformed.children[0].contentType).toBe('table');
        expect(transformed.children[0].children[0].contentType).toBe('code');

        const rootStyling = NodeStyleCalculator.calculateStyling(transformed);
        const tableStyling = NodeStyleCalculator.calculateStyling(transformed.children[0]);
        const codeStyling = NodeStyleCalculator.calculateStyling(transformed.children[0].children[0]);

        expect(rootStyling.shape).toBe('circle');
        expect(tableStyling.shape).toBe('rect');
        expect(codeStyling.shape).toBe('roundedRect');
    });
});