/**
 * Main Application Controller
 * Integrates all modular components and handles application initialization
 * 
 * @module MainApp
 */

(function() {
    'use strict';

    // Mock data for testing
    const mockMarkdown = `# Web Development Roadmap

## Frontend Development
### HTML & CSS
#### HTML5 Semantic Elements
#### CSS3 Flexbox & Grid
#### Responsive Design
#### CSS Preprocessors
##### Sass
##### Less
##### Stylus

### JavaScript
#### ES6+ Features
##### Arrow Functions
##### Promises & Async/Await
##### Modules
##### Destructuring
#### Frontend Frameworks
##### React
###### React Hooks
###### React Router
###### State Management
##### Vue.js
###### Vue 3 Composition API
###### Vuex
##### Angular
###### TypeScript
###### RxJS

## Backend Development
### Node.js
#### Express.js
#### RESTful APIs
#### GraphQL
#### Authentication
##### JWT
##### OAuth
##### Session Management

### Databases
#### SQL Databases
##### PostgreSQL
##### MySQL
##### SQLite
#### NoSQL Databases
##### MongoDB
##### Redis
##### Elasticsearch

## DevOps & Tools
### Version Control
#### Git
##### Branching Strategies
##### Pull Requests
##### Git Flow

### CI/CD
#### GitHub Actions
#### Jenkins
#### Docker
##### Containerization
##### Docker Compose

### Cloud Platforms
#### AWS
##### EC2
##### S3
##### RDS
#### Google Cloud
#### Azure

## Testing
### Unit Testing
#### Jest
#### Mocha
#### Chai
### Integration Testing
### End-to-End Testing
#### Cypress
#### Playwright
#### Selenium`;

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
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (!darkModeToggle) return;

        const isDark = localStorage.getItem('darkMode') === 'true';
        
        if (isDark) {
            document.documentElement.classList.add('dark');
        }

        darkModeToggle.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            localStorage.setItem('darkMode', document.documentElement.classList.contains('dark'));
        });
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