// svg-exporter.js
// T007: Export current mindmap view as SVG or standalone HTML

/**
 * Export the current mindmap as SVG file.
 * @param {string|Element} svgSelector - CSS selector or SVG DOM element
 * @param {Object} [options]
 *   - filename: string (optional)
 *   - includeStyles: boolean (default: true)
 */
function exportAsSVG(svgSelector, options = {}) {
    const svgElement = resolveSVG(svgSelector);
    const svgString = getSVGString(svgElement, options.includeStyles !== false);
    const filename = options.filename || `mindmap-${timestamp()}.svg`;
    downloadFile(svgString, filename, 'image/svg+xml');
}

/**
 * Export the current mindmap as standalone HTML file (SVG embedded in HTML).
 * @param {string|Element} svgSelector - CSS selector or SVG DOM element
 * @param {Object} [options]
 *   - filename: string (optional)
 *   - includeStyles: boolean (default: true)
 */
function exportAsHTML(svgSelector, options = {}) {
    const svgElement = resolveSVG(svgSelector);
    const svgString = getSVGString(svgElement, options.includeStyles !== false);
    const htmlString = wrapSVGInHTML(svgString);
    const filename = options.filename || `mindmap-${timestamp()}.html`;
    downloadFile(htmlString, filename, 'text/html');
}

function resolveSVG(svgSelector) {
    if (typeof svgSelector === 'string') {
        return document.querySelector(svgSelector);
    }
    return svgSelector;
}

function getSVGString(svgElement, includeStyles = true) {
    const clone = svgElement.cloneNode(true);
    if (includeStyles) {
        inlineStyles(clone);
    }
    return new XMLSerializer().serializeToString(clone);
}

function inlineStyles(svg) {
    // Inline computed styles for all elements in SVG
    const allElements = svg.querySelectorAll('*');
    allElements.forEach(el => {
        const computed = window.getComputedStyle(el);
        let style = '';
        for (let i = 0; i < computed.length; i++) {
            const key = computed[i];
            style += `${key}:${computed.getPropertyValue(key)};`;
        }
        el.setAttribute('style', style);
    });
}

function wrapSVGInHTML(svgString) {
    return `<!DOCTYPE html>\n<html><head><meta charset='UTF-8'><title>Mindmap Export</title></head><body>${svgString}</body></html>`;
}

function downloadFile(data, filename, mimeType) {
    const blob = new Blob([data], {type: mimeType});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

function timestamp() {}

// Expose for browser global usage
if (typeof window !== 'undefined') {
    window.exportAsSVG = exportAsSVG;
    window.exportAsHTML = exportAsHTML;
}

function timestamp() {
    const now = new Date();
    return now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
}
