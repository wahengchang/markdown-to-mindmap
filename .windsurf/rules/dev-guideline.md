---
trigger: always_on
---

# Development Guidelines for markdown-mindmap

## Project Overview
This project is a web application built with Vue 3 (CDN), Vue Router (CDN), and Tailwind CSS (CDN), served by a Node.js Express backend. The frontend source files are organized under `public/js/`, with a modular structure using pages and components. The backend serves static files and handles SPA routing.

## Stack
- **Backend:** Node.js + Express (see `server.js`)
- **Frontend:**
  - Vue 3 (via CDN)
  - Vue Router (via CDN)
  - Tailwind CSS (via CDN)
- **Entry Point:** `public/index.html`
- **Main JS:** `public/js/main.js`

## Folder Structure
- `public/` — Static files served to the client
  - `index.html` — Main HTML file
  - `js/` — Main frontend source
    - `main.js` — Vue app entry
    - `router.js` — Vue Router setup
    - `pages/` — Page-level Vue components (e.g., Home, Login, Todo, Navbar)
      - `components/` — Nested components (e.g., Counter.js)
- `server.js` — Express server
- `package.json` — Node.js dependencies and scripts

## Coding Standards
- Use ES6+ syntax for all JS files.
- Organize code into reusable components (under `pages/components/`).
- Use Vue SFC style (template, script, style) within JS files if possible, or keep render logic cleanly separated.
- Use Tailwind CSS utility classes for styling.
- Keep business logic and UI logic separated.

## Best Practices
- **Routing:** Define all routes in `router.js`. Use history mode and fallback to `index.html` for SPA support.
- **Components:** Keep components small and focused. Place shared components in `pages/components/`.
- **State Management:** Use Vue's built-in reactivity. For larger state, consider a global store (e.g., Vuex or Pinia, if CDN loaded).
- **Comments:** Write clear comments for non-obvious logic.
- **Naming:** Use PascalCase for components, camelCase for variables/functions.

## Development Workflow
1. Install dependencies: `npm install`
2. Start the server: `npm start` (runs Express on port 8000)
3. Access the app at [http://localhost:8000](http://localhost:8000)
4. Edit frontend code in `public/js/` and backend in `server.js`.
5. Use version control (git) for all changes.

## Contribution
- Branch from `main` for new features/bugfixes.
- Open pull requests with clear descriptions.
- Ensure code is linted and tested before merging.

## Additional Notes
- All dependencies are managed via `package.json`.
- CDN usage for frontend libraries keeps the project lightweight and easy to update.
- For new pages/components, follow the structure in `public/js/pages/` and `public/js/pages/components/`.

---
_Last updated: 2025-07-17_
