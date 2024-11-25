import { goToStartPageListener } from "/helpers/navigation.js"
import { loadUsers, saveUser } from "./addUser.js"
// Call loadUsers when the page is loaded
window.onload = loadUsers;

// Go to start page
goToStartPageListener();

document.getElementById("save-user-button").addEventListener("click", saveUser);
