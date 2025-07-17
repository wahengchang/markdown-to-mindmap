# Vue CDN Express Starter

A minimal, modern starter for Vue 3 apps using Vue Router and Tailwind CSS—all loaded via CDN, with a simple Express backend. No build tools or CLI required.

## Features
- **Express server** for static file serving and SPA routing
- **Vue 3**, **Vue Router 4**, and **Tailwind CSS** via CDN
- Pages and Navbar as ES modules in `public/js/pages/`
- Example Counter component in `public/js/pages/components/`
- Clean, easy-to-understand folder structure

## Folder Structure
```
vue-cdn-express-starter/
├── public/
│   ├── index.html            # Main HTML entry, loads Vue, Router, Tailwind via CDN
│   └── js/
│       ├── main.js           # Vue app entry point
│       ├── router.js         # Vue Router setup
│       └── pages/
│           ├── Home.js       # Home page (JS module)
│           ├── Login.js      # Login page (JS module)
│           ├── Todo.js       # Todo page (JS module)
│           ├── Navbar.js     # Navbar component (JS module)
│           └── components/
│               └── Counter.js # Example sub-component
├── server.js                 # Express backend
├── package.json              # Node dependencies (express only)
└── README.md                 # This file
```

## Getting Started
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Start the server**
   ```bash
   node server.js
   ```
3. **Open your browser**
   - Go to: [http://localhost:8000](http://localhost:8000)

## How it Works
- `server.js` serves all static files in `public/` and redirects all routes to `index.html` (SPA history mode).
- `index.html` loads Vue, Vue Router, and Tailwind CSS via CDN.
- App logic is in `public/js/main.js`.
- Pages and Navbar are JS modules in `public/js/pages/`.
- Example sub-component in `public/js/pages/components/`.

## Customization
- Add new pages to `public/js/pages/` and register them in `router.js`.
- Add components to `public/js/pages/components/`.
- Change the layout/template in `main.js`.

## Why this Starter?
- No build step, no CLI, no complex config—just start coding!
- Perfect for learning, prototyping, or small projects.

---

Feel free to expand or modify as needed!
