// e2e/setup.js
// Common setup and utilities for Cypress tests

// Clear localStorage before each test to ensure a clean state
beforeEach(() => {
  cy.clearLocalStorage();
});

// Theme testing utilities
const themeTestUtils = {
  // Helper to verify theme is applied correctly
  verifyThemeApplied: (themeName) => {
    cy.get('html').should('have.attr', 'data-theme', themeName);
    
    // Additional theme-specific checks based on ThemeManager implementation
    cy.window().then((win) => {
      // Verify theme is correctly stored in localStorage
      expect(win.localStorage.getItem('mindmap-theme-preference')).to.equal(themeName);
      
      // Verify theme CSS variables are applied
      const bodyStyles = getComputedStyle(win.document.body);
      cy.wrap(bodyStyles).should('not.be.null');
      
      // We expect at least these CSS variables to be defined for any theme
      const requiredVars = [
        '--theme-background', 
        '--theme-text', 
        '--theme-primary', 
        '--theme-secondary',
        '--theme-accent'
      ];
      
      requiredVars.forEach(varName => {
        cy.wrap(bodyStyles.getPropertyValue(varName).trim()).should('not.be.empty');
      });
    });
  },
  
  // Helper to verify dark mode state
  verifyDarkMode: (isDarkMode) => {
    if (isDarkMode) {
      cy.get('html').should('have.class', 'dark');
      cy.window().then((win) => {
        expect(win.localStorage.getItem('darkMode')).to.equal('true');
      });
    } else {
      cy.get('html').should('not.have.class', 'dark');
      cy.window().then((win) => {
        const darkMode = win.localStorage.getItem('darkMode');
        expect(darkMode === null || darkMode === 'false').to.be.true;
      });
    }
  },
  
  // Helper to open theme selector
  openThemeSelector: () => {
    cy.get('#themePickerBtn').click();
    cy.wait(500); // Allow for dynamic selector creation
  },
  
  // Helper to take a themed screenshot
  takeThemedScreenshot: (name) => {
    cy.screenshot(`${name}`, {
      capture: 'viewport',
      overwrite: true
    });
  }
};

// Make utilities available globally as Cypress commands
Cypress.Commands.add('verifyThemeApplied', themeTestUtils.verifyThemeApplied);
Cypress.Commands.add('verifyDarkMode', themeTestUtils.verifyDarkMode);
Cypress.Commands.add('openThemeSelector', themeTestUtils.openThemeSelector);
Cypress.Commands.add('takeThemedScreenshot', themeTestUtils.takeThemedScreenshot);
