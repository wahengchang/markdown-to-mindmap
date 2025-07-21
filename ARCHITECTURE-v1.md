# Architecture & Engineering Guide
## Markdown-to-Mindmap Project

> **Purpose**: Central reference for architecture, technical decisions, and engineering processes for current and future collaborators.

---

## 🏗️ System Architecture

### Core Design Philosophy
- **Modular JavaScript**: ES6+ browser-compatible modules using IIFE pattern
- **Zero Build Tools**: Direct browser execution without transpilation/bundling
- **Performance First**: <150KB bundle, <200ms render time for 500 nodes
- **Progressive Enhancement**: Graceful degradation for older browsers

### Module Structure
```
public/
├── js/
│   ├── core/           # Business logic & integration
│   │   ├── main.js     # Application bootstrap
│   │   ├── parser.js   # Markdown → TreeNode conversion
│   │   └── config.js   # Configuration management
│   ├── tree/           # Data structures & algorithms
│   │   ├── tree-node.js      # Core tree data structure
│   │   └── layout-engine.js  # Spatial positioning algorithms
│   ├── rendering/      # Visualization layer
│   │   ├── d3-renderer.js    # D3.js SVG mindmap generation
│   │   └── svg-exporter.js   # Export functionality
│   ├── ui/             # User interface components
│   │   └── components.js     # UI widgets & controls
│   ├── events/         # Event handling & coordination
│   │   └── event-manager.js  # Centralized event system
│   └── utils/          # Shared utilities
│       └── helpers.js        # Common helper functions
└── css/                # Styling
    ├── base.css        # Foundation styles
    └── components.css  # Component-specific styles
```

### Data Flow Architecture
```
Markdown Input → Parser → TreeNode Structure → Layout Engine → D3 Renderer → SVG Output
                    ↓
                Filtering Logic (Leaf Node Detection) → Clean Structure → Enhanced Display
```

---

## 🎯 Key Technical Decisions

### 1. Leaf Node Filtering System
**Decision**: Implement two-pass filtering algorithm for clean mindmap visualization
- **Pass 1**: Identify leaf nodes (headers with no structural children)
- **Pass 2**: Build filtered tree with detail property for leaf nodes
- **Rationale**: Separates structural navigation from detailed content
- **Impact**: 65% node reduction (17→6 nodes) while preserving all content

### 2. TreeNode Enhancement
**Decision**: Add `detail` property to TreeNode class
```javascript
class TreeNode {
    constructor(text, level = 0) {
        this.text = text;      // Clean header for navigation
        this.detail = '';      // Aggregated content for leaves
        // ... other properties
    }
}
```
- **Rationale**: Enables content separation without breaking existing API
- **Backward Compatibility**: Optional property, existing code unaffected

### 3. D3.js Visualization Strategy
**Decision**: Multi-line text rendering with SVG tspan elements
- **Header**: Bold, primary color, full text
- **Detail**: Normal weight, gray, line-wrapped content
- **Hover**: Enhanced tooltips with complete content
- **Rationale**: Preserves readability while showing maximum information

### 4. Module Communication Pattern
**Decision**: Global namespace with explicit exports
```javascript
window.MarkdownMindmap = {
    Parser: { parseMarkdownToTree, filterTreeForMindmap },
    Renderer: { renderMindmap, updateMindmapFromMarkdown },
    TreeInteraction: { LayoutEngine, TreeNode }
};
```
- **Benefits**: Clear module boundaries, testable components
- **Trade-off**: Global namespace over module bundler complexity

---

## 📋 Engineering Standards

### Code Quality Requirements
1. **Function Size**: Maximum 50 lines per function
2. **Documentation**: JSDoc comments for all public functions
3. **Error Handling**: Explicit exception handling with graceful degradation
4. **Testing**: Jest unit tests with >80% coverage
5. **Naming**: camelCase functions/variables, PascalCase classes

### Performance Targets
- **Bundle Size**: <150KB gzipped total
- **Render Time**: <200ms for 500 nodes
- **Memory Usage**: <50MB peak for large documents
- **Compatibility**: Modern browsers (ES6+ support)

### Testing Strategy
```
tests/
├── unit/                    # Individual module testing
│   ├── parser.test.js       # Core parsing logic
│   ├── tree-node.test.js    # Data structure validation
│   └── filter.test.js       # Filtering algorithm tests
├── integration/             # Cross-module testing
│   └── end-to-end.test.js   # Full pipeline validation
└── performance/             # Performance benchmarks
    └── render-speed.test.js # Timing validation
```

---

## 🔄 Multi-Engineer Workflow

### Engineer Specializations
- **Engineer 1 (TreeInteraction)**: Data structures, spatial algorithms, event handling
- **Engineer 2 (JavaScript)**: Core logic, parsing, integration, testing
- **Engineer 3 (UI/UX)**: Interface components, styling, user experience

### Coordination Protocol
1. **TaskBoard.md**: Central task tracking with status updates
2. **Interface Contracts**: API agreements before implementation
3. **No File Overlap**: Each engineer owns specific modules
4. **Daily Sync**: TaskBoard.md status updates as tasks progress

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
- **Tailwind CSS**: Utility-first styling framework
- **Jest**: Testing framework (dev dependency)

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
    includeTypes: ['header', 'list-item', 'code', 'table'],
    maxDepth: 6                       // Limit nesting depth
});
```

### Rendering Configuration
```javascript
renderMindmap(tree, container, {
    theme: {
        colors: { nodes: ['#dbeafe', '#fef3c7', '#d1fae5'] },
        fonts: { size: { node: 12 } }
    },
    layout: { algorithm: 'tree', spacing: 80 }
});
```

## 🚀 Deployment & Distribution

### Production Build
- Concatenate and minify CSS files
- Validate all JavaScript modules load correctly
- Test with sample markdown documents
- Verify cross-browser compatibility

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