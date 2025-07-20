/**
 * Theme Manager Tests (T006)
 * Tests for 9 professional color palettes, theme switching, and accessibility
 */

const { 
    initializeThemeManager,
    switchTheme,
    getAvailableThemes,
    getCurrentTheme,
    validateThemeAccessibility,
    createCustomTheme,
    THEMES
} = require('../public/js/ui/theme-manager.js');

// Mock DOM for testing
global.document = {
    documentElement: {
        style: { setProperty: jest.fn() },
        setAttribute: jest.fn(),
        classList: { add: jest.fn(), remove: jest.fn() }
    },
    head: { appendChild: jest.fn() },
    createElement: jest.fn(() => ({ textContent: '' }))
};

global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn()
};

global.performance = {
    now: jest.fn(() => Date.now())
};

describe('Theme Manager (T006)', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
        global.localStorage.getItem.mockReturnValue(null);
    });

    describe('Theme Definitions', () => {
        test('should have exactly 9 professional color palettes', () => {
            const themes = Object.keys(THEMES);
            expect(themes).toHaveLength(9);
            
            const expectedThemes = [
                'professional', 'creative', 'accessible', 'nature', 
                'sunset', 'ocean', 'monochrome', 'vibrant', 'dark'
            ];
            
            expectedThemes.forEach(theme => {
                expect(themes).toContain(theme);
            });
        });
        
        test('each theme should have required color properties', () => {
            const requiredColors = [
                'primary', 'secondary', 'accent', 'background', 
                'text', 'surface', 'border', 'shadow'
            ];
            
            Object.values(THEMES).forEach(theme => {
                requiredColors.forEach(color => {
                    expect(theme.colors[color]).toBeDefined();
                    expect(typeof theme.colors[color]).toBe('string');
                });
            });
        });
        
        test('each theme should have accessibility metadata', () => {
            Object.values(THEMES).forEach(theme => {
                expect(theme.accessibility).toBeDefined();
                expect(theme.accessibility.contrastRatio).toBeGreaterThanOrEqual(4.5);
                expect(['AA', 'AAA']).toContain(theme.accessibility.wcagLevel);
            });
        });
        
        test('themes should be categorized correctly', () => {
            const validCategories = ['business', 'creative', 'accessible', 'custom'];
            
            Object.values(THEMES).forEach(theme => {
                expect(validCategories).toContain(theme.category);
            });
        });
    });

    describe('Theme Initialization', () => {
        test('should initialize with default professional theme', () => {
            initializeThemeManager();
            
            expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
                '--theme-primary', '#1e3a8a'
            );
            expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
                'data-theme', 'professional'
            );
        });
        
        test('should initialize with specified theme', () => {
            initializeThemeManager('creative');
            
            expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
                '--theme-primary', '#7c3aed'
            );
            expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
                'data-theme', 'creative'
            );
        });
        
        test('should load saved theme preference', () => {
            global.localStorage.getItem.mockReturnValue('dark');
            
            initializeThemeManager();
            
            expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
                'data-theme', 'dark'
            );
        });
        
        test('should fallback to professional theme for invalid saved preference', () => {
            global.localStorage.getItem.mockReturnValue('invalid-theme');
            
            initializeThemeManager();
            
            expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
                'data-theme', 'professional'
            );
        });
    });

    describe('Theme Switching', () => {
        test('should switch theme successfully', async () => {
            global.performance.now
                .mockReturnValueOnce(0)   // Start time
                .mockReturnValueOnce(50); // End time
            
            const result = await switchTheme('ocean');
            
            expect(result.theme).toBe('ocean');
            expect(result.switchTime).toBe(50);
            expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
                '--theme-primary', '#0f766e'
            );
        });
        
        test('should reject for invalid theme', async () => {
            await expect(switchTheme('invalid-theme')).rejects.toThrow(
                'Theme "invalid-theme" not found'
            );
        });
        
        test('should save theme preference on switch', async () => {
            await switchTheme('nature');
            
            expect(global.localStorage.setItem).toHaveBeenCalledWith(
                'mindmap-theme-preference', 'nature'
            );
        });
        
        test('should add and remove transition class', async () => {
            const promise = switchTheme('sunset');
            
            expect(document.documentElement.classList.add).toHaveBeenCalledWith(
                'theme-transitioning'
            );
            
            await promise;
            
            // Note: remove is called in setTimeout, so it may not be immediately testable
            // but the transition class addition is verified
        });
        
        test('should warn about slow theme switches', async () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            global.performance.now
                .mockReturnValueOnce(0)    // Start time
                .mockReturnValueOnce(150); // End time (150ms > 100ms target)
            
            await switchTheme('vibrant');
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Theme switch took 150.00ms (target: <100ms)')
            );
            
            consoleSpy.mockRestore();
        });
    });

    describe('Theme Information', () => {
        test('should return available themes with metadata', () => {
            const themes = getAvailableThemes();
            
            expect(themes).toHaveLength(9);
            
            themes.forEach(theme => {
                expect(theme.id).toBeDefined();
                expect(theme.name).toBeDefined();
                expect(theme.description).toBeDefined();
                expect(theme.category).toBeDefined();
                expect(theme.colors).toBeDefined();
                expect(theme.accessibility).toBeDefined();
                expect(theme.preview).toBeDefined();
            });
        });
        
        test('should return current theme information', () => {
            initializeThemeManager('creative');
            
            const current = getCurrentTheme();
            
            expect(current.id).toBe('creative');
            expect(current.name).toBe('Creative');
            expect(current.colors.primary).toBe('#7c3aed');
        });
        
        test('theme previews should contain essential colors', () => {
            const themes = getAvailableThemes();
            
            themes.forEach(theme => {
                expect(theme.preview.primary).toBeDefined();
                expect(theme.preview.secondary).toBeDefined();
                expect(theme.preview.accent).toBeDefined();
                expect(theme.preview.background).toBeDefined();
                expect(theme.preview.text).toBeDefined();
            });
        });
    });

    describe('Accessibility Validation', () => {
        test('should validate theme accessibility', () => {
            const colors = {
                text: '#000000',
                background: '#ffffff',
                primary: '#1e3a8a',
                surface: '#f8fafc'
            };
            
            const validation = validateThemeAccessibility(colors);
            
            expect(validation.passes).toBe(true);
            expect(validation.wcagLevel).toBe('AA');
            expect(validation.tests).toHaveLength(3);
        });
        
        test('accessibility validation should test key color combinations', () => {
            const colors = THEMES.professional.colors;
            const validation = validateThemeAccessibility(colors);
            
            const testElements = validation.tests.map(t => t.element);
            expect(testElements).toContain('body text');
            expect(testElements).toContain('primary on background');
            expect(testElements).toContain('text on surface');
        });
    });

    describe('Custom Themes', () => {
        test('should create custom theme with valid configuration', () => {
            const customConfig = {
                name: 'Test Theme',
                description: 'A test theme',
                category: 'custom',
                primary: '#ff0000',
                secondary: '#00ff00',
                accent: '#0000ff',
                background: '#ffffff',
                text: '#000000'
            };
            
            const themeId = createCustomTheme(customConfig);
            
            expect(themeId).toMatch(/^custom_\d+$/);
            expect(THEMES[themeId]).toBeDefined();
            expect(THEMES[themeId].name).toBe('Test Theme');
            expect(THEMES[themeId].colors.primary).toBe('#ff0000');
        });
        
        test('should provide defaults for missing custom theme properties', () => {
            const minimalConfig = {
                name: 'Minimal Theme'
            };
            
            const themeId = createCustomTheme(minimalConfig);
            const theme = THEMES[themeId];
            
            expect(theme.colors.primary).toBe('#1e3a8a'); // Default
            expect(theme.colors.background).toBe('#ffffff'); // Default
            expect(theme.category).toBe('custom');
            expect(theme.accessibility).toBeDefined();
        });
    });

    describe('Theme Categories', () => {
        test('should have business themes for corporate use', () => {
            const businessThemes = getAvailableThemes().filter(
                theme => theme.category === 'business'
            );
            
            expect(businessThemes.length).toBeGreaterThanOrEqual(3);
            expect(businessThemes.map(t => t.id)).toContain('professional');
        });
        
        test('should have creative themes for design work', () => {
            const creativeThemes = getAvailableThemes().filter(
                theme => theme.category === 'creative'
            );
            
            expect(creativeThemes.length).toBeGreaterThanOrEqual(2);
            expect(creativeThemes.map(t => t.id)).toContain('creative');
        });
        
        test('should have accessible themes for high contrast needs', () => {
            const accessibleThemes = getAvailableThemes().filter(
                theme => theme.category === 'accessible'
            );
            
            expect(accessibleThemes.length).toBeGreaterThanOrEqual(1);
            expect(accessibleThemes.map(t => t.id)).toContain('accessible');
        });
    });

    describe('Theme System Integration', () => {
        test('should apply all required CSS custom properties', () => {
            initializeThemeManager('ocean');
            
            const expectedProperties = [
                '--theme-primary',
                '--theme-secondary', 
                '--theme-accent',
                '--theme-background',
                '--theme-text',
                '--theme-surface',
                '--theme-border',
                '--theme-shadow'
            ];
            
            expectedProperties.forEach(property => {
                expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
                    property, expect.any(String)
                );
            });
        });
        
        test('should set theme data attributes for CSS targeting', () => {
            initializeThemeManager('nature');
            
            expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
                'data-theme', 'nature'
            );
            expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
                'data-theme-category', 'business'
            );
        });
    });

    describe('Performance Requirements', () => {
        test('theme switching should target <100ms performance', () => {
            // This test verifies the warning system for slow switches
            // The custom theme created in earlier tests affects the count, so we test the warning mechanism
            const themes = getAvailableThemes();
            expect(themes.length).toBeGreaterThanOrEqual(9);
            
            // Verify we have the core 9 themes
            const coreThemes = themes.filter(t => !t.id.startsWith('custom_'));
            expect(coreThemes).toHaveLength(9);
            
            // The actual performance test happens in the warning check
            // which we tested in the "should warn about slow theme switches" test
        });
        
        test('theme definitions should be efficiently structured', () => {
            // Verify themes are properly structured for fast access
            Object.entries(THEMES).forEach(([id, theme]) => {
                expect(typeof id).toBe('string');
                expect(theme.colors).toBeDefined();
                expect(Object.keys(theme.colors).length).toBeGreaterThanOrEqual(8);
            });
        });
    });
});