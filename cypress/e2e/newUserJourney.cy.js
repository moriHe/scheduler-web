// INFO: Tests a new user that adds users in on the user page and then creates a plan.
describe('Common navigation first time visitor', () => {
  beforeEach(() => {
    // Ignore uncaught exceptions
    cy.on('uncaught:exception', (err, runnable) => {
      // Return false to prevent Cypress from failing the test
      return false;
    });
  });

  const createUser = (userName) => {
    cy.get('#user-name').type(userName); // Type the username
    cy.get('#save-user-button').click(); // Click the save button
  };
  it('Should reset users and verify localStorage is cleared', () => {
    // INFO: Reset localstorage for testing
    cy.window().then((win) => win.localStorage.setItem("users", "Hello"))
    cy.window().then((win) => {
      const users = win.localStorage.getItem("users");
      expect(users).to.equal("Hello");
    });

    // INFO: Start testing
    cy.visit('http://localhost:3000/index.html');

    // INFO: Alert and Confirm listeners that auto accept the boxes
    cy.on('window:alert', (alertText) => {
      expect(alertText).to.equal('Benutzer wurden zurückgesetzt.'); // Validate alert text
    });
    cy.on('window:confirm', (confirmText) => {
      expect(confirmText).to.equal('Möchten Sie die Benutzer wirklich zurücksetzen?');
    });

    // INFO: Go to options page and reset users
    cy.get('#options-button').click();
    cy.get('#reset-users-button').click();
    cy.window().then((win) => {
      const users = win.localStorage.getItem('users');
      expect(users).to.deep.equal("[]");
    });

    // INFO: Go to user page and add users
    cy.get('#back-button').click();
    cy.get('#add-user-button').click();
    cy.get('#user-name').type("TEST_USER_A");
    cy.get('#save-user-button').click();
    cy.window().then((win) => {
      const users = win.localStorage.getItem('users');
      expect(users).to.deep.equal('["TEST_USER_A"]');
    });
    cy.get('#user-name').type("TEST_USER_B");
    cy.get('#save-user-button').click();
    cy.contains("TEST_USER_A");
    cy.contains("TEST_USER_B");
    cy.get('.delete-button').first().click();
    cy.window().then((win) => {
      const users = win.localStorage.getItem("users");
      expect(users).to.deep.equal('["TEST_USER_B"]');
    });
    cy.get('.delete-button').first().click();
    const users = Array.from({ length: 16 }, (_, i) => `TEST_USER_${String.fromCharCode(65 + i)}`);
    users.forEach((user) => {
      createUser(user);

      // Optional: Add assertion or wait for reset between iterations
      cy.get('#user-name').clear(); // Clear the input for the next user
    });
    users.forEach((user) => {
      cy.contains(user).should('be.visible'); // Check that the name is visible on the page
    });
    // INFO: END
  });
});

