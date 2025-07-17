const express = require('express');
const path = require('path');
const app = express();
const port = 8000;

// Set up MIME types
// app.use((req, res, next) => {
//     res.setHeader('Content-Type', 'application/javascript');
//     next();
// });

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Handle Vue Router history mode - only serve index.html for non-file requests
app.get('*', (req, res, next) => {
    // If the request has a file extension, skip to static middleware
    if (path.extname(req.path)) {
        return next();
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
