import { initialize } from "./options.js"


window.addEventListener("load", () => {
    const BASE = window.location.pathname.includes("/scheduler-web/") ? "/scheduler-web" : "";
    initialize(`${BASE}/shiftplan.html`)
})
