/**
 * Code Block Display Component - T010
 * Implements syntax-highlighted code block display for mindmap visualization
 * 
 * @module CodeBlockDisplay
 * @requires CSS styling from components.css
 */

(function() {
    'use strict';

    /**
     * Code Block Display class for rendering syntax-highlighted code in mindmap nodes
     * @class CodeBlockDisplay
     */
    class CodeBlockDisplay {
        
        /**
         * Initialize code block renderer with configuration options
         * @param {Object} options - Renderer configuration
         * @param {boolean} options.showLineNumbers - Show line numbers (default: true)
         * @param {boolean} options.enableCopy - Show copy button (default: true)
         * @param {number} options.maxLines - Maximum lines to display before truncation (default: 15)
         * @param {string} options.theme - Theme for syntax highlighting (default: 'default')
         */
        constructor(options = {}) {
            this.config = {
                showLineNumbers: options.showLineNumbers !== false,
                enableCopy: options.enableCopy !== false,
                maxLines: options.maxLines || 15,
                theme: options.theme || 'default',
                defaultLanguage: options.defaultLanguage || 'plaintext',
                ...options
            };
            
            this.codeCache = new Map();
            this.languageAliases = this.initLanguageAliases();
            
            // Initialize language detection patterns
            this.languagePatterns = this.initLanguagePatterns();
        }

        /**
         * Initialize language aliases mapping
         * @returns {Map} Map of language aliases to standardized names
         */
        initLanguageAliases() {
            const aliases = new Map();
            
            // JavaScript aliases
            ['js', 'javascript', 'jsx', 'node'].forEach(alias => aliases.set(alias, 'javascript'));
            
            // HTML aliases
            ['html', 'xhtml', 'xml', 'svg'].forEach(alias => aliases.set(alias, 'html'));
            
            // CSS aliases
            ['css', 'scss', 'sass', 'less'].forEach(alias => aliases.set(alias, 'css'));
            
            // Python aliases
            ['py', 'python', 'python3'].forEach(alias => aliases.set(alias, 'python'));
            
            // Java aliases
            ['java'].forEach(alias => aliases.set(alias, 'java'));
            
            // C/C++ aliases
            ['c', 'cpp', 'c++'].forEach(alias => aliases.set(alias, 'cpp'));
            
            // Ruby aliases
            ['rb', 'ruby'].forEach(alias => aliases.set(alias, 'ruby'));
            
            // Markdown aliases
            ['md', 'markdown'].forEach(alias => aliases.set(alias, 'markdown'));
            
            // JSON aliases
            ['json'].forEach(alias => aliases.set(alias, 'json'));
            
            // Shell aliases
            ['sh', 'bash', 'shell', 'zsh'].forEach(alias => aliases.set(alias, 'bash'));
            
            // SQL aliases
            ['sql'].forEach(alias => aliases.set(alias, 'sql'));
            
            // TypeScript aliases
            ['ts', 'typescript', 'tsx'].forEach(alias => aliases.set(alias, 'typescript'));
            
            return aliases;
        }
        /**
         * Initialize language detection patterns
         * @returns {Object} Map of language patterns for detection
         */
        initLanguagePatterns() {
            return {
                javascript: {
                    keywords: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return'],
                    patterns: [
                        { regex: /^import\s+.*\s+from\s+['"].*['"];/, confidence: 0.9 },
                        { regex: /\bconst\s+\w+\s*=/, confidence: 0.7 },
                        { regex: /function\s+\w+\s*\(.*\)\s*\{/, confidence: 0.8 }
                    ]
                },
                html: {
                    keywords: ['div', 'span', 'class', 'id', 'html', 'body'],
                    patterns: [
                        { regex: /<(!DOCTYPE|html|head|body|div|span|h1|p)\b/, confidence: 0.9 },
                        { regex: /<.*class=['"].*['"].*>/, confidence: 0.7 }
                    ]
                },
                css: {
                    keywords: ['color', 'margin', 'padding', 'width', 'height', 'font-size'],
                    patterns: [
                        { regex: /[\.\#]?\w+\s*\{[\s\S]*?\}/, confidence: 0.8 },
                        { regex: /\b(margin|padding|width|color):\s*[\w\d\s\.\#]+;/, confidence: 0.7 }
                    ]
                },
                python: {
                    keywords: ['def', 'import', 'from', 'class', 'if', 'elif', 'else', 'for', 'while'],
                    patterns: [
                        { regex: /def\s+\w+\s*\(.*\):/, confidence: 0.9 },
                        { regex: /import\s+[\w\s,]+/, confidence: 0.8 },
                        { regex: /class\s+\w+(\(.*\))?:/, confidence: 0.9 }
                    ]
                },
                markdown: {
                    keywords: ['#', '##', '###', '-', '*', '```'],
                    patterns: [
                        { regex: /^#{1,6}\s+.+$/, confidence: 0.9 },
                        { regex: /^\s*[-\*]\s+.+$/, confidence: 0.7 }
                    ]
                }
                // Additional languages can be added here
            };
        }

        /**
         * Render code block with syntax highlighting
         * @param {Object} codeData - Code data from content analysis
         * @param {string} codeData.content - Raw code content
         * @param {string} codeData.language - Programming language (optional)
         * @param {HTMLElement} container - Container element for the code block
         * @param {Object} options - Rendering options
         * @returns {HTMLElement} Rendered code block element
         */
        renderCodeBlock(codeData, container, options = {}) {
            if (!this.validateCodeData(codeData)) {
                throw new Error('Invalid code data provided');
            }

            const renderConfig = { ...this.config, ...options };
            const codeId = this.generateCodeId(codeData);
            
            // Check cache for performance
            if (this.codeCache.has(codeId) && !renderConfig.forceRefresh) {
                const cachedCode = this.codeCache.get(codeId).cloneNode(true);
                container.appendChild(cachedCode);
                return cachedCode;
            }

            // Detect language if not specified
            const language = codeData.language || 
                this.detectLanguage(codeData.content) || 
                renderConfig.defaultLanguage;
                
            const codeElement = this.createCodeElement(codeData.content, language, renderConfig);
            
            // Cache the rendered code block
            this.codeCache.set(codeId, codeElement.cloneNode(true));
            
            container.appendChild(codeElement);
            
            // Add copy button if enabled
            if (renderConfig.enableCopy && !renderConfig.isPreview) {
                this.addCopyButton(codeElement, codeData.content);
            }
            
            return codeElement;
        }

        /**
         * Create the complete code block HTML structure
         * @param {string} content - Raw code content
         * @param {string} language - Detected or specified language
         * @param {Object} config - Rendering configuration
         * @returns {HTMLElement} Complete code block element
         */
        createCodeElement(content, language, config) {
            // Create wrapper element
            const wrapper = document.createElement('div');
            wrapper.className = `mindmap-code-block theme-${config.theme}`;
            wrapper.setAttribute('data-language', language);
            
            // Create header with language indicator
            const header = document.createElement('div');
            header.className = 'code-header';
            
            const langIndicator = document.createElement('span');
            langIndicator.className = 'language-indicator';
            langIndicator.textContent = this.formatLanguageName(language);
            header.appendChild(langIndicator);
            
            wrapper.appendChild(header);
            
            // Create pre/code elements for code display
            const preElement = document.createElement('pre');
            preElement.className = `language-${language}`;
            
            const codeElement = document.createElement('code');
            codeElement.className = `language-${language}`;
            
            // Process content
            const lines = content.split('\n');
            const displayLines = config.maxLines > 0 ? 
                lines.slice(0, config.maxLines) : lines;
            
            // Add line numbers if enabled
            if (config.showLineNumbers) {
                const lineNumbers = document.createElement('div');
                lineNumbers.className = 'line-numbers';
                
                displayLines.forEach((_, index) => {
                    const lineNum = document.createElement('span');
                    lineNum.className = 'line-number';
                    lineNum.textContent = (index + 1).toString();
                    lineNumbers.appendChild(lineNum);
                });
                
                wrapper.appendChild(lineNumbers);
                wrapper.classList.add('with-line-numbers');
            }
            
            // Apply syntax highlighting
            const highlightedCode = this.highlightCode(displayLines.join('\n'), language);
            codeElement.innerHTML = highlightedCode;
            
            // Add truncation indicator if needed
            if (config.maxLines > 0 && lines.length > config.maxLines) {
                const truncationIndicator = document.createElement('div');
                truncationIndicator.className = 'truncation-indicator';
                truncationIndicator.textContent = `+ ${lines.length - config.maxLines} more lines`;
                wrapper.appendChild(truncationIndicator);
            }
            
            preElement.appendChild(codeElement);
            wrapper.appendChild(preElement);
            
            return wrapper;
        }
        /**
         * Add copy button to code block
         * @param {HTMLElement} codeElement - Code block element
         * @param {string} content - Raw code content to copy
         */
        addCopyButton(codeElement, content) {
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-button';
            copyButton.setAttribute('aria-label', 'Copy code to clipboard');
            copyButton.innerHTML = '<span class="copy-icon">📋</span> Copy';
            
            copyButton.addEventListener('click', () => this.copyToClipboard(content, copyButton));
            
            // Add the button to the header
            const header = codeElement.querySelector('.code-header');
            header.appendChild(copyButton);
        }
        
        /**
         * Copy code content to clipboard
         * @param {string} content - Code content to copy
         * @param {HTMLElement} button - Button element for feedback
         */
        copyToClipboard(content, button) {
            // Use Clipboard API if available
            if (navigator.clipboard) {
                navigator.clipboard.writeText(content)
                    .then(() => this.showCopyFeedback(button, true))
                    .catch(() => this.showCopyFeedback(button, false));
            } else {
                // Fallback method
                try {
                    const textarea = document.createElement('textarea');
                    textarea.value = content;
                    textarea.style.position = 'absolute';
                    textarea.style.left = '-9999px';
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    this.showCopyFeedback(button, true);
                } catch (err) {
                    this.showCopyFeedback(button, false);
                }
            }
        }
        
        /**
         * Show visual feedback after copy attempt
         * @param {HTMLElement} button - Button element
         * @param {boolean} success - Whether copy was successful
         */
        showCopyFeedback(button, success) {
            const originalText = button.innerHTML;
            
            if (success) {
                button.innerHTML = '<span class="copy-icon">✅</span> Copied!';
                button.classList.add('copied');
            } else {
                button.innerHTML = '<span class="copy-icon">❌</span> Failed';
                button.classList.add('copy-failed');
            }
            
            // Reset after delay
            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('copied', 'copy-failed');
            }, 2000);
        }
        /**
         * Detect programming language from code content
         * @param {string} content - Raw code content
         * @returns {string|null} Detected language or null
         */
        detectLanguage(content) {
            if (!content || typeof content !== 'string' || content.trim().length === 0) {
                return null;
            }
            
            // Check for language markers in markdown code blocks
            const languageMarkerMatch = content.match(/^```(\w+)/);
            if (languageMarkerMatch && languageMarkerMatch[1]) {
                const markedLanguage = languageMarkerMatch[1].toLowerCase();
                return this.normalizeLanguage(markedLanguage);
            }
            
            // Analyze content for language features
            const scores = {};
            
            // Calculate scores for each language
            Object.entries(this.languagePatterns).forEach(([language, definition]) => {
                scores[language] = 0;
                
                // Check for keywords
                definition.keywords.forEach(keyword => {
                    const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
                    const matches = content.match(keywordRegex);
                    if (matches) {
                        scores[language] += matches.length * 0.1;
                    }
                });
                
                // Check for patterns
                definition.patterns.forEach(pattern => {
                    const matches = content.match(pattern.regex);
                    if (matches) {
                        scores[language] += matches.length * pattern.confidence;
                    }
                });
            });
            
            // Find language with highest score
            let bestMatch = null;
            let highestScore = 0.5; // Minimum threshold
            
            Object.entries(scores).forEach(([language, score]) => {
                if (score > highestScore) {
                    highestScore = score;
                    bestMatch = language;
                }
            });
            
            return bestMatch;
        }
        
        /**
         * Normalize language name using aliases
         * @param {string} language - Raw language identifier
         * @returns {string} Normalized language identifier
         */
        normalizeLanguage(language) {
            const normalized = language.toLowerCase().trim();
            return this.languageAliases.get(normalized) || normalized;
        }
        
        /**
         * Format language name for display
         * @param {string} language - Language identifier
         * @returns {string} Formatted language name
         */
        formatLanguageName(language) {
            if (!language) return 'Plain Text';
            
            const normalized = language.toLowerCase();
            
            // Special cases
            const specialCases = {
                'javascript': 'JavaScript',
                'typescript': 'TypeScript',
                'cpp': 'C++',
                'csharp': 'C#',
                'fsharp': 'F#',
                'html': 'HTML',
                'css': 'CSS',
                'sql': 'SQL',
                'json': 'JSON'
            };
            
            if (specialCases[normalized]) {
                return specialCases[normalized];
            }
            
            // Capitalize first letter
            return normalized.charAt(0).toUpperCase() + normalized.slice(1);
        }

        /**
         * Apply syntax highlighting to code content
         * @param {string} code - Raw code content
         * @param {string} language - Language identifier
         * @returns {string} HTML with highlighting markup
         */
        highlightCode(code, language) {
            // Remove any markdown language markers
            code = code.replace(/^```\w*\n/, '').replace(/```$/, '');
            
            // Simple syntax highlighting - in a real implementation,
            // this would use a proper syntax highlighting library
            
            if (!language || language === 'plaintext') {
                // For plain text, just escape HTML entities
                return this.escapeHtml(code);
            }
            
            // Apply basic syntax highlighting based on language
            let highlighted = this.escapeHtml(code);
            
            // Apply language-specific highlighting
            switch (language) {
                case 'javascript':
                case 'typescript':
                case 'jsx':
                case 'tsx':
                    highlighted = this.highlightJavaScript(highlighted);
                    break;
                case 'html':
                case 'xml':
                    highlighted = this.highlightHtml(highlighted);
                    break;
                case 'css':
                case 'scss':
                case 'less':
                    highlighted = this.highlightCss(highlighted);
                    break;
                case 'python':
                    highlighted = this.highlightPython(highlighted);
                    break;
                case 'markdown':
                    highlighted = this.highlightMarkdown(highlighted);
                    break;
                case 'json':
                    highlighted = this.highlightJson(highlighted);
                    break;
                default:
                    // Apply generic highlighting
                    highlighted = this.highlightGeneric(highlighted);
            }
            
            return highlighted;
        }
        
        /**
         * Escape HTML entities in code
         * @param {string} code - Raw code
         * @returns {string} Escaped code
         */
        escapeHtml(code) {
            return code
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
        /**
         * Apply JavaScript syntax highlighting
         * @param {string} code - Escaped code
         * @returns {string} Highlighted code
         */
        highlightJavaScript(code) {
            // Keywords
            const keywords = ['await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 
                             'default', 'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 
                             'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'return', 
                             'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 
                             'while', 'with', 'yield'];
                             
            const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
            code = code.replace(keywordRegex, '<span class="token keyword">$1</span>');
            
            // Strings
            code = code.replace(/(["'`])(.*?)(?<!\\)\1/g, '<span class="token string">$1$2$1</span>');
            
            // Comments
            code = code.replace(/\/\/(.*)$/gm, '<span class="token comment">//\$1</span>');
            code = code.replace(/\/\*[\s\S]*?\*\//g, '<span class="token comment">$&</span>');
            
            // Numbers
            code = code.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="token number">$1</span>');
            
            // Functions
            code = code.replace(/\b([a-zA-Z_$][\w$]*)\s*\(/g, '<span class="token function">$1</span>(');
            
            return code;
        }
        
        /**
         * Apply HTML syntax highlighting
         * @param {string} code - Escaped code
         * @returns {string} Highlighted code
         */
        highlightHtml(code) {
            // Tags
            code = code.replace(/(&lt;\/?)([a-zA-Z][a-zA-Z0-9]*)(.*?)(&gt;)/g, 
                               '$1<span class="token tag">$2</span>$3$4');
            
            // Attributes
            code = code.replace(/\s([a-zA-Z-]+)=["']/g, ' <span class="token attr-name">$1</span>=');
            
            // Attribute values
            code = code.replace(/(=["'])(.*?)(["'])/g, '$1<span class="token attr-value">$2</span>$3');
            
            // Comments
            code = code.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="token comment">$1</span>');
            
            // DOCTYPE
            code = code.replace(/(&lt;!DOCTYPE[^&]*&gt;)/g, '<span class="token doctype">$1</span>');
            
            return code;
        }
        
        /**
         * Apply CSS syntax highlighting
         * @param {string} code - Escaped code
         * @returns {string} Highlighted code
         */
        highlightCss(code) {
            // Selectors
            code = code.replace(/([a-zA-Z0-9_\-\.#]+)\s*\{/g, '<span class="token selector">$1</span> {');
            
            // Properties
            code = code.replace(/(\s*)([\w-]+)(\s*:)/g, '$1<span class="token property">$2</span>$3');
            
            // Values
            code = code.replace(/(:\s*)([^;]+)(;|$)/g, '$1<span class="token value">$2</span>$3');
            
            // Units
            code = code.replace(/(\d+)(px|em|rem|%|vh|vw|s|ms)/g, 
                               '<span class="token number">$1</span><span class="token unit">$2</span>');
            
            // Colors
            code = code.replace(/#([a-fA-F0-9]{3,6})\b/g, '<span class="token color">#$1</span>');
            
            // Comments
            code = code.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token comment">$1</span>');
            
            return code;
        }
        /**
         * Apply Python syntax highlighting
         * @param {string} code - Escaped code
         * @returns {string} Highlighted code
         */
        highlightPython(code) {
            // Keywords
            const keywords = ['and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 
                             'def', 'del', 'elif', 'else', 'except', 'False', 'finally', 'for',
                             'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'None',
                             'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'True',
                             'try', 'while', 'with', 'yield'];
                             
            const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
            code = code.replace(keywordRegex, '<span class="token keyword">$1</span>');
            
            // Strings
            code = code.replace(/(["'])(.*?)(?<!\\)\1/g, '<span class="token string">$1$2$1</span>');
            code = code.replace(/(["'])([^\\]*?(?:\\.[^\\]*?)*)(?<!\\)\1/g, '<span class="token string">$1$2$1</span>');
            
            // Multi-line strings
            code = code.replace(/("""[\s\S]*?""")/g, '<span class="token string">$1</span>');
            code = code.replace(/(\'\'\'[\s\S]*?\'\'\')/g, '<span class="token string">$1</span>');
            
            // Comments
            code = code.replace(/(#.*)$/gm, '<span class="token comment">$1</span>');
            
            // Numbers
            code = code.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="token number">$1</span>');
            
            // Functions
            code = code.replace(/\bdef\s+([a-zA-Z_][a-zA-Z0-9_]*)/g, 'def <span class="token function">$1</span>');
            
            // Decorators
            code = code.replace(/(@[a-zA-Z_][a-zA-Z0-9_]*)/g, '<span class="token decorator">$1</span>');
            
            return code;
        }
        
        /**
         * Apply Markdown syntax highlighting
         * @param {string} code - Escaped code
         * @returns {string} Highlighted code
         */
        highlightMarkdown(code) {
            // Headers
            code = code.replace(/^(#{1,6})\s+(.*)$/gm, '<span class="token header">$1 $2</span>');
            
            // Bold
            code = code.replace(/(\*\*|__)(.*?)(\*\*|__)/g, '<span class="token bold">$1$2$3</span>');
            
            // Italic
            code = code.replace(/(\*|_)(.*?)(\*|_)/g, '<span class="token italic">$1$2$3</span>');
            
            // Links
            code = code.replace(/(\[)(.*?)(\]\()(.*?)(\))/g, 
                               '<span class="token link">$1$2$3<span class="token url">$4</span>$5</span>');
            
            // Lists
            code = code.replace(/^(\s*[-*+]\s+)(.*)$/gm, '$1<span class="token list-item">$2</span>');
            code = code.replace(/^(\s*\d+\.\s+)(.*)$/gm, '$1<span class="token list-item">$2</span>');
            
            // Code blocks
            code = code.replace(/(```[\s\S]*?```)/g, '<span class="token code-block">$1</span>');
            code = code.replace(/(`[^`]+`)/g, '<span class="token inline-code">$1</span>');
            
            // Blockquotes
            code = code.replace(/^(\s*&gt;\s+)(.*)$/gm, '$1<span class="token blockquote">$2</span>');
            
            return code;
        }
        
        /**
         * Apply JSON syntax highlighting
         * @param {string} code - Escaped code
         * @returns {string} Highlighted code
         */
        highlightJson(code) {
            // Keys
            code = code.replace(/("[\w\s]+")(\s*:)/g, '<span class="token property">$1</span>$2');
            
            // Strings
            code = code.replace(/:\s*(".*?")(?=,|\n|$)/g, ': <span class="token string">$1</span>');
            
            // Numbers
            code = code.replace(/:\s*(\d+(\.\d+)?)/g, ': <span class="token number">$1</span>');
            
            // Booleans and null
            code = code.replace(/:\s*(true|false|null)\b/g, ': <span class="token boolean">$1</span>');
            
            return code;
        }
        /**
         * Apply generic syntax highlighting for unsupported languages
         * @param {string} code - Escaped code
         * @returns {string} Highlighted code
         */
        highlightGeneric(code) {
            // Strings
            code = code.replace(/(["'`])(.*?)(?<!\\)\1/g, '<span class="token string">$1$2$1</span>');
            
            // Comments - try to detect common comment patterns
            code = code.replace(/\/\/(.*)$/gm, '<span class="token comment">//\$1</span>');
            code = code.replace(/\/\*[\s\S]*?\*\//g, '<span class="token comment">$&</span>');
            code = code.replace(/(#.*)$/gm, '<span class="token comment">$1</span>');
            
            // Numbers
            code = code.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="token number">$1</span>');
            
            return code;
        }

        /**
         * Validate code data structure
         * @param {Object} codeData - Code data to validate
         * @returns {boolean} True if valid
         */
        validateCodeData(codeData) {
            if (!codeData || typeof codeData !== 'object') return false;
            if (!codeData.content) return false;
            
            return true;
        }

        /**
         * Generate unique ID for code block caching
         * @param {Object} codeData - Code data
         * @returns {string} Unique code identifier
         */
        generateCodeId(codeData) {
            const content = codeData.content + (codeData.language || '');
            let hash = 0;
            for (let i = 0; i < content.length; i++) {
                const char = content.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return 'code_' + Math.abs(hash).toString(16);
        }
    }

    // Export CodeBlockDisplay
    if (typeof window !== 'undefined') {
        window.MarkdownMindmap = window.MarkdownMindmap || {};
        window.MarkdownMindmap.CodeBlockDisplay = CodeBlockDisplay;
    }
})();
