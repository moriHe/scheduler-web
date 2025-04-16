import text from "../localization"
import { getStorageKey } from "../storageKey"

export function initialize(backurl) {
    document.getElementById("back-button").addEventListener("click", () => {
        window.location.href = backurl
    });

    document
        .getElementById("reset-users-button")
        .addEventListener("click", resetUsers);

    document
        .getElementById("upload-users-button")
        .addEventListener("click", uploadUsers);
}

function uploadUsers() {
    const fileInput = document.getElementById("file-input");
    const file = fileInput.files[0];

    if (!file) {
        alert(text.options.chooseFile);
        return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
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
                alert(text.options.duplicates);
                return; // Stop execution if duplicates are found
            }

            // If no duplicates, save the users to localStorage
            localStorage.setItem(getStorageKey(), JSON.stringify(users));
            alert(text.options.uploadSuccess);
        } catch (error) {
            console.log(error)
            alert(text.options.notValidJson);
        }
    };


    reader.readAsText(file);
}

function resetUsers() {
    const confirmReset = confirm(text.options.revert);
    if (confirmReset) {
        localStorage.setItem(getStorageKey(), JSON.stringify([])); // Reset users to an empty array
        alert(text.options.revertSuccess); // Optional: Alert to confirm reset
    }
}
