import {
    assignUsersCalendarThreeCols,
    assignUsersCalendarTwoCols,
    generatePDFThreeCols,
    formatDate,
    formatDayOfWeek,
    displayError, generatePDFTwoCols,
} from "./shiftplanCalendar.js";

let usersData = [];         // Temporäre Speicherung der Nutzerdaten
let formattedUsers = [];      // Formatierte Nutzerdaten
let selectedWeekdays = [];
const WEEKDAY_MAPPING = {
    Mo: "Monday",
    Di: "Tuesday",
    Mi: "Wednesday",
    Do: "Thursday",
    Fr: "Friday",
    Sa: "Saturday",
    So: "Sunday",
};
let holidays = [];
let kitaOpenNoEd = [];
let teamdays = [];

// Laden der Nutzerdaten und Initialisierung der Jahresauswahl
window.onload = () => {
    const toggleBtn = document.getElementById('toggle-summary');
    const parentSummary = document.getElementById('parent-summary');

    toggleBtn.addEventListener('click', () => {
        parentSummary.classList.toggle('hidden');
    });
    function configureHeaders(labelArray, registerEventListener) {
        labelArray.forEach((label, index) => {
            const input = document.getElementById(label);
            input.value = localStorage.getItem(label) || `Schicht ${index + 1}`;
            if (registerEventListener) {
                input.addEventListener('input', () => {
                    localStorage.setItem(label, input.value.trim());
                });
            }
        });
    }
    configureHeaders( ['twocol-label-1', 'twocol-label-2'], true)
    configureHeaders( ['threecol-label-1', 'threecol-label-2', 'threecol-label-3'], true)

    const jsonUsers = localStorage.getItem("shiftplanUsers");
    if (jsonUsers) {
        usersData = JSON.parse(jsonUsers);
    }
    populateYearSelect();
    const today = new Date();
    const nextMonth = (today.getMonth() + 1) % 12;
    const nextYear = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
    document.getElementById("month").value = nextMonth;
    document.getElementById("year").value = nextYear;
    formatUsersData(usersData);
    updateCalendar();

    document.getElementById("back-button").addEventListener("click", () => {
        window.location.href = "/shiftplan.html";
    });

    document.getElementById("month").addEventListener("change", () => updateCalendar());
    document.getElementById("year").addEventListener("change", () => updateCalendar());

    document.getElementById("onlySelected").addEventListener("click", () => {
        renderCalendarPreview(formattedUsers.filter(user => user.name !== document.getElementById("nameInput")?.value?.trim()))
        document.getElementById("customModal").classList.add("hidden");
    })

    document.getElementById("cancel").addEventListener("click", () => {
        document.getElementById("customModal").classList.add("hidden");
    })
    document.getElementById("show-preview-button").addEventListener("click", function () {
        configureHeaders( ['twocol-label-1', 'twocol-label-2'], false)
        configureHeaders( ['threecol-label-1', 'threecol-label-2', 'threecol-label-3'], false)
        const specificPerson = document.getElementById("nameInput")?.value?.trim();
        const isSpecificPersonInUsersArray = usersData?.find(user => user === specificPerson);
        if (isSpecificPersonInUsersArray) {
            showCustomModal(specificPerson);
            return
        }

        if (teamdays.length !== 0 && !specificPerson) {
            alert("Bitte Person im ausgewählte Schichten Kalender eintragen.")
            return
        }
        renderCalendarPreview();
    });

    document.getElementById("back-creation-button").addEventListener("click", function () {
        document.getElementById("plan-creation-container").classList.remove("hidden");
        document.getElementById("calendar-preview-container").classList.add("hidden");
    });
};

function formatUsersData(users) {
    formattedUsers = users.map((user) => ({
        name: user,
        not_available: [],
    }));
}

function populateYearSelect() {
    const yearSelect = document.getElementById("year");
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = "";
    for (let i = currentYear; i <= currentYear + 10; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = i;
        yearSelect.appendChild(option);
    }
    yearSelect.value = currentYear;
}

let calendar = null;

function renderCalendarPreview(subsetFormattedUsers) {
    document.getElementById("plan-creation-container").classList.add("hidden");
    document.getElementById("calendar-preview-container").classList.remove("hidden");

    const usersToAssign = subsetFormattedUsers ?? formattedUsers
    const month = parseInt(document.getElementById("month").value) + 1;
    const year = parseInt(document.getElementById("year").value);

    const selectedWeekdays = Array.from(
        document.querySelectorAll(".weekday-checkbox:checked")
    ).map((checkbox) => WEEKDAY_MAPPING[checkbox.value]);

    const options = {
        weekdays: selectedWeekdays,
        holidays,
        kitaOpenNoEd,
        teamdays,
        specificPerson: document.getElementById("nameInput")?.value
    };

    const shiftValue = document.querySelector('input[name="shifts-per-day"]:checked').value;
    if (shiftValue === "3") {
        calendar = assignUsersCalendarThreeCols(month, year, usersToAssign, options);
        renderCalendarThreeCols(month, year);


    } else {
        calendar = assignUsersCalendarTwoCols(month, year, usersToAssign, options);
        renderCalendarTwoCol(month, year);
    }

}

function renderCalendarThreeCols(month, year) {
    const previewBody = document.getElementById("calendar-preview-table");
    const twoColHeader = document.getElementById("tableheadersTwoCols");
    const threeColHeader = document.getElementById("tableheadersThreeCols");

    previewBody.innerHTML = "";
    twoColHeader.classList.add("hidden");
    threeColHeader.classList.remove("hidden");
    previewBody.appendChild(twoColHeader);
    previewBody.appendChild(threeColHeader);

    const calendarEntries = Object.entries(calendar).map(
        ([day, [parent1, parent2, parent3, meta]]) => ({ day, parent1, parent2, parent3, meta })
    );

    const parentCount = {};
    calendarEntries.forEach(({ parent1, parent2, parent3, meta }) => {
        if (meta.isValidDay && parent1 && parent1 !== "NOT SET")
            parentCount[parent1] = (parentCount[parent1] || 0) + 1;
        if (meta.isValidDay && parent2 && parent2 !== "NOT SET")
            parentCount[parent2] = (parentCount[parent2] || 0) + 1;
        if (meta.isValidDay && parent3 && parent3 !== "NOT SET")
            parentCount[parent3] = (parentCount[parent3] || 0) + 1;
    });

    const summaryDiv = document.getElementById("parent-summary");
    summaryDiv.innerHTML = "";
    Object.entries(parentCount)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([parent, count]) => {
            const summaryItem = document.createElement("div");
            summaryItem.classList.add("flex", "justify-between", "py-1", "cursor-pointer");
            summaryItem.innerHTML = `
                <span class="font-medium text-gray-800">${parent}</span>
                <span class="text-gray-600">(${count})</span>
            `;
            summaryItem.addEventListener("click", () => {
                document.querySelectorAll("#parent-summary > div").forEach((item) => item.classList.remove("bg-green-200"));
                summaryItem.classList.add("bg-green-200");
                const selects = document.querySelectorAll("#calendar-preview-table select");
                selects.forEach((select) => {
                    if (select.value === parent)
                        select.classList.add("bg-green-200");
                    else
                        select.classList.remove("bg-green-200");
                });
            });
            summaryDiv.appendChild(summaryItem);
        });

    for (const entry of calendarEntries) {
        const { day, parent1, parent2, parent3, meta } = entry;
        const flexContainer = document.createElement("div");
        flexContainer.classList.add("flex", "flex-col", "md:flex-row", "w-full", "py-1", "border");

        const rowDayDiv = document.createElement("div");
        const rowDay = formatDayOfWeek(day, month, year);
        rowDayDiv.textContent = rowDay;
        rowDayDiv.classList.add("w-full", "md:w-1/12", "text-left");

        const rowDateDiv = document.createElement("div");
        const rowDate = formatDate(day, month, year);
        rowDateDiv.textContent = rowDate;
        rowDateDiv.classList.add("w-full", "md:w-1/6", "text-left");

        flexContainer.appendChild(rowDayDiv);
        flexContainer.appendChild(rowDateDiv);

        if (meta.isKitaOpenNoEd) {
            flexContainer.classList.add("bg-yellow-200");
            const invalidDayInput = document.createElement("input");
            invalidDayInput.type = "text";
            invalidDayInput.value = calendar[day][3].invalidText || "";
            invalidDayInput.classList.add("flex-1", "text-center", "bg-yellow-200");
            invalidDayInput.setAttribute("tabindex", "0");
            invalidDayInput.addEventListener("change", () => {
                const newValue = invalidDayInput.value.trim();
                calendar[day][3].invalidText = newValue;
                renderCalendarThreeCols(month, year);
            });
            flexContainer.appendChild(invalidDayInput);
        } else if (!meta.isValidDay) {
            flexContainer.classList.add("bg-red-200");
            const invalidDayInput = document.createElement("input");
            invalidDayInput.type = "text";
            invalidDayInput.value = calendar[day][3].invalidText || "";
            invalidDayInput.classList.add("flex-1", "text-center", "bg-red-200");
            invalidDayInput.setAttribute("tabindex", "0");
            invalidDayInput.addEventListener("change", () => {
                const newValue = invalidDayInput.value.trim();
                calendar[day][3].invalidText = newValue;
                renderCalendarThreeCols(month, year);
            });
            flexContainer.appendChild(invalidDayInput);
        } else {
            // Erstelle drei Select-Elemente für die drei Elternteile
            const user1Select = document.createElement("select");
            user1Select.classList.add("w-full", "md:flex-1", "text-left", "cursor-pointer");
            if (!usersData.find(user => user === parent1)) {
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
                const naDateArray = formattedUsers.find(fUser => fUser.name === user1Select.value)?.not_available || [];
                let continueProcess = true;
                if (isSet && naDateArray.includes(`${year}-${month}-${day}`)) {
                    continueProcess = confirm(`User kann an diesem Tag nicht. Trotzdem eintragen?`);
                }
                if (continueProcess) {
                    calendar[day][0] = user1Select.value;
                } else {
                    user1Select.value = calendar[day][0];
                }
                renderCalendarThreeCols(month, year);
            });

            const user2Select = document.createElement("select");
            user2Select.classList.add("flex-1", "text-left", "cursor-pointer");
            if (parent2 !== "Team" && !usersData.find(user => user === parent2)) {
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
            // parent2 sollte eigentlich nichts mehr mit Team zu tun haben im 3 Cols Calendar. Das ist in parent3 gehandlet
            if (parent2 === "Team") {
                const teamOption = document.createElement("option");
                teamOption.value = "Team";
                teamOption.textContent = "Team";
                teamOption.selected = true;
                user2Select.appendChild(teamOption);
                user2Select.value = "Team";
                user2Select.disabled = true;
                user2Select.classList.add("cursor-not-allowed");
            }
            if (!user2Select.disabled) {
                user2Select.addEventListener("change", () => {
                    const isSet = user2Select.value !== "NOT SET";
                    const naDateArray = formattedUsers.find(fUser => fUser.name === user2Select.value)?.not_available || [];
                    let continueProcess = true;
                    if (isSet && naDateArray.includes(`${year}-${month}-${day}`)) {
                        continueProcess = confirm(`User kann an diesem Tag nicht. Trotzdem eintragen?`);
                    }
                    if (continueProcess) {
                        calendar[day][1] = user2Select.value;
                    } else {
                        user2Select.value = calendar[day][1];
                    }
                    renderCalendarThreeCols(month, year);
                });
            }
            const user3Select = document.createElement("select");
            user3Select.classList.add("flex-1", "text-left", "cursor-pointer");
            if (!meta.hasSpecificPerson && !usersData.find(user => user === parent3)) {
                user3Select.classList.add("bg-yellow-200");
            }
            const noSelectionUser3 = document.createElement("option");
            noSelectionUser3.value = "NOT SET";
            noSelectionUser3.textContent = "NOT SET";
            if (parent3 === "NOT SET") noSelectionUser3.selected = true;
            user3Select.appendChild(noSelectionUser3);
            usersData.forEach((user) => {
                const option = document.createElement("option");
                option.value = user;
                option.textContent = user;
                if (user === parent3) option.selected = true;
                user3Select.appendChild(option);
            });
            if (meta.hasSpecificPerson) {
                const teamOption = document.createElement("option");
                teamOption.value = parent3;
                teamOption.textContent = parent3;
                teamOption.selected = true;
                user3Select.appendChild(teamOption);
                user3Select.value = parent3;
                user3Select.disabled = true;
                user3Select.classList.add("cursor-not-allowed");
            }
            if (!user3Select.disabled) {
                user3Select.addEventListener("change", () => {
                    const isSet = user3Select.value !== "NOT SET";
                    const naDateArray = formattedUsers.find(fUser => fUser.name === user3Select.value)?.not_available || [];
                    let continueProcess = true;
                    if (isSet && naDateArray.includes(`${year}-${month}-${day}`)) {
                        continueProcess = confirm(`User kann an diesem Tag nicht. Trotzdem eintragen?`);
                    }
                    if (continueProcess) {
                        calendar[day][2] = user3Select.value;
                    } else {
                        user3Select.value = calendar[day][2];
                    }
                    renderCalendarThreeCols(month, year);
                });
            }

            flexContainer.appendChild(user1Select);
            flexContainer.appendChild(user2Select);
            flexContainer.appendChild(user3Select);
        }

        previewBody.appendChild(flexContainer);
    }
}

function renderCalendarTwoCol(month, year) {
    const previewBody = document.getElementById("calendar-preview-table");
    const twoColHeader = document.getElementById("tableheadersTwoCols");
    const threeColHeader = document.getElementById("tableheadersThreeCols");

    previewBody.innerHTML = "";
    threeColHeader.classList.add("hidden");
    twoColHeader.classList.remove("hidden");
    previewBody.appendChild(twoColHeader);
    previewBody.appendChild(threeColHeader);
    
    // Für 2 Spalten: [parent1, parent2, meta]
    const calendarEntries = Object.entries(calendar).map(
        ([day, [parent1, parent2, meta]]) => ({ day, parent1, parent2, meta })
    );

    const parentCount = {};
    calendarEntries.forEach(({ parent1, parent2, meta }) => {
        if (meta.isValidDay && parent1 && parent1 !== "NOT SET")
            parentCount[parent1] = (parentCount[parent1] || 0) + 1;
        if (meta.isValidDay && parent2 && parent2 !== "NOT SET")
            parentCount[parent2] = (parentCount[parent2] || 0) + 1;
    });

    const summaryDiv = document.getElementById("parent-summary");
    summaryDiv.innerHTML = "";
    Object.entries(parentCount)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([parent, count]) => {
            const summaryItem = document.createElement("div");
            summaryItem.classList.add("flex", "justify-between", "py-1", "cursor-pointer");
            summaryItem.innerHTML = `
                    <span class="font-medium text-gray-800">${parent}</span>
                    <span class="text-gray-600">(${count})</span>
                `;
            summaryItem.addEventListener("click", () => {
                document.querySelectorAll("#parent-summary > div").forEach((item) => item.classList.remove("bg-green-200"));
                summaryItem.classList.add("bg-green-200");
                const selects = document.querySelectorAll("#calendar-preview-table select");
                selects.forEach((select) => {
                    if (select.value === parent)
                        select.classList.add("bg-green-200");
                    else
                        select.classList.remove("bg-green-200");
                });
            });
            summaryDiv.appendChild(summaryItem);
        });

    calendarEntries.forEach((entry) => {
        const { day, parent1, parent2, meta } = entry;
        const flexContainer = document.createElement("div");
        flexContainer.classList.add("flex", "flex-col", "md:flex-row", "w-full", "py-1", "border");

        const rowDayDiv = document.createElement("div");
        const rowDay = formatDayOfWeek(day, month, year);
        rowDayDiv.textContent = rowDay;
        rowDayDiv.classList.add("w-full", "md:w-1/12", "text-left");

        const rowDateDiv = document.createElement("div");
        const rowDate = formatDate(day, month, year);
        rowDateDiv.textContent = rowDate;
        rowDateDiv.classList.add("w-full", "md:w-1/6", "text-left");

        flexContainer.appendChild(rowDayDiv);
        flexContainer.appendChild(rowDateDiv);

        if (meta.isKitaOpenNoEd) {
            flexContainer.classList.add("bg-yellow-200");
            const invalidDayInput = document.createElement("input");
            invalidDayInput.type = "text";
            invalidDayInput.value = calendar[day][2].invalidText || "";
            invalidDayInput.classList.add("flex-1", "text-center", "bg-yellow-200");
            invalidDayInput.setAttribute("tabindex", "0");
            invalidDayInput.addEventListener("change", () => {
                const newValue = invalidDayInput.value.trim();
                calendar[day][2].invalidText = newValue;
                renderCalendarTwoCol(month, year);
            });
            flexContainer.appendChild(invalidDayInput);
        } else if (!meta.isValidDay) {
            flexContainer.classList.add("bg-red-200");
            const invalidDayInput = document.createElement("input");
            invalidDayInput.type = "text";
            invalidDayInput.value = calendar[day][2].invalidText || "";
            invalidDayInput.classList.add("flex-1", "text-center", "bg-red-200");
            invalidDayInput.setAttribute("tabindex", "0");
            invalidDayInput.addEventListener("change", () => {
                const newValue = invalidDayInput.value.trim();
                calendar[day][2].invalidText = newValue;
                renderCalendarTwoCol(month, year);
            });
            flexContainer.appendChild(invalidDayInput);
        } else {
            // Erstelle zwei Select-Elemente für die zwei Elternteile
            const user1Select = document.createElement("select");
            user1Select.classList.add("w-full", "md:flex-1", "text-left", "cursor-pointer");
            if (!usersData.find(user => user === parent1)) {
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
                const naDateArray = formattedUsers.find(fUser => fUser.name === user1Select.value)?.not_available || [];
                let continueProcess = true;
                if (isSet && naDateArray.includes(`${year}-${month}-${day}`)) {
                    continueProcess = confirm(`User kann an diesem Tag nicht. Trotzdem eintragen?`);
                }
                if (continueProcess) {
                    calendar[day][0] = user1Select.value;
                } else {
                    user1Select.value = calendar[day][0];
                }
                renderCalendarTwoCol(month, year);
            });

            const user2Select = document.createElement("select");
            user2Select.classList.add("flex-1", "text-left", "cursor-pointer");
            if (!meta.hasSpecificPerson && !usersData.find(user => user === parent2)) {
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
            if (meta.hasSpecificPerson) {
                const teamOption = document.createElement("option");
                teamOption.value = parent2;
                teamOption.textContent = parent2;
                teamOption.selected = true;
                user2Select.appendChild(teamOption);
                user2Select.value = parent2;
                user2Select.disabled = true;
                user2Select.classList.add("cursor-not-allowed");
            }
            if (!user2Select.disabled) {
                user2Select.addEventListener("change", () => {
                    const isSet = user2Select.value !== "NOT SET";
                    const naDateArray = formattedUsers.find(fUser => fUser.name === user2Select.value)?.not_available || [];
                    let continueProcess = true;
                    if (isSet && naDateArray.includes(`${year}-${month}-${day}`)) {
                        continueProcess = confirm(`User kann an diesem Tag nicht. Trotzdem eintragen?`);
                    }
                    if (continueProcess) {
                        calendar[day][1] = user2Select.value;
                    } else {
                        user2Select.value = calendar[day][1];
                    }
                    renderCalendarTwoCol(month, year);
                });
            }
            flexContainer.appendChild(user1Select);
            flexContainer.appendChild(user2Select);
        }

        previewBody.appendChild(flexContainer);
    });
}

document.getElementById("preview-button").addEventListener("click", () => {
    renderCalendarPreview();
    console.log("Preview updated");
});

function updateCalendar() {
    formattedUsers.forEach((user) => (user.not_available = []));
    holidays = [];
    teamdays = [];
    kitaOpenNoEd = [];
    selectedWeekdays = Array.from(
        document.querySelectorAll(".weekday-checkbox:checked")
    ).map((checkbox) => checkbox.value);
    populateUserTable(formattedUsers);
    updateHolidayCalendar();
    updateKitaOpenNoEdCalendar();
    updateTeamTakesSlotCalendar();
}

function populateUserTable(users) {
    const userTableBody = document.getElementById("user-table-body");
    userTableBody.innerHTML = "";
    const month = document.getElementById("month").value;
    const year = document.getElementById("year").value;
    users.sort((a, b) => a?.name?.localeCompare(b?.name)).forEach((user) => {
        const row = document.createElement("tr");
        row.classList.add("border-b");
        const userCell = document.createElement("td");
        userCell.classList.add("p-4", "border", "border-gray-300", "rounded-lg");
        const userNameElement = document.createElement("div");
        userNameElement.textContent = user.name;
        userNameElement.classList.add("font-semibold", "text-lg", "mb-2", "text-gray-800", "p-2", "bg-gray-100", "rounded-md");
        userCell.appendChild(userNameElement);
        const jsonInput = document.createElement("input");
        jsonInput.type = "text";
        jsonInput.placeholder = "Generierte Sperrzeit einfügen";
        jsonInput.classList.add("w-full", "p-2", "border", "border-gray-300", "rounded-md", "mt-2", "focus:outline-none", "focus:ring-2", "focus:ring-blue-500", "bg-white");
        const confirmButton = document.createElement("button");
        confirmButton.textContent = "Bestätigen";
        confirmButton.classList.add("mt-2", "px-4", "py-2", "bg-blue-500", "text-white", "rounded-md", "hover:bg-blue-600", "focus:outline-none", "focus:ring-2", "focus:ring-blue-500");
        confirmButton.addEventListener("click", function() {
            try {
                const jsonData = JSON.parse(jsonInput.value);
                if (Array.isArray(jsonData)) {
                    const dateRegex = /^\d{4}-\d{1,2}-\d{1,2}$/;
                    const isValid = jsonData.every(item => typeof item === 'string' && dateRegex.test(item));
                    if (isValid) {
                        user.not_available = jsonData;
                        populateUserTable(users);
                    } else {
                        alert("The JSON array contains invalid dates or incorrect format.");
                    }
                } else {
                    alert("The JSON is not an array.");
                }
            } catch (error) {
                alert("Invalid JSON. Please try again. " + error?.message);
            }
        });
        userCell.appendChild(jsonInput);
        userCell.appendChild(confirmButton);
        row.appendChild(userCell);

        const calendarCell = document.createElement("td");
        calendarCell.classList.add("p-2");
        const daysContainer = document.createElement("div");
        daysContainer.classList.add("calendar");
        const daysOfWeek = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
        daysOfWeek.forEach((day) => {
            const dayHeader = document.createElement("div");
            dayHeader.classList.add("calendar-header");
            dayHeader.textContent = day;
            daysContainer.appendChild(dayHeader);
        });

        const firstDayOfMonth = new Date(year, parseInt(month), 1).getDay();
        const firstDayAdjusted = (firstDayOfMonth + 6) % 7;
        for (let i = 0; i < firstDayAdjusted; i++) {
            const emptyCell = document.createElement("div");
            emptyCell.classList.add("calendar-day");
            daysContainer.appendChild(emptyCell);
        }

        const daysInMonth = new Date(year, parseInt(month) + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const dayButton = document.createElement("div");
            dayButton.classList.add("calendar-day");
            dayButton.textContent = day;
            const dayOfWeek = new Date(year, parseInt(month), day).getDay();
            const dayName = daysOfWeek[dayOfWeek - 1];
            if (!selectedWeekdays.includes(dayName)) {
                dayButton.classList.add("excluded");
                dayButton.style.cursor = "default";
            } else {
                const isNotAvailable = user.not_available.includes(`${year}-${parseInt(month) + 1}-${day}`);
                if (isNotAvailable) {
                    dayButton.classList.add("not-available");
                }
                dayButton.addEventListener("click", () => {
                    const dateKey = `${year}-${parseInt(month) + 1}-${day}`;
                    const isCurrentlyNotAvailable = user.not_available.includes(dateKey);
                    if (isCurrentlyNotAvailable) {
                        user.not_available = user.not_available.filter((date) => date !== dateKey);
                        dayButton.classList.remove("not-available");
                    } else {
                        user.not_available.push(dateKey);
                        dayButton.classList.add("not-available");
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

function updateKitaOpenNoEdCalendar() {
    updateGenericCalender("kitaOpenNoEd-calendar", kitaOpenNoEd);
}

function updateTeamTakesSlotCalendar() {
    updateGenericCalender("team-calendar", teamdays);
}

function updateGenericCalender(id, subjectArray) {
    const month = document.getElementById("month").value;
    const year = document.getElementById("year").value;
    const subjectCalendar = document.getElementById(id);
    subjectCalendar.innerHTML = "";
    const daysOfWeek = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    daysOfWeek.forEach((day) => {
        const dayHeader = document.createElement("div");
        dayHeader.classList.add("calendar-header");
        dayHeader.textContent = day;
        subjectCalendar.appendChild(dayHeader);
    });
    const firstDayOfMonth = new Date(year, parseInt(month), 1).getDay();
    const firstDayAdjusted = (firstDayOfMonth + 6) % 7;
    for (let i = 0; i < firstDayAdjusted; i++) {
        const emptyCell = document.createElement("div");
        emptyCell.classList.add("calendar-day");
        subjectCalendar.appendChild(emptyCell);
    }
    const daysInMonth = new Date(year, parseInt(month) + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const dayButton = document.createElement("div");
        dayButton.classList.add("calendar-day");
        dayButton.textContent = day;
        const dayOfWeek = new Date(year, parseInt(month), day).getDay();
        const dayName = daysOfWeek[dayOfWeek - 1];
        if (!selectedWeekdays.includes(dayName)) {
            dayButton.classList.add("excluded");
            dayButton.style.cursor = "default";
        } else {
            const isSubject = subjectArray.includes(`${year}-${parseInt(month) + 1}-${day}`);
            if (isSubject) {
                dayButton.classList.add("not-available");
            }
            dayButton.addEventListener("click", () => {
                const dateKey = `${year}-${parseInt(month) + 1}-${day}`;
                const isCurrentlySubject = subjectArray.includes(dateKey);
                if (isCurrentlySubject) {
                    const index = subjectArray.indexOf(dateKey);
                    if (index > -1) {
                        subjectArray.splice(index, 1);
                    }
                    dayButton.classList.remove("not-available");
                } else {
                    subjectArray.push(dateKey);
                    dayButton.classList.add("not-available");
                }
            });
        }
        subjectCalendar.appendChild(dayButton);
    }
}

document.getElementById("generate-pdf-button").addEventListener("click", async () => {
    const month = parseInt(document.getElementById("month").value) + 1;
    const year = parseInt(document.getElementById("year").value);
    try {
        if (!calendar || Object.entries(calendar).length === 0) {
            displayError("Please Update the preview");
            return;
        }
        let fileBlob = null

        const shiftValue = document.querySelector('input[name="shifts-per-day"]:checked').value;
        if (shiftValue === "3") {
            fileBlob = generatePDFThreeCols(calendar, month, year, usersData);
        } else {
            fileBlob = generatePDFTwoCols(calendar, month, year, usersData);
        }
        const downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(fileBlob);
        downloadLink.download = `dienstplan_${year}_${month}.pdf`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        console.log("PDF generated successfully");
    } catch (error) {
        console.error(error.message);
    }
});

document.querySelectorAll(".weekday-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
        updateCalendar();
    });
});

function showCustomModal(personName) {
    document.getElementById("modalText").innerHTML = `
    ${personName} erhält ausgewählte Schichten und wird aus der Autozuweisung entfernt.`;
    document.getElementById("customModal").classList.remove("hidden");
}
