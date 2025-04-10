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
 * Diese Version weist 2 Spalten zu: Bei Team-Tagen wird ein Elternteil und eine feste "Team"-Spalte genutzt,
 * bei regulären Tagen werden 2 Eltern ausgewählt.
 */
export function testAssignUsersToCalendar(month, year, localUsers, options = {}) {
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
        const availableTotal = uniqueServiceDays - user["not_available"].length;
        const prioOffsetFactor = availableTotal <= uniqueServiceDays / 4 ? 0 :
            availableTotal <= uniqueServiceDays / 2 ? 2 : 1;
        return {
            ...user,
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
            calendar[day] = [selectedUser.name, 'Team', { isKitaOpenNoEd: false, isValidDay: true, isAssigned: hasEnoughUsers }];
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

/**
 * Funktion zur Zuweisung von Eltern zu Kalendertagen – mittels Pinned-Count-System für eine gleichmäßigere Verteilung.
 * Diese Version arbeitet mit 2 Spalten (2 Eltern pro Tag).
 */
export function assignUsersToCalendar(month, year, users, options = {}) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const calendar = {};
    const userPinnedCount = {};
    shuffleArray(users); // Zufällige Reihenfolge
    const { weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], holidays = [], kitaOpenNoEd = [], teamdays = [] } = options;

    users.forEach(user => {
        userPinnedCount[user.name] = 0;
    });

    function isUserAvailable(user, date) {
        const formattedDate = `${year}-${month}-${date}`;
        return !user.not_available.includes(formattedDate);
    }
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
    function getAvailableUsersForDay(day) {
        return users.filter(user => isUserAvailable(user, day))
            .sort((a, b) => {
                const countA = userPinnedCount[a.name];
                const countB = userPinnedCount[b.name];
                return countA - countB;
            });
    }

    for (let day = 1; day <= daysInMonth; day++) {
        if (isKitaOpenNoEd(day)) {
            calendar[day] = ["", "", { isKitaOpenNoEd: true, isValidDay: false, isAssigned: false }];
            continue;
        }
        if (!isValidWeekday(day) || isHoliday(day)) {
            calendar[day] = ["", "", { isKitaOpenNoEd: false, isValidDay: false, isAssigned: false }];
            continue;
        }

        const availableUsers = getAvailableUsersForDay(day);

        if (isTeamDay(day)) {
            // Bei Team-Tagen: Einen Nutzer auswählen, die übrige Spalte mit "Team"
            const hasEnoughUsers = availableUsers.length >= 1;
            const selectedUser = hasEnoughUsers ? availableUsers[0] : { name: "NOT SET" };
            calendar[day] = [selectedUser.name, 'Team', { isKitaOpenNoEd: false, isValidDay: true, isAssigned: hasEnoughUsers }];
            if (hasEnoughUsers) userPinnedCount[selectedUser.name]++;
        }
        else {
            // Regulärer Tag – wähle zwei Eltern aus
            const hasEnoughUsers = availableUsers.length >= 2;
            const hasOneUser = availableUsers.length === 1;
            let selectedUsers;
            if (hasEnoughUsers) {
                selectedUsers = availableUsers.slice(0, 2);
            } else if (hasOneUser) {
                selectedUsers = [availableUsers[0], { name: "NOT SET" }];
            } else {
                selectedUsers = [{ name: "NOT SET" }, { name: "NOT SET" }];
            }

            if (hasEnoughUsers && selectedUsers[0].name === selectedUsers[1].name) {
                displayError("Some dataset duplication that should not happen. Please reach out to the code maintainer.");
                throw new Error("Duplicate users in data set");
            }

            calendar[day] = [...selectedUsers.map(user => user.name), { isKitaOpenNoEd: false, isValidDay: true, isAssigned: hasEnoughUsers }];
            if (hasEnoughUsers) {
                userPinnedCount[selectedUsers[0].name]++;
                userPinnedCount[selectedUsers[1].name]++;
            } else if (hasOneUser) {
                userPinnedCount[selectedUsers[0].name]++;
            }
        }
    }
    return calendar;
}

// Helper function to format the date (e.g., "01.10")
export function formatDate(day, month, year) {
    const date = new Date(year, month - 1, day);
    return window.dateFns.format(date, 'dd.MM', { locale: window.dateFns.locale.de });
}

// Helper function to format the day of the week (e.g., "Mo")
export function formatDayOfWeek(day, month, year) {
    const date = new Date(year, month - 1, day);
    const formattedDay = window.dateFns.format(date, 'EE', { locale: window.dateFns.locale.de });
    return formattedDay.endsWith(".") ? formattedDay.slice(0, -1) : formattedDay;
}

export function generatePDF(calendar, month, year, usersData = []) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Titel und Untertitel zentrieren
    doc.setFontSize(16);
    doc.text('Dienstplan', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(
        `${window.dateFns.format(new Date(year, month - 1), 'MMMM yyyy', { locale: window.dateFns.locale.de })}`,
        doc.internal.pageSize.getWidth() / 2,
        22,
        { align: 'center' }
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
        const [parent1, parent2, meta] = calendar[day];
        if (!actionTaken && meta.isValidDay &&
            !usersData.find(user => user === parent1) &&
            !usersData.find(user => user === parent2)) {
            const confirmedChoice = confirm(`User nicht im Datenset gefunden: ${parent1}, ${parent2}. Trotzdem fortfahren?`);
            if (!confirmedChoice) {
                return;
            }
            actionTaken = true;
        }
        const formattedDate = formatDate(day, month, year);
        const dayOfWeek = formatDayOfWeek(day, month, year);
        // Bei gültigen Tagen: Schicht 1 entspricht parent1
        const normalShiftText = meta.isValidDay ? parent1 : "";
        rows.push({ data: [dayOfWeek, formattedDate, normalShiftText, parent2], meta });
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
                    styles: { halign: 'center', fillColor: fillColor, textColor: [50, 50, 50] }
                }
            ];
        } else {
            // Normale Zeile: 4 Zellen (Tag, Datum, Schicht 1, Schicht 2)
            return row.data;
        }
    });

    // Tabellenkopf – 4 Spalten
    const headers = [['Tag', 'Datum', 'Schicht 1', 'Schicht 2']];
    const wantedTableWidth = 150;
    const margin = (pageWidth - wantedTableWidth) / 2;

    // Aufruf von autoTable
    doc.autoTable({
        head: headers,
        body: tableBody,
        startY: startY,
        theme: 'grid',
        headStyles: { fillColor: [100, 100, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        bodyStyles: { halign: 'center' },
        columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 30 },
            2: { cellWidth: 50 },
            3: { cellWidth: 50 }
        },
        margin: { left: margin, right: margin }
    });

    return doc.output('blob');
}