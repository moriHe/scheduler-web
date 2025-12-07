const env = (typeof process !== "undefined" && process.env) || {};
const cfg = (typeof window !== "undefined" && window.__IMPRINT) || {};

const nameLine = String(env.IMPRINT_NAME || cfg.IMPRINT_NAME || "").trim();
const addressLines = String(env.IMPRINT_ADDRESS || cfg.IMPRINT_ADDRESS || "")
  .replace(/\\n/g, "\n")
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean);
const noteLine = String(env.IMPRINT_NOTE || cfg.IMPRINT_NOTE || "")
  .replace(/\\n/g, "\n")
  .trim();
const emailLine = String(env.IMPRINT_EMAIL || cfg.IMPRINT_EMAIL || "").trim();
const phoneLine = String(env.IMPRINT_PHONE || cfg.IMPRINT_PHONE || "").trim();

function setLines(id, lines) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = "";
  const content = lines.filter(Boolean);
  if (content.length === 0) {
    el.textContent = "—";
    return;
  }
  content.forEach((line, idx) => {
    if (idx > 0) el.appendChild(document.createElement("br"));
    el.appendChild(document.createTextNode(line));
  });
}

function initImprint() {
  const addressBlock = [...addressLines];
  if (nameLine) addressBlock.unshift(nameLine);
  setLines("imprint-address", addressBlock);
  setLines("imprint-note", noteLine ? [noteLine] : []);

  const contact = [];
  if (emailLine) contact.push(`E-Mail: ${emailLine}`);
  if (phoneLine) contact.push(`Tel: ${phoneLine}`);
  setLines("imprint-contact", contact);
}

if (typeof document !== "undefined") {
  initImprint();
}
