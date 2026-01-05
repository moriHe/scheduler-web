import { initialize } from "./options"


window.addEventListener("load", () => {
    
    const BASE = window.location.pathname.includes("/scheduler-web/") ? "/scheduler-web" : "";
    initialize(`${BASE}/pro.html`)
})
