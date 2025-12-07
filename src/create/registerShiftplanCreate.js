import { initialize } from "./create"
import getText from "../localization"


function configureHeaders(labelArray, registerEventListener) {
    labelArray.forEach((label, index) => {
        const input = document.getElementById(label);
        input.value = localStorage.getItem(label) || `${getText("create.shift")} ${index + 1}`;
        if (registerEventListener) {
            input.addEventListener('input', () => {
                localStorage.setItem(label, input.value.trim());
            });
        }
    });
}

window.addEventListener("load", () => {
    
    initialize("/shiftplan.html")
    configureHeaders(['twocol-label-1', 'twocol-label-2'], true)
    configureHeaders(['threecol-label-1', 'threecol-label-2', 'threecol-label-3'], true)

    document.getElementById("show-preview-button").addEventListener("click", function () {
        configureHeaders(['twocol-label-1', 'twocol-label-2'], false)
        configureHeaders(['threecol-label-1', 'threecol-label-2', 'threecol-label-3'], false)
    });
})