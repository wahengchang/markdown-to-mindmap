# Architecture & Engineering Guide v2
## Markdown-to-Mindmap Project

> **Purpose**: Central reference for architecture, technical decisions, and engineering processes for current and future collaborators.

---

## 🏗️ System Architecture

### Core Design Philosophy
- **Modular JavaScript**: ES6+ browser-compatible modules with enhanced encapsulation
- **Zero Build Tools**: Direct browser execution without transpilation/bundling
- **Performance First**: <150KB bundle, <200ms render time for 500 nodes
- **Progressive Enhancement**: Graceful degradation with accessibility compliance
- **Content Intelligence**: Smart content type detection and specialized rendering

### Module Structure
```
public/
├── js/
│   ├── core/                # Business logic & integration
│   │   ├── main.js          # Application bootstrap
│   │   ├── parser.js        # Markdown → TreeNode conversion
│   │   └── config.js        # Configuration management
│   ├── tree/                # Data structures & algorithms
│   │   ├── tree-node.js     # Enhanced tree data structure
│   │   └── layout-engine.js # Spatial positioning algorithms
│   ├── rendering/           # Visualization layer
│   │   ├── d3-renderer.js   # D3.js SVG mindmap generation
│   │   ├── d3-animations.js # Animation and transitions
│   │   └── svg-exporter.js  # Export functionality
│   ├── ui/                  # User interface components
│   │   ├── components.js            # UI widgets & controls
│   │   ├── theme-manager.js         # Theme application system
│   │   ├── theme-selector.js        # Theme selection interface
│   │   ├── code-block-display.js    # Code syntax highlighting
│   │   ├── table-renderer.js        # Table visualization
│   │   ├── list-visualization.js    # List rendering
│   │   ├── expansion-controls.js    # Node expansion UI
│   │   ├── export-manager.js        # Export functionality UI
│   │   ├── tooltip-manager.js       # Enhanced tooltips
│   │   ├── real-time-theme-switcher.js # Theme transition system
│   │   └── content-display-integrator.js # Content type coordination
│   ├── events/              # Event handling & coordination
│   │   ├── event-manager.js      # Centralized event bus
│   │   └── node-interactions.js  # Node interaction handlers
│   └── utils/               # Shared utilities
│       └── helpers.js            # Common helper functions
└── css/                     # Styling
    ├── base.css             # Foundation styles
    ├── components.css       # Component-specific styles
    ├── content-display.css  # Content type styling
    └── theme-selector.css   # Theme selection interface
```

### Data Flow Architecture
```
                                  ┌─────────────────┐
                                  │  Markdown Input  │
                                  └────────┬────────┘
                                           │
                                           ▼
┌───────────────────────────────────────────────────────────────────┐
│                         Core Processing                           │
│  ┌────────────┐    ┌──────────────────┐    ┌───────────────────┐  │
│  │   Parser   │───▶│ Content Analysis │───▶│ Leaf Node Filter  │  │
│  └────────────┘    └──────────────────┘    └───────────────────┘  │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│                       Enhanced Tree Structure                     │
│  ┌────────────┐    ┌──────────────────┐    ┌───────────────────┐  │
│  │  TreeNode  │◀──▶│ Content Elements │◀──▶│ Type-specific     │  │
│  │  Structure │    │ & Classification │    │ Data Structures   │  │
│  └────────────┘    └──────────────────┘    └───────────────────┘  │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│                      Layout & Visualization                       │
│  ┌────────────┐    ┌──────────────────┐    ┌───────────────────┐  │
│  │   Layout   │───▶│   D3 Renderer    │───▶│  Content-aware    │  │
│  │   Engine   │    │   & Animations   │    │  Display System   │  │
│  └────────────┘    └──────────────────┘    └───────────────────┘  │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│                      User Interface Layer                         │
│  ┌────────────┐    ┌──────────────────┐    ┌───────────────────┐  │
│  │   Theme    │◀──▶│  Node Expansion  │◀──▶│  Export/Import    │  │
│  │  System    │    │     Controls     │    │    Functionality  │  │
│  └────────────┘    └──────────────────┘    └───────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Technical Decisions

### 1. Enhanced Content Type Detection System
**Decision**: Implement intelligent content classification with specialized rendering
- **Content Types**: Text, Tables, Lists, Code Blocks, Images
- **Detection Method**: Regex-based pattern matching with contextual analysis
- **Specialized Renderers**: Type-specific display components
- **Rationale**: Provides rich, content-appropriate visualization
- **Impact**: 95%+ accuracy in content classification with optimized display

### 2. Advanced TreeNode Structure
**Decision**: Enhanced TreeNode class with content type awareness
```javascript
class TreeNode {
    constructor(text, level = 0) {
        this.text = text;          // Clean header for navigation
        this.detail = '';          // Aggregated content for leaves
        this.contentType = null;   // Type classification (text|table|list|code)
        this.elements = [];        // Structured content elements
        this.expanded = false;     // Dynamic expansion state
        // ... other properties
    }
}
```
- **Rationale**: Enables intelligent content handling while preserving API
- **Backward Compatibility**: Optional properties, existing code unaffected

### 3. Event-Driven Architecture
**Decision**: Implement centralized event bus for module communication
```javascript
// Event publication
EventManager.publish('node:expand', {
    nodeId: node.id,
    contentType: node.contentType
});

// Event subscription
EventManager.subscribe('node:expand', (data) => {
    ContentDisplayIntegrator.renderContent(data.nodeId, data.contentType);
});
```
- **Benefits**: Loose coupling between components, testable event flows
- **Performance**: Optimized event propagation with <5ms overhead

### 4. Theme Management System
**Decision**: Comprehensive theme management with live preview
- **Theme Definition**: Structured theme objects with color palettes and typography
- **Live Preview**: Debounced theme application (100ms delay) for performance
- **Accessibility**: WCAG 2.1 AA compliance for all themes
- **Persistence**: Local storage for user theme preferences
- **Rationale**: Enhances user experience with personalization options

### 5. Dynamic Content Expansion
**Decision**: On-demand content rendering for complex node types
- **Collapsed State**: Show header text only for optimal mindmap clarity
- **Expanded State**: Render full content with type-specific visualization
- **Transition**: Smooth animations for state changes (<200ms)
- **Rationale**: Balances information density with visual clarity
- **Impact**: 60%+ reduction in initial render complexity

### 6. Export System
**Decision**: Multi-format export capabilities
- **Formats**: SVG (vector), PNG (raster), PDF (document)
- **Styling**: Embedded CSS for consistent appearance
- **Optimization**: File size reduction techniques (<1MB target)
- **Rationale**: Enables sharing and integration with other tools
- **Implementation**: Client-side conversion without server dependencies

---

## 📋 Engineering Standards

### Code Quality Requirements
1. **Function Size**: Maximum 50 lines per function
2. **Documentation**: JSDoc comments for all public functions
3. **Error Handling**: Explicit exception handling with graceful degradation
4. **Testing**: Jest unit tests with >80% coverage
5. **Naming**: camelCase functions/variables, PascalCase classes
6. **Accessibility**: WCAG 2.1 AA compliance for all UI components

### Performance Targets
- **Bundle Size**: <150KB gzipped total
- **Render Time**: <200ms for 500 nodes
- **Memory Usage**: <50MB peak for large documents
- **Theme Switching**: <100ms transition time
- **Content Expansion**: <200ms animation time
- **Compatibility**: Modern browsers (ES6+ support)

### Module Communication Patterns
1. **Event-Based**: Use EventManager for cross-module communication
2. **Direct API**: Use explicit exports for same-module communication
3. **Configuration**: Use ConfigManager for global settings
4. **State Management**: Local state within components, shared state via events

### Testing Strategy
```
tests/
├── unit/                    # Individual module testing
│   ├── parser.test.js       # Core parsing logic
│   ├── tree-node.test.js    # Data structure validation
│   ├── content-types.test.js # Content detection tests
│   └── theme-system.test.js # Theme application tests
├── integration/             # Cross-module testing
│   ├── end-to-end.test.js   # Full pipeline validation
│   └── event-flow.test.js   # Event propagation tests
├── performance/             # Performance benchmarks
│   ├── render-speed.test.js # Timing validation
│   └── memory-usage.test.js # Memory consumption tests
└── accessibility/           # A11y testing
    └── wcag-compliance.test.js # Accessibility validation
```

---

## 🔄 Multi-Engineer Workflow

### Engineer Specializations
- **Engineer-TreeInteraction**: Data structures, spatial algorithms, event handling
- **Engineer-JavaScript**: Core logic, parsing, integration, testing
- **Engineer-UI/UX**: Interface components, styling, user experience

### Coordination Protocol
1. **TaskBoard.md**: Central task tracking with status updates
2. **Interface Contracts**: API agreements before implementation
3. **No File Overlap**: Each engineer owns specific modules
4. **Daily Sync**: TaskBoard.md status updates as tasks progress
5. **Event Documentation**: Clear documentation of published/subscribed events

### Status Reporting Format
```
🔸 Engineer-[Role]:
Status: [Kick Off | Iteration | Refinement | DONE]
Completed:
1. [Task ID] - [Description]
2. [Task ID] - [Description]

Implements: [Key functions/components]
Notes: "[Dependencies, coordination items]"
```

---

## 🛠️ Development Environment

### Dependencies (CDN Only)
- **D3.js v7.9.0**: Data visualization and SVG manipulation
- **Tailwind CSS v3.3.3**: Utility-first styling framework
- **Highlight.js v11.8.0**: Code syntax highlighting
- **html2canvas v1.4.1**: HTML to image conversion for PNG export
- **jsPDF v2.5.1**: PDF generation for document export
- **Jest v29.6.2**: Testing framework (dev dependency)

### Local Development
```bash
# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run serve
# or open public/index.html directly
```

### File Watching & Hot Reload
- No build process required
- Direct file editing with browser refresh
- Browser DevTools for debugging and profiling

---

## 🔧 Configuration Management

### Parser Options
```javascript
parseMarkdownToTree(markdown, {
    filterForMindmap: true,           // Enable leaf-node filtering
    includeTypes: ['header', 'list-item', 'code', 'table', 'image'],
    maxDepth: 6,                      // Limit nesting depth
    contentAnalysis: {
        detectTypes: true,            // Enable content type detection
        extractElements: true         // Extract structured elements
    }
});
```

### Rendering Configuration
```javascript
renderMindmap(tree, container, {
    theme: ThemeManager.getCurrentTheme(),
    layout: {
        algorithm: 'radial',          // tree, radial, force-directed
        spacing: 80,
        collision: {
            detection: true,
            padding: 10
        }
    },
    animation: {
        duration: 200,
        easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)'
    },
    content: {
        initialExpansion: false,      // Start with collapsed nodes
        maxPreviewLength: 100         // Characters in collapsed preview
    }
});
```

### Theme Configuration
```javascript
ThemeManager.registerTheme({
    id: 'business-blue',
    name: 'Business Blue',
    colors: {
        background: '#ffffff',
        text: '#333333',
        primary: '#1a73e8',
        secondary: '#4285f4',
        accent: '#fbbc04',
        nodeColors: ['#e8f0fe', '#d2e3fc', '#aecbfa', '#8ab4f8']
    },
    typography: {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: {
            header: '14px',
            detail: '12px',
            code: '12px'
        },
        fontWeight: {
            header: 600,
            detail: 400
        }
    },
    accessibility: {
        contrastRatio: 4.5,           // WCAG AA minimum
        focusIndicator: true,
        reducedMotion: 'prefers-reduced-motion'
    }
});
```

## 🚀 Deployment & Distribution

### Production Build
- Concatenate and minify CSS files
- Validate all JavaScript modules load correctly
- Test with sample markdown documents
- Verify cross-browser compatibility
- Validate WCAG 2.1 AA compliance

### File Organization
```
dist/
├── index.html          # Main application entry
├── css/
│   └── styles.min.css  # Combined and minified styles
└── js/
    ├── core/           # Core business logic
    ├── tree/           # Tree data structures
    ├── rendering/      # Visualization components
    ├── ui/             # User interface
    ├── events/         # Event management
    └── utils/          # Shared utilities
```

## 🔐 Accessibility Compliance

### WCAG 2.1 AA Requirements
- **Perceivable**: All themes meet 4.5:1 contrast ratio
- **Operable**: Full keyboard navigation support
- **Understandable**: Consistent UI patterns and clear labeling
- **Robust**: Cross-browser compatibility and screen reader support

### Implementation Details
- **Keyboard Navigation**: Arrow keys, Tab, Enter/Space for all interactions
- **Focus Management**: Visible focus indicators and logical tab order
- **Reduced Motion**: Support for prefers-reduced-motion media query
- **Screen Reader**: ARIA attributes for dynamic content
- **Color Independence**: Information not conveyed by color alone

## 🔍 Performance Optimization

### Bundle Size Management
- **Code Splitting**: Logical module separation
- **Lazy Loading**: On-demand content rendering
- **Dependency Management**: Minimal external libraries

### Runtime Performance
- **Render Optimization**: Efficient D3 update patterns
- **Event Debouncing**: Prevent excessive handler execution
- **Memory Management**: Proper cleanup of event listeners
- **Layout Thrashing**: Batch DOM operations

### Monitoring & Metrics
- **Performance API**: Runtime measurement of critical operations
- **Memory Profiling**: Heap snapshot analysis for leaks
- **Render Timing**: Frame rate monitoring for animations
- **Error Tracking**: Console error aggregation and reporting

## 🧩 Extension & Plugin Architecture

### Plugin System
- **Registration API**: `MarkdownMindmap.registerPlugin(plugin)`
- **Hook Points**: Parser, Renderer, UI, Export
- **Configuration**: Plugin-specific settings in config
- **Lifecycle**: Initialize, Execute, Cleanup

### Example Plugin
```javascript
MarkdownMindmap.registerPlugin({
    id: 'github-flavored-markdown',
    name: 'GitHub Flavored Markdown',
    hooks: {
        'parser:before': (markdown) => {
            // Transform GitHub-specific syntax
            return transformedMarkdown;
        },
        'renderer:node:create': (node, element) => {
            // Custom rendering for GitHub elements
            if (node.contentType === 'github-table') {
                // Custom rendering logic
            }
            return element;
        }
    },
    config: {
        enableTaskLists: true,
        enableStrikethrough: true
    }
});
```

---

## 📈 Future Roadmap

### Version 2.1
- **Collaborative Editing**: Real-time collaboration support
- **Import Enhancements**: Support for additional markdown flavors
- **Advanced Layouts**: Additional layout algorithms (horizontal tree, mind map)
- **Mobile Optimization**: Touch-specific interactions and responsive design

### Version 2.2
- **Data Persistence**: Cloud storage integration
- **Template System**: Pre-defined mindmap templates
- **Advanced Filtering**: Dynamic node filtering by criteria
- **Integration APIs**: Embed API for third-party integration

### Version 3.0
- **AI-Enhanced Analysis**: Smart content grouping and summarization
- **Interactive Presentations**: Presentation mode with navigation
- **Offline Support**: Progressive Web App with offline capabilities
- **Real-time Collaboration**: Multi-user editing and commenting
