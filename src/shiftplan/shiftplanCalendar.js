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
            // Bei Team-Tagen: Ein Elternteil und zwei feste "Team"
            const hasEnoughUsers = usersSortedByPrio.length >= 1;
            const selectedUser = hasEnoughUsers ? usersSortedByPrio[0] : { name: "NOT SET" };
            calendar[day] = [selectedUser.name, 'Team', 'Team', { isKitaOpenNoEd: false, isValidDay: true, isAssigned: hasEnoughUsers }];
            updateUsersArray(_users, averageServiceCount, hasEnoughUsers, selectedUser);
        } else {
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

/**
 * Funktion zur Zuweisung von Eltern zu Kalendertagen – hier werden die Nutzer über ein Pinned-Count-System gleichmäßig verteilt.
 * Ähnlich wie testAssignUsersToCalendar, jedoch mit einem internen Zähler (userPinnedCount) pro Nutzer.
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
            calendar[day] = ["", "", "", { isKitaOpenNoEd: true, isValidDay: false, isAssigned: false }];
            continue;
        }
        if (!isValidWeekday(day) || isHoliday(day)) {
            calendar[day] = ["", "", "", { isKitaOpenNoEd: false, isValidDay: false, isAssigned: false }];
            continue;
        }

        const availableUsers = getAvailableUsersForDay(day);

        if (isTeamDay(day)) {
            // Bei Team-Tagen: Einen Nutzer auswählen, die übrigen beiden Spalten mit "Team" füllen
            const hasEnoughUsers = availableUsers.length >= 1;
            const selectedUser = hasEnoughUsers ? availableUsers[0] : { name: "NOT SET" };
            calendar[day] = [selectedUser.name, 'Team', 'Team', { isKitaOpenNoEd: false, isValidDay: true, isAssigned: hasEnoughUsers }];
            if (hasEnoughUsers) userPinnedCount[selectedUser.name]++;
        } else {
            const hasEnoughUsers = availableUsers.length >= 3;
            const hasTwoUsers = availableUsers.length === 2;
            const hasOneUser = availableUsers.length === 1;
            let selectedUsers;
            if (hasEnoughUsers) {
                selectedUsers = availableUsers.slice(0, 3);
            } else if (hasTwoUsers) {
                selectedUsers = [availableUsers[0], availableUsers[1], { name: "NOT SET" }];
            } else if (hasOneUser) {
                selectedUsers = [availableUsers[0], { name: "NOT SET" }, { name: "NOT SET" }];
            } else {
                selectedUsers = [{ name: "NOT SET" }, { name: "NOT SET" }, { name: "NOT SET" }];
            }

            if (hasEnoughUsers &&
                (selectedUsers[0].name === selectedUsers[1].name ||
                    selectedUsers[0].name === selectedUsers[2].name ||
                    selectedUsers[1].name === selectedUsers[2].name)) {
                displayError("Some dataset duplication that should not happen. Please reach out to the code maintainer.");
                throw new Error("Duplicate users in data set");
            }

            calendar[day] = [...selectedUsers.map(user => user.name), { isKitaOpenNoEd: false, isValidDay: true, isAssigned: hasEnoughUsers }];
            if (hasEnoughUsers) {
                userPinnedCount[selectedUsers[0].name]++;
                userPinnedCount[selectedUsers[1].name]++;
                userPinnedCount[selectedUsers[2].name]++;
            } else if (hasTwoUsers) {
                userPinnedCount[selectedUsers[0].name]++;
                userPinnedCount[selectedUsers[1].name]++;
            } else if (hasOneUser) {
                userPinnedCount[selectedUsers[0].name]++;
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
export function generatePDF(calendar, month, year, usersData = []) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Titel und Untertitel zentrieren
    doc.setFontSize(16);
    doc.text('Elterndienstplan', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
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
    doc.text("Kita offen, kein Elterndienst", legendLeftMargin + boxSize + 5, legendStartY + boxSize - 1);

    // Legende: Roter Kasten
    const redBoxX = legendLeftMargin + 90;
    doc.setFillColor(255, 204, 204);
    doc.rect(redBoxX, legendStartY, boxSize, boxSize, 'F');
    doc.text("Kita geschlossen", redBoxX + boxSize + 5, legendStartY + boxSize - 1);

    let startY = legendStartY + 10;
    let continueProcess = true;
    let actionTaken = false;

    const rows = [];
    for (const day in calendar) {
        const [parent1, parent2, parent3, meta] = calendar[day];
        if (!continueProcess) break;
        const isUser1InDataSet = usersData.find(user => user === parent1);
        const isUser2InDataSet = usersData.find(user => user === parent2) || parent2 === "Team";
        const isUser3InDataSet = usersData.find(user => user === parent3) || parent3 === "Team";
        if (!actionTaken && meta.isValidDay && !isUser1InDataSet && !isUser2InDataSet && !isUser3InDataSet) {
            const confirmedChoice = confirm(`User nicht im Datenset gefunden an der Stelle: ${parent1}, ${parent2}, ${parent3}. Trotzdem fortfahren?`);
            continueProcess = confirmedChoice;
            actionTaken = true;
        }
        const dateParent1 = formatDate(day, month, year);
        const dayParent1 = formatDayOfWeek(day, month, year);
        const parent1Content = meta.isValidDay ? parent1 : meta.invalidText || "";
        rows.push({ data: [dayParent1, dateParent1, parent1Content, parent2, parent3], meta });
    }

    const headers = [['Tag', 'Datum', 'Elternteil 1', 'Elternteil 2', 'Elternteil 3']];
    const wantedTableWidth = 160;
    const margin = (pageWidth - wantedTableWidth) / 2;

    doc.autoTable({
        head: headers,
        body: rows.map(row => row.data),
        startY: startY,
        theme: 'grid',
        headStyles: { fillColor: [100, 100, 255] },
        bodyStyles: { halign: 'center' },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 20 },
            2: { cellWidth: 60 },
            3: { cellWidth: 50 },
            4: { cellWidth: 50 }
        },
        margin: { left: margin, right: margin },
        didDrawCell: function(data) {
            if (data.row.section === 'head') return;
            const row = rows[data.row.index];
            if (row.meta.isKitaOpenNoEd && data.column.index === 2) {
                const mergedWidth = data.cell.width + data.table.columns[3].width + data.table.columns[4].width;
                doc.setFillColor(255, 230, 153);
                doc.rect(data.cell.x, data.cell.y, mergedWidth, data.cell.height, 'F');
                doc.setTextColor(50, 50, 50);
                doc.text(row.data[2], data.cell.x + mergedWidth / 2, data.cell.y + data.cell.height / 2, { align: 'center' });
            } else if (!row.meta.isValidDay && data.column.index === 2) {
                const mergedWidth = data.cell.width + data.table.columns[3].width + data.table.columns[4].width;
                doc.setFillColor(255, 204, 204);
                doc.rect(data.cell.x, data.cell.y, mergedWidth, data.cell.height, 'F');
                doc.setTextColor(50, 50, 50);
                doc.text(row.data[2], data.cell.x + mergedWidth / 2, data.cell.y + data.cell.height / 2, { align: 'center' });
            } else if (row.meta.isValidDay && data.row.index % 2 !== 0) {
                doc.setFillColor(245, 245, 245);
                doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                doc.setTextColor(0, 0, 0);
                doc.text(data.cell.text[0], data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { align: 'center' });
            }
        }
    });
    return doc.output('blob');
}
