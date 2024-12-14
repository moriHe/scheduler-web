describe('Common navigation first time visitor', () => {
  beforeEach(() => {
    // Ignore uncaught exceptions
    cy.on('uncaught:exception', (err, runnable) => {
      // Return false to prevent Cypress from failing the test
      return false;
    });

  });

  it('Should reset users and verify localStorage is cleared', () => {
    // Reset localstorage for testing
    cy.window().then((win) => win.localStorage.setItem("users", "Hello"))
    cy.window().then((win) => {
      const users = win.localStorage.getItem("users");
      expect(users).to.equal("Hello");
    });

    // Start testing
    cy.visit('http://localhost:3000/index.html');

    // Alert and Confirm listeners
    cy.on('window:alert', (alertText) => {
      expect(alertText).to.equal('Benutzer wurden zurückgesetzt.'); // Validate alert text
    });
    cy.on('window:confirm', (confirmText) => {
      expect(confirmText).to.equal('Möchten Sie die Benutzer wirklich zurücksetzen?');
    });

    // Go to options page
    cy.get('#options-button').click();
    cy.get('#reset-users-button').click();
    cy.window().then((win) => {
      const users = win.localStorage.getItem('users');
      expect(users).to.deep.equal("[]");
    });
  });

});

