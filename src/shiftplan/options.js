export function uploadUsers() {
    const fileInput = document.getElementById("file-input");
    const file = fileInput.files[0];

    if (!file) {
        alert("Bitte wählen Sie eine JSON-Datei aus.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            let users = JSON.parse(event.target.result);

            if (!Array.isArray(users)) {
                throw new Error("Uploaded data is not an array.");
            }

            users = users
                .map((user) => user.trim())
                .filter((user) => user.length > 0);

            // Check for duplicates
            const uniqueUsers = new Set(users);
            if (uniqueUsers.size !== users.length) {
                alert(
                    "Es gibt doppelte Personennamen in der Datei. Bitte entfernen Sie die Duplikate und versuchen Sie es erneut.",
                );
                return; // Stop execution if duplicates are found
            }

            // If no duplicates, save the users to localStorage
            localStorage.setItem("shiftplanUsers", JSON.stringify(users));
            alert("Personen wurden erfolgreich hochgeladen.");
        } catch (error) {
            console.log(error)
            alert(
                "Fehler beim Verarbeiten der Datei. Stellen Sie sicher, dass es sich um eine gültige JSON-Datei handelt.",
            );
        }
    };


    reader.readAsText(file);
}

export function resetUsers() {
    const confirmReset = confirm(
        "Möchten Sie die Personen wirklich zurücksetzen?",
    );
    if (confirmReset) {
        localStorage.setItem("shiftplanUsers", JSON.stringify([])); // Reset users to an empty array
        alert("Personen wurden zurückgesetzt."); // Optional: Alert to confirm reset
    }
}
