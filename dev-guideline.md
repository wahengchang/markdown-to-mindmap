# Markdown-to-Mindmap Dev Guidelines

## Project Overview

- **Single HTML file** application with Tailwind CSS (via CDN)
- Transforms Markdown into interactive SVG mind maps
- Client-side only, no server dependencies

## Key Requirements

- **Performance:** Render ≤ 200ms for 500 nodes, bundle ≤ 150KB
- **Accessibility:** WCAG 2.1 AA compliance
- **Features:** Markdown parsing, interactive SVG, exports (PNG/SVG)

## Development Setup

- Browser: Chrome, Firefox, Safari, Edge (latest 2 versions)
- Tools: Text editor, Git, Node.js (for serve package)
- No build process required - direct HTML/CSS/JS development
- Start development server: `npm run dev` or `npm start` (serves on port 5000)


## HTML & CSS

- Use semantic HTML and proper heading hierarchy
- Apply Tailwind utility classes directly in HTML
- Include ARIA attributes for accessibility
- Dark/light mode via Tailwind's dark variant

## JavaScript

- Organize by functionality (core parsing, UI, event handlers)
- Optimize for performance (debounce, efficient DOM operations)
- Keep bundle size under limit (150KB gzipped)

## Testing

- Cross-browser compatibility
- Performance benchmarks for rendering
- Accessibility compliance (WCAG 2.1 AA)

## Core Features

1. **Markdown Parsing:** Headers, lists, code, math
2. **Interactive Mind Map:** Zoom, pan, fold/unfold
3. **Configuration:** JSON options in frontmatter
4. **Export:** PNG and SVG with current view state

## Implementation Architecture

- **File Structure:** Single `public/index.html` with embedded CSS/JS
- **Tree Structure:** TreeNode class with parent-child relationships
- **Layout Algorithm:** Hierarchical positioning with automatic spacing
- **Rendering:** SVG-based mindmap with responsive design
- **Styling:** Tailwind CSS via CDN, dark mode support
- **Development Server:** Uses `npx serve` for local testing (port 5000)

## Success Metrics

- ≤ 200ms render at 95th percentile
- 80% export activation in first session
- WCAG 2.1 AA score ≥ 90
