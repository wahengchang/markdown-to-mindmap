import { test, expect } from '@playwright/test';

test.describe('Basic Application Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the application successfully', async ({ page }) => {
    // Check that the main heading is present
    await expect(page.locator('h1')).toHaveText('Markdown MindMap');
    
    // Check that the page title is set correctly
    await expect(page).toHaveTitle('Vite App');
    
    // Verify the main container is visible
    await expect(page.locator('.max-w-4xl')).toBeVisible();
  });

  test('should display markdown input section', async ({ page }) => {
    // Check for markdown input section
    await expect(page.locator('h2').filter({ hasText: 'Markdown Input' })).toBeVisible();
    
    // Check for textarea
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute('placeholder', 'Enter your markdown here...');
    
    // Verify textarea has default content
    await expect(textarea).toHaveValue(/# Hello World/);
  });

  test('should display mindmap output section', async ({ page }) => {
    // Check for mindmap output section
    await expect(page.locator('h2').filter({ hasText: 'MindMap Output' })).toBeVisible();
    
    // Check for mindmap container
    const mindmapContainer = page.locator('[ref="mindmapContainer"]').first();
    await expect(mindmapContainer).toBeVisible();
  });

  test('should have responsive layout', async ({ page }) => {
    // Test desktop layout
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(page.locator('.lg\\:grid-cols-2')).toBeVisible();
    
    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.grid-cols-1')).toBeVisible();
  });

  test('should have proper styling classes', async ({ page }) => {
    // Check for Tailwind classes
    await expect(page.locator('.min-h-screen')).toBeVisible();
    await expect(page.locator('.bg-gray-100')).toBeVisible();
    await expect(page.locator('.rounded-lg')).toBeVisible();
    await expect(page.locator('.shadow-md')).toBeVisible();
  });

  test('should load without console errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out known acceptable errors
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon.ico') &&
      !error.includes('icon-192x192.png') &&
      !error.includes('SW registration')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    // Check for proper heading hierarchy
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h2')).toHaveCount(2);
    
    // Check textarea accessibility
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
    await expect(textarea).toBeFocused; // Should be focusable
  });
});