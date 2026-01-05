import { initialize } from "./addUser.js"


// Call loadUsers when the page is loaded
window.addEventListener("load", () => {
    const BASE = window.location.pathname.includes("/scheduler-web/") ? "/scheduler-web" : "";
    initialize(`${BASE}/shiftplan.html`)
    
})
