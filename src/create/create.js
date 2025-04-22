import {getStorageKey} from "../storageKey";
import { renderMonthYearSelect } from "../utils/render"
import text from "../localization"
import {
    displayError,
    formatDate,
    formatDayOfWeek,
    generatePDFThreeCols,
    generatePDFTwoCols,
} from "./calendar.js";
import {assignUsersCalendar} from "./assignUsersCalendar";

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

export function initialize(backurl) {
    const toggleBtn = document.getElementById('toggle-summary');
    const parentSummary = document.getElementById('parent-summary');

    toggleBtn.addEventListener('click', () => {
        parentSummary.classList.toggle('hidden');
    });

    const jsonUsers = localStorage.getItem(getStorageKey());
    if (jsonUsers) {
        usersData = JSON.parse(jsonUsers);
    }
    renderMonthYearSelect();
    formatUsersData(usersData);
    updateCalendar();

    document.getElementById("back-button").addEventListener("click", () => {
        window.location.href = backurl;
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
        const specificPerson = document.getElementById("nameInput")?.value?.trim();
        const isSpecificPersonInUsersArray = usersData?.find(user => user === specificPerson);
        if (isSpecificPersonInUsersArray) {
            showCustomModal(specificPerson);
            return
        }

        if (teamdays.length !== 0 && !specificPerson) {
            alert(text.create.specificPersonMissing)
            return
        }
        renderCalendarPreview();
    });

    document.getElementById("back-creation-button").addEventListener("click", function () {
        document.getElementById("plan-creation-container").classList.remove("hidden");
        document.getElementById("calendar-preview-container").classList.add("hidden");
    })

    document.querySelectorAll(".weekday-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
            updateCalendar();
        });
    });
}

function formatUsersData(users) {
    formattedUsers = users.map((user) => ({
        name: user,
        not_available: [],
    }));
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
    const shiftValue = document.querySelector('input[name="shifts-per-day"]:checked')?.value ?? "2"
    if (shiftValue === "3") {
        calendar = assignUsersCalendar(month, year, usersToAssign, options, 3);
        renderCalendarThreeCols(month, year);


    } else {
        calendar = assignUsersCalendar(month, year, usersToAssign, options, 2);
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
        ([day, {parents, isKitaOpenNoEd, isAssigned, isValidDay, invalidText, specificPerson}]) => ({day, parents, meta: {isAssigned, isValidDay, invalidText, isKitaOpenNoEd, specificPerson}})
    );

    const parentCount = {};
    calendarEntries.forEach(({parents, meta}) => {
        if (meta.specificPerson)
            parentCount[meta.specificPerson] = (parentCount[parent] || 0) + 1
        parents.forEach((parent) => {
            if (meta.isValidDay && parent && parent !== text.create.notSet)
                parentCount[parent] = (parentCount[parent] || 0) + 1;
        })
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
        const {day, parents, meta} = entry;
        const flexContainer = document.createElement("div");
        flexContainer.classList.add("flex", "flex-col", "md:flex-row", "w-full", "py-1", "border");

        const rowDayDiv = document.createElement("div");
        rowDayDiv.textContent = formatDayOfWeek(day, month, year);
        rowDayDiv.classList.add("w-full", "md:w-1/12", "text-left");

        const rowDateDiv = document.createElement("div");
        rowDateDiv.textContent = formatDate(day, month, year);
        rowDateDiv.classList.add("w-full", "md:w-1/6", "text-left");

        flexContainer.appendChild(rowDayDiv);
        flexContainer.appendChild(rowDateDiv);

        if (meta.isKitaOpenNoEd) {
            flexContainer.classList.add("bg-yellow-200");
            const invalidDayInput = document.createElement("input");
            invalidDayInput.type = "text";
            invalidDayInput.value = calendar[day].invalidText || "";
            invalidDayInput.classList.add("flex-1", "text-center", "bg-yellow-200");
            invalidDayInput.setAttribute("tabindex", "0");
            invalidDayInput.addEventListener("change", () => {
                calendar[day].invalidText = invalidDayInput.value.trim();
                renderCalendarThreeCols(month, year);
            });
            flexContainer.appendChild(invalidDayInput);
        } else if (!meta.isValidDay) {
            flexContainer.classList.add("bg-red-200");
            const invalidDayInput = document.createElement("input");
            invalidDayInput.type = "text";
            invalidDayInput.value = calendar[day].invalidText || "";
            invalidDayInput.classList.add("flex-1", "text-center", "bg-red-200");
            invalidDayInput.setAttribute("tabindex", "0");
            invalidDayInput.addEventListener("change", () => {
                calendar[day].invalidText = invalidDayInput.value.trim();
                renderCalendarThreeCols(month, year);
            });
            flexContainer.appendChild(invalidDayInput);
        } else {
            parents.forEach((parent, index) => {
                const user3Select = document.createElement("select");
                user3Select.classList.add("flex-1", "text-left", "cursor-pointer");
                if (!usersData.find(user => user === parent)) {
                    user3Select.classList.add("bg-yellow-200");
                }
                const noSelectionUser3 = document.createElement("option");
                noSelectionUser3.value = text.create.notSet;
                noSelectionUser3.textContent = text.create.notSet;
                if (parent === text.create.notSet) noSelectionUser3.selected = true;
                user3Select.appendChild(noSelectionUser3);
                usersData.forEach((user) => {
                    const option = document.createElement("option");
                    option.value = user;
                    option.textContent = user;
                    if (user === parent) option.selected = true;
                    user3Select.appendChild(option);
                });

                user3Select.addEventListener("change", () => {
                        const isSet = user3Select.value !== text.create.notSet;
                        const naDateArray = formattedUsers.find(fUser => fUser.name === user3Select.value)?.not_available || [];
                        let continueProcess = true;
                        if (isSet && naDateArray.includes(`${year}-${month}-${day}`)) {
                            continueProcess = confirm(text.create.personNotAvailableAlert);
                        }
                        if (continueProcess) {
                            calendar[day].parents[index] = user3Select.value;
                        } else {
                            user3Select.value = calendar[day].parents[index];
                        }
                        renderCalendarThreeCols(month, year);
                    });

                flexContainer.appendChild(user3Select)
            })
            if (meta.specificPerson) {
                const user3Select = document.createElement("select");
                user3Select.classList.add("flex-1", "text-left", "cursor-pointer");
                const teamOption = document.createElement("option");
                teamOption.value = meta.specificPerson;
                teamOption.textContent = meta.specificPerson;
                teamOption.selected = true;
                user3Select.appendChild(teamOption);
                user3Select.disabled = true;
                user3Select.value = meta.specificPerson

                user3Select.classList.add("cursor-not-allowed");
                flexContainer.appendChild(user3Select)
            }
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
        ([day, {parents, isKitaOpenNoEd, isAssigned, isValidDay, invalidText, specificPerson}]) => ({day, parents, meta: {isAssigned, isValidDay, invalidText, isKitaOpenNoEd, specificPerson}})
    );

    const parentCount = {};
    calendarEntries.forEach(({parents, meta}) => {
        parents.forEach((parent) => {
            if (meta.isValidDay && parent && parent !== text.create.notSet)
                parentCount[parent] = (parentCount[parent] || 0) + 1;
        })
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
        const {day, parents, meta} = entry;
        const flexContainer = document.createElement("div");
        flexContainer.classList.add("flex", "flex-col", "md:flex-row", "w-full", "py-1", "border");

        const rowDayDiv = document.createElement("div");
        rowDayDiv.textContent = formatDayOfWeek(day, month, year);
        rowDayDiv.classList.add("w-full", "md:w-1/12", "text-left");

        const rowDateDiv = document.createElement("div");
        rowDateDiv.textContent = formatDate(day, month, year);
        rowDateDiv.classList.add("w-full", "md:w-1/6", "text-left");

        flexContainer.appendChild(rowDayDiv);
        flexContainer.appendChild(rowDateDiv);

        if (meta.isKitaOpenNoEd) {
            flexContainer.classList.add("bg-yellow-200");
            const invalidDayInput = document.createElement("input");
            invalidDayInput.type = "text";
            invalidDayInput.value = calendar[day].invalidText || "";
            invalidDayInput.classList.add("flex-1", "text-center", "bg-yellow-200");
            invalidDayInput.setAttribute("tabindex", "0");
            invalidDayInput.addEventListener("change", () => {
                calendar[day].invalidText = invalidDayInput.value.trim();
                renderCalendarTwoCol(month, year);
            });
            flexContainer.appendChild(invalidDayInput);
        } else if (!meta.isValidDay) {
            flexContainer.classList.add("bg-red-200");
            const invalidDayInput = document.createElement("input");
            invalidDayInput.type = "text";
            invalidDayInput.value = calendar[day].invalidText || "";
            invalidDayInput.classList.add("flex-1", "text-center", "bg-red-200");
            invalidDayInput.setAttribute("tabindex", "0");
            invalidDayInput.addEventListener("change", () => {
                calendar[day].invalidText = invalidDayInput.value.trim();
                renderCalendarTwoCol(month, year);
            });
            flexContainer.appendChild(invalidDayInput);
        } else {
            parents.forEach((parent, index) => {
                const user2Select = document.createElement("select");
                user2Select.classList.add("flex-1", "text-left", "cursor-pointer");
                if (!usersData.find(user => user === parent)) {
                    user2Select.classList.add("bg-yellow-200");
                }
                const noSelectionUser2 = document.createElement("option");
                noSelectionUser2.value = text.create.notSet;
                noSelectionUser2.textContent = text.create.notSet;
                if (parent === text.create.notSet) noSelectionUser2.selected = true;
                user2Select.appendChild(noSelectionUser2);
                usersData.forEach((user) => {
                    const option = document.createElement("option");
                    option.value = user;
                    option.textContent = user;
                    if (user === parent) option.selected = true;
                    user2Select.appendChild(option);
                });

                    user2Select.addEventListener("change", () => {
                        const isSet = user2Select.value !== text.create.notSet;
                        const naDateArray = formattedUsers.find(fUser => fUser.name === user2Select.value)?.not_available || [];
                        let continueProcess = true;
                        if (isSet && naDateArray.includes(`${year}-${month}-${day}`)) {
                            continueProcess = confirm(text.create.personNotAvailableAlert);
                        }
                        if (continueProcess) {
                            calendar[day].parents[index] = user2Select.value;
                        } else {
                            user2Select.value = calendar[day].parents[index];
                        }
                        renderCalendarTwoCol(month, year);
                    });

                flexContainer.appendChild(user2Select);
            })

            if (meta.specificPerson) {
                const user3Select = document.createElement("select");
                user3Select.classList.add("flex-1", "text-left", "cursor-pointer");
                const teamOption = document.createElement("option");
                teamOption.value = meta.specificPerson;
                teamOption.textContent = meta.specificPerson;
                teamOption.selected = true;
                user3Select.appendChild(teamOption);
                user3Select.disabled = true;
                user3Select.value = meta.specificPerson

                user3Select.classList.add("cursor-not-allowed");
                flexContainer.appendChild(user3Select)
            }
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
        jsonInput.placeholder = text.create.insertBlockedTime;
        jsonInput.classList.add("w-full", "p-2", "border", "border-gray-300", "rounded-md", "mt-2", "focus:outline-none", "focus:ring-2", "focus:ring-blue-500", "bg-white");
        const confirmButton = document.createElement("button");
        confirmButton.textContent = text.create.confirm;
        confirmButton.classList.add("mt-2", "px-4", "py-2", "bg-blue-500", "text-white", "rounded-md", "hover:bg-blue-600", "focus:outline-none", "focus:ring-2", "focus:ring-blue-500");
        confirmButton.addEventListener("click", function () {
            try {
                const jsonData = JSON.parse(jsonInput.value);
                if (Array.isArray(jsonData)) {
                    const dateRegex = /^\d{4}-\d{1,2}-\d{1,2}$/;
                    const isValid = jsonData.every(item => typeof item === 'string' && dateRegex.test(item));
                    if (isValid) {
                        user.not_available = jsonData;
                        populateUserTable(users);
                    } else {
                        alert(text.create.dateStringInvalidDates);
                    }
                } else {
                    alert(text.create.dateStringInvalidList);
                }
            } catch (error) {
                console.log(error)
                alert(text.create.generalError);
            }
        });
        userCell.appendChild(jsonInput);
        userCell.appendChild(confirmButton);
        row.appendChild(userCell);

        const calendarCell = document.createElement("td");
        calendarCell.classList.add("p-2");
        const daysContainer = document.createElement("div");
        daysContainer.classList.add("calendar");
        const daysOfWeek = [text.daysShort.mo, text.daysShort.di, text.daysShort.mi, text.daysShort.do, text.daysShort.fr, text.daysShort.sa, text.daysShort.so];
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
            dayButton.textContent = day.toString();
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
    const daysOfWeek = [text.daysShort.mo, text.daysShort.di, text.daysShort.mi, text.daysShort.do, text.daysShort.fr, text.daysShort.sa, text.daysShort.so];
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
        dayButton.textContent = day.toString();
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
            displayError(text.create.forceUpdatePreview);
            return;
        }
        let fileBlob

        const shiftValue = document.querySelector('input[name="shifts-per-day"]:checked')?.value;
        let isKita = false
        if (shiftValue === "3") {
            fileBlob = generatePDFThreeCols(calendar, month, year, usersData);
        } else if (shiftValue === "2") {
            fileBlob = generatePDFTwoCols(calendar, month, year, usersData);
        } else {
            isKita = true
            fileBlob = generatePDFTwoCols(calendar, month, year, usersData, isKita);
        }
        const downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(fileBlob);
        downloadLink.download = isKita ? `${text.create.kitaplanpdf}_${year}_${month}.pdf` : `${text.create.shiftplanpdf}_${year}_${month}.pdf`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        console.log("PDF generated successfully");
    } catch (error) {
        console.error(error.message);
    }
});

function showCustomModal(personName) {
    document.getElementById("modalText").innerHTML = `
    ${personName} ${text.create.specialshiftsInfo}`;
    document.getElementById("customModal").classList.remove("hidden");
}
