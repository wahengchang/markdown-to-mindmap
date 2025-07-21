/**
 * Code Block Display Component Tests
 * Tests for the syntax-highlighted code block display component
 */

describe('CodeBlockDisplay', () => {
  let codeDisplay;
  let testContainer;

  beforeEach(() => {
    // Set up DOM environment
    testContainer = document.createElement('div');
    document.body.appendChild(testContainer);
    
    // Initialize CodeBlockDisplay
    codeDisplay = new window.MarkdownMindmap.CodeBlockDisplay({
      showLineNumbers: true,
      enableCopy: true,
      maxLines: 15,
      theme: 'default'
    });
  });

  afterEach(() => {
    // Clean up
    document.body.removeChild(testContainer);
    testContainer = null;
    codeDisplay = null;
  });

  test('should initialize with correct configuration', () => {
    expect(codeDisplay.config).toHaveProperty('showLineNumbers', true);
    expect(codeDisplay.config).toHaveProperty('enableCopy', true);
    expect(codeDisplay.config).toHaveProperty('maxLines', 15);
    expect(codeDisplay.config).toHaveProperty('theme', 'default');
  });

  test('should correctly render a code block', () => {
    const codeData = {
      content: 'function test() {\n  return true;\n}',
      language: 'javascript'
    };
    
    const codeElement = codeDisplay.renderCodeBlock(codeData, testContainer);
    
    // Check structure
    expect(codeElement).toBeTruthy();
    expect(codeElement.classList.contains('mindmap-code-block')).toBe(true);
    expect(codeElement.getAttribute('data-language')).toBe('javascript');
    expect(codeElement.querySelector('.language-indicator').textContent).toBe('JavaScript');
    
    // Check code content
    const codeContent = codeElement.querySelector('code').innerHTML;
    expect(codeContent).toContain('function');
    expect(codeContent).toContain('test()');
  });
  
  test('should detect language correctly', () => {
    // JavaScript detection
    const jsCode = 'function test() {\n  const x = 5;\n  return x;\n}';
    expect(codeDisplay.detectLanguage(jsCode)).toBe('javascript');
    
    // Python detection
    const pythonCode = 'def test():\n    x = 5\n    return x';
    expect(codeDisplay.detectLanguage(pythonCode)).toBe('python');
    
    // HTML detection
    const htmlCode = '<div class="test">\n  <h1>Title</h1>\n  <p>Content</p>\n</div>';
    expect(codeDisplay.detectLanguage(htmlCode)).toBe('html');
  });
  
  test('should normalize language names', () => {
    expect(codeDisplay.normalizeLanguage('js')).toBe('javascript');
    expect(codeDisplay.normalizeLanguage('py')).toBe('python');
    expect(codeDisplay.normalizeLanguage('scss')).toBe('css');
  });
  
  test('should format language names for display', () => {
    expect(codeDisplay.formatLanguageName('javascript')).toBe('JavaScript');
    expect(codeDisplay.formatLanguageName('cpp')).toBe('C++');
    expect(codeDisplay.formatLanguageName('python')).toBe('Python');
  });
  
  test('should handle code blocks with no language specified', () => {
    const codeData = {
      content: 'const x = 5;\nreturn x;'
      // No language specified
    };
    
    const codeElement = codeDisplay.renderCodeBlock(codeData, testContainer);
    expect(codeElement.getAttribute('data-language')).toBe('javascript');
  });
  
  test('should apply line numbers when configured', () => {
    const codeData = {
      content: 'Line 1\nLine 2\nLine 3',
      language: 'plaintext'
    };
    
    const codeElement = codeDisplay.renderCodeBlock(codeData, testContainer);
    expect(codeElement.classList.contains('with-line-numbers')).toBe(true);
    
    const lineNumbers = codeElement.querySelector('.line-numbers');
    expect(lineNumbers).toBeTruthy();
    expect(lineNumbers.children.length).toBe(3);
  });
  
  test('should handle code truncation for long content', () => {
    // Create code with 20 lines
    const longCode = Array.from({length: 20}, (_, i) => `Line ${i+1}`).join('\n');
    
    const codeData = {
      content: longCode,
      language: 'plaintext'
    };
    
    const codeDisplay = new window.MarkdownMindmap.CodeBlockDisplay({
      maxLines: 10 // Only show 10 lines
    });
    
    const codeElement = codeDisplay.renderCodeBlock(codeData, testContainer);
    const truncationIndicator = codeElement.querySelector('.truncation-indicator');
    
    expect(truncationIndicator).toBeTruthy();
    expect(truncationIndicator.textContent).toContain('10 more lines');
  });
});
