export function renderMonthYearSelect() {
    const yearSelect = document.getElementById("year");
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = "";
    for (let i = currentYear; i <= currentYear + 10; i++) {
        const option = document.createElement("option");
        option.value = i.toString();
        option.textContent = i.toString();
        yearSelect.appendChild(option);
    }
    const today = new Date();
    const nextMonth = (today.getMonth() + 1) % 12;
    const nextYear = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
    document.getElementById("month").value = nextMonth;
    yearSelect.value = nextYear;
}


// Function to display error messages
export function displayError(message) {
    const errorMessageElement = document.getElementById('error-message');
    errorMessageElement.textContent = message;
    errorMessageElement.classList.remove('hidden'); // Show the error message
    setTimeout(() => {
        errorMessageElement.classList.add('hidden'); // Hide the error message after 5 seconds
    }, 5000);
}