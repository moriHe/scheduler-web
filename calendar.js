// Function to assign users to calendar
export function assignUsersToCalendar(month, year, users, options = {}) {
    const daysInMonth = new Date(year, month, 0).getDate(); // Get the number of days in the month
    const calendar = {}; // To store the user assignments per day
    const userPinnedCount = {}; // To track how many days each user is pinned

    // Set default options for weekdays and holidays
    const { weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], holidays = [], teamdays = [] } = options;

    // Initialize pinned count for each user to 0
    users.forEach(user => {
        userPinnedCount[user.name] = 0;
    });

    // Helper function to check if a user is available on a particular day
    function isUserAvailable(user, date) {
        const formattedDate = `${year}-${month}-${date}`;
        return !user.not_available.includes(formattedDate);
    }

    // Helper function to check if a day is a holiday
    function isHoliday(date) {
        const formattedDate = `${year}-${month}-${date}`;
        return holidays.includes(formattedDate);
    }

    function isTeamDay(date) {
        const formattedDate = `${year}-${month}-${date}`;
        return teamdays.includes(formattedDate) 
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
            .sort((a, b) => userPinnedCount[a.name] - userPinnedCount[b.name]); // Sort by how many times they've been pinned
    }

    // Iterate over each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
        // Skip the day if it's a holiday or not a valid weekday
        if (!isValidWeekday(day) || isHoliday(day)) {
            calendar[day] = ["", ""]
            continue;
        }

        const availableUsers = getAvailableUsersForDay(day);

        if (isTeamDay(day)) {
            // If it's a team day, assign one user and mark the second slot as "Team"
            if (availableUsers.length < 1) {
                throw new Error(`No available users for team day ${day}`);
            }

            const selectedUser = availableUsers[0]; // Get the first available user
            calendar[day] = [selectedUser.name, 'Team']; // Assign user and "Team" for the second slot
            userPinnedCount[selectedUser.name]++; // Increment the pinned count for the selected user

        } else {
            // If fewer than 2 users are available for the day, we cannot assign it properly
            if (availableUsers.length < 2) {
                throw new Error(`Not enough users available for day ${day}`);
            }

            // Pick the top two least pinned users for the day
            const selectedUsers = availableUsers.slice(0, 2);

            // Assign these users to the calendar for the current day
            calendar[day] = selectedUsers.map(user => user.name);

            // Increment the pinned count for each selected user
            selectedUsers.forEach(user => {
                userPinnedCount[user.name]++;
            });
        }
    }

    return calendar;
}
            // Helper function to format the date in the "1. Okt. Dienstag" format
            function formatDate(day, month, year) {
                const date = new Date(year, month - 1, day);
                // { locale: window.dateFns.locale.de }
                return window.dateFns.format(date, 'dd.MM');
            }

            // Helper function to get day of the week as "Mo, Di, Mi" etc.
            function formatDayOfWeek(day, month, year) {
                const date = new Date(year, month - 1, day);
                // { locale: window.dateFns.locale.de }
                const formattedDay = window.dateFns.format(date, 'EE');
                return formattedDay.endsWith(".") ? formattedDay.slice(0, -1) : formattedDay; // Format as short day, e.g., "Mo" for Monday
            }

            export function generatePDF(calendar, month, year, filePath, excludedDays, holidays) {
                console.log(window);
                const { jsPDF } = window.jspdf; // Access jsPDF from window

                // Create a new jsPDF document
                const doc = new jsPDF();

                // Add a title
                doc.setFontSize(18);
                doc.text('Elterndienstplan', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

                doc.setFontSize(14);
                doc.text(`${window.dateFns.format(new Date(year, month - 1), 'MMMM yyyy')}`, doc.internal.pageSize.getWidth() / 2, 30, { align: 'center' });

                // Add some space
                let startY = 40;

                // Prepare the rows for the table
                const rows = [];
                for (const day in calendar) {
                    const [parent1, parent2] = calendar[day];
                    const dateParent1 = `${formatDate(day, month, year)}`;
                    const dayParent1 = `${formatDayOfWeek(day, month, year)}`;
                    const dateParent2 = parent2 === "" ? "" : `${formatDate(day, month, year)}`;
                    const dayParent2 = parent2 === "" ? "" : `${formatDayOfWeek(day, month, year)}`;

                    rows.push([dayParent1, dateParent1, parent1, dayParent2, dateParent2, parent2]);
                }

                // Prepare the headers
                const headers = [['Tag', 'Datum', 'Elternpaar 1', 'Tag', 'Datum', 'Elternpaar 2']];

                // Use jsPDF AutoTable to generate the table
                doc.autoTable({
                    head: headers,
                    body: rows,
                    startY: startY,
                    theme: 'grid',
                    headStyles: { fillColor: [100, 100, 255] },
                    bodyStyles: {
                        halign: 'center', // Horizontally center text in the cells
                    },
                    columnStyles: {
                        0: { cellWidth: 20 },
                        1: { cellWidth: 30 },
                        2: { cellWidth: 70 },
                        3: { cellWidth: 20 },
                        4: { cellWidth: 30 },
                        5: { cellWidth: 70 }
                    },
                    didDrawCell: function (data) {
                        const row = rows[data.row.index];
                        if (row[2] === "" && row[5] === "") {
                            // Highlight the row for holidays or empty slots
                            doc.setFillColor(255, 204, 204); // Light red color
                            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                            doc.setTextColor(128); // Set text to light gray
                        }
                    }
                });

                // Save the generated PDF to a file
                doc.save(filePath);
            }
