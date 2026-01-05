import { initialize } from "./create"


window.addEventListener("load", () => {
    const BASE = window.location.pathname.includes("/scheduler-web/") ? "/scheduler-web" : "";
    initialize(`${BASE}/kitashiftplan.html`)
    
})
