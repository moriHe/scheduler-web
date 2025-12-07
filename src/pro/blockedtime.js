import { renderMonthYearSelect } from "../utils/render";
import getText from "../localization"

let selectedDates = { shift1: [], shift2: [], shift3: [] };
window.addEventListener("load", () => {
    initialize("/pro.html");
})
export function initialize(backurl) {
    renderMonthYearSelect();
    setupEventListeners(backurl);
    updateShiftDisplay();
    renderAllCalendars();
}

function setupEventListeners(backurl) {
    document.getElementById("month").addEventListener("change", renderAllCalendars);
    document.getElementById("year").addEventListener("change", renderAllCalendars);
    document.getElementsByName("shifts-per-day").forEach(radio => radio.addEventListener("change", () => {
        updateShiftDisplay();
        renderAllCalendars();
    }));
    document.getElementById("back-button").addEventListener("click", () => window.location.href = backurl);

    document.getElementById("generate-json").addEventListener("click", generateJson);
    document.getElementById("copy-json").addEventListener("click", copyJson);
}

function getShiftCount() {
    const checked = document.querySelector('input[name="shifts-per-day"]:checked');
    return checked ? parseInt(checked.value) : 3;
}

function updateShiftDisplay() {
    const count = getShiftCount();
    const wrapper = document.getElementById("calendars-wrapper");
// Grid-Anpassung
    wrapper.classList.toggle("md:grid-cols-2", count === 2);
    wrapper.classList.toggle("md:grid-cols-3", count === 3);
// Sichtbarkeit
    document.getElementById("shift1-wrapper").style.display = "block";
    document.getElementById("shift2-wrapper").style.display = "block";
    document.getElementById("shift3-wrapper").style.display = count === 3 ? "block" : "none";
}

function renderAllCalendars() {
    const month = parseInt(document.getElementById("month").value);
    const year = parseInt(document.getElementById("year").value);
    const count = getShiftCount();
    ["shift1", "shift2", "shift3"].forEach((shift, idx) => {
        if (idx < count) {
            renderCalendarForShift(shift, month, year);
        }
    });
}

function renderCalendarForShift(shift, month, year) {
    const container = document.getElementById(`calendar-container-${shift}`);
    container.innerHTML = "";
    const daysOfWeek = [getText("daysShort.mo"), getText("daysShort.di"), getText("daysShort.mi"), getText("daysShort.do"), getText("daysShort.fr"), getText("daysShort.sa"), getText("daysShort.so")];
    const header = document.createElement("div"); header.classList.add("calendar");
    daysOfWeek.forEach(d => { const c = document.createElement("div"); c.classList.add("calendar-header"); c.textContent = d; header.appendChild(c); });
    container.appendChild(header);

    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
    const grid = document.createElement("div"); grid.classList.add("calendar");
    for (let i = 0; i < firstDay; i++) grid.appendChild(createEmptyCell());
    const daysInMonth = new Date(year, month+1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${year}-${month+1}-${d}`;
        const cell = document.createElement("div"); cell.classList.add("calendar-day"); cell.textContent = d;
        cell.addEventListener("click", () => toggleDate(shift, dateKey, cell));
        if (selectedDates[shift].includes(dateKey)) cell.classList.add("selected");
        grid.appendChild(cell);
    }
    const total = firstDay + daysInMonth;
    const rem = total % 7;
    if (rem > 0) for (let i = 0; i < 7-rem; i++) grid.appendChild(createEmptyCell());
    container.appendChild(grid);
}

function createEmptyCell() {
    const e = document.createElement("div");
    e.classList.add("calendar-day"); return e;
}

function toggleDate(shift, dateKey, cell) {
    const arr = selectedDates[shift];
    if (arr.includes(dateKey)) {
        selectedDates[shift] = arr.filter(d => d !== dateKey);
        cell.classList.remove("selected");
    } else {
        arr.push(dateKey);
        cell.classList.add("selected");
    }
}

function normalizeISO(s) {
    const [y,m,d] = s.split("-").map(Number);
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function generateJson() {
    const count = getShiftCount();
    const output = {};
    if (count >= 1) output.shift1 = sortDates(selectedDates.shift1);
    if (count >= 2) output.shift2 = sortDates(selectedDates.shift2);
    if (count === 3) output.shift3 = sortDates(selectedDates.shift3);
    document.getElementById("json-output").textContent = JSON.stringify(output, null, 2);
}

async function copyJson() {
    generateJson();
    const text = document.getElementById("json-output").textContent;
    try {
        await navigator.clipboard.writeText(text);
        showToast(getText("blockedtime.copied"));
    } catch(err) { console.error(err); }
}

function sortDates(arr) {
    return [...arr].sort((a,b)=>new Date(normalizeISO(a)) - new Date(normalizeISO(b)));
}

function showToast(msg) {
    const toast = document.createElement("div");
    toast.classList.add(
        "fixed","bottom-4","left-4","bg-green-100","text-green-800",
        "p-4","rounded-lg","shadow-md","opacity-0","transition-opacity",
        "duration-300","z-50","flex","items-center","space-x-2","border","border-green-300"
    );
    const icon = document.createElement("span"); icon.textContent = "✓"; icon.classList.add("text-green-600","font-bold");
    toast.append(icon, document.createElement("span").appendChild(document.createTextNode(msg)));
    document.body.appendChild(toast);
    setTimeout(()=>toast.classList.replace("opacity-0","opacity-100"),10);
    setTimeout(()=>{ toast.classList.replace("opacity-100","opacity-0"); setTimeout(()=>toast.remove(),300); },2000);
}
