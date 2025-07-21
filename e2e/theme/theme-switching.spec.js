// e2e/theme/theme-switching.spec.js
// Tests for theme switching and dark mode functionality

// Part 1: Dark Mode Toggle Tests
describe('Dark Mode Toggling', () => {
  beforeEach(() => {
    cy.visit('/');
    // Wait for the application to fully load
    cy.get('#mindmapContainer', { timeout: 10000 }).should('be.visible');
  });

  it('should toggle dark mode on -> off -> on again', () => {
    // Initial state should be light mode (or verify current state)
    cy.get('html').then($html => {
      const initialDarkMode = $html.hasClass('dark');
      
      // Toggle dark mode
      cy.get('#darkModeToggle').click();
      cy.verifyDarkMode(!initialDarkMode);
      cy.takeThemedScreenshot('dark-mode-first-toggle');
      
      // Toggle back
      cy.get('#darkModeToggle').click();
      cy.verifyDarkMode(initialDarkMode);
      cy.takeThemedScreenshot('dark-mode-second-toggle');
      
      // Toggle again
      cy.get('#darkModeToggle').click();
      cy.verifyDarkMode(!initialDarkMode);
      cy.takeThemedScreenshot('dark-mode-third-toggle');
      
      // Verify dark mode persists after page reload
      cy.reload();
      cy.get('#mindmapContainer', { timeout: 10000 }).should('be.visible');
      cy.verifyDarkMode(!initialDarkMode);
      cy.takeThemedScreenshot('dark-mode-after-reload');
    });
  });
});

// Part 2: Theme Switching Tests
describe('Theme Switching', () => {
  beforeEach(() => {
    cy.visit('/');
    // Wait for the application to fully load
    cy.get('#mindmapContainer', { timeout: 10000 }).should('be.visible');
    // Open the theme selector
    cy.openThemeSelector();
  });

  it('should switch between theme1 and theme2 and back', () => {
    // Get all available theme cards
    cy.get('.theme-card').then($cards => {
      // Need at least 2 themes for this test
      expect($cards.length).to.be.at.least(2);
      
      // Get the current theme
      cy.get('html').invoke('attr', 'data-theme').then((initialTheme) => {
        // Find a different theme to switch to
        let secondTheme;
        for (let i = 0; i < $cards.length; i++) {
          const themeId = $cards[i].getAttribute('data-theme-id');
          if (themeId !== initialTheme) {
            secondTheme = themeId;
            break;
          }
        }
        
        // Switch to the second theme
        cy.get(`.theme-card[data-theme-id="${secondTheme}"]`).click();
        cy.verifyThemeApplied(secondTheme);
        cy.takeThemedScreenshot(`theme-switch-to-${secondTheme}`);
        
        // Open theme selector again
        cy.openThemeSelector();
        
        // Switch back to the original theme
        cy.get(`.theme-card[data-theme-id="${initialTheme}"]`).click();
        cy.verifyThemeApplied(initialTheme);
        cy.takeThemedScreenshot(`theme-switch-back-to-${initialTheme}`);
        
        // Verify theme persists after page reload
        cy.reload();
        cy.get('#mindmapContainer', { timeout: 10000 }).should('be.visible');
        cy.verifyThemeApplied(initialTheme);
      });
    });
  });
});

// Part 3: Combined Dark Mode and Theme Switching Tests
describe('Combined Dark Mode and Theme Switching', () => {
  beforeEach(() => {
    cy.visit('/');
    // Wait for the application to fully load
    cy.get('#mindmapContainer', { timeout: 10000 }).should('be.visible');
  });

  it('should handle changing dark mode -> theme1 -> theme2', () => {
    // Get initial theme
    cy.get('html').invoke('attr', 'data-theme').then((initialTheme) => {
      // Enable dark mode first
      cy.get('#darkModeToggle').click();
      cy.verifyDarkMode(true);
      cy.takeThemedScreenshot('combined-dark-mode-on');
      
      // Open theme selector and get available themes
      cy.openThemeSelector();
      cy.get('.theme-card').then($cards => {
        // Need at least 2 themes different from initial for this test
        expect($cards.length).to.be.at.least(2);
        
        // Find two different themes
        let theme1, theme2;
        for (let i = 0; i < $cards.length; i++) {
          const themeId = $cards[i].getAttribute('data-theme-id');
          if (themeId !== initialTheme) {
            if (!theme1) {
              theme1 = themeId;
            } else if (!theme2 && themeId !== theme1) {
              theme2 = themeId;
              break;
            }
          }
        }
        
        // Switch to theme1
        cy.get(`.theme-card[data-theme-id="${theme1}"]`).click();
        cy.verifyThemeApplied(theme1);
        cy.verifyDarkMode(true); // Dark mode should still be enabled
        cy.takeThemedScreenshot(`combined-theme1-${theme1}`);
        
        // Open theme selector again
        cy.openThemeSelector();
        
        // Switch to theme2
        cy.get(`.theme-card[data-theme-id="${theme2}"]`).click();
        cy.verifyThemeApplied(theme2);
        cy.verifyDarkMode(true); // Dark mode should still be enabled
        cy.takeThemedScreenshot(`combined-theme2-${theme2}`);
        
        // Verify settings persist after page reload
        cy.reload();
        cy.get('#mindmapContainer', { timeout: 10000 }).should('be.visible');
        cy.verifyThemeApplied(theme2);
        cy.verifyDarkMode(true);
      });
    });
  });
});
