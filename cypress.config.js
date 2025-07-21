// cypress.config.js
module.exports = {
  e2e: {
    baseUrl: 'http://localhost:5050',
    supportFile: 'e2e/setup.js',
    specPattern: 'e2e/**/*.spec.js',
    viewportWidth: 1280,
    viewportHeight: 800,
    screenshotsFolder: 'e2e/screenshots',
    videosFolder: 'e2e/videos',
    video: false,
    screenshotOnRunFailure: true,
    trashAssetsBeforeRuns: true
  },
  // Show the browser during test execution
  experimentalInteractiveRunEvents: true
};
