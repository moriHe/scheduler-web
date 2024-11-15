export function resetUsers() {
  const confirmReset = confirm(
    "Möchten Sie die Benutzer wirklich zurücksetzen?",
  );
  if (confirmReset) {
    localStorage.setItem("users", JSON.stringify([])); // Reset users to an empty array
    alert("Benutzer wurden zurückgesetzt."); // Optional: Alert to confirm reset
  }
}
// Reset users in localStorage
document
  .getElementById("reset-users-button")
  .addEventListener("click", resetUsers);

// Go back to the front page
document.getElementById("back-button").addEventListener("click", () => {
  window.location.href = "../index.html"; // Navigate back to index.html
});

// Upload users from a JSON file
document
  .getElementById("upload-users-button")
  .addEventListener("click", () => {
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
            "Es gibt doppelte Benutzernamen in der Datei. Bitte entfernen Sie die Duplikate und versuchen Sie es erneut.",
          );
          return; // Stop execution if duplicates are found
        }

        // If no duplicates, save the users to localStorage
        localStorage.setItem("users", JSON.stringify(users));
        alert("Benutzer wurden erfolgreich hochgeladen.");
      } catch (error) {
        console.log(error)
        alert(
          "Fehler beim Verarbeiten der Datei. Stellen Sie sicher, dass es sich um eine gültige JSON-Datei handelt.",
        );
      }
    };

    reader.readAsText(file);
  });
