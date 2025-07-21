/**
 * Enhanced Export Manager - T023 Implementation
 * Comprehensive export functionality supporting SVG, PNG, PDF, and HTML formats
 * 
 * @module ExportManager
 * @requires SVGExporter from svg-exporter.js
 * @requires EventBus from event-manager.js (optional)
 */

(function() {
    'use strict';

    // Import dependencies
    const EventBus = (typeof window !== 'undefined' && window.MindmapEvents) || null;
    const SVGExporter = (typeof window !== 'undefined' && window.MarkdownMindmap?.SVGExporter) || null;
    const Debug = (typeof window !== 'undefined' && window.TreeInteraction?.Utils?.Debug) || {};

    /**
     * Export Configuration
     */
    const ExportConfig = {
        // Quality settings
        pngQuality: 1.0,
        pngScale: 2.0, // For high-DPI displays
        jpegQuality: 0.9,
        
        // PDF settings
        pdfFormat: 'a4',
        pdfOrientation: 'landscape',
        pdfMargin: 20,
        
        // Canvas settings
        canvasBackgroundColor: '#ffffff',
        canvasMaxWidth: 4096,
        canvasMaxHeight: 4096,
        
        // Processing settings
        processingTimeout: 30000, // 30 seconds
        chunkSize: 1024 * 1024, // 1MB chunks for large files
        
        // User feedback
        showProgress: true,
        showNotifications: true,
        enableBulkExport: true,
        
        // File naming
        timestampFormat: 'yyyyMMdd_HHmmss',
        defaultPrefix: 'mindmap',
        
        // Browser compatibility
        fallbackToSVG: true,
        checkWebGL: true
    };

    /**
     * Enhanced Export Manager Class
     */
    class ExportManager {
        constructor(options = {}) {
            this.config = { ...ExportConfig, ...options };
            this.isProcessing = false;
            this.supportedFormats = new Set();
            this.canvasCache = new Map();
            
            // Performance tracking
            this.stats = {
                totalExports: 0,
                successfulExports: 0,
                failedExports: 0,
                averageExportTime: 0,
                formatUsage: {},
                lastExportTime: null
            };
            
            this.initializeExportManager();
        }

        /**
         * Initialize export manager and detect capabilities
         */
        initializeExportManager() {
            this.detectBrowserCapabilities();
            this.setupEventListeners();
            
            if (EventBus) {
                EventBus.emit('export-manager:initialized', {
                    supportedFormats: Array.from(this.supportedFormats),
                    config: this.config
                });
            }

            if (Debug?.log) {
                Debug.log('info', 'Export Manager initialized', {
                    supportedFormats: Array.from(this.supportedFormats),
                    hasWebGL: this.hasWebGL
                });
            }
        }

        /**
         * Detect browser capabilities for export formats
         */
        detectBrowserCapabilities() {
            // SVG support (always available in modern browsers)
            this.supportedFormats.add('svg');
            this.supportedFormats.add('html');
            
            // Canvas support for PNG/JPEG
            const canvas = document.createElement('canvas');
            if (canvas.getContext && canvas.getContext('2d')) {
                this.supportedFormats.add('png');
                this.supportedFormats.add('jpeg');
                this.canvasSupported = true;
            }
            
            // Check for WebGL (better performance for large canvases)
            if (this.config.checkWebGL) {
                try {
                    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                    this.hasWebGL = !!gl;
                } catch (e) {
                    this.hasWebGL = false;
                }
            }
            
            // PDF support (using client-side generation)
            if (typeof window !== 'undefined' && window.jsPDF) {
                this.supportedFormats.add('pdf');
                this.pdfSupported = true;
            } else {
                // PDF can still be generated using canvas->image->pdf
                this.supportedFormats.add('pdf');
                this.pdfSupported = 'canvas';
            }
            
            // Cleanup test canvas
            canvas.remove();
        }

        /**
         * Setup event listeners for export actions
         */
        setupEventListeners() {
            if (!EventBus) return;

            EventBus.on('export:request', (data) => {
                this.exportMindmap(data.format, data.options);
            });

            EventBus.on('export:bulk', (data) => {
                if (this.config.enableBulkExport) {
                    this.bulkExport(data.formats, data.options);
                }
            });

            EventBus.on('export:cancel', () => {
                this.cancelExport();
            });
        }

        /**
         * Main export function - handles all formats
         * @param {string} format - Export format (svg, png, pdf, html, jpeg)
         * @param {Object} options - Export options
         * @returns {Promise<boolean>} Success status
         */
        async exportMindmap(format, options = {}) {
            if (this.isProcessing) {
                this.showNotification('Export already in progress', 'warning');
                return false;
            }

            const startTime = performance.now();
            this.isProcessing = true;

            try {
                // Validate format
                if (!this.supportedFormats.has(format)) {
                    throw new Error(`Format '${format}' is not supported`);
                }

                // Get SVG element
                const svgElement = this.getSVGElement(options.svgSelector);
                if (!svgElement) {
                    throw new Error('SVG element not found');
                }

                // Show progress if enabled
                if (this.config.showProgress) {
                    this.showProgress(0, `Preparing ${format.toUpperCase()} export...`);
                }

                // Route to appropriate export method
                let success = false;
                switch (format.toLowerCase()) {
                    case 'svg':
                        success = await this.exportSVG(svgElement, options);
                        break;
                    case 'png':
                    case 'jpeg':
                        success = await this.exportRasterImage(svgElement, format, options);
                        break;
                    case 'pdf':
                        success = await this.exportPDF(svgElement, options);
                        break;
                    case 'html':
                        success = await this.exportHTML(svgElement, options);
                        break;
                    default:
                        throw new Error(`Unknown format: ${format}`);
                }

                // Update statistics
                const exportTime = performance.now() - startTime;
                this.updateStats(format, success, exportTime);

                if (success) {
                    this.showNotification(`${format.toUpperCase()} exported successfully`, 'success');
                    if (EventBus) {
                        EventBus.emit('export:completed', { format, exportTime, success: true });
                    }
                }

                return success;

            } catch (error) {
                console.error('Export failed:', error);
                this.showNotification(`Export failed: ${error.message}`, 'error');
                this.updateStats(format, false, performance.now() - startTime);
                
                if (EventBus) {
                    EventBus.emit('export:failed', { format, error: error.message });
                }
                
                return false;
            } finally {
                this.isProcessing = false;
                this.hideProgress();
            }
        }

        /**
         * Export as SVG format
         * @param {SVGElement} svgElement - Source SVG element
         * @param {Object} options - Export options
         * @returns {Promise<boolean>} Success status
         */
        async exportSVG(svgElement, options) {
            if (SVGExporter) {
                // Use existing SVG exporter
                SVGExporter.exportAsSVG(svgElement, {
                    filename: this.generateFilename('svg', options),
                    includeStyles: options.includeStyles !== false
                });
                return true;
            }

            // Fallback implementation
            const svgString = this.getSVGString(svgElement, options.includeStyles !== false);
            const filename = this.generateFilename('svg', options);
            this.downloadFile(svgString, filename, 'image/svg+xml');
            return true;
        }

        /**
         * Export as HTML format
         * @param {SVGElement} svgElement - Source SVG element
         * @param {Object} options - Export options
         * @returns {Promise<boolean>} Success status
         */
        async exportHTML(svgElement, options) {
            if (SVGExporter) {
                SVGExporter.exportAsHTML(svgElement, {
                    filename: this.generateFilename('html', options),
                    includeStyles: options.includeStyles !== false
                });
                return true;
            }

            // Fallback implementation
            const svgString = this.getSVGString(svgElement, options.includeStyles !== false);
            const htmlString = this.wrapSVGInHTML(svgString, options);
            const filename = this.generateFilename('html', options);
            this.downloadFile(htmlString, filename, 'text/html');
            return true;
        }

        /**
         * Export as raster image (PNG/JPEG)
         * @param {SVGElement} svgElement - Source SVG element
         * @param {string} format - Image format (png/jpeg)
         * @param {Object} options - Export options
         * @returns {Promise<boolean>} Success status
         */
        async exportRasterImage(svgElement, format, options) {
            if (!this.canvasSupported) {
                throw new Error('Canvas not supported in this browser');
            }

            const canvas = await this.svgToCanvas(svgElement, options);
            if (!canvas) {
                throw new Error('Failed to convert SVG to canvas');
            }

            const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
            const quality = format === 'jpeg' ? this.config.jpegQuality : this.config.pngQuality;
            
            return new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    if (blob) {
                        const filename = this.generateFilename(format, options);
                        this.downloadBlob(blob, filename);
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                }, mimeType, quality);
            });
        }

        /**
         * Export as PDF format
         * @param {SVGElement} svgElement - Source SVG element  
         * @param {Object} options - Export options
         * @returns {Promise<boolean>} Success status
         */
        async exportPDF(svgElement, options) {
            if (this.pdfSupported === true && window.jsPDF) {
                // Direct PDF generation with jsPDF
                return this.exportPDFDirect(svgElement, options);
            } else {
                // PDF via canvas conversion
                return this.exportPDFViaCanvas(svgElement, options);
            }
        }

        /**
         * Export PDF using direct jsPDF approach
         * @param {SVGElement} svgElement - Source SVG element
         * @param {Object} options - Export options
         * @returns {Promise<boolean>} Success status
         */
        async exportPDFDirect(svgElement, options) {
            const { jsPDF } = window;
            const svgString = this.getSVGString(svgElement, true);
            
            // Create PDF document
            const pdf = new jsPDF({
                orientation: options.orientation || this.config.pdfOrientation,
                unit: 'mm',
                format: options.format || this.config.pdfFormat
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = this.config.pdfMargin;

            try {
                // Add SVG to PDF (if jsPDF supports it)
                await new Promise((resolve, reject) => {
                    pdf.svg(svgString, {
                        x: margin,
                        y: margin,
                        width: pageWidth - 2 * margin,
                        height: pageHeight - 2 * margin
                    });
                    resolve();
                });

                const filename = this.generateFilename('pdf', options);
                pdf.save(filename);
                return true;
            } catch (error) {
                console.warn('Direct PDF export failed, falling back to canvas method');
                return this.exportPDFViaCanvas(svgElement, options);
            }
        }

        /**
         * Export PDF via canvas conversion
         * @param {SVGElement} svgElement - Source SVG element
         * @param {Object} options - Export options
         * @returns {Promise<boolean>} Success status
         */
        async exportPDFViaCanvas(svgElement, options) {
            const canvas = await this.svgToCanvas(svgElement, {
                ...options,
                scale: 2.0 // Higher resolution for PDF
            });

            if (!canvas) {
                throw new Error('Failed to convert SVG to canvas for PDF');
            }

            const { jsPDF } = window.jsPDF ? window : { jsPDF: this.createFallbackPDF };
            const pdf = new jsPDF({
                orientation: options.orientation || this.config.pdfOrientation,
                unit: 'mm',
                format: options.format || this.config.pdfFormat
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = this.config.pdfMargin;

            // Calculate dimensions
            const canvasAspectRatio = canvas.width / canvas.height;
            const availableWidth = pageWidth - 2 * margin;
            const availableHeight = pageHeight - 2 * margin;
            const availableAspectRatio = availableWidth / availableHeight;

            let imgWidth, imgHeight;
            if (canvasAspectRatio > availableAspectRatio) {
                // Canvas is wider than available space
                imgWidth = availableWidth;
                imgHeight = availableWidth / canvasAspectRatio;
            } else {
                // Canvas is taller than available space
                imgHeight = availableHeight;
                imgWidth = availableHeight * canvasAspectRatio;
            }

            // Center the image
            const x = (pageWidth - imgWidth) / 2;
            const y = (pageHeight - imgHeight) / 2;

            // Add image to PDF
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);

            const filename = this.generateFilename('pdf', options);
            pdf.save(filename);
            return true;
        }

        /**
         * Convert SVG to Canvas element
         * @param {SVGElement} svgElement - Source SVG element
         * @param {Object} options - Conversion options
         * @returns {Promise<HTMLCanvasElement>} Canvas element
         */
        async svgToCanvas(svgElement, options = {}) {
            return new Promise((resolve, reject) => {
                try {
                    // Get SVG dimensions
                    const bbox = svgElement.getBBox();
                    const svgRect = svgElement.getBoundingClientRect();
                    
                    const scale = options.scale || this.config.pngScale;
                    const width = Math.min(svgRect.width * scale, this.config.canvasMaxWidth);
                    const height = Math.min(svgRect.height * scale, this.config.canvasMaxHeight);

                    // Create canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = options.backgroundColor || this.config.canvasBackgroundColor;
                    ctx.fillRect(0, 0, width, height);

                    // Create image from SVG
                    const svgString = this.getSVGString(svgElement, true);
                    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                    const url = URL.createObjectURL(svgBlob);

                    const img = new Image();
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0, width, height);
                        URL.revokeObjectURL(url);
                        resolve(canvas);
                    };
                    img.onerror = () => {
                        URL.revokeObjectURL(url);
                        reject(new Error('Failed to load SVG as image'));
                    };
                    img.src = url;

                } catch (error) {
                    reject(error);
                }
            });
        }

        /**
         * Bulk export multiple formats
         * @param {Array<string>} formats - Array of formats to export
         * @param {Object} options - Export options
         * @returns {Promise<Object>} Results for each format
         */
        async bulkExport(formats, options = {}) {
            if (!this.config.enableBulkExport) {
                throw new Error('Bulk export is disabled');
            }

            const results = {};
            let completed = 0;
            const total = formats.length;

            for (const format of formats) {
                try {
                    this.showProgress(completed / total * 100, `Exporting ${format.toUpperCase()}...`);
                    results[format] = await this.exportMindmap(format, options);
                } catch (error) {
                    results[format] = false;
                    console.error(`Bulk export failed for ${format}:`, error);
                }
                completed++;
            }

            const successCount = Object.values(results).filter(Boolean).length;
            this.showNotification(
                `Bulk export completed: ${successCount}/${total} successful`, 
                successCount === total ? 'success' : 'warning'
            );

            return results;
        }

        /**
         * Get SVG element from selector or default location
         * @param {string|Element} selector - SVG selector or element
         * @returns {SVGElement} SVG element
         */
        getSVGElement(selector) {
            if (selector) {
                return typeof selector === 'string' ? 
                    document.querySelector(selector) : selector;
            }
            
            // Default locations to check
            const defaultSelectors = [
                '#mindmapContainer svg',
                '.mindmap-container svg',
                'svg[class*="mindmap"]',
                'svg'
            ];
            
            for (const sel of defaultSelectors) {
                const element = document.querySelector(sel);
                if (element) return element;
            }
            
            return null;
        }

        /**
         * Get SVG string with styles
         * @param {SVGElement} svgElement - SVG element
         * @param {boolean} includeStyles - Whether to inline styles
         * @returns {string} SVG string
         */
        getSVGString(svgElement, includeStyles = true) {
            if (SVGExporter && SVGExporter.getSVGString) {
                return SVGExporter.getSVGString(svgElement, includeStyles);
            }

            // Fallback implementation
            const clone = svgElement.cloneNode(true);
            if (includeStyles) {
                this.inlineStyles(clone);
            }
            return new XMLSerializer().serializeToString(clone);
        }

        /**
         * Inline computed styles (fallback implementation)
         * @param {SVGElement} svg - SVG element
         */
        inlineStyles(svg) {
            const elements = svg.querySelectorAll('*');
            elements.forEach(el => {
                const computedStyle = window.getComputedStyle(el);
                let inlineStyle = '';
                
                // Copy key style properties
                const importantProps = [
                    'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity',
                    'font-family', 'font-size', 'font-weight', 'text-anchor'
                ];
                
                importantProps.forEach(prop => {
                    const value = computedStyle.getPropertyValue(prop);
                    if (value && value !== 'initial') {
                        inlineStyle += `${prop}: ${value}; `;
                    }
                });
                
                if (inlineStyle) {
                    el.setAttribute('style', inlineStyle);
                }
            });
        }

        /**
         * Wrap SVG in HTML document
         * @param {string} svgString - SVG content
         * @param {Object} options - HTML options
         * @returns {string} HTML document
         */
        wrapSVGInHTML(svgString, options = {}) {
            const title = options.title || 'Mindmap Export';
            const timestamp = new Date().toLocaleString();
            
            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { 
            margin: 0; 
            padding: 20px; 
            background: #f5f5f5; 
            font-family: system-ui, sans-serif;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 20px;
        }
        svg { 
            max-width: 100%; 
            height: auto; 
            display: block;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            color: #333;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${title}</h1>
        </div>
        ${svgString}
        <div class="footer">
            <p>Generated by Markdown-to-Mindmap on ${timestamp}</p>
        </div>
    </div>
</body>
</html>`;
        }

        /**
         * Generate filename for export
         * @param {string} extension - File extension
         * @param {Object} options - Export options
         * @returns {string} Generated filename
         */
        generateFilename(extension, options = {}) {
            if (options.filename) {
                return options.filename.includes('.') ? options.filename : `${options.filename}.${extension}`;
            }
            
            const timestamp = this.generateTimestamp();
            const prefix = options.prefix || this.config.defaultPrefix;
            return `${prefix}-${timestamp}.${extension}`;
        }

        /**
         * Generate timestamp for filenames
         * @returns {string} Formatted timestamp
         */
        generateTimestamp() {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            
            return `${year}${month}${day}_${hours}${minutes}${seconds}`;
        }

        /**
         * Download file to user's computer
         * @param {string} data - File content
         * @param {string} filename - Download filename
         * @param {string} mimeType - MIME type
         */
        downloadFile(data, filename, mimeType) {
            const blob = new Blob([data], { type: mimeType });
            this.downloadBlob(blob, filename);
        }

        /**
         * Download blob to user's computer
         * @param {Blob} blob - File blob
         * @param {string} filename - Download filename
         */
        downloadBlob(blob, filename) {
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
         * Show progress indicator
         * @param {number} percent - Progress percentage
         * @param {string} message - Progress message
         */
        showProgress(percent, message) {
            if (!this.config.showProgress) return;
            
            if (EventBus) {
                EventBus.emit('export:progress', { percent, message });
            }
            
            // Fallback progress display
            console.log(`Export Progress: ${percent.toFixed(1)}% - ${message}`);
        }

        /**
         * Hide progress indicator
         */
        hideProgress() {
            if (EventBus) {
                EventBus.emit('export:progress-hidden');
            }
        }

        /**
         * Show notification message
         * @param {string} message - Notification message
         * @param {string} type - Notification type (success, error, warning)
         */
        showNotification(message, type = 'info') {
            if (!this.config.showNotifications) return;
            
            if (EventBus) {
                EventBus.emit('notification:show', { message, type });
            }
            
            // Fallback notification
            if (window.MarkdownMindmap?.UIComponents?.showNotification) {
                window.MarkdownMindmap.UIComponents.showNotification(message, type);
            } else {
                console.log(`${type.toUpperCase()}: ${message}`);
            }
        }

        /**
         * Update export statistics
         * @param {string} format - Export format
         * @param {boolean} success - Success status
         * @param {number} exportTime - Export time in milliseconds
         */
        updateStats(format, success, exportTime) {
            this.stats.totalExports++;
            if (success) {
                this.stats.successfulExports++;
            } else {
                this.stats.failedExports++;
            }
            
            // Update average export time
            const totalTime = this.stats.averageExportTime * (this.stats.totalExports - 1) + exportTime;
            this.stats.averageExportTime = totalTime / this.stats.totalExports;
            
            // Update format usage
            this.stats.formatUsage[format] = (this.stats.formatUsage[format] || 0) + 1;
            this.stats.lastExportTime = new Date().toISOString();
        }

        /**
         * Cancel ongoing export operation
         */
        cancelExport() {
            if (this.isProcessing) {
                this.isProcessing = false;
                this.hideProgress();
                this.showNotification('Export cancelled', 'warning');
                
                if (EventBus) {
                    EventBus.emit('export:cancelled');
                }
            }
        }

        /**
         * Get supported export formats
         * @returns {Array<string>} Supported formats
         */
        getSupportedFormats() {
            return Array.from(this.supportedFormats);
        }

        /**
         * Check if format is supported
         * @param {string} format - Format to check
         * @returns {boolean} Support status
         */
        isFormatSupported(format) {
            return this.supportedFormats.has(format.toLowerCase());
        }

        /**
         * Get export statistics
         * @returns {Object} Export statistics
         */
        getStats() {
            return {
                ...this.stats,
                isProcessing: this.isProcessing,
                supportedFormats: Array.from(this.supportedFormats),
                successRate: this.stats.totalExports > 0 ? 
                    (this.stats.successfulExports / this.stats.totalExports) * 100 : 0
            };
        }

        /**
         * Update export configuration
         * @param {Object} newConfig - Configuration updates
         */
        updateConfig(newConfig) {
            this.config = { ...this.config, ...newConfig };
        }

        /**
         * Reset statistics
         */
        resetStats() {
            this.stats = {
                totalExports: 0,
                successfulExports: 0,
                failedExports: 0,
                averageExportTime: 0,
                formatUsage: {},
                lastExportTime: null
            };
        }
    }

    // Create global instance
    const exportManager = new ExportManager();

    // Expose to global namespace
    if (typeof window !== 'undefined') {
        window.TreeInteraction = window.TreeInteraction || {};
        
        // Enhanced Export Manager interface
        window.TreeInteraction.ExportManager = {
            exportMindmap: exportManager.exportMindmap.bind(exportManager),
            bulkExport: exportManager.bulkExport.bind(exportManager),
            cancelExport: exportManager.cancelExport.bind(exportManager),
            getSupportedFormats: exportManager.getSupportedFormats.bind(exportManager),
            isFormatSupported: exportManager.isFormatSupported.bind(exportManager),
            updateConfig: exportManager.updateConfig.bind(exportManager),
            getStats: exportManager.getStats.bind(exportManager),
            resetStats: exportManager.resetStats.bind(exportManager),
            
            // Convenience methods
            exportAsSVG: (options) => exportManager.exportMindmap('svg', options),
            exportAsPNG: (options) => exportManager.exportMindmap('png', options),
            exportAsPDF: (options) => exportManager.exportMindmap('pdf', options),
            exportAsHTML: (options) => exportManager.exportMindmap('html', options),
            
            // Getters
            get isProcessing() { return exportManager.isProcessing; },
            get supportedFormats() { return exportManager.getSupportedFormats(); },
            get stats() { return exportManager.getStats(); }
        };

        if (Debug?.log) {
            Debug.log('info', 'Enhanced Export Manager module loaded', {
                globalInterface: 'window.TreeInteraction.ExportManager',
                supportedFormats: exportManager.getSupportedFormats()
            });
        }
    } else if (typeof module !== 'undefined' && module.exports) {
        // Node.js environment support
        module.exports = { 
            ExportManager, 
            ExportConfig 
        };
    }

})();