import { resetUsers, uploadUsers } from "./options.js"

// Back to start page
document.getElementById("back-button").addEventListener("click", () => {
  window.location.href = "/index.html"; // Navigate back to index.html
});

// Reset users in localStorage
document
  .getElementById("reset-users-button")
  .addEventListener("click", resetUsers);

// Upload users from JSON file
document
  .getElementById("upload-users-button")
  .addEventListener("click", uploadUsers);
