import { initialize } from "./addUser"

// Call loadUsers when the page is loaded
window.addEventListener("load", () => {
  
  const BASE = window.location.pathname.includes("/scheduler-web/") ? "/scheduler-web" : "";
  initialize(`${BASE}/kitashiftplan.html`);
})
