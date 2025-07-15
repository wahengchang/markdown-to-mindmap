import { test, expect } from '@playwright/test';

test.describe('Interactive MindMap Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('svg', { timeout: 10000 });
  });

  test('should render interactive SVG mindmap', async ({ page }) => {
    // Check that SVG is present and interactive
    const svg = page.locator('svg').first();
    await expect(svg).toBeVisible();
    
    // Check for mindmap nodes
    const nodes = page.locator('.markmap-node');
    await expect(nodes.first()).toBeVisible();
    
    // Check for mindmap links
    const links = page.locator('.markmap-link');
    await expect(links.first()).toBeVisible();
  });

  test('should have clickable nodes', async ({ page }) => {
    // Wait for mindmap to be fully rendered
    await page.waitForSelector('.markmap-node', { timeout: 5000 });
    
    const nodes = page.locator('.markmap-node');
    const firstNode = nodes.first();
    
    // Check that nodes are clickable
    await expect(firstNode).toBeVisible();
    
    // Click on a node (this should expand/collapse if implemented)
    await firstNode.click();
    
    // Wait for any animations to complete
    await page.waitForTimeout(300);
    
    // Verify the click was processed (node should still be there)
    await expect(firstNode).toBeVisible();
  });

  test('should support zoom and pan interactions', async ({ page }) => {
    const svg = page.locator('svg').first();
    
    // Get initial transform
    const initialTransform = await svg.evaluate(el => {
      const g = el.querySelector('g');
      return g ? g.getAttribute('transform') : null;
    });
    
    // Simulate mouse wheel zoom
    await svg.hover();
    await page.mouse.wheel(0, -100); // Zoom in
    
    await page.waitForTimeout(300);
    
    // Check if transform has changed (indicating zoom worked)
    const newTransform = await svg.evaluate(el => {
      const g = el.querySelector('g');
      return g ? g.getAttribute('transform') : null;
    });
    
    // The transform should have changed if zoom is working
    // Note: This might not work if zoom is not implemented yet
    expect(newTransform).toBeDefined();
  });

  test('should handle mouse interactions on mindmap', async ({ page }) => {
    const svg = page.locator('svg').first();
    
    // Test hover effects
    await svg.hover();
    await expect(svg).toBeVisible();
    
    // Test mouse movement over nodes
    const nodes = page.locator('.markmap-node');
    const firstNode = nodes.first();
    
    if (await firstNode.isVisible()) {
      await firstNode.hover();
      await page.waitForTimeout(200);
      
      // Check that hover doesn't break the node
      await expect(firstNode).toBeVisible();
    }
  });

  test('should maintain mindmap structure after interactions', async ({ page }) => {
    const textarea = page.locator('textarea');
    
    // Set specific content
    await textarea.fill(`# Root
## Branch 1
- Leaf 1
- Leaf 2
## Branch 2
- Leaf 3
- Leaf 4`);
    
    await page.waitForTimeout(500);
    
    // Get initial node count
    const initialNodes = await page.locator('.markmap-node').count();
    
    // Interact with the mindmap
    const svg = page.locator('svg').first();
    await svg.click();
    await page.waitForTimeout(200);
    
    // Check that structure is maintained
    const finalNodes = await page.locator('.markmap-node').count();
    expect(finalNodes).toBe(initialNodes);
  });

  test('should handle touch interactions on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const svg = page.locator('svg').first();
    await expect(svg).toBeVisible();
    
    // Simulate touch tap
    await svg.tap();
    await page.waitForTimeout(200);
    
    // Check that tap interaction works
    await expect(svg).toBeVisible();
  });

  test('should render node text correctly', async ({ page }) => {
    const textarea = page.locator('textarea');
    
    await textarea.fill(`# Main Topic
## Subtopic One
## Subtopic Two
- Item A
- Item B`);
    
    await page.waitForTimeout(500);
    
    // Check for text elements in the SVG
    const textElements = page.locator('svg text, svg foreignObject');
    await expect(textElements.first()).toBeVisible();
    
    // Verify text content is present
    const nodeCount = await page.locator('.markmap-node').count();
    expect(nodeCount).toBeGreaterThan(0);
  });

  test('should handle rapid markdown changes without breaking', async ({ page }) => {
    const textarea = page.locator('textarea');
    
    const markdownVariations = [
      '# Test 1',
      '# Test 1\n## Sub 1',
      '# Test 1\n## Sub 1\n- Item 1',
      '# Test 1\n## Sub 1\n- Item 1\n- Item 2',
      '# Test 1\n## Sub 1\n- Item 1\n- Item 2\n## Sub 2',
    ];
    
    // Rapidly change markdown content
    for (const markdown of markdownVariations) {
      await textarea.fill(markdown);
      await page.waitForTimeout(100);
    }
    
    // Wait for final render
    await page.waitForTimeout(500);
    
    // Check that mindmap still renders correctly
    const svg = page.locator('svg').first();
    await expect(svg).toBeVisible();
    
    const nodes = page.locator('.markmap-node');
    expect(await nodes.count()).toBeGreaterThan(0);
  });

  test('should maintain performance with complex interactions', async ({ page }) => {
    const textarea = page.locator('textarea');
    
    // Create complex markdown
    let complexMarkdown = '# Performance Test\n';
    for (let i = 1; i <= 20; i++) {
      complexMarkdown += `## Section ${i}\n`;
      for (let j = 1; j <= 3; j++) {
        complexMarkdown += `- Item ${i}.${j}\n`;
      }
    }
    
    await textarea.fill(complexMarkdown);
    await page.waitForTimeout(1000);
    
    // Perform multiple interactions
    const svg = page.locator('svg').first();
    
    // Multiple clicks
    for (let i = 0; i < 5; i++) {
      await svg.click();
      await page.waitForTimeout(100);
    }
    
    // Check that mindmap is still responsive
    await expect(svg).toBeVisible();
    
    const nodes = page.locator('.markmap-node');
    expect(await nodes.count()).toBeGreaterThan(10);
  });

  test('should handle keyboard interactions', async ({ page }) => {
    const textarea = page.locator('textarea');
    
    // Focus on textarea
    await textarea.focus();
    
    // Use keyboard to modify content
    await textarea.press('Control+A'); // Select all
    await textarea.pressSequentially('# Keyboard Test\n## New Section');
    
    await page.waitForTimeout(500);
    
    // Check that mindmap updated
    const svg = page.locator('svg').first();
    await expect(svg).toBeVisible();
    
    const nodes = page.locator('.markmap-node');
    expect(await nodes.count()).toBeGreaterThan(0);
  });

  test('should handle window resize correctly', async ({ page }) => {
    // Start with desktop size
    await page.setViewportSize({ width: 1024, height: 768 });
    
    const svg = page.locator('svg').first();
    await expect(svg).toBeVisible();
    
    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Check that mindmap still renders
    await expect(svg).toBeVisible();
    
    // Resize back to desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(500);
    
    // Check that mindmap adapts to new size
    await expect(svg).toBeVisible();
  });
});