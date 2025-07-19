/**
 * SVG Exporter Module
 * Export mindmap visualization as SVG or HTML files
 * 
 * @module SVGExporter
 */

(function() {
    'use strict';

    /**
     * Generate timestamp for filename
     * @returns {string} Formatted timestamp
     */
    function generateTimestamp() {
        const now = new Date();
        return now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    }

    /**
     * Export the current mindmap as SVG file.
     * @param {string|Element} svgSelector - CSS selector or SVG DOM element
     * @param {Object} [options]
     *   - filename: string (optional)
     *   - includeStyles: boolean (default: true)
     */
    function exportAsSVG(svgSelector, options = {}) {
        try {
            const svgElement = resolveSVG(svgSelector);
            if (!svgElement) {
                throw new Error('SVG element not found');
            }
            
            const svgString = getSVGString(svgElement, options.includeStyles !== false);
            const filename = options.filename || `mindmap-${generateTimestamp()}.svg`;
            downloadFile(svgString, filename, 'image/svg+xml');
            
            // Show success notification if available
            if (window.MarkdownMindmap?.UIComponents?.showNotification) {
                window.MarkdownMindmap.UIComponents.showNotification('SVG exported successfully', 'success');
            }
        } catch (error) {
            console.error('SVG export failed:', error);
            if (window.MarkdownMindmap?.UIComponents?.showNotification) {
                window.MarkdownMindmap.UIComponents.showNotification('SVG export failed: ' + error.message, 'error');
            }
        }
    }

    /**
     * Export the current mindmap as standalone HTML file (SVG embedded in HTML).
     * @param {string|Element} svgSelector - CSS selector or SVG DOM element
     * @param {Object} [options]
     *   - filename: string (optional)
     *   - includeStyles: boolean (default: true)
     */
    function exportAsHTML(svgSelector, options = {}) {
        try {
            const svgElement = resolveSVG(svgSelector);
            if (!svgElement) {
                throw new Error('SVG element not found');
            }
            
            const svgString = getSVGString(svgElement, options.includeStyles !== false);
            const htmlString = wrapSVGInHTML(svgString);
            const filename = options.filename || `mindmap-${generateTimestamp()}.html`;
            downloadFile(htmlString, filename, 'text/html');
            
            // Show success notification if available
            if (window.MarkdownMindmap?.UIComponents?.showNotification) {
                window.MarkdownMindmap.UIComponents.showNotification('HTML exported successfully', 'success');
            }
        } catch (error) {
            console.error('HTML export failed:', error);
            if (window.MarkdownMindmap?.UIComponents?.showNotification) {
                window.MarkdownMindmap.UIComponents.showNotification('HTML export failed: ' + error.message, 'error');
            }
        }
    }

    /**
     * Resolve SVG element from selector or element
     * @param {string|Element} svgSelector - CSS selector or SVG DOM element
     * @returns {Element} SVG element
     */
    function resolveSVG(svgSelector) {
        if (typeof svgSelector === 'string') {
            return document.querySelector(svgSelector);
        }
        return svgSelector;
    }

    /**
     * Convert SVG element to string with optional style inlining
     * @param {Element} svgElement - SVG element
     * @param {boolean} includeStyles - Whether to inline styles
     * @returns {string} SVG string
     */
    function getSVGString(svgElement, includeStyles = true) {
        const clone = svgElement.cloneNode(true);
        if (includeStyles) {
            inlineStyles(clone);
        }
        return new XMLSerializer().serializeToString(clone);
    }

    /**
     * Inline computed styles for all elements in SVG
     * @param {Element} svg - SVG element
     */
    function inlineStyles(svg) {
        const allElements = svg.querySelectorAll('*');
        allElements.forEach(el => {
            const computed = window.getComputedStyle(el);
            let style = '';
            for (let i = 0; i < computed.length; i++) {
                const key = computed[i];
                const value = computed.getPropertyValue(key);
                if (value && value !== 'initial' && value !== 'inherit') {
                    style += `${key}:${value};`;
                }
            }
            if (style) {
                el.setAttribute('style', style);
            }
        });
    }

    /**
     * Wrap SVG string in HTML document
     * @param {string} svgString - SVG content
     * @returns {string} Complete HTML document
     */
    function wrapSVGInHTML(svgString) {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <title>Mindmap Export</title>
    <style>
        body { margin: 0; padding: 20px; background: #f5f5f5; }
        svg { max-width: 100%; height: auto; background: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    ${svgString}
    <p style="margin-top: 20px; color: #666; font-family: Arial, sans-serif; font-size: 12px;">
        Generated by Markdown-to-Mindmap on ${new Date().toLocaleString()}
    </p>
</body>
</html>`;
    }

    /**
     * Download file to user's computer
     * @param {string} data - File content
     * @param {string} filename - Download filename
     * @param {string} mimeType - MIME type
     */
    function downloadFile(data, filename, mimeType) {
        const blob = new Blob([data], {type: mimeType});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    /**
     * Get current SVG string for export
     * @returns {string} SVG content or null if not found
     */
    function getCurrentSVGString() {
        const svg = document.querySelector('#mindmapContainer svg');
        return svg ? getSVGString(svg, true) : null;
    }

    // Create global namespace
    if (typeof window !== 'undefined') {
        window.MarkdownMindmap = window.MarkdownMindmap || {};
        window.MarkdownMindmap.SVGExporter = {
            exportAsSVG,
            exportAsHTML,
            getSVGString,
            getCurrentSVGString,
            generateFilename: (prefix, extension) => `${prefix}-${generateTimestamp()}.${extension}`
        };
    }

    // Export for module systems if available
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            exportAsSVG,
            exportAsHTML,
            getSVGString,
            getCurrentSVGString
        };
    }

})();
