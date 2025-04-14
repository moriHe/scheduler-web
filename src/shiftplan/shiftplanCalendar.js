// Get the error message display element
const errorMessageElement = document.getElementById('error-message');

// Function to display error messages
export function displayError(message) {
    errorMessageElement.textContent = message;
    errorMessageElement.classList.remove('hidden'); // Show the error message
    setTimeout(() => {
        errorMessageElement.classList.add('hidden'); // Hide the error message after 5 seconds
    }, 5000);
}

// Function to shuffle an array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); // Random index
        [array[i], array[j]] = [array[j], array[i]]; // Swap
    }
}

// Function to update the selected user's data (service count and prio)
function updateUsersArray(_users, averageServiceCount, hasEnoughUsers, selectedUser) {
    if (hasEnoughUsers) {
        _users.forEach((user) => {
            if (user.name === selectedUser.name) {
                // Update service count and adjust priority
                const newServiceCount = user.serviceCount + 1;
                let newPrio;
                if (newServiceCount >= averageServiceCount) {
                    newPrio = 1000;
                } else if (user.prioOffsetFactor === 0) {
                    newPrio = -1000;
                } else {
                    newPrio = 10 * user.prioOffsetFactor;
                }
                user.prio = newPrio;
                user.serviceCount = newServiceCount;
            } else {
                user.prio = user.prio === 1000 ? 1000 : user.prio === -1000 ? -1000 : user.prio - 10;
            }
        });
    }
}

/**
 * Testfunktion zur Zuweisung von Eltern zu den Kalender-Tagen (für die Vorschau)
 * Hier wird pro Tag entweder – bei Team-Tagen – eine Kombination aus einem ausgewählten Elternteil und zwei statischen "Team"
 * oder – bei regulären Tagen – versucht, drei unterschiedliche, verfügbare Eltern aus der sortierten Liste zu entnehmen.
 */
export function assignUsersCalendarThreeCols(month, year, localUsers, options = {}) {
    // Helper functions zur Prüfung der Tage
    function isKitaOpenNoEd(date) {
        const formattedDate = `${year}-${month}-${date}`;
        return kitaOpenNoEd.includes(formattedDate);
    }
    function isHoliday(date) {
        const formattedDate = `${year}-${month}-${date}`;
        return holidays.includes(formattedDate);
    }
    function isTeamDay(date) {
        const formattedDate = `${year}-${month}-${date}`;
        return teamdays.includes(formattedDate);
    }
    function isValidWeekday(day) {
        const date = new Date(year, month - 1, day);
        const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
        return weekdays.includes(weekday);
    }

    // Berechne die Anzahl der Tage, an denen ein Dienst stattfindet
    function calcUniqueServiceDays() {
        let total = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            if (isKitaOpenNoEd(day)) {
                continue;
            } else if (!isValidWeekday(day) || isHoliday(day)) {
                continue;
            } else {
                total = total + 1;
            }
        }
        return total;
    }

    const calendar = {}; // Kalenderspeicher
    const { weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], holidays = [], kitaOpenNoEd = [], teamdays = [] } = options;

    function isUserAvailable(user, date) {
        const formattedDate = `${year}-${month}-${date}`;
        return !user.not_available.includes(formattedDate);
    }
    function getAvailableUsersForDay(day, localUsers) {
        return localUsers.filter(user => isUserAvailable(user, day));
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const uniqueServiceDays = calcUniqueServiceDays();
    // Anpassen: Berechne den Durchschnitt anhand von 3 Schicht-Spalten (statt 2)
    const averageServiceCount = Math.floor(uniqueServiceDays * 3 / localUsers.length);

    // Kopiere und erweitere die Nutzer-Daten
    const _users = [...localUsers].map((user) => {
        const cleanedNotAvailableArray = user["not_available"].filter((date) => {
            const extractedDay = date.split("-")[2];
            if (extractedDay === undefined) return false
            if (isHoliday(extractedDay)) return false
            if (isKitaOpenNoEd(extractedDay)) return false
            return isValidWeekday(extractedDay);
        })

        const availableTotal = uniqueServiceDays - cleanedNotAvailableArray.length;
        const prioOffsetFactor = availableTotal <= uniqueServiceDays / 4 ? 0 :
            availableTotal <= uniqueServiceDays / 2 ? 2 : 1;
        return {
            ...user,
            "not_available": cleanedNotAvailableArray,
            serviceCount: 0,
            prioOffsetFactor,
            // Der niedrigere Wert = höhere Chance ausgewählt zu werden
            prio: availableTotal <= uniqueServiceDays / 4 ? -1000 : -10 * prioOffsetFactor
        };
    });

    for (let day = 1; day <= daysInMonth; day++) {
        // Sonderfälle: Tage, an denen kein Dienst stattfindet
        if (isKitaOpenNoEd(day)) {
            calendar[day] = ["", "", "", { isKitaOpenNoEd: true, isValidDay: false, isAssigned: false }];
            continue;
        }
        if (!isValidWeekday(day) || isHoliday(day)) {
            calendar[day] = ["", "", "", { isKitaOpenNoEd: false, isValidDay: false, isAssigned: false }];
            continue;
        }

        const availableUsers = getAvailableUsersForDay(day, _users);
        // Sortiere verfügbare Nutzer anhand der Priorität und Service-Zahl (mit etwas Zufall)
        const usersSortedByPrio = availableUsers.sort((a, b) => {
            if (a.serviceCount === b.serviceCount && a.prioOffsetFactor === 1 && b.prioOffsetFactor === 1) {
                return Math.random() < 0.5 ? -1 : 1;
            }
            if (a.prio < b.prio) return -1;
            if (a.prio > b.prio) return 1;
            if (a.serviceCount < b.serviceCount) return -1;
            if (a.serviceCount > b.serviceCount) return 1;
            return Math.random() < 0.5 ? -1 : 1;
        });

        if (isTeamDay(day)) {
            // Bei Team-Tagen: Zwei Elternteile und eine feste "Team"-Spalte
            const hasEnoughUsers = usersSortedByPrio.length >= 2;
            let selectedUser1, selectedUser2;

            if (hasEnoughUsers) {
                [selectedUser1, selectedUser2] = usersSortedByPrio.slice(0, 2);
            } else if (usersSortedByPrio.length === 1) {
                selectedUser1 = usersSortedByPrio[0];
                selectedUser2 = { name: "NOT SET" };
            } else {
                selectedUser1 = { name: "NOT SET" };
                selectedUser2 = { name: "NOT SET" };
            }
            calendar[day] = [
                selectedUser1.name,
                selectedUser2.name,
                options.specificPerson ?? 'k.A.',
                { isKitaOpenNoEd: false, isValidDay: true, isAssigned: hasEnoughUsers, hasSpecificPerson: options.specificPerson !== undefined }
            ];

            // Aktualisiere die User-Daten für die ausgewählten Nutzer
            if (usersSortedByPrio.length >= 2) {
                updateUsersArray(_users, averageServiceCount, true, selectedUser1);
                updateUsersArray(_users, averageServiceCount, true, selectedUser2);
            } else if (usersSortedByPrio.length === 1) {
                updateUsersArray(_users, averageServiceCount, true, selectedUser1);
            }
        }
         else {
            // Regulärer Tag – wähle drei Eltern aus
            const hasEnoughUsers = availableUsers.length >= 3;
            const hasTwoUsers = availableUsers.length === 2;
            const hasOneUser = availableUsers.length === 1;
            let selectedUsers;
            if (hasEnoughUsers) {
                selectedUsers = usersSortedByPrio.slice(0, 3);
            } else if (hasTwoUsers) {
                selectedUsers = [usersSortedByPrio[0], usersSortedByPrio[1], { name: "NOT SET" }];
            } else if (hasOneUser) {
                selectedUsers = [usersSortedByPrio[0], { name: "NOT SET" }, { name: "NOT SET" }];
            } else {
                selectedUsers = [{ name: "NOT SET" }, { name: "NOT SET" }, { name: "NOT SET" }];
            }

            // Prüfe auf doppelte Einträge (nur wenn genügend echte Nutzer vorhanden sind)
            if (hasEnoughUsers &&
                (selectedUsers[0].name === selectedUsers[1].name ||
                    selectedUsers[0].name === selectedUsers[2].name ||
                    selectedUsers[1].name === selectedUsers[2].name)) {
                displayError("Some dataset duplication that should not happen. Please reach out to the code maintainer.");
                throw new Error("Duplicate users in data set");
            }

            calendar[day] = [...selectedUsers.map(user => user.name), { isKitaOpenNoEd: false, isValidDay: true, isAssigned: hasEnoughUsers }];
            if (hasEnoughUsers) {
                updateUsersArray(_users, averageServiceCount, true, selectedUsers[0]);
                updateUsersArray(_users, averageServiceCount, true, selectedUsers[1]);
                updateUsersArray(_users, averageServiceCount, true, selectedUsers[2]);
            } else if (hasTwoUsers) {
                updateUsersArray(_users, averageServiceCount, true, selectedUsers[0]);
                updateUsersArray(_users, averageServiceCount, true, selectedUsers[1]);
            } else if (hasOneUser) {
                updateUsersArray(_users, averageServiceCount, true, selectedUsers[0]);
            }
        }
    }
    return calendar;
}

// Helper function to format the date (z.B. "01.10")
export function formatDate(day, month, year) {
    const date = new Date(year, month - 1, day);
    return window.dateFns.format(date, 'dd.MM', { locale: window.dateFns.locale.de });
}

// Helper function, um den Wochentag (z.B. "Mo") zu formatieren
export function formatDayOfWeek(day, month, year) {
    const date = new Date(year, month - 1, day);
    const formattedDay = window.dateFns.format(date, 'EE', { locale: window.dateFns.locale.de });
    return formattedDay.endsWith(".") ? formattedDay.slice(0, -1) : formattedDay;
}

/**
 * Erzeugt das PDF des Elterndienstplans. Dabei wird der Kalender (mit 3 Spalten) in eine Tabelle konvertiert.
 */
export function generatePDFThreeCols(calendar, month, year, usersData = []) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Titel und Untertitel zentrieren
    doc.setFontSize(16);
    doc.text('Dienstplan', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`${window.dateFns.format(new Date(year, month - 1), 'MMMM yyyy', { locale: window.dateFns.locale.de })}`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });

    const legendStartY = 28;
    const pageWidth = doc.internal.pageSize.getWidth();
    const legendLeftMargin = (pageWidth - 150) / 2;
    const boxSize = 6;

    // Legende: Gelber Kasten
    doc.setFillColor(255, 230, 153);
    doc.rect(legendLeftMargin, legendStartY, boxSize, boxSize, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text("Geöffnet, keine Schichten notwendig", legendLeftMargin + boxSize + 5, legendStartY + boxSize - 1);

    // Legende: Roter Kasten
    const redBoxX = legendLeftMargin + 90;
    doc.setFillColor(255, 204, 204);
    doc.rect(redBoxX, legendStartY, boxSize, boxSize, 'F');
    doc.text("Geschlossen", redBoxX + boxSize + 5, legendStartY + boxSize - 1);

    let startY = legendStartY + 10;
    let actionTaken = false;
    const rows = [];

    // Erzeugen der Zeilen-Daten aus dem Kalender
    for (const day in calendar) {
        let [parent1, parent2, parent3, meta] = calendar[day];

        if (!actionTaken) {
            const areAllUsersKnown = !usersData.find(user => user === parent1) ||
                !usersData.find(user => user === parent2) || !usersData.find(user => user === parent3)
            if (meta.isValidDay && areAllUsersKnown) {

                const confirmedChoice = confirm(`Person(en) nicht im Datenset gefunden an der Stelle: ${parent1}, ${parent2}, ${parent3}. Trotzdem fortfahren?`);
                if (!confirmedChoice) {
                    return
                }
                actionTaken = true;
        }
        }
        const formattedDate = formatDate(day, month, year);
        const dayOfWeek = formatDayOfWeek(day, month, year);
        // Bei gültigen Tagen wird der Inhalt aus der ersten Spalte übernommen.
        // Für ungültige Tage (z.B. Feiertage) bzw. "KitaOpenNoEd" nutzen wir später einen fixen Text.
        if (parent1 === "NOT SET")
            parent1 = ""
        if (parent2 === "NOT SET")
            parent2 = ""
        if (parent3 === "NOT SET")
            parent3 = ""

        const normalShiftText = meta.isValidDay ? parent1 : "";

        // Speichere die Zeile inklusive Meta-Daten
        rows.push({ data: [dayOfWeek, formattedDate, normalShiftText, parent2, parent3], meta });
    }

    // Neuer Body‑Array, der für spezielle Tage (nicht valide oder KitaOpenNoEd) die Schicht-Spalten zusammenfasst:
    const tableBody = rows.map(row => {
        if (!row.meta.isValidDay || row.meta.isKitaOpenNoEd) {
            let specialText = "";
            let fillColor;
            if (row.meta.isKitaOpenNoEd) {
                specialText = row.meta.invalidText ?? "";
                fillColor = [255, 230, 153];  // Gelb
            } else {
                specialText = row.meta.invalidText ?? "";
                fillColor = [255, 204, 204];  // Rot
            }
            // Für diese Zeile haben wir zwei Zellen für Tag und Datum und eine Zelle (colSpan:3) für Schichtinfo
            return [
                row.data[0],
                row.data[1],
                {
                    content: specialText,
                    colSpan: 3,
                    styles: { halign: 'center', fillColor: fillColor, textColor: [50, 50, 50] }
                }
            ];
        } else {
            // Normale Zeile: 5 Spalten, ohne Veränderung
            return row.data;
        }
    });

    // Überschrift der Tabelle (Header) – hier bleiben wir bei 5 Zellen, da autoTable Body-Zeilen über colSpan korrekt zusammenführt.
    const schicht1 = localStorage.getItem('threecol-label-1') || "Schicht 1";
    const schicht2 = localStorage.getItem('threecol-label-2') || "Schicht 2";
    const schicht3 = localStorage.getItem('threecol-label-3') || "Schicht 3";

    const headers = [['Tag', 'Datum', schicht1, schicht2, schicht3]];

    // Gesamte Tabellenspaltenbreiten (aus Column-Styles)
    // Spalte 0: 10, Spalte 1: 20, Spalte 2: 60, Spalte 3: 50, Spalte 4: 50 => Summe = 190
    const wantedTableWidth = 190;
    const margin = (pageWidth - wantedTableWidth) / 2;

    // Aufruf von autoTable – alternativ: Für normale Zeilen nutzen wir das Alternating Row Style
    doc.autoTable({
        head: headers,
        body: tableBody,
        startY: startY,
        theme: 'grid',
        headStyles: { fillColor: [100, 100, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        bodyStyles: { halign: 'center' },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 20 },
            2: { cellWidth: 60 },
            3: { cellWidth: 50 },
            4: { cellWidth: 50 }
        },
        margin: { left: margin, right: margin }
    });

    return doc.output('blob');
}

/**
 * Testfunktion zur Zuweisung von Eltern zu den Kalender-Tagen (für die Vorschau)
 * Diese Version weist 2 Spalten zu: Bei Team-Tagen wird ein Elternteil und eine feste "Team"-Spalte genutzt,
 * bei regulären Tagen werden 2 Eltern ausgewählt.
 */
export function assignUsersCalendarTwoCols(month, year, localUsers, options = {}) {
    // Helper functions zur Prüfung der Tage
    function isKitaOpenNoEd(date) {
        const formattedDate = `${year}-${month}-${date}`;
        return kitaOpenNoEd.includes(formattedDate);
    }
    function isHoliday(date) {
        const formattedDate = `${year}-${month}-${date}`;
        return holidays.includes(formattedDate);
    }
    function isTeamDay(date) {
        const formattedDate = `${year}-${month}-${date}`;
        return teamdays.includes(formattedDate);
    }
    function isValidWeekday(day) {
        const date = new Date(year, month - 1, day);
        const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
        return weekdays.includes(weekday);
    }
    // Berechne die Anzahl der Tage, an denen ein Dienst stattfindet
    function calcUniqueServiceDays() {
        let total = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            if (isKitaOpenNoEd(day)) {
                continue;
            } else if (!isValidWeekday(day) || isHoliday(day)) {
                continue;
            } else {
                total++;
            }
        }
        return total;
    }
    const calendar = {}; // Kalenderspeicher
    const { weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], holidays = [], kitaOpenNoEd = [], teamdays = [] } = options;

    function isUserAvailable(user, date) {
        const formattedDate = `${year}-${month}-${date}`;
        return !user.not_available.includes(formattedDate);
    }
    function getAvailableUsersForDay(day, localUsers) {
        return localUsers.filter(user => isUserAvailable(user, day));
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const uniqueServiceDays = calcUniqueServiceDays();
    // Adjust average calculation for 2 Spalten statt 3
    const averageServiceCount = Math.floor(uniqueServiceDays * 2 / localUsers.length);

    // Kopiere und erweitere die Nutzer-Daten
    const _users = [...localUsers].map((user) => {
        const cleanedNotAvailableArray = user["not_available"].filter((date) => {
            const extractedDay = date.split("-")[2];
            if (extractedDay === undefined) return false
            if (isHoliday(extractedDay)) return false
            if (isKitaOpenNoEd(extractedDay)) return false
            return isValidWeekday(extractedDay);
        })

        const availableTotal = uniqueServiceDays - cleanedNotAvailableArray.length;

        const prioOffsetFactor = availableTotal <= uniqueServiceDays / 4 ? 0 :
            availableTotal <= uniqueServiceDays / 2 ? 2 : 1;
        return {
            ...user,
            "not_available": cleanedNotAvailableArray,
            serviceCount: 0,
            prioOffsetFactor,
            // Der niedrigere Wert = höhere Chance ausgewählt zu werden
            prio: availableTotal <= uniqueServiceDays / 4 ? -1000 : -10 * prioOffsetFactor
        };
    });

    for (let day = 1; day <= daysInMonth; day++) {
        // Sonderfälle: Tage, an denen kein Dienst stattfindet
        if (isKitaOpenNoEd(day)) {
            calendar[day] = ["", "", { isKitaOpenNoEd: true, isValidDay: false, isAssigned: false }];
            continue;
        }
        if (!isValidWeekday(day) || isHoliday(day)) {
            calendar[day] = ["", "", { isKitaOpenNoEd: false, isValidDay: false, isAssigned: false }];
            continue;
        }

        const availableUsers = getAvailableUsersForDay(day, _users);
        // Sortiere verfügbare Nutzer anhand der Priorität und Service-Zahl (mit etwas Zufall)
        const usersSortedByPrio = availableUsers.sort((a, b) => {
            if (a.serviceCount === b.serviceCount && a.prioOffsetFactor === 1 && b.prioOffsetFactor === 1) {
                return Math.random() < 0.5 ? -1 : 1;
            }
            if (a.prio < b.prio) return -1;
            if (a.prio > b.prio) return 1;
            if (a.serviceCount < b.serviceCount) return -1;
            if (a.serviceCount > b.serviceCount) return 1;
            return Math.random() < 0.5 ? -1 : 1;
        });

        if (isTeamDay(day)) {
            // Bei Team-Tagen: Ein Elternteil und eine feste "Team"-Spalte
            const hasEnoughUsers = usersSortedByPrio.length >= 1;
            let selectedUser = hasEnoughUsers ? usersSortedByPrio[0] : { name: "NOT SET" };
            calendar[day] = [selectedUser.name, options.specificPerson ?? 'k.A.', { isKitaOpenNoEd: false, isValidDay: true, isAssigned: hasEnoughUsers, hasSpecificPerson: true }];
            if (hasEnoughUsers) {
                updateUsersArray(_users, averageServiceCount, true, selectedUser);
            }
        }
        else {
            // Regulärer Tag – wähle zwei Eltern aus
            const hasEnoughUsers = availableUsers.length >= 2;
            const hasOneUser = availableUsers.length === 1;
            let selectedUsers;
            if (hasEnoughUsers) {
                selectedUsers = usersSortedByPrio.slice(0, 2);
            } else if (hasOneUser) {
                selectedUsers = [usersSortedByPrio[0], { name: "NOT SET" }];
            } else {
                selectedUsers = [{ name: "NOT SET" }, { name: "NOT SET" }];
            }

            // Prüfe auf doppelte Einträge (nur wenn genügend echte Nutzer vorhanden sind)
            if (hasEnoughUsers && selectedUsers[0].name === selectedUsers[1].name) {
                displayError("Some dataset duplication that should not happen. Please reach out to the code maintainer.");
                throw new Error("Duplicate users in data set");
            }

            calendar[day] = [...selectedUsers.map(user => user.name), { isKitaOpenNoEd: false, isValidDay: true, isAssigned: hasEnoughUsers }];
            if (hasEnoughUsers) {
                updateUsersArray(_users, averageServiceCount, true, selectedUsers[0]);
                updateUsersArray(_users, averageServiceCount, true, selectedUsers[1]);
            } else if (hasOneUser) {
                updateUsersArray(_users, averageServiceCount, true, selectedUsers[0]);
            }
        }
    }
    return calendar;
}

export function generatePDFTwoCols(calendar, month, year, usersData = []) {
    const {jsPDF} = window.jspdf;
    const doc = new jsPDF();

    // Titel und Untertitel zentrieren
    doc.setFontSize(16);
    doc.text('Dienstplan', doc.internal.pageSize.getWidth() / 2, 15, {align: 'center'});
    doc.setFontSize(12);
    doc.text(
        `${window.dateFns.format(new Date(year, month - 1), 'MMMM yyyy', {locale: window.dateFns.locale.de})}`,
        doc.internal.pageSize.getWidth() / 2,
        22,
        {align: 'center'}
    );

    // Legende: Positionierung und Box-Parameter
    const legendStartY = 28;
    const pageWidth = doc.internal.pageSize.getWidth();
    const legendLeftMargin = (pageWidth - 150) / 2;
    const boxSize = 6;

    // Legende: Gelber Kasten
    doc.setFillColor(255, 230, 153);
    doc.rect(legendLeftMargin, legendStartY, boxSize, boxSize, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text("Geöffnet, keine Schichten notwendig", legendLeftMargin + boxSize + 5, legendStartY + boxSize - 1);

    // Legende: Roter Kasten
    const redBoxX = legendLeftMargin + 90;
    doc.setFillColor(255, 204, 204);
    doc.rect(redBoxX, legendStartY, boxSize, boxSize, 'F');
    doc.text("Geschlossen", redBoxX + boxSize + 5, legendStartY + boxSize - 1);

    let startY = legendStartY + 10;
    let actionTaken = false;
    const rows = [];

    // Erzeugen der Zeilen-Daten aus dem Kalender (Format: [parent1, parent2, meta])
    for (const day in calendar) {
        let [parent1, parent2, meta] = calendar[day];

        if (!actionTaken) {
            const areAllUsersKnown = !usersData.find(user => user === parent1) ||
                !usersData.find(user => user === parent2)

            if (meta.isValidDay && areAllUsersKnown) {
                const confirmedChoice = confirm(`Person(en) nicht im Datenset gefunden: ${parent1}, ${parent2}. Trotzdem fortfahren?`);
                if (!confirmedChoice) {
                    return;
                }
                actionTaken = true;
        }
        }
        const formattedDate = formatDate(day, month, year);
        const dayOfWeek = formatDayOfWeek(day, month, year);

        if (parent1 === "NOT SET")
            parent1 = ""
        if (parent2 === "NOT SET")
            parent2 = ""
        // Bei gültigen Tagen: Schicht 1 entspricht parent1
        const normalShiftText = meta.isValidDay ? parent1 : "";
        rows.push({data: [dayOfWeek, formattedDate, normalShiftText, parent2], meta});
    }

    // Neuer Body‑Array, der für spezielle Tage (nicht valide oder isKitaOpenNoEd)
    // die Schicht-Spalten zusammenfasst: Es werden Tag und Datum beibehalten,
    // und beide Schicht-Spalten (normalerweise zwei Zellen) zu einer mit colSpan:2 zusammengeführt.
    const tableBody = rows.map(row => {
        if (!row.meta.isValidDay || row.meta.isKitaOpenNoEd) {
            let specialText = row.meta.invalidText ?? "";
            let fillColor = row.meta.isKitaOpenNoEd ? [255, 230, 153] : [255, 204, 204];
            return [
                row.data[0],
                row.data[1],
                {
                    content: specialText,
                    colSpan: 2,
                    styles: {halign: 'center', fillColor: fillColor, textColor: [50, 50, 50]}
                }
            ];
        } else {
            // Normale Zeile: 4 Zellen (Tag, Datum, Schicht 1, Schicht 2)
            return row.data;
        }
    });

    // Tabellenkopf – 4 Spalten
    const schicht1 = localStorage.getItem('twocol-label-1') || "Schicht 1";
    const schicht2 = localStorage.getItem('twocol-label-2') || "Schicht 2";

    const headers = [['Tag', 'Datum', schicht1, schicht2]];
    const wantedTableWidth = 150;
    const margin = (pageWidth - wantedTableWidth) / 2;

    // Aufruf von autoTable
    doc.autoTable({
        head: headers,
        body: tableBody,
        startY: startY,
        theme: 'grid',
        headStyles: {fillColor: [100, 100, 255]},
        alternateRowStyles: {fillColor: [245, 245, 245]},
        bodyStyles: {halign: 'center'},
        columnStyles: {
            0: {cellWidth: 20},
            1: {cellWidth: 30},
            2: {cellWidth: 50},
            3: {cellWidth: 50}
        },
        margin: {left: margin, right: margin}
    });

    return doc.output('blob');
}