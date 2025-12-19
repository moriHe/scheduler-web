# Scheduler Web

## Private project
Started as a parent duty scheduler, then expanded to three shifts per day with one to three people per shift.

## Features
- Choose between two or three shifts per day.
- With the normal shiftplan you can add one person per shift (or any string value you put in there)
- With the pro shiftplan you can add one to three person per shift per day.
- Automatically warns you if a person marked a shift as not available.

## Development
- If Parcel errors, clear its cache: `npx parcel cache clean`
- Build: `npm run build` (obfuscation runs afterwards automatically; otherwise run `npm run postbuild`)
- Preview dist: `npm run preview`

## Scheduler Web Setup (private project)
- Prereqs: Node 20+ and npm; no backend needed (static Parcel app).
- Install deps: npm install.
- Dev server: npm start (Parcel, defaults to http://localhost:1234).
