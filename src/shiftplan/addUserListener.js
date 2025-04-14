import { loadUsers, saveUser } from "./addUser.js"
// Call loadUsers when the page is loaded
window.onload = loadUsers;

// Go back to the front page
document.getElementById("back-button").addEventListener("click", () => {
    window.location.href = "/shiftplan.html"; // Navigate back to shiftplan.html
});

document.getElementById("save-user-button").addEventListener("click", saveUser);
