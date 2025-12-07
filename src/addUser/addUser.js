import { getStorageKey } from "../storageKey";
import getText from "../localization"

export function initialize(backurl) {
  loadUsers();
  document.getElementById("save-user-button").addEventListener("click", saveUser);
  // Go back to the front page
  document.getElementById("back-button").addEventListener("click", () => {
    window.location.href = backurl;
  });
}

// Function to load users and display them as tiles
function loadUsers() {
  const userList = document.getElementById("user-list");
  userList.innerHTML = ""; // Clear the list first

  // Load users from localStorage
  const usersJson = localStorage.getItem(getStorageKey()); // Get the users JSON string
  let users = [];

  // Parse the JSON string into an array
  if (usersJson) {
    try {
      users = JSON.parse(usersJson); // Parse the JSON string
    } catch (error) {
      console.error("Error parsing JSON from localStorage:", error);
    }
  }

  // Add each user to the list as a tile
  if (Array.isArray(users)) {
    // Check if users is an array
    users
      .sort((a, b) => a.localeCompare(b))
      .forEach((user) => {
        const userTile = document.createElement("div");

        const userName = document.createElement("span");
        userName.textContent = user; // Display the user's name
        userTile.appendChild(userName);

        // Create delete button
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "🗑️"; // Trash icon
        deleteButton.classList.add("delete-button"); // Kein style. Für Testzwecke vorhanden
        deleteButton.onclick = () => deleteUser(user);
        userTile.appendChild(deleteButton);

        userList.appendChild(userTile);
      });
  } else {
    console.error("Loaded users is not an array:", users);
  }
}

// Function to delete a user
function deleteUser(userName) {
  // Load current users from localStorage
  const usersJson = localStorage.getItem(getStorageKey());
  let users = [];

  if (usersJson) {
    try {
      users = JSON.parse(usersJson); // Parse the JSON string
    } catch (error) {
      console.error(
        "Error parsing JSON from localStorage during deletion:",
        error,
      );
    }
  }

  // Filter out the user to delete
  users = users.filter((user) => user !== userName);

  // Save the updated users back to localStorage
  localStorage.setItem(getStorageKey(), JSON.stringify(users));

  loadUsers(); // Reload the users after deleting
}

export function saveUser() {
  const userName = document.getElementById("user-name").value.trim(); // Trim whitespace
  if (userName) {
    // Load current users from localStorage
    const usersJson = localStorage.getItem(getStorageKey());
    let users = [];

    if (usersJson) {
      try {
        users = JSON.parse(usersJson); // Parse the JSON string
      } catch (error) {
        console.error(
          "Error parsing JSON from localStorage during saving:",
          error,
        );
      }
    }

    // Check if the user already exists
    if (users.includes(userName)) {
      alert(getText("addUser.alreadyExists"));
    } else {
      // Add the new user to the list
      users.push(userName);

      // Save the updated users back to localStorage
      localStorage.setItem(getStorageKey(), JSON.stringify(users));

      document.getElementById("user-name").value = ""; // Clear the input
      loadUsers(); // Reload the users after saving
    }
  }
}
