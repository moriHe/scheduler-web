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

    // INFO: Start plan tests
    cy.get('#back-button').click();
    cy.get('#view-calendar-button').click();
    cy.get('#month').select('Dezember');
    cy.get('#year').select('2034');
    cy.get('#month').should('have.value', '11');
    cy.get('#year').should('have.value', '2034');

    // INFO: Shallow check if the calendar has the right values.
    // Assumption: If weekend values is empty at the end, it should be correct.
    let expectedWeekendValues = new Set(['2', '3', '9', '10', '16', '17', '23', '24', '30', '31']);

    cy.get('.calendar').first()
      .children('.weekend')  // Get all children with the 'weekend' class
      .should('have.length', expectedWeekendValues.size) // Ensure there are exactly 10 weekend days
      .each(($el) => {
        // Extract the text (date) of each weekend element
        const dayText = $el.text().trim(); // Get the text of each day, removing extra whitespace

        // Assert that the day is in the list of expected values
        expect(expectedWeekendValues).to.include(dayText);
        // Remove the day from the set after matching it
        expectedWeekendValues.delete(dayText);
      });

    // After the loop, ensure that no expected values are left (i.e., each was found exactly once)
    cy.wrap(expectedWeekendValues).should('be.empty'); // The Set should be empty

    cy.get('.calendar').first()  // Select the first .calendar element
      .children('.calendar-day') // Select all .calendar-day children
      .filter((_, el) => {   // Filter elements based on conditions
        const dayText = Cypress.$(el).text().trim();  // Get the text and trim any extra spaces
        const hasWeekendClass = Cypress.$(el).hasClass('weekend');  // Check if the element has 'weekend' class
        return dayText !== '' && !hasWeekendClass;  // Filter to only non-empty text and no weekend class
      })
      .each(($el) => {
        cy.wrap($el).click();
        cy.wrap($el).should('have.class', 'not-available');
      });

    // INFO: END
  });
});

