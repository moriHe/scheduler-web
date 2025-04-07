// INFO: Tests a new user that adds users in on the user page and then creates a plan.
describe("Common navigation first time visitor", () => {
  beforeEach(() => {
    // Ignore uncaught exceptions
    cy.on("uncaught:exception", (err, runnable) => {
      // Return false to prevent Cypress from failing the test
      return false;
    });

    cy.window().then((win) => win.localStorage.clear()); // Clear localStorage
  });

  const createUser = (userName) => {
    cy.get("#user-name").type(userName); // Type the username
    cy.get("#save-user-button").click(); // Click the save button
  };
  it("Should reset users and verify localStorage is cleared", () => {
    let confirmCounter = 0;
    const confirmPopups = [
      "Möchten Sie die Benutzer wirklich zurücksetzen?",
      "User kann an diesem Tag nicht. Trotzdem eintragen?",
      "User kann an diesem Tag nicht. Trotzdem eintragen?",
    ];
    // INFO: Reset localstorage for testing
    cy.window().then((win) => win.localStorage.setItem("users", "Hello"));
    cy.window().then((win) => {
      const users = win.localStorage.getItem("users");
      expect(users).to.equal("Hello");
    });

    // INFO: Start testing
    cy.visit("http://localhost:1234/kitashiftplan.html");

    // INFO: Alert and Confirm listeners that auto accept the boxes
    cy.once("window:alert", (alertText) => {
      expect(alertText).to.equal("Benutzer wurden zurückgesetzt."); // Validate alert text
    });
    cy.on("window:confirm", (confirmText) => {
      expect(confirmText).to.equal(confirmPopups[confirmCounter++]);
    });

    // INFO: Go to options page and reset users
    cy.get("#options-button").click();
    cy.get("#reset-users-button").click();
    cy.window().then((win) => {
      const users = win.localStorage.getItem("users");
      expect(users).to.deep.equal("[]");
    });

    // INFO: Go to user page and add users
    cy.get("#back-button").click();
    cy.get("#add-user-button").click();
    cy.get("#user-name").type("TEST_USER_A");
    cy.get("#save-user-button").click();
    cy.window().then((win) => {
      const users = win.localStorage.getItem("users");
      expect(users).to.deep.equal('["TEST_USER_A"]');
    });
    cy.get("#user-name").type("TEST_USER_B");
    cy.get("#save-user-button").click();
    cy.contains("TEST_USER_A");
    cy.contains("TEST_USER_B");
    cy.get(".delete-button").first().click();
    cy.window().then((win) => {
      const users = win.localStorage.getItem("users");
      expect(users).to.deep.equal('["TEST_USER_B"]');
    });
    cy.get(".delete-button").first().click();
    const users = Array.from(
      { length: 16 },
      (_, i) => `TEST_USER_${String.fromCharCode(65 + i)}`,
    );
    users.forEach((user) => {
      createUser(user);

      // Optional: Add assertion or wait for reset between iterations
      cy.get("#user-name").clear(); // Clear the input for the next user
    });
    users.forEach((user) => {
      cy.contains(user).scrollIntoView().should("be.visible"); // Check that the name is visible on the page
    });

    // INFO: Start plan tests
    cy.get("#back-button").click();
    cy.get("#view-calendar-button").click();
    cy.get("#month").select("Dezember");
    cy.get("#year").select("2034");
    cy.get("#month").should("have.value", "11");
    cy.get("#year").should("have.value", "2034");

    // INFO: Shallow check if the calendar has the right values.
    // Assumption: If weekend values is empty at the end, it should be correct.
    let expectedWeekendValues = new Set([
      "2",
      "3",
      "9",
      "10",
      "16",
      "17",
      "23",
      "24",
      "30",
      "31",
    ]);

    cy.get(".calendar")
      .first()
      .children(".excluded") // Get all children with the 'weekend' class
      .should("have.length", expectedWeekendValues.size) // Ensure there are exactly 10 weekend days
      .each(($el) => {
        // Extract the text (date) of each weekend element
        const dayText = $el.text().trim(); // Get the text of each day, removing extra whitespace

        // Assert that the day is in the list of expected values
        expect(expectedWeekendValues).to.include(dayText);
        // Remove the day from the set after matching it
        expectedWeekendValues.delete(dayText);
      });

    // After the loop, ensure that no expected values are left (i.e., each was found exactly once)
    cy.wrap(expectedWeekendValues).should("be.empty"); // The Set should be empty

    // INFO: User a is not available the whole month.
    cy.get(".calendar")
      .first() // Select the first .calendar element
      .children(".calendar-day") // Select all .calendar-day children
      .filter((_, el) => {
        // Filter elements based on conditions
        const dayText = Cypress.$(el).text().trim(); // Get the text and trim any extra spaces
        const hasWeekendClass = Cypress.$(el).hasClass("excluded"); // Check if the element has 'weekend' class
        return dayText !== "" && !hasWeekendClass; // Filter to only non-empty text and no weekend class
      })
      .each(($el) => {
        cy.wrap($el).click();
        cy.wrap($el).should("have.class", "not-available");
      });

    //INFO: User B is only available day 5, 6 and 7 and 8. Click 8 and unselect it again.
    cy.get(".calendar")
      .eq(1) // Select the first .calendar element
      .children(".calendar-day") // Select all .calendar-day children
      .filter((_, el) => {
        const dayText = Cypress.$(el).text().trim(); // Get the text and trim any extra spaces
        const hasWeekendClass = Cypress.$(el).hasClass("excluded"); // Check if the element has 'weekend' class
        const dayNumber = parseInt(dayText, 10); // Parse the text as a number

        // Exclude empty days, weekend class, and specific days (1, 4, 5, 6, 7)
        return (
          dayText !== "" &&
          !hasWeekendClass &&
          ![1, 4, 5, 6, 7, 8].includes(dayNumber)
        );
      })
      .each(($el) => {
        const dayText = Cypress.$($el).text().trim(); // Get the day text
        const dayNumber = parseInt(dayText, 10); // Convert it to a number

        if (dayNumber === 8) {
          // If the day is 8, click twice
          cy.wrap($el).click();
          cy.wrap($el).click();

          // Confirm the element does NOT have the 'not-available' class
          cy.wrap($el).should("not.have.class", "not-available");
        } else {
          // Otherwise, click once
          cy.wrap($el).click();

          // Confirm the element DOES have the 'not-available' class
          cy.wrap($el).should("have.class", "not-available");
        }
      });
    //INFO: Day 1 is holiday
    cy.get("#holidays-calendar")
      .find(".calendar-day") // Find all children with the class 'calendar-day'
      .each(($el) => {
        if ($el.text().trim() === "1") {
          cy.wrap($el).click(); // Example: Click on the element
          cy.wrap($el).click(); // Example: Click on the element
          cy.wrap($el).click(); // Example: Click on the element
          cy.wrap($el).should("have.class", "not-available");
        } else {
          cy.wrap($el).should("not.have.class", "not-available");
        }
      });
    // INFO: Day 4 is kita open, no shift for parents
    cy.get("#kitaOpenNoEd-calendar")
      .find(".calendar-day") // Find all children with the class 'calendar-day'
      .each(($el) => {
        if ($el.text().trim() === "4") {
          cy.wrap($el).click(); // Example: Click on the element
          cy.wrap($el).click(); // Example: Click on the element
          cy.wrap($el).click(); // Example: Click on the element
          cy.wrap($el).should("have.class", "not-available");
        } else {
          cy.wrap($el).should("not.have.class", "not-available");
        }
      });
    // INFO: Day 5 is team takes over 1 shift
    cy.get("#team-calendar")
      .find(".calendar-day") // Find all children with the class 'calendar-day'
      .each(($el) => {
        if ($el.text().trim() === "5") {
          cy.wrap($el).click(); // Example: Click on the element
          cy.wrap($el).click(); // Example: Click on the element
          cy.wrap($el).click(); // Example: Click on the element
          cy.wrap($el).should("have.class", "not-available");
        } else {
          cy.wrap($el).should("not.have.class", "not-available");
        }
      });
    // INFO: Show calendar preview
    cy.get("#show-preview-button").click();
    cy.get("#parent-summary")
      .should("be.visible")
      .and("not.contain", "TEST_USER_A");

    cy.get("select").each(($select) => {
      // Check that the selected option's value is not 'TEST_USER_A'
      cy.wrap($select) // Wrap each <select> element
        .find("option:selected") // Find the currently selected <option>
        .should("not.have.value", "TEST_USER_A"); // Assert the selected option's value is not 'TEST_USER_A'
    });

    // List of users to check for selection counts

    // List of users to check for selection counts
    const testUsers = [
      "TEST_USER_B",
      "TEST_USER_C",
      "TEST_USER_D",
      "TEST_USER_E",
      "TEST_USER_F",
      "TEST_USER_G",
      "TEST_USER_H",
      "TEST_USER_I",
      "TEST_USER_J",
      "TEST_USER_K",
      "TEST_USER_L",
      "TEST_USER_M",
      "TEST_USER_N",
      "TEST_USER_O",
      "TEST_USER_P",
    ];

    cy.get("#calendar-preview-table") // Select the table container
      .should("be.visible") // Ensure the table is visible
      .find("select") // Find all <select> elements within the table
      .then(($selects) => {
        const allSelectedValues = []; // Array to store all selected values

        // Process each <select> element
        cy.wrap($selects).each(($select) => {
          cy.wrap($select)
            .find("option:selected") // Get the selected option
            .should("be.visible") // Ensure it's visible
            .invoke("text") // Extract its text content
            .then((selectedText) => {
              allSelectedValues.push(selectedText); // Collect the selected value
            });
        });

        // Use `.then` to validate after collecting all values
        cy.wrap(null).then(() => {
          cy.log("All Selected Values:", allSelectedValues); // Debugging log

          // Check "Team" is selected exactly once
          const teamCount = allSelectedValues.filter(
            (value) => value === "Team",
          ).length;
          expect(teamCount).to.equal(1, "Team should appear exactly once");

          // Check TEST_USER_B to TEST_USER_P appear between 2 and 3 times
          testUsers.forEach((user) => {
            const userCount = allSelectedValues.filter(
              (value) => value === user,
            ).length;
            expect(userCount).to.be.within(
              2,
              3,
              `${user} should appear at least 2 times and at most 3 times`,
            );
          });
        });
        cy.get("#calendar-preview-table")
          .children()
          .each((child, index) => {
            // Skip the first child
            if (index === 0) return;

            // Extract date and day information for validation
            const dayIndex = index - 1;
            const date = new Date(2034, 11, 1 + dayIndex); // Assuming December 2034
            const day = date.toLocaleDateString("de-DE", { weekday: "short" }); // "Mo", "Di", etc.

            const formattedDate = date
              .toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })
              .replace(/\.$/, ""); // "dd.MM" without trailing period
            // Check classes and content based on the schema
            if (day === "Sa" || day === "So" || formattedDate === "01.12") {
              cy.wrap(child)
                .should("have.class", "bg-red-200") // Sa and Su should have bg-red-200
                .children()
                .eq(0)
                .should("have.text", day) // First child matches day
                .next()
                .should("have.text", formattedDate); // Second child matches formatted date
            } else if (formattedDate === "04.12") {
              cy.wrap(child)
                .should("have.class", "bg-yellow-200") // 04.12 should have bg-yellow-200
                .children()
                .eq(0)
                .should("have.text", day) // First child matches day
                .next()
                .should("have.text", formattedDate); // Second child matches formatted date
            } else {
              cy.wrap(child)
                .should("not.have.class", "bg-yellow-200") // Non-highlighted days
                .and("not.have.class", "bg-red-200")
                .children()
                .eq(0)
                .should("have.text", day) // First child matches day
                .next()
                .should("have.text", formattedDate); // Second child matches formatted date
            }
          });
      });
    // Locate the #calendar-preview-table and select the child at index 11
    cy.get("#calendar-preview-table")
      .children()
      .eq(11) // Select the child at index 11
      .as("targetRow"); // Alias for reusability

    // Modify the third child (select element) of the target row
    cy.get("@targetRow")
      .children()
      .eq(2) // Third child (index 2)
      .select("TEST_USER_B"); // Change the value to TEST_USER_B

    // Verify the change did not persist
    cy.get("@targetRow").children().eq(2).should("have.value", "TEST_USER_B");

    cy.get("#calendar-preview-table")
      .children()
      .eq(11) // Select the child at index 11
      .as("targetRow1"); // Alias for reusability

    // Modify the third child (select element) of the target row
    cy.get("@targetRow1")
      .children()
      .eq(3) // fourth child (index 3)
      .select("TEST_USER_B"); // Change the value to TEST_USER_B

    // Verify the change did not persist
    cy.get("@targetRow1").children().eq(3).should("have.value", "TEST_USER_B");

    cy.get("#calendar-preview-table")
      .children()
      .eq(5) // Select the child at index 11
      .as("targetRow2"); // Alias for reusability

    // Modify the third child (select element) of the target row
    cy.get("@targetRow2")
      .children()
      .eq(2) // Third child (index 2)
      .select("TEST_USER_B"); // Change the value to TEST_USER_B
    cy.get("@targetRow2").children().eq(2).should("have.value", "TEST_USER_B");
    // INFO: END
  });
});
