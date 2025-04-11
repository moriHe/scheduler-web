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



function updateUsersArray(_users, averageServiceCount, hasEnoughUsers, selectedUser) {
  if (hasEnoughUsers) {
    _users.forEach((user) => {
      if (user.name === selectedUser.name) {
        const newServiceCount = user.serviceCount + 1
        let newPrio
        if (newServiceCount >= averageServiceCount) {
          newPrio = 1000
        } else if (user.prioOffsetFactor === 0) {
          newPrio = -1000
        } else {
          newPrio = 10 * user.prioOffsetFactor
        }
        user.prio = newPrio
        user.serviceCount = newServiceCount
      } else {
        user.prio = user.prio === 1000 ? 1000 : user.prio === -1000 ? -1000 : user.prio - 10
      }
    })
  }
}


export function testAssignUsersToCalendar(month, year, localUsers, options = {}) {
  function isKitaOpenNoEd(date) {
    const formattedDate = `${year}-${month}-${date}`;
    return kitaOpenNoEd.includes(formattedDate);
  }

  // Helper function to check if a day is a holiday
  function isHoliday(date) {
    const formattedDate = `${year}-${month}-${date}`;
    return holidays.includes(formattedDate);
  }

  function isTeamDay(date) {
    const formattedDate = `${year}-${month}-${date}`;
    return teamdays.includes(formattedDate);
  }

  // Helper function to check if a day is within the valid weekdays
  function isValidWeekday(day) {
    const date = new Date(year, month - 1, day);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });

    return weekdays.includes(weekday);
  } function calcUniqueServiceDays() {
    let total = 0;


    for (let day = 1; day <= daysInMonth; day++) {
      if (isKitaOpenNoEd(day)) {
        continue;

      }
      else if (!isValidWeekday(day) || isHoliday(day)) {
        continue;
      }
      else if (isTeamDay(day)) {
        // das eigentlich nicht ganz richtig
        total = total + 1
      } else {
        total = total + 1
      }
    }
    return total
  }

  const calendar = {}; // To store the user assignments per day
  const { weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], holidays = [], kitaOpenNoEd = [], teamdays = [] } = options;

  function isUserAvailable(user, date) {
    const formattedDate = `${year}-${month}-${date}`;
    return !user.not_available.includes(formattedDate);
  }
  function getAvailableUsersForDay(day, localUsers) {
    return localUsers
      .filter(user => isUserAvailable(user, day)) // Filter users who are available for the day
  }
  const daysInMonth = new Date(year, month, 0).getDate(); // Get the number of days in the month
  const uniqueServiceDays = calcUniqueServiceDays(daysInMonth, month, year, options)
  const oneFourthUniqueServices = uniqueServiceDays / 4
  const halfUniqueServices = uniqueServiceDays / 2
  const _users = [...localUsers].map((user) => {
    const availableTotal = uniqueServiceDays - user["not_available"].length
    const prioOffsetFactor = availableTotal <= oneFourthUniqueServices ? 0 :
      availableTotal <= halfUniqueServices ? 2 : 1
    return {
      ...user,
      serviceCount: 0,
      prioOffsetFactor,
      // the lower the number the higher the chance to be picked
      prio: availableTotal <= oneFourthUniqueServices ? -1000 : -10 * prioOffsetFactor
    }
  })

  const averageServiceCount = Math.floor(uniqueServiceDays * 2 / localUsers.length)

  for (let day = 1; day <= daysInMonth; day++) {
    // Skip the day if it's a holiday or not a valid weekday
    if (isKitaOpenNoEd(day)) {
      calendar[day] = ["", "", { isKitaOpenNoEd: true, isValidDay: false, isAssigned: false }]
      continue;

    }
    if (!isValidWeekday(day) || isHoliday(day)) {
      calendar[day] = ["", "", { isKitaOpenNoEd: false, isValidDay: false, isAssigned: false }]
      continue;
    }

    const availableUsers = getAvailableUsersForDay(day, _users);
    const usersSortedByPrio = availableUsers.sort((a, b) => {
      // First, sort by prio in ascending order
      // INFO: This if statement adds some randomness. If it messes up the calculation, remove it.
      if (a.serviceCount === b.serviceCount && a.prioOffsetFactor === 1 && b.prioOffsetFactor === 1) {
        return Math.random() < 0.5 ? -1 : 1
      }
      if (a.prio < b.prio) {
        return -1; // a comes before b
      }
      if (a.prio > b.prio) {
        return 1; // b comes before a
      }

      // If prio is the same, sort by serviceCount in ascending order
      if (a.serviceCount < b.serviceCount) {
        return -1; // a comes before b
      }
      if (a.serviceCount > b.serviceCount) {
        return 1; // b comes before a
      }
      return Math.random() < 0.5 ? -1 : 1; // If both prio and serviceCount are the same, keep original order
    })

    if (isTeamDay(day)) {
      const hasEnoughUsers = usersSortedByPrio.length >= 1

      const selectedUser = hasEnoughUsers ? usersSortedByPrio[0] : { name: "NOT SET" }// Get the first available user
      calendar[day] = [selectedUser.name, 'Team', { isKitaOpenNoEd: false, isValidDay: true, isAssigned: hasEnoughUsers }]; // Assign user and "Team" for the second slot
      updateUsersArray(_users, averageServiceCount, hasEnoughUsers, selectedUser);
    } else {
      const hasEnoughUsers = usersSortedByPrio.length >= 2
      const hasOneUser = usersSortedByPrio.length === 1

      let selectedUsers
      if (hasEnoughUsers) selectedUsers = usersSortedByPrio.slice(0, 2)
      else if (hasOneUser) selectedUsers = [usersSortedByPrio[0], { name: "NOT SET" }]
      else selectedUsers = [{ name: "NOT SET" }, { name: "NOT SET" }]

      if (hasEnoughUsers && selectedUsers[0].name === selectedUsers[1].name) {
        displayError(`Some dataset duplication that should not happen. Please reach out to the code maintainer.`);
        throw new Error(`Duplicate users in data set`);
      }

      // Assign these users to the calendar for the current day
      calendar[day] = [...selectedUsers.map(user => user.name), { isKitaOpenNoEd: false, isValidDay: true, isAssigned: hasEnoughUsers }];
      if (hasEnoughUsers) {
        updateUsersArray(_users, averageServiceCount, true, selectedUsers[0])
        updateUsersArray(_users, averageServiceCount, true, selectedUsers[1])
      }
      if (hasOneUser) {
        updateUsersArray(_users, averageServiceCount, true, selectedUsers[0])
      }
    }
  }
  return calendar
}

// Function to assign users to calendar
export function assignUsersToCalendar(month, year, users, options = {}) {
  const daysInMonth = new Date(year, month, 0).getDate(); // Get the number of days in the month
  const calendar = {}; // To store the user assignments per day
  const userPinnedCount = {}; // To track how many days each user is pinned

  shuffleArray(users); // Randomize users

  // Set default options for weekdays and holidays
  const { weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], holidays = [], kitaOpenNoEd = [], teamdays = [] } = options;

  // Initialize pinned count for each user to 0
  users.forEach(user => {
    userPinnedCount[user.name] = 0;
  });

  // Helper function to check if a user is available on a particular day
  function isUserAvailable(user, date) {
    const formattedDate = `${year}-${month}-${date}`;
    return !user.not_available.includes(formattedDate);
  }

  function isKitaOpenNoEd(date) {
    const formattedDate = `${year}-${month}-${date}`;
    return kitaOpenNoEd.includes(formattedDate);
  }

  // Helper function to check if a day is a holiday
  function isHoliday(date) {
    const formattedDate = `${year}-${month}-${date}`;
    return holidays.includes(formattedDate);
  }

  function isTeamDay(date) {
    const formattedDate = `${year}-${month}-${date}`;
    return teamdays.includes(formattedDate);
  }

  // Helper function to check if a day is within the valid weekdays
  function isValidWeekday(day) {
    const date = new Date(year, month - 1, day);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });

    return weekdays.includes(weekday);
  }

  // Helper function to get the least pinned available users
  function getAvailableUsersForDay(day) {
    return users
      .filter(user => isUserAvailable(user, day)) // Filter users who are available for the day
      .sort((a, b) => {
        // Get the pinned counts for both users
        const countA = userPinnedCount[a.name];
        const countB = userPinnedCount[b.name];

        // Compare pinned counts
        if (countA > countB) {
          return 1; // a should come after b
        } else if (countA < countB) {
          return -1; // a should come before b
        } else {
          return 0;
        }
      });

  }

  // Iterate over each day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    // Skip the day if it's a holiday or not a valid weekday
    if (isKitaOpenNoEd(day)) {
      calendar[day] = ["", "", { isKitaOpenNoEd: true, isValidDay: false, isAssigned: false }]
      continue;

    }
    if (!isValidWeekday(day) || isHoliday(day)) {
      calendar[day] = ["", "", { isKitaOpenNoEd: false, isValidDay: false, isAssigned: false }]
      continue;
    }

    const availableUsers = getAvailableUsersForDay(day);

    if (isTeamDay(day)) {
      const hasEnoughUsers = availableUsers.length >= 1

      const selectedUser = hasEnoughUsers ? availableUsers[0] : { name: "NOT SET" }// Get the first available user
      calendar[day] = [selectedUser.name, 'Team', { isKitaOpenNoEd: false, isValidDay: true, isAssigned: hasEnoughUsers }]; // Assign user and "Team" for the second slot
      hasEnoughUsers && userPinnedCount[selectedUser.name]++; // Increment the pinned count for the selected user

    } else {
      const hasEnoughUsers = availableUsers.length >= 2
      const hasOneUser = availableUsers.length === 1

      let selectedUsers
      if (hasEnoughUsers) selectedUsers = availableUsers.slice(0, 2)
      else if (hasOneUser) selectedUsers = [availableUsers[0], { name: "NOT SET" }]
      else selectedUsers = [{ name: "NOT SET" }, { name: "NOT SET" }]

      if (hasEnoughUsers && selectedUsers[0].name === selectedUsers[1].name) {
        displayError(`Some dataset duplication that should not happen. Please reach out to the code maintainer.`);
        throw new Error(`Duplicate users in data set`);
      }

      // Assign these users to the calendar for the current day
      calendar[day] = [...selectedUsers.map(user => user.name), { isKitaOpenNoEd: false, isValidDay: true, isAssigned: hasEnoughUsers }];

      // Increment the pinned count for each selected user
      hasEnoughUsers && selectedUsers.forEach(user => {
        userPinnedCount[user.name]++;
      });
    }
  }

  return calendar;
}

// Helper function to format the date in the "1. Okt. Dienstag" format
export function formatDate(day, month, year) {
  const date = new Date(year, month - 1, day);
  return window.dateFns.format(date, 'dd.MM', { locale: window.dateFns.locale.de });
}

// Helper function to get day of the week as "Mo, Di, Mi" etc.
export function formatDayOfWeek(day, month, year) {
  const date = new Date(year, month - 1, day);
  const formattedDay = window.dateFns.format(date, 'EE', { locale: window.dateFns.locale.de });
  return formattedDay.endsWith(".") ? formattedDay.slice(0, -1) : formattedDay; // Format as short day, e.g., "Mo" for Monday
}


export function generatePDF(calendar, month, year, usersData = []) {
  const { jsPDF } = window.jspdf; // Zugriff auf jsPDF aus window
  const doc = new jsPDF();

  // Titel und Untertitel zentrieren
  doc.setFontSize(16);
  doc.text('Elterndienstplan', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
  doc.setFontSize(12);
  doc.text(
      `${window.dateFns.format(new Date(year, month - 1), 'MMMM yyyy', { locale: window.dateFns.locale.de })}`,
      doc.internal.pageSize.getWidth() / 2,
      22,
      { align: 'center' }
  );

  const legendStartY = 28;
  const pageWidth = doc.internal.pageSize.getWidth();
  const legendLeftMargin = (pageWidth - 150) / 2; // Annahme: 150 ist die Gesamtbreite der Legende
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

  // Erzeugen der Zeilen-Daten aus dem Kalender
  for (const day in calendar) {
    const [parent1, parent2, meta] = calendar[day];
    const isUser1InDataSet = usersData.find((user) => user === parent1);
    const isUser2InDataSet = usersData.find((user) => user === parent2) || parent2 === "Team";

    if (continueProcess && !actionTaken && meta.isValidDay && !isUser1InDataSet && !isUser2InDataSet) {
      const confirmedChoice = confirm(`User nicht im Datenset gefunden an der Stelle: ${parent1}, ${parent2}. Trotzdem fortfahren?`);
      if (!confirmedChoice) {
        // Abbruch der PDF-Erzeugung, falls der Benutzer ablehnt
        return;
      }
      actionTaken = true;
    }

    const dateStr = formatDate(day, month, year);
    const dayStr = formatDayOfWeek(day, month, year);
    // Bei gültigen Tagen wird der Inhalt aus der ersten Spalte übernommen,
    // andernfalls später im Mapping ein fixer Text (über die volle Breite der letzten beiden Spalten) gesetzt.
    const normalShiftText = meta.isValidDay ? parent1 : "";
    // Wir speichern immer 4 Zellen (Tag, Datum, Elternteil 1 und Elternteil 2)
    rows.push({ data: [dayStr, dateStr, normalShiftText, parent2], meta });
  }

  if (!continueProcess) return;

  // Neuer Body‑Array, der für spezielle Tage (nicht valide oder KitaOpenNoEd) die letzten beiden Spalten zusammenführt:
  const tableBody = rows.map(row => {
    if (!row.meta.isValidDay || row.meta.isKitaOpenNoEd) {
      let specialText = row.meta.invalidText ?? "";
      let fillColor;
      if (row.meta.isKitaOpenNoEd) {
        fillColor = [255, 230, 153]; // Gelb
      } else {
        fillColor = [255, 204, 204]; // Rot
      }
      // Hier bleiben die ersten beiden Zellen (Tag und Datum) unverändert,
      // die letzten beiden Spalten werden in einer Zelle mit colSpan: 2 zusammengeführt.
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
      return row.data;
    }
  });

  // Überschrift der Tabelle
  const headers = [['Tag', 'Datum', 'Elternteile 1', 'Elternteile 2']];

  // Definierte Gesamttabellenbreite (z. B. 160) und Zentrierung anhand der Seitenbreite
  const wantedTableWidth = 160;
  const margin = (pageWidth - wantedTableWidth) / 2;

  // Aufruf von autoTable zur Erzeugung der Tabelle
  doc.autoTable({
    head: headers,
    body: tableBody,
    startY: startY,
    theme: 'grid',
    headStyles: { fillColor: [100, 100, 255] },
    bodyStyles: { halign: 'center' },
    columnStyles: {
      0: { cellWidth: 10 }, // Tag
      1: { cellWidth: 20 }, // Datum
      2: { cellWidth: 70 }, // Elternteil 1 (bzw. kombiniert, falls colSpan)
      3: { cellWidth: 60 }  // Elternteil 2 (wird bei speziellen Zeilen zusammengeführt)
    },
    margin: { left: margin, right: margin }
  });

  return doc.output('blob'); // Rückgabe des generierten PDF als Blob
}
