#!/usr/bin/env node
const required = [
  "SIMPLE_ANALYTICS_SRC",
  "IMPRINT_NAME",
  "IMPRINT_ADDRESS",
  "IMPRINT_NOTE",
  "IMPRINT_EMAIL",
  "IMPRINT_PHONE",
];

const missing = required.filter((key) => {
  const val = process.env[key];
  return typeof val !== "string" || val.trim() === "";
});

if (missing.length) {
  console.error(
    `[check-env] Missing required environment variables: ${missing.join(", ")}`
  );
  process.exit(1);
}

console.log("[check-env] All required environment variables are set.");
