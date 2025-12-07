import {getStorageKey} from "../storageKey";
import {displayError, renderMonthYearSelect} from "../utils/render"
import getText from "../localization"
//bg-green-200, yellow, red
import {formatDate, formatDayOfWeek, generateShiftplanPdf,} from "./generateShiftplanPdf.js";
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
let calendar = null;

function updatePersonsVisibility(label3) {
    // if the "3 Schichten pro Tag" radio is checked, hide the 3-person checkbox
    const twoChecked = document.querySelector('input[name="shifts-per-day"][value="2"]').checked;
    if (twoChecked) {
        label3.style.display = 'none';
    } else {
        label3.style.display = 'flex'; // restore original flex layout
    }
}

export function initialize(backurl) {
        document.querySelectorAll('input[name="shifts-per-day"]').forEach(radio =>
        radio.addEventListener('change', () => {
            updateCalendar();
        })
        )
    const radios = document.querySelectorAll('input[name="shifts-per-day"]');
    const label3   = document.getElementById('persons-3-label');
    radios.forEach(r => r.addEventListener('change', () => updatePersonsVisibility(label3)));

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
    initFormatUsersData(usersData);
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
        // fills global object. works, but could be refactored
        const assignments= getShiftAssignments();
        //TODO: SpecificPerson anpassen
        const specificPerson = document.getElementById("nameInput")?.value?.trim();
        const isSpecificPersonInUsersArray = usersData?.find(user => user === specificPerson);
        if (isSpecificPersonInUsersArray) {
            showCustomModal(specificPerson);
            return
        }

        if (teamdays.length !== 0 && !specificPerson) {
            alert(getText("create.specificPersonMissing"))
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

function initFormatUsersData(users) {
    formattedUsers = users.map((user) => ({
        name: user,
        onePersonShift: true,
        twoPersonShift: true,
        threePersonShift: true,
        not_available: {
            shift1: [],
            shift2: [],
            shift3: [],
        }
    }));
}

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
        shiftTypes,
        weekdays: selectedWeekdays,
        holidays,
        kitaOpenNoEd,
        teamdays,
        specificPerson: document.getElementById("nameInput")?.value
    };
    const shiftValue = document.querySelector('input[name="shifts-per-day"]:checked')?.value ?? 2
    calendar = assignUsersCalendar(month, year, usersToAssign, options, Number(shiftValue));

    renderPdfPreview(month, year);
}

// Angepasstes renderPdfPreview mit altem Styling und Mehrfachnamen pro Zelle
function renderPdfPreview(month, year) {
    const previewBody = document.getElementById("calendar-preview-table");
    const twoColHeader = document.getElementById("tableheadersTwoCols");
    const threeColHeader = document.getElementById("tableheadersThreeCols");
    const summaryDiv = document.getElementById("parent-summary");

    // Parent-Summary aktualisieren (unverändert)
    const parentCount = {};
    Object.values(calendar).forEach(dayData => {
        if (dayData.shifts) {
            Object.values(dayData.shifts).forEach(names => {
                names.forEach(name => {
                    if (name && name !== getText("create.notSet")) {
                        parentCount[name] = (parentCount[name] || 0) + 1;
                    }
                });
            });
        }
    });
    summaryDiv.innerHTML = "";
    Object.keys(parentCount).sort().forEach(name => {
        const count = parentCount[name];
        const item = document.createElement("div");
        item.classList.add("flex", "justify-between", "py-1", "cursor-pointer");
        item.innerHTML = `<span class="font-medium text-gray-800">${name}</span><span class="text-gray-600">(${count})</span>`;
        item.addEventListener("click", () => {
            Array.from(summaryDiv.children).forEach(c => c.classList.remove("bg-green-200"));
            item.classList.add("bg-green-200");
            const selects = previewBody.querySelectorAll("select");
            selects.forEach(sel => sel.classList.toggle("bg-green-200", sel.value === name));
        });
        summaryDiv.appendChild(item);
    });

    // Tabelle leeren und Header setzen
    previewBody.innerHTML = "";
    twoColHeader.classList.add("hidden");
    threeColHeader.classList.remove("hidden");
    previewBody.appendChild(twoColHeader);
    previewBody.appendChild(threeColHeader);

    // Zeilen generieren
    Object.entries(calendar).forEach(([day, data], index) => {
        const bgColor = index % 2 !== 0 ? "bg-gray-200": "bg-white"
        const { shifts, isKitaOpenNoEd, isValidDay, invalidText } = data;
        const row = document.createElement("div");
        row.classList.add("flex", "flex-col", "md:flex-row", "w-full", "py-1", "border", bgColor);

        // Markierung ganzer Zeile bei invalid/KitaOpen
        if (!isValidDay) row.classList.add("bg-red-200");
        else if (isKitaOpenNoEd) row.classList.add("bg-yellow-200");

        // Tag und Datum
        const dayDiv = document.createElement("div");
        dayDiv.textContent = formatDayOfWeek(day, month, year);
        dayDiv.classList.add("w-full", "md:w-1/12", "text-left");
        const dateDiv = document.createElement("div");
        dateDiv.textContent = formatDate(day, month, year);
        dateDiv.classList.add("w-full", "md:w-1/6", "text-left");
        row.append(dayDiv, dateDiv);

        if (!isValidDay || isKitaOpenNoEd) {
            // Eingabefeld über alle drei Zellen hinweg
            const input = document.createElement("input");
            input.type = "text";
            input.value = invalidText || "";
            input.classList.add(
                "flex-1", "text-center",
                !isValidDay ? "bg-red-200" : "bg-yellow-200",
                "border-transparent", "border", "rounded"
            );
            input.addEventListener("change", () => {
                calendar[day].invalidText = input.value.trim();
            });
            row.appendChild(input);
        } else {
            // Normale Zellen: selektierbare Eltern
            Object.keys(shifts).forEach(shiftKey => {
                const names = shifts[shiftKey];
                const cell = document.createElement("div");
                cell.classList.add("flex-1", "flex", "flex-col", "space-y-1");
                names.forEach((parent, idx) => {
                    const select = document.createElement("select")
                    select.classList.add(
                        "border", "border-gray-300", "rounded-md", "px-2", "py-1", bgColor
                    );
                    const optNone = document.createElement("option");
                    optNone.value = getText("create.notSet");
                    optNone.textContent = getText("create.notSet");
                    if (parent === getText("create.notSet")) {
                        optNone.select = true
                        select.classList.add("bg-yellow-200")
                    }
                    select.appendChild(optNone);
                    usersData.forEach(user => {
                        const opt = document.createElement("option");
                        opt.value = user;
                        opt.textContent = user;
                        if (user === parent) opt.selected = true;
                        select.appendChild(opt);
                    });
                    select.addEventListener("change", () => {
                        const newValue  = select.value;
                        const oldValue  = calendar[day].shifts[shiftKey][idx];
                        const dateKey   = `${year}-${month}-${day}`;
                        const isSet     = newValue !== getText("create.notSet");
                        select.classList.remove("bg-yellow-200")
                        if (isSet) {
                            // find that user’s preferences
                            const userEntry = formattedUsers.find(u => u.name === newValue);

                            // 1) Blocked on this date/shift?
                            if (userEntry.not_available[shiftKey].includes(dateKey)) {
                                const ok = confirm(getText("create.personNotAvailableAlert"));
                                if (!ok) {
                                    select.value = oldValue;
                                    return;
                                }
                            }

                            // 2) Eligible for this shift-size?
                            //    shiftKey is "shift1"|"shift2"|"shift3" → array length = number of people needed
                            const needed = calendar[day].shifts[shiftKey].length;
                            if (
                                (needed === 1 && !userEntry.onePersonShift) ||
                                (needed === 2 && !userEntry.twoPersonShift) ||
                                (needed === 3 && !userEntry.threePersonShift)
                            ) {
                                const ok = confirm(getText("create.teamSizeAlert"));
                                if (!ok) {
                                    select.value = oldValue;
                                    return;
                                }
                            }
                        } else {
                            select.classList.add("bg-yellow-200")
                        }

                        // all checks passed → commit the change
                        calendar[day].shifts[shiftKey][idx] = newValue;
                        // (re-render if you need to—e.g. renderPdfPreview(month, year))
                    });

                    cell.appendChild(select);
                });
                row.appendChild(cell);
            });
        }

        previewBody.appendChild(row);
    });
}




document.getElementById("preview-button").addEventListener("click", () => {
    renderCalendarPreview();
    console.log("Preview updated");
});

function updateCalendar() {
    formattedUsers.forEach((user) => {
        user.not_available = {
            shift1: [],
            shift2: [],
            shift3: [],
        }
    });
    holidays = [];
    teamdays = [];
    kitaOpenNoEd = [];
    selectedWeekdays = Array.from(
        document.querySelectorAll(".weekday-checkbox:checked")
    ).map((checkbox) => checkbox.value);
    const shiftValue = document.querySelector('input[name="shifts-per-day"]:checked')?.value;

    updateShiftTypeCalendar(shiftValue);
    populateUserList(formattedUsers, shiftValue);
    updateHolidayCalendar();
    updateKitaOpenNoEdCalendar();
    //updateTeamTakesSlotCalendar();
}

function populateUserList(users, shiftValue) {
    const container = document.getElementById("user-list");
    container.innerHTML = "";

    const month = document.getElementById("month").value;
    const year = document.getElementById("year").value;

    users
        .sort((a, b) => a?.name?.localeCompare(b?.name))
        .forEach(user => {
            // outer flex row
            const row = document.createElement("div");
            row.classList.add("flex", "flex-col", "md:flex-row", "border-b", "pb-4", "mb-4");

            // ── Left panel (user info + controls) ───────────────────────
            const infoPanel = document.createElement("div");
            infoPanel.classList.add("w-full", "md:w-1/3", "pr-4");

            // Name header
            const nameEl = document.createElement("div");
            nameEl.textContent = user.name;
            nameEl.classList.add(
                "font-semibold", "text-lg", "mb-2",
                "text-gray-800", "p-2", "bg-gray-100", "rounded-md"
            );
            infoPanel.appendChild(nameEl);

            // Shift-types checkboxes
            const shiftTypesContainer = document.createElement("div");
            shiftTypesContainer.classList.add("mb-2");
            const shiftLabel = document.createElement("div");
            shiftLabel.textContent = getText("create.shiftTypes");
            shiftLabel.classList.add("font-medium");
            const shiftEligble = document.createElement("div");
            shiftEligble.textContent = getText("create.teamSize");
            shiftEligble.classList.add(
                "text-md", "mt-2",
                "text-gray-800"
            );
            infoPanel.appendChild(shiftEligble);
            ["onePersonShift", "twoPersonShift", "threePersonShift"].forEach((type, index) => {
                const lbl = document.createElement("label");
                lbl.classList.add("mr-6");
                const cb = document.createElement("input");
                cb.type = "checkbox";
                cb.value = type;
                cb.checked = user[type];
                cb.classList.add("form-checkbox", "mr-1");
                cb.addEventListener("change", () => {
                        user[type] = !user[type]
                });
                lbl.append(cb, document.createTextNode((index + 1).toString()));
                shiftTypesContainer.appendChild(lbl);
            });
            infoPanel.appendChild(shiftTypesContainer);

            // Blocked-time JSON input + button
            const jsonInput = document.createElement("input");
            jsonInput.type = "text";
            jsonInput.placeholder = getText("create.insertBlockedTime");
            jsonInput.classList.add(
                "w-full", "p-2", "border", "border-gray-300",
                "rounded-md", "mt-2", "focus:outline-none",
                "focus:ring-2", "focus:ring-blue-500", "bg-white"
            );
            const btn = document.createElement("button");
            btn.textContent = getText("create.confirm");
            btn.classList.add(
                "mt-2", "px-4", "py-2", "bg-blue-500",
                "text-white", "rounded-md",
                "hover:bg-blue-600", "focus:outline-none",
                "focus:ring-2", "focus:ring-blue-500"
            );
            btn.addEventListener("click", () => {
                try {
                    // parse whatever the user pasted — either the not_available object itself
                    // or an outer object with a `not_available` property:
                    const parsed = JSON.parse(jsonInput.value);
                    const na = parsed.not_available ?? parsed;

                    // define the three shifts you expect
                    const shiftKeys = ["shift1", "shift2", "shift3"];
                    const dateRe   = /^\d{4}-\d{1,2}-\d{1,2}$/;

                    // check that each shift key exists, is an array, and every entry matches the date regex
                    const valid = shiftKeys.every(key =>
                        Array.isArray(na[key]) &&
                        na[key].every(d => dateRe.test(d))
                    );

                    if (valid) {
                        user.not_available = na;
                        populateUserList(users);
                    } else {
                        alert(getText("create.dateStringInvalidDates"));
                    }
                } catch (e) {
                    console.log(e)
                    alert(getText("create.generalError"));
                }
            });

            infoPanel.append(jsonInput, btn);
            row.appendChild(infoPanel);
            const shifts = shiftValue === "3" ? ["shift1", "shift2", "shift3"] : ["shift1", "shift2"]
            shifts.forEach(type => {
                const panel = renderUserCalenderPanel(year, month, user, type)
                panel.classList.add("w-full", "md:flex-1", "md:mx-4");
                row.appendChild(panel)
            })
            // assemble
            container.appendChild(row);
        });
}

function renderUserCalenderPanel(year, month, user, shiftType) {
    // ── Right panel (calendar) ───────────────────────────────────
    const calendarPanel = document.createElement("div");
    calendarPanel.classList.add("flex-1");

    const daysContainer = document.createElement("div");
    daysContainer.classList.add("calendar", "grid", "grid-cols-7", "gap-1");

    // weekday headers
    const daysOfWeek = [getText("daysShort.mo"), getText("daysShort.di"), getText("daysShort.mi"), getText("daysShort.do"), getText("daysShort.fr"), getText("daysShort.sa"), getText("daysShort.so")];
    daysOfWeek.forEach(d => {
        const hdr = document.createElement("div");
        hdr.classList.add("calendar-header");
        hdr.textContent = d;
        daysContainer.appendChild(hdr);
    });

    // offset for first day
    const firstDow = new Date(year, +month, 1).getDay();
    const offset = (firstDow + 6) % 7;
    for (let i = 0; i < offset; i++) {
        const empty = document.createElement("div");
        empty.classList.add("calendar-day");
        daysContainer.appendChild(empty);
    }

    // days
    const totalDays = new Date(year, +month + 1, 0).getDate();
    for (let day = 1; day <= totalDays; day++) {
        const cell = document.createElement("div");
        cell.classList.add("calendar-day");
        cell.textContent = day;

        const dow = new Date(year, +month, day).getDay();
        const dayName = daysOfWeek[(dow + 6) % 7];
        if (!selectedWeekdays.includes(dayName)) {
            cell.classList.add("excluded");
        } else {
            const key = `${year}-${+month + 1}-${day}`;
            if (user.not_available[shiftType].includes(key)) {
                cell.classList.add("not-available");
            }
            cell.addEventListener("click", () => {
                const idx = user.not_available[shiftType].indexOf(key);
                if (idx > -1) {
                    user.not_available[shiftType].splice(idx, 1);
                    cell.classList.remove("not-available");
                } else {
                    user.not_available[shiftType].push(key);
                    cell.classList.add("not-available");
                }
            });
        }

        daysContainer.appendChild(cell);
    }

    calendarPanel.appendChild(daysContainer);
    return calendarPanel
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
    const month = parseInt(document.getElementById("month").value);
    const year = parseInt(document.getElementById("year").value);
    const container = document.getElementById(id);
    container.innerHTML = "";
    // let the container flexibly fill remaining space
    container.classList.add("flex-1");

    // build the grid exactly as in populateUserList (without flex-1 on the grid itself)
    const daysContainer = document.createElement("div");
    daysContainer.classList.add("calendar", "grid", "grid-cols-7", "gap-1");

    const daysOfWeek = [getText("daysShort.mo"), getText("daysShort.di"), getText("daysShort.mi"), getText("daysShort.do"), getText("daysShort.fr"), getText("daysShort.sa"), getText("daysShort.so")]
    daysOfWeek.forEach(d => {
        const hdr = document.createElement("div");
        hdr.classList.add("calendar-header");
        hdr.textContent = d;
        daysContainer.appendChild(hdr);
    });

    const firstDow = new Date(year, month, 1).getDay();
    const offset = (firstDow + 6) % 7;
    for (let i = 0; i < offset; i++) {
        const empty = document.createElement("div");
        empty.classList.add("calendar-day");
        daysContainer.appendChild(empty);
    }

    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= totalDays; day++) {
        const cell = document.createElement("div");
        cell.classList.add("calendar-day");
        cell.textContent = day;

        const dow = new Date(year, month, day).getDay();
        const dayName = daysOfWeek[(dow + 6) % 7];

        if (!selectedWeekdays.includes(dayName)) {
            cell.classList.add("excluded");
            cell.style.cursor = "default";
        } else {
            const dateKey = `${year}-${month + 1}-${day}`;
            if (subjectArray.includes(dateKey)) {
                cell.classList.add("not-available");
            }
            cell.addEventListener("click", () => {
                const idx = subjectArray.indexOf(dateKey);
                if (idx > -1) {
                    subjectArray.splice(idx, 1);
                    cell.classList.remove("not-available");
                } else {
                    subjectArray.push(dateKey);
                    cell.classList.add("not-available");
                }
            });
        }

        daysContainer.appendChild(cell);
    }

    container.appendChild(daysContainer);
}

document.getElementById("generate-pdf-button").addEventListener("click", async () => {
    const month = parseInt(document.getElementById("month").value) + 1;
    const year = parseInt(document.getElementById("year").value);
    try {
        if (!calendar || Object.entries(calendar).length === 0) {
            displayError(getText("create.forceUpdatePreview"));
            return;
        }
        let fileBlob

        const shiftValue = document.querySelector('input[name="shifts-per-day"]:checked')?.value;
        let isKita = false
        if (shiftValue === "3") {
            fileBlob = generateShiftplanPdf(calendar, month, year, usersData, isKita, 3);
        } else {
            fileBlob = generateShiftplanPdf(calendar, month, year, usersData, isKita, 2);
        }
        const downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(fileBlob);
        downloadLink.download = isKita ? `${getText("create.kitaplanpdf")}_${year}_${month}.pdf` : `${getText("create.shiftplanpdf")}_${year}_${month}.pdf`;
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
    ${personName} ${getText("create.specialshiftsInfo")}`;
    document.getElementById("customModal").classList.remove("hidden");
}


let shiftTypeSelectedColor = null;

// Baut einen einzelnen Kalender-Grid wie in populateUserList, ohne Verfügbarkeitslogik
function renderShiftTypeCalendarPanel(year, month, header) {
    const calendarPanel = document.createElement("div");
    calendarPanel.classList.add("flex-1");
    const label = document.createElement("div")
    label.textContent = header
    label.classList.add("font-semibold")
    calendarPanel.appendChild(label);
    const daysContainer = document.createElement("div");
    daysContainer.classList.add("calendar", "grid", "grid-cols-7", "gap-1");

    // Wochentags-Köpfe
    const daysOfWeek = [getText("daysShort.mo"), getText("daysShort.di"), getText("daysShort.mi"), getText("daysShort.do"), getText("daysShort.fr"), getText("daysShort.sa"), getText("daysShort.so")]
    daysOfWeek.forEach(d => {
        const hdr = document.createElement("div");
        hdr.classList.add("calendar-header");
        hdr.textContent = d;
        daysContainer.appendChild(hdr);
    });

    // Offset für den ersten Tag
    const firstDow = new Date(year, +month, 1).getDay();
    const offset = (firstDow + 6) % 7;
    for (let i = 0; i < offset; i++) {
        const empty = document.createElement("div");
        empty.classList.add("calendar-day");
        daysContainer.appendChild(empty);
    }

    // Tage des Monats
    const totalDays = new Date(year, +month + 1, 0).getDate();
    for (let day = 1; day <= totalDays; day++) {
        const cell = document.createElement("div");
        cell.classList.add("calendar-day", "bg-green-200");
        cell.textContent = day;
        // ausgegraute Wochenenden oder ausgeschlossene Wochentage
        const dow = new Date(year, +month, day).getDay();
        const dayName = daysOfWeek[(dow + 6) % 7];
        if (!selectedWeekdays.includes(dayName)) {
            cell.classList.add("excluded");
        }

        // Klick-Handler: Färben mit ausgewählter Farbe
        cell.addEventListener('click', () => {
            if (!shiftTypeSelectedColor) return; // keine Farbe ausgewählt
            if (cell.classList.contains(shiftTypeSelectedColor)) {
                // Bereits eingefärbt: zurücksetzen
                cell.classList.remove(shiftTypeSelectedColor);
            } else {
                // Alle Farbklassen entfernen
                ['bg-green-200','bg-yellow-200','bg-red-200'].forEach(c => cell.classList.remove(c));
                // Neue Farbe hinzufügen
                cell.classList.add(shiftTypeSelectedColor);
            }
        });

        daysContainer.appendChild(cell);
    }

    calendarPanel.appendChild(daysContainer);
    return calendarPanel;
}

function updateShiftTypeCalendar(shiftValue) {
    const container = document.getElementById('shifttype-calendar');
    container.innerHTML = '';

    const month = document.getElementById('month').value;
    const year = document.getElementById('year').value;

    // Flex-Row mit Info-Panel + 3 Kalender
    const row = document.createElement('div');
    row.classList.add('flex', 'flex-col', 'md:flex-row', 'border-b', 'pb-4', 'mb-4');
    // Info-Panel links: 3 Farbfelder
    const infoPanel = document.createElement('div');
    infoPanel.classList.add('w-full', 'md:w-1/3', 'pr-4', 'flex', 'flex-col', 'space-y-2');

    const colorTypes = [
        { label: `1 ${getText("create.person")}`, color: 'bg-green-200' },
        { label: `2 ${getText("create.persons")}`, color: 'bg-yellow-200' },
        { label: `3 ${getText("create.persons")}`, color: 'bg-red-200' }
    ];

    // Buttons für Schichttypen erstellen und als Radio verhalten
    const buttons = [];
    colorTypes.forEach(({ label, color }) => {
        const btn = document.createElement('div');
        btn.textContent = label;
        btn.classList.add(color, 'p-2', 'rounded-md', 'text-center', 'cursor-pointer');
        // Klick-Handler: Radio-Verhalten und Farbwahl
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('ring-2'));
            btn.classList.add('ring-2');
            // Setzen der globalen Farbwahl
            shiftTypeSelectedColor = color;
        });
        buttons.push(btn);
        infoPanel.appendChild(btn);
    });

    row.appendChild(infoPanel);
    const shifts = shiftValue === "3" ? ['threecol-label-1', 'threecol-label-2', 'threecol-label-3'] :  ['twocol-label-1', 'twocol-label-2']
    // Drei Kalender rechts
    for (let i = 0; i < Number(shiftValue); i++) {
        const header = localStorage.getItem(shifts[i]) ?? `${getText("create.shift")} ${i + 1}`
        const panel = renderShiftTypeCalendarPanel(year, month, header);
        panel.classList.add('w-full', 'md:flex-1', 'md:mx-4');
        row.appendChild(panel);
    }

    container.appendChild(row);
}
const shiftTypes={};

function getShiftAssignments(){
    const container=document.getElementById('shifttype-calendar').firstChild;
    const panels=Array.from(container.children).slice(1,4); // skip infoPanel
    const monthVal=parseInt(document.getElementById('month').value)+1;
    const yearVal=parseInt(document.getElementById('year').value);
    const shiftValue = document.querySelector('input[name="shifts-per-day"]:checked')?.value;
    const shifts = shiftValue === "3" ? ['shift1','shift2','shift3'] :  ['shift1','shift2']
       shifts.forEach((shiftKey,index)=>{
        const panel=panels[index].querySelector('.calendar');
        const cells=Array.from(panel.querySelectorAll('.calendar-day'))
            .filter(c=>c.textContent.trim()!=='');
        const one=[]; const two=[]; const three=[];
        cells.forEach(c=>{
            const d= parseInt(c.textContent);
            const dateStr=`${yearVal}-${monthVal}-${d}`;
            if(c.classList.contains('bg-yellow-200')) two.push(dateStr);
            else if(c.classList.contains('bg-red-200')) three.push(dateStr);
            else one.push(dateStr);
        });
        shiftTypes[shiftKey]={onePerson:one,twoPersons:two,threePersons:three};
    })
    return shiftTypes
}