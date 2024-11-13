import {
  assignUsersToCalendar,
  generatePDF,
  formatDate,
  formatDayOfWeek,
  displayError,
} from "../calendar.js";

let usersData = []; // To store user data temporarily
let formattedUsers = []; // To store the formatted users data
let selectedWeekdays = [];
const WEEKDAY_MAPPING = {
  Mo: "Monday",
  Di: "Tuesday",
  Mi: "Wednesday",
  Do: "Thursday",
  Fr: "Friday",
};
let holidays = [];
let teamdays = [];

// Load users and populate year select box
window.onload = () => {
  // Simulate loading users from an API or local storage for browser
  const jsonUsers = localStorage.getItem("users");
  if (jsonUsers) {
    usersData = JSON.parse(jsonUsers);
  }

  populateYearSelect();
  formatUsersData(usersData); // Convert to required format only once
  updateCalendar(); // Populate the calendar for the default month/year

  // Go back to the front page
  document.getElementById("back-button").addEventListener("click", () => {
    window.location.href = "../index.html"; // Navigate back to index.html
  });

  // Add event listeners for month and year change
  document
    .getElementById("month")
    .addEventListener("change", () => updateCalendar());
  document
    .getElementById("year")
    .addEventListener("change", () => updateCalendar());

  document
    .getElementById("show-preview-button")
    .addEventListener("click", function() {
      // Hide the plan creation container
      document
        .getElementById("plan-creation-container")
        .classList.add("hidden");

      // Show the calendar preview container
      document
        .getElementById("calendar-preview-container")
        .classList.remove("hidden");

      // Call the render function to populate the preview table
      renderCalendarPreview();
    });

  // Function to go back to the plan creation container
  document
    .getElementById("back-creation-button")
    .addEventListener("click", function() {
      // Show the plan creation container
      document
        .getElementById("plan-creation-container")
        .classList.remove("hidden");

      // Hide the calendar preview container
      document
        .getElementById("calendar-preview-container")
        .classList.add("hidden");
    });
};

function formatUsersData(users) {
  // Convert the flat user array into the desired object format
  formattedUsers = users.map((user) => ({
    name: user,
    not_available: [], // Initialize not_available for each user
  }));
}

function populateYearSelect() {
  const yearSelect = document.getElementById("year");
  const currentYear = new Date().getFullYear();
  yearSelect.innerHTML = ""; // Clear existing options
  for (let i = currentYear; i <= currentYear + 10; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = i;
    yearSelect.appendChild(option);
  }
  yearSelect.value = currentYear; // Default to the current year
}

let calendar = null;

function renderCalendarPreview() {
  const month = parseInt(document.getElementById("month").value) + 1; // Add 1 because months are 0-indexed in JS
  const year = parseInt(document.getElementById("year").value);

  const selectedWeekdays = Array.from(
    document.querySelectorAll(".weekday-checkbox:checked"),
  ).map((checkbox) => WEEKDAY_MAPPING[checkbox.value]);
  const options = {
    weekdays: selectedWeekdays, // only week days
    holidays, // List of holidays
    teamdays, // List of days the team takes a slot
  };

  calendar = assignUsersToCalendar(month, year, formattedUsers, options);

  function renderCalendar() {
    const previewBody = document.getElementById("calendar-preview-table");
    const firstRow = previewBody.firstElementChild;
    previewBody.innerHTML = ""; // Clear previous rows
    previewBody.appendChild(firstRow);
    // Store the calendar entries for later updates
    const calendarEntries = Object.entries(calendar).map(
      ([day, [parent1, parent2, meta]]) => {
        return { day, parent1, parent2, meta }; // Create an array of objects for easy access
      },
    );

    const parentCount = {};
    calendarEntries.forEach(({ parent1, parent2, meta }) => {
      if (meta.isValidDay && parent1 && parent1 !== "NOT SET")
        parentCount[parent1] = (parentCount[parent1] || 0) + 1;
      if (meta.isValidDay && parent2 && parent2 !== "NOT SET")
        parentCount[parent2] = (parentCount[parent2] || 0) + 1;
    });

    const summaryDiv = document.getElementById("parent-summary");
    summaryDiv.innerHTML = ""; // Clear previous list

    Object.entries(parentCount)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([parent, count]) => {
        const summaryItem = document.createElement("div");
        summaryItem.classList.add(
          "flex",
          "justify-between",
          "py-1",
          "cursor-pointer",
        );
        summaryItem.innerHTML = `
                <span class="font-medium text-gray-800">${parent}</span>
                <span class="text-gray-600">(${count})</span>
            `;

        summaryItem.addEventListener("click", () => {
          document
            .querySelectorAll("#parent-summary > div")
            .forEach((item) => item.classList.remove("bg-green-200"));
          // Apply the green background to the clicked summary item
          summaryItem.classList.add("bg-green-200");
          // Find all select elements in the calendar preview
          const selects = document.querySelectorAll(
            "#calendar-preview-table select",
          );

          selects.forEach((select) => {
            // Check if the select's value matches the clicked parent name
            if (select.value === parent) {
              select.classList.add("bg-green-200"); // Highlight matching select
            } else {
              select.classList.remove("bg-green-200"); // Remove highlight from non-matching selects
            }
          });
        });
        summaryDiv.appendChild(summaryItem);
      });

    for (const entry of calendarEntries) {
      const { day, parent1, parent2, meta } = entry;

      const flexContainer = document.createElement("div");
      flexContainer.classList.add("flex", "w-full", "py-1", "border");
      const rowDateDiv = document.createElement("div");
      const rowDate = formatDate(day, month, year);
      rowDateDiv.textContent = rowDate;
      rowDateDiv.classList.add("w-1/6", "text-left");

      const rowDayDiv = document.createElement("div");
      const rowDay = formatDayOfWeek(day, month, year);
      rowDayDiv.textContent = rowDay;
      rowDayDiv.classList.add("w-1/12", "text-left");

      flexContainer.appendChild(rowDayDiv);
      flexContainer.appendChild(rowDateDiv);

      if (!meta.isValidDay) {
        flexContainer.classList.add("bg-red-200");
        const invalidDayInput = document.createElement("input");
        invalidDayInput.type = "text"; // Make it an input field
        invalidDayInput.value = calendar[day][2].invalidText || "";
        invalidDayInput.classList.add(
          "flex-1",
          "text-center",
          "bg-red-200",
        );
        invalidDayInput.setAttribute("tabindex", "0"); // Make it focusable

        // Add change event listener to the invalidDayInput
        invalidDayInput.addEventListener("change", () => {
          const newValue = invalidDayInput.value.trim();
          calendar[day][2].invalidText = newValue;
          renderCalendar();
        });

        flexContainer.appendChild(invalidDayInput);
      } else {
        const user1Select = document.createElement("select");
        user1Select.classList.add(
          "flex-1",
          "text-left",
          "cursor-pointer",
        );

        if (!usersData.find((user) => user === parent1)) {
          user1Select.classList.add("bg-yellow-200");
        }

        const noSelectionUser1 = document.createElement("option");
        noSelectionUser1.value = "NOT SET";
        noSelectionUser1.textContent = "NOT SET";
        if (parent1 === "NOT SET") noSelectionUser1.selected = true;
        user1Select.appendChild(noSelectionUser1);

        usersData.forEach((user) => {
          const option = document.createElement("option");
          option.value = user;
          option.textContent = user;
          if (user === parent1) option.selected = true;
          user1Select.appendChild(option);
        });

        user1Select.addEventListener("change", () => {
          const isSet = user1Select.value !== "NOT SET";
          const naDateArray =
            formattedUsers.find((fUser) => {
              return fUser.name === user1Select.value;
            })?.not_available || [];

          let continueProcess = true;
          if (isSet && naDateArray.includes(`${year}-${month}-${day}`)) {
            continueProcess = confirm(
              `User kann an diesem Tag nicht. Trotzdem eintragen?`,
            );
          }
          if (continueProcess) {
            calendar[day][0] = user1Select.value;
          }
          renderCalendar();
        });

        const user2Select = document.createElement("select");
        user2Select.classList.add(
          "flex-1",
          "text-left",
          "cursor-pointer",
        );

        if (
          parent2 !== "Team" &&
          !usersData.find((user) => user === parent2)
        ) {
          user2Select.classList.add("bg-yellow-200");
        }

        const noSelectionUser2 = document.createElement("option");
        noSelectionUser2.value = "NOT SET";
        noSelectionUser2.textContent = "NOT SET";
        if (parent2 === "NOT SET") noSelectionUser2.selected = true;
        user2Select.appendChild(noSelectionUser2);

        usersData.forEach((user) => {
          const option = document.createElement("option");
          option.value = user;
          option.textContent = user;
          if (user === parent2) option.selected = true;
          user2Select.appendChild(option);
        });

        if (parent2 === "Team") {
          const teamOption = document.createElement("option");
          teamOption.value = "Team";
          teamOption.textContent = "Team";
          teamOption.selected = true;
          user2Select.appendChild(teamOption);

          user2Select.value = "Team"; // Set "Team" as the value
          user2Select.disabled = true; // Disable the select element

          // Optional: add a class to style it differently when disabled
          user2Select.classList.add("cursor-not-allowed");
        }

        if (!user2Select.disabled) {
          user2Select.addEventListener("change", () => {
            calendar[day][1] = user2Select.value;
            renderCalendar();
          });
        }

        flexContainer.appendChild(user1Select);
        flexContainer.appendChild(user2Select);
      }

      previewBody.appendChild(flexContainer);
    }
  }
  renderCalendar();
}

document
  .getElementById("preview-button")
  .addEventListener("click", () => {
    // Reload the calendar preview
    renderCalendarPreview();
    console.log("Preview updated");
  });

function updateCalendar() {
  // Clear not_available array for each user when switching months or years
  formattedUsers.forEach((user) => (user.not_available = []));
  holidays = [];
  teamdays = [];
  selectedWeekdays = Array.from(
    document.querySelectorAll(".weekday-checkbox:checked"),
  ).map((checkbox) => checkbox.value);

  populateUserTable(formattedUsers); // Update the user table with the formatted users data
  updateHolidayCalendar();
  updateTeamTakesSlotCalendar();
}

function populateUserTable(users) {
  const userTableBody = document.getElementById("user-table-body");
  userTableBody.innerHTML = ""; // Clear existing table rows

  const month = document.getElementById("month").value;
  const year = document.getElementById("year").value;

  users.forEach((user) => {
    const row = document.createElement("tr");
    row.classList.add("border-b");

    const userCell = document.createElement("td");
    userCell.classList.add("p-2");
    userCell.textContent = user.name; // Display user name
    row.appendChild(userCell);

    const calendarCell = document.createElement("td");
    calendarCell.classList.add("p-2");

    // Create calendar days for the month
    const daysContainer = document.createElement("div");
    daysContainer.classList.add("calendar");

    // Add day headers (Mo, Di, Mi, Do, Fr, Sa, So)
    const daysOfWeek = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    daysOfWeek.forEach((day) => {
      const dayHeader = document.createElement("div");
      dayHeader.classList.add("calendar-header");
      dayHeader.textContent = day;
      daysContainer.appendChild(dayHeader);
    });

    // Fill in empty cells for alignment
    const firstDayOfMonth = new Date(year, parseInt(month), 1).getDay(); // Get day index (0-6) where 0 is Sunday
    const firstDayAdjusted = (firstDayOfMonth + 6) % 7; // Adjust for the new starting day (Monday)

    for (let i = 0; i < firstDayAdjusted; i++) {
      const emptyCell = document.createElement("div");
      emptyCell.classList.add("calendar-day"); // Keep the style
      daysContainer.appendChild(emptyCell);
    }

    const daysInMonth = new Date(year, parseInt(month) + 1, 0).getDate(); // Get number of days in the month

    for (let day = 1; day <= daysInMonth; day++) {
      const dayButton = document.createElement("div");
      dayButton.classList.add("calendar-day");
      dayButton.textContent = day;

      // Check if the day is Saturday (6) or Sunday (0)
      const dayOfWeek = new Date(year, parseInt(month), day).getDay();
      const dayName = daysOfWeek[dayOfWeek - 1];

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        dayButton.classList.add("weekend"); // Grey out weekend days
      } else if (!selectedWeekdays.includes(dayName)) {
        // If the day is not in the selected weekdays, mark it as excluded
        dayButton.classList.add("excluded"); // Gray out excluded days
        dayButton.style.cursor = "default"; // Ensure default cursor
      } else {
        // Check if the day is already not available for the user
        const isNotAvailable = user.not_available.includes(
          `${year}-${parseInt(month) + 1}-${day}`,
        );
        if (isNotAvailable) {
          dayButton.classList.add("not-available"); // Highlight already not available days
        }
        dayButton.addEventListener("click", () => {
          // Toggle day availability
          const dateKey = `${year}-${parseInt(month) + 1}-${day}`;

          // Check if the day is currently in not_available
          const isCurrentlyNotAvailable =
            user.not_available.includes(dateKey);
          if (isCurrentlyNotAvailable) {
            // Remove from not_available
            user.not_available = user.not_available.filter(
              (date) => date !== dateKey,
            );
            dayButton.classList.remove("not-available"); // Change button color back
          } else {
            // Add to not_available
            user.not_available.push(dateKey);
            dayButton.classList.add("not-available"); // Highlight
          }
        });
      }

      daysContainer.appendChild(dayButton);
    }

    calendarCell.appendChild(daysContainer);
    row.appendChild(calendarCell);
    userTableBody.appendChild(row);
  });
}

function updateHolidayCalendar() {
  updateGenericCalender("holidays-calendar", holidays);
}

function updateTeamTakesSlotCalendar() {
  updateGenericCalender("team-calendar", teamdays);
}

// Create a function to update the generic calendars
function updateGenericCalender(id, subjectArray) {
  const month = document.getElementById("month").value;
  const year = document.getElementById("year").value;

  const subjectCalendar = document.getElementById(id);
  subjectCalendar.innerHTML = ""; // Clear existing days

  // Add day headers (Mo, Di, Mi, Do, Fr, Sa, So)
  const daysOfWeek = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  daysOfWeek.forEach((day) => {
    const dayHeader = document.createElement("div");
    dayHeader.classList.add("calendar-header");
    dayHeader.textContent = day;
    subjectCalendar.appendChild(dayHeader);
  });

  // Fill in empty cells for alignment
  const firstDayOfMonth = new Date(year, parseInt(month), 1).getDay(); // Get day index (0-6) where 0 is Sunday
  const firstDayAdjusted = (firstDayOfMonth + 6) % 7; // Adjust for the new starting day (Monday)

  for (let i = 0; i < firstDayAdjusted; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.classList.add("calendar-day"); // Keep the style
    subjectCalendar.appendChild(emptyCell);
  }

  const daysInMonth = new Date(year, parseInt(month) + 1, 0).getDate(); // Get number of days in the month

  for (let day = 1; day <= daysInMonth; day++) {
    const dayButton = document.createElement("div");
    dayButton.classList.add("calendar-day");
    dayButton.textContent = day;

    // Check if the day is Saturday (6) or Sunday (0)
    const dayOfWeek = new Date(year, parseInt(month), day).getDay();
    const dayName = daysOfWeek[dayOfWeek - 1];

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      dayButton.classList.add("weekend"); // Grey out weekend days
    } else if (!selectedWeekdays.includes(dayName)) {
      // If the day is not in the selected weekdays, mark it as excluded
      dayButton.classList.add("excluded"); // Gray out excluded days
      dayButton.style.cursor = "default"; // Ensure default cursor
    } else {
      // Check if the day is already marked as a subject
      const isSubject = subjectArray.includes(
        `${year}-${parseInt(month) + 1}-${day}`,
      );
      if (isSubject) {
        dayButton.classList.add("not-available"); // Highlight subject days
      }
      dayButton.addEventListener("click", () => {
        // Toggle day subject status
        const dateKey = `${year}-${parseInt(month) + 1}-${day}`;
        const isCurrentlySubject = subjectArray.includes(dateKey);

        if (isCurrentlySubject) {
          // Find the index of the date in the original array
          const index = subjectArray.indexOf(dateKey);

          // Remove the date if it exists in the array
          if (index > -1) {
            subjectArray.splice(index, 1); // Remove item directly from the original array
          }

          dayButton.classList.remove("not-available"); // Change button color back
        } else {
          // Add to subject array
          subjectArray.push(dateKey);
          dayButton.classList.add("not-available"); // Highlight
        }
      });
    }

    subjectCalendar.appendChild(dayButton);
  }
}

document
  .getElementById("generate-pdf-button")
  .addEventListener("click", async () => {
    const month = parseInt(document.getElementById("month").value) + 1; // Add 1 because months are 0-indexed in JS
    const year = parseInt(document.getElementById("year").value);

    try {
      if (!calendar || Object.entries(calendar).length === 0) {
        displayError("Please Update the preview");
        return;
      }

      // Simulate a PDF download by creating a Blob and using it as a downloadable file
      const fileBlob = generatePDF(calendar, month, year, usersData); // Assuming this returns a blob or binary data

      const downloadLink = document.createElement("a");
      downloadLink.href = URL.createObjectURL(fileBlob);
      downloadLink.download = `elterndienstplan_${year}_${month}.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      console.log("PDF generated successfully");
    } catch (error) {
      console.error(error.message);
    }
  });

// Add this inside your window.onload function, right after populating the year select box
document.querySelectorAll(".weekday-checkbox").forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    // Call updateCalendar whenever a checkbox is checked/unchecked
    updateCalendar();
  });
});

