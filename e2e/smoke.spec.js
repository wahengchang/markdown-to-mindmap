// e2e/smoke.spec.js
// Basic smoke test to verify the application loads and theme elements are accessible

describe('Markdown-to-Mindmap Smoke Test', () => {
  beforeEach(() => {
    // Visit the application before each test
    cy.visit('/');
    
    // Wait for the application to fully load
    cy.get('#mindmapContainer', { timeout: 10000 }).should('be.visible');
  });

  it('should load the application successfully', () => {
    // Verify the main container is visible
    cy.get('#mindmapContainer').should('be.visible');
    
    // Take a screenshot of the initial state
    cy.takeThemedScreenshot('initial-load');
    
    // Verify the page title
    cy.title().should('include', 'Markdown to Mindmap');
  });

  it('should have accessible theme controls', () => {
    // Verify theme picker button is present and clickable
    cy.get('#themePickerBtn')
      .should('be.visible')
      .and('not.be.disabled');
    
    // Verify dark mode toggle is present and clickable
    cy.get('#darkModeToggle')
      .should('be.visible')
      .and('not.be.disabled');
    
    // Click the theme picker button to open selector
    cy.get('#themePickerBtn').click();
    
    // Wait for theme selector to be visible (it might be dynamically created)
    cy.wait(500);
    
    // Take a screenshot with theme controls visible
    
    // Take a screenshot with theme selector open
    cy.takeThemedScreenshot('theme-selector-open');
  });

  it('should have proper theme state in localStorage', () => {
    // Check that localStorage and theme state are working
    cy.window().then((win) => {
      // Check if theme system is initialized (may be null initially)
      const selectedTheme = win.localStorage.getItem('selectedTheme');
      
      // Dark mode state should be consistent
      const darkMode = win.localStorage.getItem('darkMode');
      if (darkMode === 'true') {
        cy.get('html').should('have.class', 'dark');
      } else {
        cy.get('html').should('not.have.class', 'dark');
      }
      
      // Basic functionality check - theme picker should be interactive
      cy.get('#themePickerBtn').should('be.visible');
    });
  });
});
