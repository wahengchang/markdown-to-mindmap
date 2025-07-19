/**
 * Shared Utilities Module - Mathematical, DOM, and performance helpers
 * Used across all mindmap modules for common operations
 */
(function() {
    'use strict';

    /**
     * Mathematical utility functions
     */
    const MathUtils = {
        /**
         * Calculate Euclidean distance between two points
         * @param {number} x1 - First point X coordinate
         * @param {number} y1 - First point Y coordinate
         * @param {number} x2 - Second point X coordinate
         * @param {number} y2 - Second point Y coordinate
         * @returns {number} Distance between the points
         */
        calculateDistance(x1, y1, x2, y2) {
            const dx = x2 - x1;
            const dy = y2 - y1;
            return Math.sqrt(dx * dx + dy * dy);
        },

        /**
         * Calculate angle from center point to target point in radians
         * @param {number} centerX - Center point X coordinate
         * @param {number} centerY - Center point Y coordinate
         * @param {number} pointX - Target point X coordinate
         * @param {number} pointY - Target point Y coordinate
         * @returns {number} Angle in radians
         */
        calculateAngle(centerX, centerY, pointX, pointY) {
            return Math.atan2(pointY - centerY, pointX - centerX);
        },

        /**
         * Convert degrees to radians
         * @param {number} degrees - Angle in degrees
         * @returns {number} Angle in radians
         */
        degreesToRadians(degrees) {
            return degrees * (Math.PI / 180);
        },

        /**
         * Convert radians to degrees
         * @param {number} radians - Angle in radians
         * @returns {number} Angle in degrees
         */
        radiansToDegrees(radians) {
            return radians * (180 / Math.PI);
        },

        /**
         * Normalize angle to be between 0 and 2π
         * @param {number} angle - Angle in radians
         * @returns {number} Normalized angle
         */
        normalizeAngle(angle) {
            while (angle < 0) angle += 2 * Math.PI;
            while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
            return angle;
        },

        /**
         * Clamp a value between minimum and maximum bounds
         * @param {number} value - Value to clamp
         * @param {number} min - Minimum bound
         * @param {number} max - Maximum bound
         * @returns {number} Clamped value
         */
        clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        },

        /**
         * Linear interpolation between two values
         * @param {number} start - Start value
         * @param {number} end - End value
         * @param {number} factor - Interpolation factor (0-1)
         * @returns {number} Interpolated value
         */
        lerp(start, end, factor) {
            return start + (end - start) * factor;
        }
    };

    /**
     * DOM and SVG utility functions
     */
    const DOMUtils = {
        /**
         * Create an SVG element with specified tag and attributes
         * @param {string} tag - SVG element tag name
         * @param {Object} attributes - Object containing attribute key-value pairs
         * @returns {SVGElement} Created SVG element
         */
        createSVGElement(tag, attributes = {}) {
            const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
            this.setAttributes(element, attributes);
            return element;
        },

        /**
         * Set multiple attributes on an element
         * @param {Element} element - Target element
         * @param {Object} attributes - Object containing attribute key-value pairs
         */
        setAttributes(element, attributes) {
            for (const [key, value] of Object.entries(attributes)) {
                element.setAttribute(key, value);
            }
        },

        /**
         * Get bounding box of an element
         * @param {Element} element - Target element
         * @returns {DOMRect} Bounding box information
         */
        getBoundingBox(element) {
            return element.getBoundingClientRect();
        },

        /**
         * Check if element is visible in viewport
         * @param {Element} element - Target element
         * @returns {boolean} True if element is visible
         */
        isElementVisible(element) {
            const rect = this.getBoundingBox(element);
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= window.innerHeight &&
                rect.right <= window.innerWidth
            );
        }
    };

    /**
     * Performance utility functions
     */
    const PerformanceUtils = {
        /**
         * Debounce function execution
         * @param {Function} func - Function to debounce
         * @param {number} wait - Wait time in milliseconds
         * @returns {Function} Debounced function
         */
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func.apply(this, args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        /**
         * Throttle function execution
         * @param {Function} func - Function to throttle
         * @param {number} limit - Time limit in milliseconds
         * @returns {Function} Throttled function
         */
        throttle(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        /**
         * Measure execution time of a function
         * @param {Function} fn - Function to measure
         * @param {string} label - Label for logging
         * @returns {*} Function result
         */
        measureTime(fn, label = 'Function') {
            const start = performance.now();
            const result = fn();
            const end = performance.now();
            console.log(`${label} execution time: ${(end - start).toFixed(2)}ms`);
            return result;
        },

        /**
         * Request animation frame with fallback
         * @param {Function} callback - Callback function
         * @returns {number} Frame request ID
         */
        requestFrame(callback) {
            return window.requestAnimationFrame || 
                   window.webkitRequestAnimationFrame || 
                   window.mozRequestAnimationFrame || 
                   function(callback) { setTimeout(callback, 16); };
        }
    };

    /**
     * Debugging and logging utilities
     */
    const DebugUtils = {
        /**
         * Enhanced logging with levels
         * @param {string} level - Log level (debug, info, warn, error)
         * @param {string} message - Log message
         * @param {*} data - Additional data to log
         */
        log(level, message, data = null) {
            const timestamp = new Date().toISOString();
            const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
            
            switch (level.toLowerCase()) {
                case 'debug':
                    console.debug(prefix, message, data);
                    break;
                case 'info':
                    console.info(prefix, message, data);
                    break;
                case 'warn':
                    console.warn(prefix, message, data);
                    break;
                case 'error':
                    console.error(prefix, message, data);
                    break;
                default:
                    console.log(prefix, message, data);
            }
        },

        /**
         * Assert condition with error message
         * @param {boolean} condition - Condition to check
         * @param {string} message - Error message if condition fails
         */
        assert(condition, message) {
            if (!condition) {
                throw new Error(`Assertion failed: ${message}`);
            }
        },

        /**
         * Create a performance benchmark
         * @param {string} name - Benchmark name
         * @returns {Object} Benchmark object with start/stop methods
         */
        createBenchmark(name) {
            let startTime;
            return {
                start() {
                    startTime = performance.now();
                    this.log('debug', `Benchmark '${name}' started`);
                },
                stop() {
                    if (startTime) {
                        const duration = performance.now() - startTime;
                        this.log('info', `Benchmark '${name}' completed in ${duration.toFixed(2)}ms`);
                        return duration;
                    }
                    return 0;
                }
            };
        }
    };

    /**
     * String utility functions
     */
    const StringUtils = {
        /**
         * Generate a random ID string
         * @param {number} length - Length of the ID (default: 9)
         * @returns {string} Random ID string
         */
        generateId(length = 9) {
            return Math.random().toString(36).substr(2, length);
        },

        /**
         * Truncate text with ellipsis
         * @param {string} text - Text to truncate
         * @param {number} maxLength - Maximum length
         * @returns {string} Truncated text
         */
        truncate(text, maxLength) {
            if (text.length <= maxLength) return text;
            return text.substr(0, maxLength - 3) + '...';
        },

        /**
         * Escape HTML special characters
         * @param {string} text - Text to escape
         * @returns {string} Escaped text
         */
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };

    // Expose utilities to global namespace
    if (typeof window !== 'undefined') {
        window.TreeInteraction = window.TreeInteraction || {};
        window.TreeInteraction.Utils = {
            Math: MathUtils,
            DOM: DOMUtils,
            Performance: PerformanceUtils,
            Debug: DebugUtils,
            String: StringUtils
        };
    } else if (typeof module !== 'undefined' && module.exports) {
        // Node.js environment support
        module.exports = {
            MathUtils,
            DOMUtils,
            PerformanceUtils,
            DebugUtils,
            StringUtils
        };
    }

})();