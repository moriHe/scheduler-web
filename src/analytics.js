const SA_SRC = process.env.SIMPLE_ANALYTICS_SRC || "";
const IS_PROD = process.env.NODE_ENV === "production";

export function loadAnalytics() {
    if (!IS_PROD) return;
    if (!SA_SRC) return;
    if (typeof document === "undefined") return;
    if (document.querySelector('script[data-sa-loader="true"]')) return;

    const s = document.createElement("script");
    s.src = SA_SRC;
    s.async = true;
    s.defer = true;
    s.dataset.saLoader = "true";
    document.head.appendChild(s);
}

// Auto-load when the module is included on a page
loadAnalytics();
