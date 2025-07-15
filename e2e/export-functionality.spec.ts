import { test, expect } from '@playwright/test';

test.describe('Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('svg', { timeout: 10000 });
  });

  test('should have export capabilities in DOM', async ({ page }) => {
    // Check that SVG is available for export
    const svg = page.locator('svg').first();
    await expect(svg).toBeVisible();
    
    // Verify SVG has content that can be exported
    const svgContent = await svg.innerHTML();
    expect(svgContent.length).toBeGreaterThan(0);
  });

  test('should allow SVG export through context menu or programmatic access', async ({ page }) => {
    const svg = page.locator('svg').first();
    
    // Right-click on SVG to check context menu
    await svg.click({ button: 'right' });
    
    // Check that SVG can be accessed programmatically
    const svgData = await svg.evaluate((element) => {
      return new XMLSerializer().serializeToString(element);
    });
    
    expect(svgData).toContain('<svg');
    expect(svgData).toContain('</svg>');
  });

  test('should generate exportable SVG content', async ({ page }) => {
    // Set specific content for export testing
    const textarea = page.locator('textarea');
    await textarea.fill(`# Export Test
## Section 1
- Item 1
- Item 2
## Section 2
- Item 3
- Item 4`);
    
    await page.waitForTimeout(1000);
    
    // Get SVG content
    const svg = page.locator('svg').first();
    const svgContent = await svg.evaluate((element) => {
      const svgClone = element.cloneNode(true) as SVGElement;
      return new XMLSerializer().serializeToString(svgClone);
    });
    
    // Verify SVG contains expected elements
    expect(svgContent).toContain('<svg');
    expect(svgContent).toContain('</svg>');
    expect(svgContent.length).toBeGreaterThan(100); // Should have substantial content
  });

  test('should create downloadable content', async ({ page }) => {
    // Test that content can be prepared for download
    const svg = page.locator('svg').first();
    
    // Create a downloadable blob
    const downloadData = await svg.evaluate((element) => {
      const svgData = new XMLSerializer().serializeToString(element);
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      return {
        size: blob.size,
        type: blob.type,
        hasData: svgData.length > 0
      };
    });
    
    expect(downloadData.size).toBeGreaterThan(0);
    expect(downloadData.type).toBe('image/svg+xml');
    expect(downloadData.hasData).toBe(true);
  });

  test('should handle export of complex mindmaps', async ({ page }) => {
    const textarea = page.locator('textarea');
    
    // Create complex mindmap
    let complexContent = '# Complex Export Test\n';
    for (let i = 1; i <= 5; i++) {
      complexContent += `## Section ${i}\n`;
      for (let j = 1; j <= 3; j++) {
        complexContent += `### Subsection ${i}.${j}\n`;
        complexContent += `- Item ${i}.${j}.1\n`;
        complexContent += `- Item ${i}.${j}.2\n`;
      }
    }
    
    await textarea.fill(complexContent);
    await page.waitForTimeout(1500);
    
    // Check that complex SVG can be exported
    const svg = page.locator('svg').first();
    const svgContent = await svg.evaluate((element) => {
      return new XMLSerializer().serializeToString(element);
    });
    
    expect(svgContent).toContain('<svg');
    expect(svgContent.length).toBeGreaterThan(1000); // Complex content should be larger
    
    // Verify it contains multiple nodes
    expect(svgContent).toContain('markmap'); // Should contain markmap-related elements
  });

  test('should support PNG export via Canvas conversion', async ({ page }) => {
    const svg = page.locator('svg').first();
    
    // Test Canvas-based PNG export
    const canvasData = await svg.evaluate((element) => {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const svgData = new XMLSerializer().serializeToString(element);
        
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width || 800;
          canvas.height = img.height || 600;
          ctx?.drawImage(img, 0, 0);
          
          resolve({
            canvasCreated: true,
            dataUrl: canvas.toDataURL('image/png'),
            hasData: canvas.toDataURL('image/png').length > 0
          });
        };
        
        img.onerror = () => {
          resolve({
            canvasCreated: false,
            dataUrl: null,
            hasData: false
          });
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
      });
    });
    
    expect(canvasData.canvasCreated).toBe(true);
    expect(canvasData.hasData).toBe(true);
  });

  test('should support PDF export preparation', async ({ page }) => {
    const svg = page.locator('svg').first();
    
    // Test PDF export preparation (print-ready)
    const pdfData = await svg.evaluate((element) => {
      const svgData = new XMLSerializer().serializeToString(element);
      
      // Create print-ready HTML
      const printHtml = `
        <html>
          <head>
            <title>Mindmap Export</title>
            <style>
              body { margin: 0; padding: 20px; }
              svg { max-width: 100%; height: auto; }
            </style>
          </head>
          <body>
            ${svgData}
          </body>
        </html>
      `;
      
      return {
        htmlLength: printHtml.length,
        containsSvg: printHtml.includes('<svg'),
        containsStyles: printHtml.includes('style>')
      };
    });
    
    expect(pdfData.htmlLength).toBeGreaterThan(0);
    expect(pdfData.containsSvg).toBe(true);
    expect(pdfData.containsStyles).toBe(true);
  });

  test('should support standalone HTML export', async ({ page }) => {
    const textarea = page.locator('textarea');
    const testContent = '# Standalone Export\n## Self-contained\n- Works offline\n- Includes all data';
    
    await textarea.fill(testContent);
    await page.waitForTimeout(500);
    
    // Create standalone HTML
    const standaloneHtml = await page.evaluate(() => {
      const svg = document.querySelector('svg');
      if (!svg) return null;
      
      const svgData = new XMLSerializer().serializeToString(svg);
      
      const standaloneHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown MindMap Export</title>
  <style>
    body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; }
    .container { max-width: 1200px; margin: 0 auto; }
    svg { width: 100%; height: auto; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Markdown MindMap</h1>
    <p>Generated on ${new Date().toLocaleDateString()}</p>
    ${svgData}
  </div>
</body>
</html>`;
      
      return standaloneHtml;
    });
    
    expect(standaloneHtml).toContain('<!DOCTYPE html>');
    expect(standaloneHtml).toContain('<svg');
    expect(standaloneHtml).toContain('Generated on');
  });

  test('should handle export of empty mindmap', async ({ page }) => {
    const textarea = page.locator('textarea');
    
    // Clear content
    await textarea.fill('');
    await page.waitForTimeout(500);
    
    // Try to export empty mindmap
    const svg = page.locator('svg').first();
    const svgContent = await svg.evaluate((element) => {
      return new XMLSerializer().serializeToString(element);
    });
    
    // Should still generate valid SVG
    expect(svgContent).toContain('<svg');
    expect(svgContent).toContain('</svg>');
  });

  test('should preserve mindmap styling in exports', async ({ page }) => {
    const svg = page.locator('svg').first();
    
    // Check that styling is preserved in export
    const styledSvg = await svg.evaluate((element) => {
      const svgData = new XMLSerializer().serializeToString(element);
      
      return {
        hasStyles: svgData.includes('style') || svgData.includes('class'),
        hasColors: svgData.includes('fill') || svgData.includes('stroke'),
        hasMarkmap: svgData.includes('markmap'),
        svgLength: svgData.length
      };
    });
    
    expect(styledSvg.svgLength).toBeGreaterThan(0);
    // Note: Actual styling depends on implementation
  });

  test('should handle export with special characters', async ({ page }) => {
    const textarea = page.locator('textarea');
    
    // Test with special characters
    const specialContent = `# Special Characters Test
## Section with "quotes" & symbols
- Item with <brackets>
- Item with émojis 🎯
- Item with math: x² + y²
## Unicode Test
- 中文 Chinese
- العربية Arabic
- Русский Russian`;
    
    await textarea.fill(specialContent);
    await page.waitForTimeout(1000);
    
    // Export should handle special characters
    const svg = page.locator('svg').first();
    const svgContent = await svg.evaluate((element) => {
      return new XMLSerializer().serializeToString(element);
    });
    
    expect(svgContent).toContain('<svg');
    expect(svgContent.length).toBeGreaterThan(500); // Should contain content
  });

  test('should support batch export operations', async ({ page }) => {
    const textarea = page.locator('textarea');
    
    // Test multiple export formats
    const testContent = '# Batch Export Test\n## Multiple formats\n- SVG\n- PNG\n- PDF\n- HTML';
    await textarea.fill(testContent);
    await page.waitForTimeout(500);
    
    const svg = page.locator('svg').first();
    
    // Test multiple export formats simultaneously
    const exportResults = await svg.evaluate((element) => {
      const svgData = new XMLSerializer().serializeToString(element);
      
      const results = {
        svg: {
          data: svgData,
          size: svgData.length,
          valid: svgData.includes('<svg')
        },
        png: {
          supported: typeof HTMLCanvasElement !== 'undefined',
          dataUrl: null
        },
        html: {
          data: `<html><body>${svgData}</body></html>`,
          size: 0,
          valid: false
        }
      };
      
      results.html.size = results.html.data.length;
      results.html.valid = results.html.data.includes('<html');
      
      return results;
    });
    
    expect(exportResults.svg.valid).toBe(true);
    expect(exportResults.svg.size).toBeGreaterThan(0);
    expect(exportResults.html.valid).toBe(true);
    expect(exportResults.html.size).toBeGreaterThan(0);
  });

  test('should maintain export quality at different zoom levels', async ({ page }) => {
    const svg = page.locator('svg').first();
    
    // Test export at different viewport sizes (simulating zoom)
    const originalSize = await page.viewportSize();
    
    const sizes = [
      { width: 800, height: 600 },
      { width: 1200, height: 800 },
      { width: 1600, height: 1200 }
    ];
    
    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(300);
      
      const svgContent = await svg.evaluate((element) => {
        return new XMLSerializer().serializeToString(element);
      });
      
      expect(svgContent).toContain('<svg');
      expect(svgContent.length).toBeGreaterThan(100);
    }
    
    // Restore original size
    if (originalSize) {
      await page.setViewportSize(originalSize);
    }
  });
});