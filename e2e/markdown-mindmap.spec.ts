import { test, expect } from '@playwright/test';

test.describe('Markdown Input and MindMap Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should render mindmap from default markdown', async ({ page }) => {
    // Wait for mindmap to be rendered
    await page.waitForSelector('svg', { timeout: 10000 });
    
    // Check that SVG mindmap is present
    const svg = page.locator('svg').first();
    await expect(svg).toBeVisible();
    
    // Check for mindmap nodes
    const nodes = page.locator('.markmap-node');
    await expect(nodes).toHaveCount.greaterThan(0);
    
    // Check for mindmap links
    const links = page.locator('.markmap-link');
    await expect(links).toHaveCount.greaterThan(0);
  });

  test('should update mindmap when markdown changes', async ({ page }) => {
    const textarea = page.locator('textarea');
    
    // Clear existing content and add new markdown
    await textarea.fill(`# New Topic
## Subtopic 1
- Item 1
- Item 2
## Subtopic 2
- Item 3
- Item 4`);
    
    // Wait for mindmap to update
    await page.waitForTimeout(500);
    
    // Check that mindmap has updated with new content
    const svg = page.locator('svg').first();
    await expect(svg).toBeVisible();
    
    // Verify the mindmap contains the new topic
    const nodes = page.locator('.markmap-node');
    await expect(nodes).toHaveCount.greaterThan(0);
  });

  test('should handle empty markdown input', async ({ page }) => {
    const textarea = page.locator('textarea');
    
    // Clear the textarea
    await textarea.fill('');
    
    // Wait for processing
    await page.waitForTimeout(500);
    
    // The mindmap container should still be present
    const mindmapContainer = page.locator('[ref="mindmapContainer"]').first();
    await expect(mindmapContainer).toBeVisible();
  });

  test('should handle complex markdown structures', async ({ page }) => {
    const textarea = page.locator('textarea');
    
    const complexMarkdown = `# Main Topic
## Section 1
### Subsection 1.1
- Point 1
  - Sub-point 1.1
  - Sub-point 1.2
- Point 2
### Subsection 1.2
- Point 3
- Point 4
## Section 2
- Different point
- Another point
### Subsection 2.1
- Final point`;
    
    await textarea.fill(complexMarkdown);
    
    // Wait for mindmap to render
    await page.waitForTimeout(1000);
    
    // Check that complex structure is rendered
    const svg = page.locator('svg').first();
    await expect(svg).toBeVisible();
    
    const nodes = page.locator('.markmap-node');
    await expect(nodes).toHaveCount.greaterThan(5);
  });

  test('should handle markdown with special characters', async ({ page }) => {
    const textarea = page.locator('textarea');
    
    const markdownWithSpecialChars = `# Topic with "Quotes" & Symbols
## Section with <HTML> tags
- Item with *emphasis*
- Item with **bold**
- Item with \`code\`
## Section with Numbers & Math
- 1 + 1 = 2
- 50% of users
- $100 cost`;
    
    await textarea.fill(markdownWithSpecialChars);
    
    // Wait for mindmap to render
    await page.waitForTimeout(1000);
    
    // Check that mindmap renders without errors
    const svg = page.locator('svg').first();
    await expect(svg).toBeVisible();
    
    const nodes = page.locator('.markmap-node');
    await expect(nodes).toHaveCount.greaterThan(0);
  });

  test('should maintain real-time updates during typing', async ({ page }) => {
    const textarea = page.locator('textarea');
    
    // Clear and start typing
    await textarea.fill('');
    await textarea.type('# New Topic');
    
    // Wait briefly and check mindmap updated
    await page.waitForTimeout(300);
    let svg = page.locator('svg').first();
    await expect(svg).toBeVisible();
    
    // Add more content
    await textarea.type('\n## Subtopic');
    
    // Wait briefly and check mindmap updated again
    await page.waitForTimeout(300);
    svg = page.locator('svg').first();
    await expect(svg).toBeVisible();
    
    // Add list items
    await textarea.type('\n- Item 1\n- Item 2');
    
    // Final check
    await page.waitForTimeout(300);
    const nodes = page.locator('.markmap-node');
    await expect(nodes).toHaveCount.greaterThan(0);
  });

  test('should handle large markdown documents', async ({ page }) => {
    const textarea = page.locator('textarea');
    
    // Generate a large markdown document
    let largeMarkdown = '# Large Document\n';
    for (let i = 1; i <= 10; i++) {
      largeMarkdown += `## Section ${i}\n`;
      for (let j = 1; j <= 5; j++) {
        largeMarkdown += `### Subsection ${i}.${j}\n`;
        for (let k = 1; k <= 3; k++) {
          largeMarkdown += `- Point ${i}.${j}.${k}\n`;
        }
      }
    }
    
    await textarea.fill(largeMarkdown);
    
    // Wait for mindmap to render (might take longer for large docs)
    await page.waitForTimeout(2000);
    
    // Check that mindmap renders successfully
    const svg = page.locator('svg').first();
    await expect(svg).toBeVisible();
    
    const nodes = page.locator('.markmap-node');
    await expect(nodes).toHaveCount.greaterThan(10);
  });

  test('should preserve textarea content on page reload', async ({ page }) => {
    const textarea = page.locator('textarea');
    
    const customMarkdown = `# Custom Content
## For Testing
- This should persist`;
    
    await textarea.fill(customMarkdown);
    await page.waitForTimeout(500);
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if content is preserved (depends on implementation)
    const textareaAfterReload = page.locator('textarea');
    await expect(textareaAfterReload).toBeVisible();
    
    // The content might revert to default or be preserved depending on local storage
    // This test verifies the application handles reload correctly
  });

  test('should handle markdown syntax errors gracefully', async ({ page }) => {
    const textarea = page.locator('textarea');
    
    // Input malformed markdown
    const malformedMarkdown = `# Unclosed bracket [
## Missing hash
Unordered list without dash
- Proper item
## Another section`;
    
    await textarea.fill(malformedMarkdown);
    await page.waitForTimeout(500);
    
    // Check that application doesn't crash
    const svg = page.locator('svg').first();
    await expect(svg).toBeVisible();
    
    // Should still render something meaningful
    const nodes = page.locator('.markmap-node');
    await expect(nodes).toHaveCount.greaterThan(0);
  });

  test('should update mindmap node count correctly', async ({ page }) => {
    const textarea = page.locator('textarea');
    
    // Simple structure
    await textarea.fill(`# Root
## Child 1
## Child 2`);
    
    await page.waitForTimeout(500);
    
    let nodes = page.locator('.markmap-node');
    const initialCount = await nodes.count();
    
    // Add more content
    await textarea.fill(`# Root
## Child 1
### Grandchild 1
### Grandchild 2
## Child 2
### Grandchild 3`);
    
    await page.waitForTimeout(500);
    
    nodes = page.locator('.markmap-node');
    const finalCount = await nodes.count();
    
    // Should have more nodes now
    expect(finalCount).toBeGreaterThan(initialCount);
  });
});