import text from "../localization";
import { displayError } from "../utils/render";

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

// Helper functions zur Prüfung der Tage
function isKitaOpenNoEd(year, month, day, kitaOpenNoEd) {
    const formattedDate = `${year}-${month}-${day}`;
    return kitaOpenNoEd.includes(formattedDate);
}

function isHoliday(year, month, day, holidays) {
    const formattedDate = `${year}-${month}-${day}`;
    return holidays.includes(formattedDate);
}

function isTeamDay(year, month, day, teamdays) {
    const formattedDate = `${year}-${month}-${day}`;
    return teamdays.includes(formattedDate);
}

function isValidWeekday(year, month, day, weekdays) {
    const date = new Date(year, month - 1, day);
    const weekday = date.toLocaleDateString('en-US', {weekday: 'long'});
    return weekdays.includes(weekday);
}

// Berechne die Anzahl der Tage, an denen ein Dienst stattfindet
function calcUniqueServiceDays(year, month, daysInMonth, kitaOpenNoEd, holidays, weekdays) {
    let total = 0;
    for (let day = 1; day <= daysInMonth; day++) {
        // Skip days where Kita is open without education,
        // invalid weekdays, or holidays in one combined check
        if (isKitaOpenNoEd(year, month, day, kitaOpenNoEd) || !isValidWeekday(year, month, day, weekdays) || isHoliday(year, month, day, holidays)) {
            continue;
        }
        total++;
    }
    return total;
}

function isUserAvailable(user, dateString) {
    return !user.not_available.includes(dateString);
}

function getAvailableUsersForDay(year, month, day, localUsers) {
    const dateString = `${year}-${month}-${day}`;
    return localUsers.filter(user => isUserAvailable(user, dateString));
}

function pickUsers(usersSortedByPrio, requiredCount) {
    const picks = usersSortedByPrio.slice(0, requiredCount);
    while (picks.length < requiredCount) {
        picks.push({name: text.create.notSet});
    }
    return picks;
}

export function assignUsersCalendar(month, year, localUsers, options = {}, cols) {
    const calendar = {}; // Kalenderspeicher
    const {
        weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        holidays = [],
        kitaOpenNoEd = [],
        teamdays = []
    } = options;

    const daysInMonth = new Date(year, month, 0).getDate();
    const uniqueServiceDays = calcUniqueServiceDays(year, month, daysInMonth, kitaOpenNoEd, holidays, weekdays);
    // Anpassen: Berechne den Durchschnitt anhand von 3 Schicht-Spalten (statt 2)
    // #Duplicate von oben bis hier.
    // # 3 mit arg ersetzen
    const averageServiceCount = Math.floor(uniqueServiceDays * cols / localUsers.length);

    // Kopiere und erweitere die Nutzer-Daten
    const _users = [...localUsers].map((user) => {
        const cleanedNotAvailableArray = user["not_available"].filter((date) => {
            const extractedDay = date.split("-")[2];
            if (extractedDay === undefined) return false
            if (isHoliday(year, month, extractedDay, holidays)) return false
            if (isKitaOpenNoEd(year, month, extractedDay, kitaOpenNoEd)) return false
            return isValidWeekday(year, month, extractedDay, weekdays);
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
        const parents = Array(cols).fill("")
        if (isKitaOpenNoEd(year, month, day, kitaOpenNoEd)) {
            calendar[day] = {isKitaOpenNoEd: true, isValidDay: false, isAssigned: false, parents};
            continue;
        }
        if (!isValidWeekday(year, month, day, weekdays) || isHoliday(year, month, day, holidays)) {
            calendar[day] = {isKitaOpenNoEd: false, isValidDay: false, isAssigned: false, parents};
            continue;
        }

        const availableUsers = getAvailableUsersForDay(year, month, day, _users);
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

        const requiredCount = isTeamDay(year, month, day, teamdays) ? cols - 1 : cols;
        const selected = pickUsers(usersSortedByPrio, requiredCount);
        const specificPerson = isTeamDay(year, month, day, teamdays) ? options.specificPerson : undefined;
        calendar[day] = {
            isKitaOpenNoEd: false,
            isValidDay: true,
            specificPerson,
            isAssigned: usersSortedByPrio.length >= requiredCount,
            parents: selected.map((parent) => parent.name)
        }

        selected.forEach(user => {
            if (user.name !== text.create.notSet) {
                updateUsersArray(_users, averageServiceCount, true, user);
            }
        });

        if (usersSortedByPrio.length >= requiredCount) {
            const names = selected.map(u => u.name);
            const dup = names.find((n, i) => names.indexOf(n) !== i);
            if (dup) {
                displayError(text.create.shouldNotHappen);
                throw new Error("Duplicate users in data set");
            }
        }
    }
    return calendar;
}