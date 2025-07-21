/**
 * Main Application Controller
 * Integrates all modular components and handles application initialization
 * 
 * @module MainApp
 */

(function() {
    'use strict';

    // Mock data for testing
    const mockMarkdown = `
### Blocks

\`\`\`js
console.log('hello, JavaScript')
\`\`\`

### Table
| Products | Price |
|-|-|
| Apple | 4 |
| Banana | 2 |

## Links
- [Website](https://markmap.js.org/)
- [GitHub](https://github.com/gera2ld/markmap)
`;

    /**
     * Update mindmap using modular components
     */
    function updateMindmap() {
        const markdownInput = document.getElementById('markdownInput');
        const markdown = markdownInput.value;
        
        if (!markdown.trim()) {
            const container = document.getElementById('mindmapContainer');
            if (container) {
                container.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">Enter markdown to see the mindmap</div>';
            }
            return;
        }

        try {
            // Use modular renderer
            window.MarkdownMindmap.Renderer.updateMindmapFromMarkdown(markdown);
        } catch (error) {
            console.error('Error updating mindmap:', error);
            const container = document.getElementById('mindmapContainer');
            if (container) {
                container.innerHTML = `<div class="flex items-center justify-center h-full text-gray-500">
                    <div class="text-center">
                        <p>Error rendering mindmap</p>
                        <p class="text-sm mt-2">${error.message}</p>
                    </div>
                </div>`;
            }
        }
    }

    /**
     * Initialize dark mode functionality
     */
    function initializeDarkMode() {
        // Initialization has been moved to components.js to avoid conflicts
        // This function is kept for backwards compatibility
        console.log('Dark mode initialization delegated to components.js');
        
        // Listen for system preference changes (this part is still useful)
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                // Only update if user hasn't set a preference
                if (localStorage.getItem('darkMode') === null) {
                    document.documentElement.classList.toggle('dark', e.matches);
                    localStorage.setItem('darkMode', e.matches);
                    
                    // Also update ThemeManager if available
                    if (window.MarkdownMindmap?.ThemeManager) {
                        const targetTheme = e.matches ? 'dark' : (localStorage.getItem('savedTheme') || 'professional');
                        window.MarkdownMindmap.ThemeManager.switchTheme(targetTheme);
                    }
                }
            });
        }
    }

    /**
     * Setup event listeners for UI component integration
     */
    function setupUIEventListeners() {
        // Listen for events dispatched by UI components
        document.addEventListener('centerNode', () => {
            console.log('Centering node...');
            // Implementation would use EventManager
        });
        
        document.addEventListener('filterNodes', (event) => {
            console.log('Filtering nodes:', event.detail);
            // Implementation would filter the mindmap
        });
        
        document.addEventListener('zoom', (event) => {
            console.log('Zoom action:', event.detail);
            // Implementation would use D3 zoom
        });
        
        document.addEventListener('download', (event) => {
            const format = event.detail;
            const svg = document.querySelector('#mindmapContainer svg');
            
            if (!svg) {
                console.warn('No SVG found to export');
                return;
            }
            
            try {
                if (format === 'svg' && window.MarkdownMindmap.SVGExporter) {
                    window.MarkdownMindmap.SVGExporter.exportAsSVG(svg);
                } else if (format === 'html' && window.MarkdownMindmap.SVGExporter) {
                    window.MarkdownMindmap.SVGExporter.exportAsHTML(svg);
                }
            } catch (error) {
                console.error('Export failed:', error);
            }
        });
    }

    /**
     * Initialize application with modular components
     */
    function init() {
        try {
            console.log('Initializing Markdown-to-Mindmap application...');

            // Make TreeNode globally available for the parser
            if (window.TreeInteraction?.TreeNode && typeof TreeNode === 'undefined') {
                window.TreeNode = window.TreeInteraction.TreeNode;
            }

            // Initialize configuration system
            if (window.MarkdownMindmap?.Config) {
                console.log('Configuration system loaded');
            }
            
            // Initialize UI components
            if (window.MarkdownMindmap?.UIComponents?.init) {
                window.MarkdownMindmap.UIComponents.init();
                console.log('UI components initialized');
            }
            
            // Initialize event management
            if (window.TreeInteraction?.EventManager?.init) {
                const container = document.getElementById('mindmapContainer');
                window.TreeInteraction.EventManager.init(container);
                console.log('Event management initialized');
            }
            
            // Initialize dark mode
            initializeDarkMode();
            
            // Load mock data
            const markdownInput = document.getElementById('markdownInput');
            if (markdownInput) {
                markdownInput.value = mockMarkdown;
                
                // Use debounced update from utilities if available
                let debouncedUpdate;
                if (window.TreeInteraction?.Utils?.PerformanceUtils?.debounce) {
                    debouncedUpdate = window.TreeInteraction.Utils.PerformanceUtils.debounce(updateMindmap, 300);
                } else {
                    // Fallback debounce
                    let timeout;
                    debouncedUpdate = function() {
                        clearTimeout(timeout);
                        timeout = setTimeout(updateMindmap, 300);
                    };
                }
                
                // Add event listeners
                markdownInput.addEventListener('input', debouncedUpdate);
                markdownInput.addEventListener('paste', () => {
                    setTimeout(debouncedUpdate, 50);
                });
            }
            
            // Setup UI event listeners
            setupUIEventListeners();
            
            // Initial render
            updateMindmap();
            
            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            
            // Show error message to user
            const container = document.getElementById('mindmapContainer');
            if (container) {
                container.innerHTML = `<div class="flex items-center justify-center h-full text-red-500">
                    <div class="text-center">
                        <p>Failed to initialize application</p>
                        <p class="text-sm mt-2">${error.message}</p>
                    </div>
                </div>`;
            }
        }
    }

    // Start the application when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export for testing/debugging
    if (typeof window !== 'undefined') {
        window.MarkdownMindmap = window.MarkdownMindmap || {};
        window.MarkdownMindmap.MainApp = {
            init,
            updateMindmap,
            setupUIEventListeners,
            initializeDarkMode
        };
    }

})();