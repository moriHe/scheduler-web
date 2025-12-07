import { renderMonthYearSelect } from "../utils/render"
import getText from "../localization"

let selectedDates = [];

export function initialize(backurl) {
    renderMonthYearSelect();
    renderCalendar();

    document.getElementById("month").addEventListener("change", renderCalendar);
    document.getElementById("year").addEventListener("change", renderCalendar);
    document.getElementById("back-button").addEventListener("click", () => {
        window.location.href = backurl;
    });
}

function renderCalendar() {
    const calendarContainer = document.getElementById("calendar-container");
    calendarContainer.innerHTML = "";
    selectedDates = []

    const monthSelect = document.getElementById("month");
    const yearSelect = document.getElementById("year");
    const month = parseInt(monthSelect.value);
    const year = parseInt(yearSelect.value);

    const daysOfWeek = [getText("daysShort.mo"), getText("daysShort.di"), getText("daysShort.mi"), getText("daysShort.do"), getText("daysShort.fr"), getText("daysShort.sa"), getText("daysShort.so")];
    const headerRow = document.createElement("div");
    headerRow.classList.add("calendar");
    daysOfWeek.forEach(day => {
        const headerCell = document.createElement("div");
        headerCell.classList.add("calendar-header");
        headerCell.textContent = day;
        headerRow.appendChild(headerCell);
    });
    calendarContainer.appendChild(headerRow);

    let firstDay = new Date(year, month, 1).getDay();
    firstDay = (firstDay + 6) % 7;

    const grid = document.createElement("div");
    grid.classList.add("calendar");
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement("div");
        emptyCell.classList.add("calendar-day");
        grid.appendChild(emptyCell);
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const dateKey = `${year}-${month + 1}-${day}`;
        const dayCell = document.createElement("div");
        dayCell.classList.add("calendar-day");
        dayCell.textContent = day;

        // Add click event listener for ALL days (including Saturday and Sunday)
        dayCell.addEventListener("click", () => {
            if (selectedDates.includes(dateKey)) {
                selectedDates = selectedDates.filter(date => date !== dateKey);
                dayCell.classList.remove("selected");
            } else {
                selectedDates.push(dateKey);
                dayCell.classList.add("selected");
            }
        });

        if (selectedDates.includes(dateKey)) {
            dayCell.classList.add("selected");
        }
        grid.appendChild(dayCell);
    }

    const totalCells = firstDay + daysInMonth;
    const remainder = totalCells % 7;
    if (remainder > 0) {
        for (let i = 0; i < 7 - remainder; i++) {
            const emptyCell = document.createElement("div");
            emptyCell.classList.add("calendar-day");
            grid.appendChild(emptyCell);
        }
    }

    calendarContainer.appendChild(grid);
}

function normalizeISO(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

document.getElementById("generate-json").addEventListener("click", () => {
    const jsonOutput = document.getElementById("json-output");
    const sortedDates = [...selectedDates]
        .sort((a, b) => new Date(normalizeISO(a)) - new Date(normalizeISO(b)));
    jsonOutput.textContent = JSON.stringify(sortedDates, null, 2);
});

document.getElementById("copy-json").addEventListener("click", async () => {
    const sortedDates = [...selectedDates]
        .sort((a, b) => new Date(normalizeISO(a)) - new Date(normalizeISO(b)));
    const compactJson = JSON.stringify(sortedDates);
    try {
        await navigator.clipboard.writeText(compactJson);

        const toastDiv = document.createElement("div");
        toastDiv.classList.add(
            "fixed", "bottom-4", "left-4", "bg-green-100", "text-green-800",
            "p-4", "rounded-lg", "shadow-md", "opacity-0", "transition-opacity",
            "duration-300", "z-50", "flex", "items-center", "space-x-2",
            "border", "border-green-300"
        );

        const checkIcon = document.createElement("span");
        checkIcon.textContent = "✓";
        checkIcon.classList.add("text-green-600", "font-bold");
        toastDiv.appendChild(checkIcon);

        const toastText = document.createElement("span");
        toastText.textContent = getText("blockedtime.copied");
        toastDiv.appendChild(toastText);

        document.body.appendChild(toastDiv);

        setTimeout(() => {
            toastDiv.classList.remove("opacity-0");
            toastDiv.classList.add("opacity-100");
        }, 10);

        setTimeout(() => {
            toastDiv.classList.remove("opacity-100");
            toastDiv.classList.add("opacity-0");
            setTimeout(() => {
                toastDiv.remove();
            }, 300);
        }, 2000);
    } catch (err) {
        console.error("Failed to copy: ", err);
    }
});
