// E2E test for public/index.html using Playwright
// To run: npx playwright test e2e/index.spec.js

const { test, expect } = require('@playwright/test');

// Update this URL if your dev server runs elsewhere
const BASE_URL = 'http://localhost:8000';

test.describe('Landing Page', () => {
  test('App loads and renders root container', async ({ page }) => {
    await page.goto(BASE_URL);
    // Check for the main app div
    await expect(page.locator('#app')).toBeVisible();
    // Check that the title is correct (matches new app title)
    await expect(page).toHaveTitle(/Markdown Mindmap/i);
    // Check that Home page content is rendered
    await expect(page.locator('h1')).toHaveText(/Markdown Mindmap/i);

    // Take a screenshot with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({
      path: `e2e/screenshots/landing-${timestamp}.png`,
      fullPage: true
    });
  });
});
