/**
 * Real-Time Theme Switcher Module
 * Implements T020: Real-time theme switching with <100ms performance
 * Builds upon theme-manager.js with event bus integration and performance optimization
 */
(function() {
    'use strict';

    // Import dependencies
    const EventBus = (typeof window !== 'undefined' && window.MindmapEvents) || null;
    const ThemeManager = (typeof window !== 'undefined' && window.MarkdownMindmap?.ThemeManager) || null;

    /**
     * Real-Time Theme Switcher Class
     * Optimized theme switching with event coordination and performance monitoring
     */
    class RealTimeThemeSwitcher {
        constructor() {
            this.eventBus = EventBus;
            this.themeManager = ThemeManager;
            this.currentTheme = null;
            this.themeHistory = [];
            this.preloadedThemes = new Set();
            this.switchInProgress = false;
            this.performanceStats = {
                switchTimes: [],
                averageSwitchTime: 0,
                fastestSwitch: Infinity,
                slowestSwitch: 0,
                totalSwitches: 0
            };

            this.config = {
                maxSwitchTime: 100,
                preloadThemes: true,
                batchUpdates: true,
                useAnimations: true,
                enableCSSVariables: true,
                enableVirtualization: true,
                enableCaching: true,
                enableWorkers: false,
                transitionDuration: 200,
                easingFunction: 'ease-in-out',
                staggerDelay: 10,
                enableFallback: true,
                fallbackTimeout: 150,
                gracefulDegradation: true
            };

            this.cache = new Map();
            this.preloadPromises = new Map();
            this.componentUpdateQueue = [];

            this.init();
        }

        /**
         * Initialize the real-time theme switcher
         */
        init() {
            if (!this.eventBus) {
                console.warn('RealTimeThemeSwitcher: Event bus not available');
                return;
            }

            if (!this.themeManager) {
                console.warn('RealTimeThemeSwitcher: Theme manager not available');
                return;
            }

            this.setupEventListeners();
            this.setupPerformanceMonitoring();
            this.preloadCriticalThemes();
            this.optimizeCSS();

            // Get initial theme
            this.currentTheme = this.themeManager.getCurrentTheme()?.id || 'professional';
            this.themeHistory.push({
                theme: this.currentTheme,
                timestamp: Date.now(),
                source: 'initialization'
            });
        }

        /**
         * Setup event listeners for theme coordination
         */
        setupEventListeners() {
            // Listen for external theme change requests
            this.eventBus.on('theme:switch:request', this.handleThemeSwitchRequest.bind(this));
            this.eventBus.on('theme:preload:request', this.handlePreloadRequest.bind(this));
            this.eventBus.on('performance:monitor:request', this.handlePerformanceRequest.bind(this));

            // Listen for component ready events
            this.eventBus.on('component:ready', this.handleComponentReady.bind(this));
            this.eventBus.on('d3:renderer:ready', this.handleD3RendererReady.bind(this));
        }

        /**
         * Setup performance monitoring
         */
        setupPerformanceMonitoring() {
            // Use Performance Observer if available
            if (typeof PerformanceObserver !== 'undefined') {
                try {
                    const observer = new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        entries.forEach(entry => {
                            if (entry.name.startsWith('theme-switch-')) {
                                this.recordSwitchPerformance(entry.duration);
                            }
                        });
                    });
                    observer.observe({ type: 'measure' });
                } catch (error) {
                    console.warn('Performance Observer not supported:', error);
                }
            }
        }

        /**
         * Preload critical themes for faster switching
         */
        preloadCriticalThemes() {
            if (!this.config.preloadThemes) return;

            const criticalThemes = ['professional', 'dark', 'creative'];
            criticalThemes.forEach(themeName => {
                this.preloadTheme(themeName);
            });
        }

        /**
         * Optimize CSS for faster theme switching
         */
        optimizeCSS() {
            if (!this.config.enableCSSVariables) return;

            // Add optimized transition styles
            const style = document.createElement('style');
            style.id = 'theme-switcher-optimizations';
            style.textContent = `
                /* Optimized theme transition styles */
                .theme-transitioning {
                    --transition-duration: ${this.config.transitionDuration}ms;
                    --transition-easing: ${this.config.easingFunction};
                }

                .theme-transitioning *,
                .theme-transitioning *::before,
                .theme-transitioning *::after {
                    transition: 
                        background-color var(--transition-duration) var(--transition-easing),
                        border-color var(--transition-duration) var(--transition-easing),
                        color var(--transition-duration) var(--transition-easing),
                        fill var(--transition-duration) var(--transition-easing),
                        stroke var(--transition-duration) var(--transition-easing),
                        box-shadow var(--transition-duration) var(--transition-easing) !important;
                }

                /* GPU acceleration for critical elements */
                .theme-transitioning .mindmap-node,
                .theme-transitioning .expansion-control,
                .theme-transitioning .list-item {
                    will-change: background-color, color, border-color;
                    transform: translateZ(0);
                }

                /* Reduce motion for users who prefer it */
                @media (prefers-reduced-motion: reduce) {
                    .theme-transitioning *,
                    .theme-transitioning *::before,
                    .theme-transitioning *::after {
                        transition: none !important;
                        animation: none !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        /**
         * Switch theme with optimized performance
         * @param {string} themeName - Name of theme to switch to
         * @param {Object} options - Switch options
         * @returns {Promise} Resolves with switch results
         */
        async switchTheme(themeName, options = {}) {
            if (this.switchInProgress) {
                console.warn('Theme switch already in progress');
                return { success: false, reason: 'switch_in_progress' };
            }

            if (!this.themeManager) {
                console.error('Theme manager not available');
                return { success: false, reason: 'theme_manager_unavailable' };
            }

            const switchOptions = {
                animated: true,
                priority: 'normal',
                source: 'manual',
                ...options
            };

            const startTime = performance.now();
            const switchId = `theme-switch-${Date.now()}`;
            
            try {
                this.switchInProgress = true;

                // Start performance measurement
                performance.mark(`${switchId}-start`);

                // Emit switch start event
                this.eventBus.emit('theme:switch:start', {
                    fromTheme: this.currentTheme,
                    toTheme: themeName,
                    timestamp: startTime,
                    options: switchOptions,
                    switchId
                });

                // Preload theme if not already loaded
                if (!this.preloadedThemes.has(themeName)) {
                    await this.preloadTheme(themeName);
                }

                // Perform the actual switch
                const switchResult = await this.performOptimizedSwitch(themeName, switchOptions);

                // End performance measurement
                performance.mark(`${switchId}-end`);
                performance.measure(switchId, `${switchId}-start`, `${switchId}-end`);

                const endTime = performance.now();
                const switchTime = endTime - startTime;

                // Update performance stats
                this.recordSwitchPerformance(switchTime);

                // Update theme history
                this.themeHistory.push({
                    theme: themeName,
                    timestamp: startTime,
                    duration: switchTime,
                    source: switchOptions.source,
                    success: switchResult.success
                });

                this.currentTheme = themeName;

                // Emit completion event
                this.eventBus.emit('theme:switch:complete', {
                    themeName,
                    duration: switchTime,
                    success: switchResult.success,
                    componentsUpdated: switchResult.componentsUpdated || 0,
                    timestamp: endTime,
                    switchId
                });

                // Performance warning if over target
                if (switchTime > this.config.maxSwitchTime) {
                    console.warn(`Theme switch took ${switchTime.toFixed(2)}ms (target: <${this.config.maxSwitchTime}ms)`);
                    this.eventBus.emit('theme:performance:warning', {
                        actualTime: switchTime,
                        targetTime: this.config.maxSwitchTime,
                        themeName
                    });
                }

                return {
                    success: true,
                    theme: themeName,
                    switchTime,
                    ...switchResult
                };

            } catch (error) {
                console.error('Theme switch failed:', error);
                
                this.eventBus.emit('theme:switch:error', {
                    themeName,
                    error: error.message,
                    timestamp: Date.now(),
                    switchId
                });

                return {
                    success: false,
                    reason: 'switch_failed',
                    error: error.message
                };
            } finally {
                this.switchInProgress = false;
            }
        }

        /**
         * Perform optimized theme switch
         * @param {string} themeName - Theme to switch to
         * @param {Object} options - Switch options
         * @returns {Promise} Switch result
         */
        async performOptimizedSwitch(themeName, options) {
            const startTime = performance.now();
            let componentsUpdated = 0;

            // Use the existing theme manager for the core switch
            if (this.config.batchUpdates) {
                // Batch DOM updates using requestAnimationFrame
                return new Promise((resolve) => {
                    requestAnimationFrame(async () => {
                        try {
                            const result = await this.themeManager.switchTheme(themeName);
                            
                            // Update components with staggered timing
                            if (options.animated && this.config.useAnimations) {
                                componentsUpdated = await this.updateComponentsStaggered(themeName);
                            } else {
                                componentsUpdated = await this.updateComponentsImmediate(themeName);
                            }

                            resolve({
                                success: true,
                                componentsUpdated,
                                duration: performance.now() - startTime
                            });
                        } catch (error) {
                            resolve({
                                success: false,
                                error: error.message
                            });
                        }
                    });
                });
            } else {
                // Direct switch without batching
                const result = await this.themeManager.switchTheme(themeName);
                componentsUpdated = await this.updateComponentsImmediate(themeName);
                
                return {
                    success: true,
                    componentsUpdated,
                    duration: performance.now() - startTime
                };
            }
        }

        /**
         * Update components with staggered timing for smooth animation
         * @param {string} themeName - New theme name
         * @returns {Promise<number>} Number of components updated
         */
        async updateComponentsStaggered(themeName) {
            const components = this.getRegisteredComponents();
            let updated = 0;

            for (let i = 0; i < components.length; i++) {
                try {
                    await this.updateComponent(components[i], themeName);
                    updated++;
                    
                    // Stagger updates for smooth animation
                    if (i < components.length - 1) {
                        await this.delay(this.config.staggerDelay);
                    }
                } catch (error) {
                    console.warn(`Failed to update component ${components[i].id}:`, error);
                }
            }

            return updated;
        }

        /**
         * Update components immediately without staggering
         * @param {string} themeName - New theme name
         * @returns {Promise<number>} Number of components updated
         */
        async updateComponentsImmediate(themeName) {
            const components = this.getRegisteredComponents();
            let updated = 0;

            await Promise.allSettled(
                components.map(async (component) => {
                    try {
                        await this.updateComponent(component, themeName);
                        updated++;
                    } catch (error) {
                        console.warn(`Failed to update component ${component.id}:`, error);
                    }
                })
            );

            return updated;
        }

        /**
         * Get list of registered components that need theme updates
         * @returns {Array} Array of component descriptors
         */
        getRegisteredComponents() {
            return [
                { id: 'expansion-controls', handler: this.updateExpansionControls.bind(this) },
                { id: 'list-visualizer', handler: this.updateListVisualizer.bind(this) },
                { id: 'ui-components', handler: this.updateUIComponents.bind(this) },
                // D3 renderer will be added when T016 is ready
                // { id: 'd3-renderer', handler: this.updateD3Renderer.bind(this) }
            ];
        }

        /**
         * Update a specific component with new theme
         * @param {Object} component - Component descriptor
         * @param {string} themeName - New theme name
         */
        async updateComponent(component, themeName) {
            if (component.handler) {
                await component.handler(themeName);
            }
        }

        /**
         * Update expansion controls theme
         * @param {string} themeName - New theme name
         */
        async updateExpansionControls(themeName) {
            // Expansion controls use CSS variables, so they update automatically
            // Just emit event for any custom handling
            this.eventBus.emit('expansion-controls:theme:updated', { themeName });
        }

        /**
         * Update list visualizer theme
         * @param {string} themeName - New theme name
         */
        async updateListVisualizer(themeName) {
            // List visualizer uses CSS variables, so it updates automatically
            // Just emit event for any custom handling
            this.eventBus.emit('list-visualizer:theme:updated', { themeName });
        }

        /**
         * Update UI components theme
         * @param {string} themeName - New theme name
         */
        async updateUIComponents(themeName) {
            // UI components use CSS variables, so they update automatically
            // Just emit event for any custom handling
            this.eventBus.emit('ui-components:theme:updated', { themeName });
        }

        /**
         * Preload theme for faster switching
         * @param {string} themeName - Theme to preload
         * @returns {Promise} Preload completion
         */
        async preloadTheme(themeName) {
            if (this.preloadedThemes.has(themeName)) {
                return Promise.resolve();
            }

            if (this.preloadPromises.has(themeName)) {
                return this.preloadPromises.get(themeName);
            }

            const preloadPromise = new Promise((resolve) => {
                // Theme data is already loaded in theme-manager.js
                // Just mark as preloaded and cache any computed values
                try {
                    const themeData = this.themeManager.getAvailableThemes()
                        .find(theme => theme.id === themeName);
                    
                    if (themeData) {
                        this.cache.set(`theme-${themeName}`, themeData);
                        this.preloadedThemes.add(themeName);
                    }
                    
                    resolve();
                } catch (error) {
                    console.warn(`Failed to preload theme ${themeName}:`, error);
                    resolve();
                }
            });

            this.preloadPromises.set(themeName, preloadPromise);
            return preloadPromise;
        }

        /**
         * Record theme switch performance
         * @param {number} switchTime - Time taken for switch in ms
         */
        recordSwitchPerformance(switchTime) {
            this.performanceStats.totalSwitches++;
            this.performanceStats.switchTimes.push(switchTime);
            
            // Keep only last 100 measurements
            if (this.performanceStats.switchTimes.length > 100) {
                this.performanceStats.switchTimes.shift();
            }

            this.performanceStats.fastestSwitch = Math.min(this.performanceStats.fastestSwitch, switchTime);
            this.performanceStats.slowestSwitch = Math.max(this.performanceStats.slowestSwitch, switchTime);
            
            const sum = this.performanceStats.switchTimes.reduce((a, b) => a + b, 0);
            this.performanceStats.averageSwitchTime = sum / this.performanceStats.switchTimes.length;
        }

        /**
         * Get current theme
         * @returns {string} Current theme name
         */
        getCurrentTheme() {
            return this.currentTheme;
        }

        /**
         * Get theme switch history
         * @returns {Array} Theme history array
         */
        getThemeHistory() {
            return [...this.themeHistory];
        }

        /**
         * Get performance statistics
         * @returns {Object} Performance stats
         */
        getPerformanceStats() {
            return { ...this.performanceStats };
        }

        /**
         * Save theme preference
         * @param {string} themeName - Theme to save
         */
        saveThemePreference(themeName) {
            if (this.themeManager) {
                this.themeManager.saveThemePreference(themeName);
            }
        }

        /**
         * Load theme preference
         * @returns {string|null} Saved theme or null
         */
        loadThemePreference() {
            return this.themeManager ? this.themeManager.loadThemePreference() : null;
        }

        /**
         * Handle theme switch request events
         * @param {Object} eventData - Event data
         */
        handleThemeSwitchRequest(eventData) {
            if (eventData.themeName) {
                this.switchTheme(eventData.themeName, eventData.options || {});
            }
        }

        /**
         * Handle preload request events
         * @param {Object} eventData - Event data
         */
        handlePreloadRequest(eventData) {
            if (eventData.themeName) {
                this.preloadTheme(eventData.themeName);
            }
        }

        /**
         * Handle performance monitoring requests
         * @param {Object} eventData - Event data
         */
        handlePerformanceRequest(eventData) {
            const stats = this.getPerformanceStats();
            this.eventBus.emit('theme:performance:stats', stats);
        }

        /**
         * Handle component ready events
         * @param {Object} eventData - Event data
         */
        handleComponentReady(eventData) {
            // Component is ready for theme updates
            console.log(`Component ${eventData.componentId} ready for theme updates`);
        }

        /**
         * Handle D3 renderer ready event (for future T016 integration)
         * @param {Object} eventData - Event data
         */
        handleD3RendererReady(eventData) {
            // D3 renderer is ready, add it to component update list
            console.log('D3 renderer ready for theme integration');
            // TODO: Add D3 component to getRegisteredComponents when T016 is complete
        }

        /**
         * Utility: Create delay promise
         * @param {number} ms - Milliseconds to delay
         * @returns {Promise} Delay promise
         */
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }

    // Create global instance
    const realTimeThemeSwitcher = new RealTimeThemeSwitcher();

    // Expose to global namespace
    if (typeof window !== 'undefined') {
        window.MarkdownMindmap = window.MarkdownMindmap || {};
        window.MarkdownMindmap.RealTimeThemeSwitcher = {
            switchTheme: realTimeThemeSwitcher.switchTheme.bind(realTimeThemeSwitcher),
            preloadTheme: realTimeThemeSwitcher.preloadTheme.bind(realTimeThemeSwitcher),
            getCurrentTheme: realTimeThemeSwitcher.getCurrentTheme.bind(realTimeThemeSwitcher),
            getThemeHistory: realTimeThemeSwitcher.getThemeHistory.bind(realTimeThemeSwitcher),
            getPerformanceStats: realTimeThemeSwitcher.getPerformanceStats.bind(realTimeThemeSwitcher),
            saveThemePreference: realTimeThemeSwitcher.saveThemePreference.bind(realTimeThemeSwitcher),
            loadThemePreference: realTimeThemeSwitcher.loadThemePreference.bind(realTimeThemeSwitcher),
            
            // Direct access to manager
            manager: realTimeThemeSwitcher
        };
    } else if (typeof module !== 'undefined' && module.exports) {
        // Node.js environment support
        module.exports = { RealTimeThemeSwitcher };
    }

})();