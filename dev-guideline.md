# Development Guidelines

## Project Overview
This is a Vue 3 + TypeScript project that converts Markdown text into interactive mind maps using the Markmap library. The application features a responsive design with real-time preview capabilities.

## Prerequisites
- Node.js 18+
- npm or yarn
- VS Code with Volar extension (recommended)

## Quick Start

### Initial Setup
```bash
# Install dependencies
npm install

# Install Playwright browsers for testing
npx playwright install
```

### Development
```bash
# Start development server (localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing
```bash
# Run all end-to-end tests
npm run test:e2e

# Run tests with UI
npm run test:e2e:ui

# Run tests in headed mode
npm run test:e2e:headed
```

### Code Quality
```bash
# Run ESLint and fix issues
npm run lint
```

## Project Structure

```
src/
├── components/           # Vue components
│   ├── HelloMindMap.vue # Main mindmap component
│   └── __tests__/       # Component tests
├── views/               # Page components
├── router/              # Vue Router configuration
├── stores/              # Pinia state management
└── assets/              # Static assets

e2e/                     # End-to-end tests
├── basic-functionality.spec.ts
├── export-functionality.spec.ts
├── interactive-mindmap.spec.ts
├── markdown-mindmap.spec.ts
└── pwa-offline.spec.ts

dist/                    # Build output
public/                  # Public assets
```

## Key Dependencies

### Core Libraries
- **Vue 3**: Framework with Composition API
- **Vite**: Build tool and dev server
- **TypeScript**: Type safety
- **Markmap**: Mind map rendering (`markmap-lib`, `markmap-view`)
- **D3.js**: Data visualization (via Markmap)

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS**: CSS processing
- **Autoprefixer**: CSS vendor prefixing

### Testing
- **Playwright**: End-to-end testing
- **Vitest**: Unit testing framework (configured but not used)

### Build & Development
- **Vite Plugin PWA**: Progressive Web App features
- **Vite Single File**: Bundle as single HTML file
- **ESLint**: Code linting with Vue/TypeScript support

## Development Workflow

### 1. Component Development
- Follow Vue 3 Composition API patterns
- Use `<script setup>` syntax
- Implement proper TypeScript types
- Use Tailwind classes for styling

### 2. Code Style
- Use ESLint configuration in `eslint.config.ts`
- Follow Vue.js style guide
- Use meaningful component and variable names
- Add JSDoc comments for complex functions

### 3. Testing Strategy
- Write E2E tests for user workflows
- Test responsive design across viewports
- Verify accessibility features
- Test error handling and edge cases

### 4. Build Process
- Development: `npm run dev` (Vite dev server)
- Production: `npm run build` (optimized bundle)
- PWA: Automatic service worker generation
- Single file: Optional bundling to single HTML

## Configuration Files

### Essential Configs
- `vite.config.ts`: Build configuration, plugins, aliases
- `playwright.config.ts`: E2E test configuration
- `eslint.config.ts`: Linting rules
- `tailwind.config.js`: Tailwind CSS customization
- `tsconfig.json`: TypeScript configuration

### Build Features
- **PWA Support**: Manifest and service worker
- **Single File Build**: Complete app in one HTML file
- **Hot Module Replacement**: Fast development updates
- **TypeScript**: Full type checking

## Testing Guidelines

### E2E Tests (Playwright)
- Test in Chromium, Firefox, and WebKit
- Verify responsive design
- Test user interactions
- Check accessibility
- Validate performance

### Test Structure
```typescript
test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

## Performance Considerations

### Markmap Integration
- Initialize Markmap in `onMounted` lifecycle
- Use `watch` for reactive updates
- Handle errors gracefully
- Optimize re-renders

### Bundle Optimization
- Vite handles code splitting automatically
- PWA caching for offline usage
- Single file build for deployment

## Deployment

### Build for Production
```bash
npm run build
```

### Output
- `dist/`: Standard build output
- PWA manifest and service worker included
- Single HTML file option available

## Troubleshooting

### Common Issues
1. **Markmap not rendering**: Check console for errors, ensure container ref is available
2. **TypeScript errors**: Run `npm run lint` to check for type issues
3. **Test failures**: Verify dev server is running for E2E tests
4. **PWA issues**: Check service worker registration in browser dev tools

### Development Tips
- Use Vue DevTools browser extension
- Monitor network requests in dev tools
- Test offline functionality with PWA
- Use Playwright trace viewer for debugging tests

## Contributing

### Before Submitting
1. Run `npm run lint` to fix code style issues
2. Run `npm run test:e2e` to ensure all tests pass
3. Test responsive design manually
4. Verify PWA functionality

### Code Review Checklist
- [ ] TypeScript types are correct
- [ ] Components are properly tested
- [ ] Responsive design works
- [ ] No console errors
- [ ] Accessibility features intact
- [ ] Performance is acceptable