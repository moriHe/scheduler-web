import { resetUsers, uploadUsers } from "./options.js"
import { goToStartPageListener } from "/helpers/navigation.js"

// Back to start page
goToStartPageListener();

// Reset users in localStorage
document
  .getElementById("reset-users-button")
  .addEventListener("click", resetUsers);

// Upload users from JSON file
document
  .getElementById("upload-users-button")
  .addEventListener("click", uploadUsers);
