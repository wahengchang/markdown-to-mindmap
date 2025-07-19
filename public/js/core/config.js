/**
 * Configuration Manager Module
 * Centralized settings management with local storage persistence
 * 
 * @module ConfigManager
 */

(function() {
    'use strict';

    // Default configuration schema
    const DEFAULT_CONFIG = {
        theme: {
            mode: 'light',              // 'light' | 'dark' | 'auto'
            colors: {
                primary: '#3b82f6',
                background: '#ffffff',
                text: '#1f2937',
                nodes: ['#dbeafe', '#fef3c7', '#d1fae5', '#fce7f3', '#e0e7ff']
            },
            fonts: {
                family: 'system-ui, sans-serif',
                size: {
                    base: 14,
                    node: 12,
                    header: 16
                }
            }
        },
        layout: {
            algorithm: 'radial',        // 'radial' | 'tree' | 'force'
            spacing: {
                radius: 120,
                increment: 90,
                minAngle: 0.6
            },
            animation: {
                duration: 300,
                easing: 'ease-in-out'
            }
        },
        export: {
            format: 'svg',              // 'svg' | 'html' | 'png'
            quality: 'high',            // 'low' | 'medium' | 'high'
            dimensions: {
                width: 1200,
                height: 800
            },
            includeStyles: true,
            timestampFilenames: true
        },
        accessibility: {
            reducedMotion: false,
            highContrast: false,
            fontSize: 'normal'          // 'small' | 'normal' | 'large'
        },
        performance: {
            debounceMs: 300,
            maxNodes: 1000,
            enableStats: false
        }
    };

    // Configuration storage key
    const STORAGE_KEY = 'markdownMindmap.config';
    
    // Current configuration state
    let currentConfig = {};
    
    // Change listeners
    const listeners = new Map();

    /**
     * Deep clone an object
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    function deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => deepClone(item));
        
        const cloned = {};
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }

    /**
     * Get nested property value using dot notation
     * @param {Object} obj - Source object
     * @param {string} path - Dot-separated path (e.g., 'theme.colors.primary')
     * @param {*} defaultValue - Default value if path not found
     * @returns {*} Property value or default
     */
    function getNestedValue(obj, path, defaultValue) {
        const keys = path.split('.');
        let current = obj;
        
        for (let key of keys) {
            if (current === null || current === undefined || !(key in current)) {
                return defaultValue;
            }
            current = current[key];
        }
        
        return current;
    }

    /**
     * Set nested property value using dot notation
     * @param {Object} obj - Target object
     * @param {string} path - Dot-separated path
     * @param {*} value - Value to set
     */
    function setNestedValue(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
    }

    /**
     * Load configuration from local storage
     * @returns {Object} Loaded configuration
     */
    function loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return { ...deepClone(DEFAULT_CONFIG), ...parsed };
            }
        } catch (error) {
            console.warn('Failed to load configuration from storage:', error);
        }
        
        return deepClone(DEFAULT_CONFIG);
    }

    /**
     * Save configuration to local storage
     * @param {Object} config - Configuration to save
     */
    function saveToStorage(config) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        } catch (error) {
            console.warn('Failed to save configuration to storage:', error);
        }
    }

    /**
     * Notify listeners of configuration changes
     * @param {string} key - Changed configuration key
     * @param {*} newValue - New value
     * @param {*} oldValue - Previous value
     */
    function notifyListeners(key, newValue, oldValue) {
        if (listeners.has(key)) {
            listeners.get(key).forEach(callback => {
                try {
                    callback(newValue, oldValue, key);
                } catch (error) {
                    console.error('Configuration listener error:', error);
                }
            });
        }
    }

    /**
     * Get configuration value
     * @param {string} key - Configuration key (supports dot notation)
     * @param {*} defaultValue - Default value if key not found
     * @returns {*} Configuration value
     */
    function get(key, defaultValue) {
        const value = getNestedValue(currentConfig, key, undefined);
        if (value !== undefined) {
            return value;
        }
        
        // Fallback to default config
        return getNestedValue(DEFAULT_CONFIG, key, defaultValue);
    }

    /**
     * Set configuration value
     * @param {string} key - Configuration key (supports dot notation)
     * @param {*} value - Value to set
     */
    function set(key, value) {
        const oldValue = get(key);
        setNestedValue(currentConfig, key, value);
        saveToStorage(currentConfig);
        notifyListeners(key, value, oldValue);
    }

    /**
     * Reset configuration key to default value
     * @param {string} key - Configuration key to reset
     */
    function reset(key) {
        const defaultValue = getNestedValue(DEFAULT_CONFIG, key);
        if (defaultValue !== undefined) {
            set(key, deepClone(defaultValue));
        }
    }

    /**
     * Reset all configuration to defaults
     */
    function resetAll() {
        const oldConfig = deepClone(currentConfig);
        currentConfig = deepClone(DEFAULT_CONFIG);
        saveToStorage(currentConfig);
        
        // Notify all listeners
        for (let [key, callbacks] of listeners) {
            const newValue = get(key);
            const oldValue = getNestedValue(oldConfig, key);
            if (newValue !== oldValue) {
                callbacks.forEach(callback => {
                    try {
                        callback(newValue, oldValue, key);
                    } catch (error) {
                        console.error('Configuration listener error:', error);
                    }
                });
            }
        }
    }

    /**
     * Export current configuration as JSON
     * @returns {Object} Current configuration
     */
    function exportConfig() {
        return deepClone(currentConfig);
    }

    /**
     * Import configuration from object
     * @param {Object} configObject - Configuration to import
     * @param {boolean} merge - Whether to merge with existing config (default: true)
     */
    function importConfig(configObject, merge = true) {
        const oldConfig = deepClone(currentConfig);
        
        if (merge) {
            currentConfig = { ...currentConfig, ...configObject };
        } else {
            currentConfig = { ...deepClone(DEFAULT_CONFIG), ...configObject };
        }
        
        saveToStorage(currentConfig);
        
        // Notify relevant listeners
        const checkAndNotify = (obj, prefix = '') => {
            for (let key in obj) {
                const fullKey = prefix ? `${prefix}.${key}` : key;
                const newValue = get(fullKey);
                const oldValue = getNestedValue(oldConfig, fullKey);
                
                if (newValue !== oldValue) {
                    notifyListeners(fullKey, newValue, oldValue);
                }
                
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    checkAndNotify(obj[key], fullKey);
                }
            }
        };
        
        checkAndNotify(configObject);
    }

    /**
     * Subscribe to configuration changes
     * @param {string} key - Configuration key to watch
     * @param {Function} callback - Callback function (newValue, oldValue, key) => void
     */
    function subscribe(key, callback) {
        if (!listeners.has(key)) {
            listeners.set(key, []);
        }
        listeners.get(key).push(callback);
    }

    /**
     * Unsubscribe from configuration changes
     * @param {string} key - Configuration key
     * @param {Function} callback - Callback function to remove
     */
    function unsubscribe(key, callback) {
        if (listeners.has(key)) {
            const callbacks = listeners.get(key);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
            if (callbacks.length === 0) {
                listeners.delete(key);
            }
        }
    }

    /**
     * Get configuration schema for validation
     * @returns {Object} Default configuration schema
     */
    function getSchema() {
        return deepClone(DEFAULT_CONFIG);
    }

    /**
     * Validate configuration object against schema
     * @param {Object} config - Configuration to validate
     * @returns {Array<string>} Array of validation errors
     */
    function validateConfig(config) {
        const errors = [];
        // Add validation logic here if needed
        return errors;
    }

    // Initialize configuration
    currentConfig = loadFromStorage();

    // Create global namespace
    if (typeof window !== 'undefined') {
        window.MarkdownMindmap = window.MarkdownMindmap || {};
        window.MarkdownMindmap.Config = {
            get,
            set,
            reset,
            resetAll,
            export: exportConfig,
            import: importConfig,
            subscribe,
            unsubscribe,
            getSchema,
            validateConfig
        };
    }

    // Export for module systems if available
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            get,
            set,
            reset,
            resetAll,
            export: exportConfig,
            import: importConfig,
            subscribe,
            unsubscribe,
            getSchema,
            validateConfig
        };
    }

})();