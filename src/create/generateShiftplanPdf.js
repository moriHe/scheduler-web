import getText from "../localization"
// Get the error message display element

// Helper function to format the date (z.B. "01.10")
export function formatDate(day, month, year) {
    const date = new Date(year, month - 1, day);
    return window.dateFns.format(date, 'dd.MM', {locale: window.dateFns.locale.de});
}

// Helper function, um den Wochentag (z.B. "Mo") zu formatieren
export function formatDayOfWeek(day, month, year) {
    const date = new Date(year, month - 1, day);
    const formattedDay = window.dateFns.format(date, 'EE', {locale: window.dateFns.locale.de});
    return formattedDay.endsWith(".") ? formattedDay.slice(0, -1) : formattedDay;
}

function getHeaders(isKita, cols) {
    if (isKita || cols === 2) {
        const schicht1 = isKita ? `${getText("create.family")} 1` : localStorage.getItem('twocol-label-1') || `${getText("create.shift")} 1`;
        const schicht2 = isKita ? `${getText("create.family")} 2` : localStorage.getItem('twocol-label-2') || `${getText("create.shift")} 2`;
        return [[getText("create.day"), getText("create.date"), schicht1, schicht2]]
    }
    // Überschrift der Tabelle (Header) – hier bleiben wir bei 5 Zellen, da autoTable Body-Zeilen über colSpan korrekt zusammenführt.
    const schicht1 = localStorage.getItem('threecol-label-1') || `${getText("create.shift")} 1`;
    const schicht2 = localStorage.getItem('threecol-label-2') || `${getText("create.shift")} 2`;
    const schicht3 = localStorage.getItem('threecol-label-3') || `${getText("create.shift")} 3`;

    return [[getText("create.day"), getText("create.date"), schicht1, schicht2, schicht3]];
}

/**
 * Erzeugt das PDF des Elterndienstplans. Dabei wird der Kalender (mit 3 Spalten) in eine Tabelle konvertiert.
 */
export function generateShiftplanPdf(calendar, month, year, usersData = [], isKita, cols) {
    const {jsPDF} = window.jspdf;
    const doc = new jsPDF();

    // Titel und Untertitel zentrieren
    const title = isKita ? getText("create.kitashiftplan") : getText("create.shiftplan")

    doc.setFontSize(16);
    doc.text(title, doc.internal.pageSize.getWidth() / 2, 15, {align: 'center'});
    doc.setFontSize(12);
    doc.text(`${window.dateFns.format(new Date(year, month - 1), 'MMMM yyyy', {locale: window.dateFns.locale.de})}`, doc.internal.pageSize.getWidth() / 2, 22, {align: 'center'});

    const legendStartY = 28;
    const pageWidth = doc.internal.pageSize.getWidth();
    const legendLeftMargin = (pageWidth - 150) / 2;
    const boxSize = 6;

    // Legende: Gelber Kasten
    doc.setFillColor(255, 230, 153);
    doc.rect(legendLeftMargin, legendStartY, boxSize, boxSize, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    const noShiftNecessaryInfo = isKita ? getText("create.kitashiftplanOpenInfo") : getText("create.shiftplanOpenInfo")
    doc.text(noShiftNecessaryInfo, legendLeftMargin + boxSize + 5, legendStartY + boxSize - 1);

    // Legende: Roter Kasten
    const redBoxX = legendLeftMargin + 90;
    doc.setFillColor(255, 204, 204);
    doc.rect(redBoxX, legendStartY, boxSize, boxSize, 'F');
    doc.text(getText("create.closedInfo"), redBoxX + boxSize + 5, legendStartY + boxSize - 1);

    let startY = legendStartY + 10;
    let actionTaken = false;
    const rows = [];

    for (const day in calendar) {
        let {
            parents,
            isValidDay,
            isKitaOpenNoEd,
            isAssigned,
            invalidText,
            specificPerson

        } = calendar[day];

        if (!actionTaken) {
            const areAllUsersKnown = parents.reduce((acc, currParent) => {
                // if one user was not found, the boolean should be persisted
                if (acc === false)
                    return false;
                return !!usersData.find((user) => user === currParent);

            }, true)

            if (isValidDay && !areAllUsersKnown) {

                const confirmedChoice = confirm(`${getText("create.personNotFoundOne")} ${parents.join(", ")}. ${getText("create.personNotFoundTwo")}`);
                if (!confirmedChoice) {
                    return
                }
                actionTaken = true;
            }
        }
        const formattedDate = formatDate(day, month, year);
        const dayOfWeek = formatDayOfWeek(day, month, year);
        // Bei gültigen Tagen wird der Inhalt aus der ersten Spalte übernommen.
        // Für ungültige Tage (z.B. Feiertage) bzw. "KitaOpenNoEd" nutzen wir später einen fixen Text.
        parents.forEach((value, index) => {
            if (value === getText("create.notSet")) {
                parents[index] = "";
            }
        });

        const parentCols = specificPerson ? [...parents, specificPerson] : parents
        // Speichere die Zeile inklusive Meta-Daten
        if (!isValidDay) {
            console.log(parents, dayOfWeek, formattedDate, isKitaOpenNoEd, isAssigned, isValidDay, invalidText, specificPerson)
        }
        rows.push({data: [dayOfWeek, formattedDate, ...parentCols], meta: {isKitaOpenNoEd, isAssigned, isValidDay, invalidText, specificPerson}});
    }

    // Neuer Body‑Array, der für spezielle Tage (nicht valide oder KitaOpenNoEd) die Schicht-Spalten zusammenfasst:
    const tableBody = rows.map(row => {
        if (!row.meta.isValidDay || row.meta.isKitaOpenNoEd) {
            let specialText = row.meta.invalidText ?? "";
            let fillColor = row.meta.isKitaOpenNoEd ? [255, 230, 153] : [255, 204, 204];
            return [
                row.data[0],
                row.data[1],
                {
                    content: specialText,
                    colSpan: cols,
                    styles: {halign: 'center', fillColor: fillColor, textColor: [50, 50, 50]}
                }
            ];
        } else {
            // Normale Zeile: 5 Spalten, ohne Veränderung
            return row.data;
        }
    });

    const headers = getHeaders(isKita, cols)

    // Gesamte Tabellenspaltenbreiten (aus Column-Styles)
    // Spalte 0: 10, Spalte 1: 20, Spalte 2: 60, Spalte 3: 50, Spalte 4: 50 => Summe = 190
    const wantedTableWidth = cols === 2 ? 150 : 190;
    const margin = (pageWidth - wantedTableWidth) / 2;
/*
columnStyles 2 cols
columnStyles: {
            0: {cellWidth: 20},
            1: {cellWidth: 30},
            2: {cellWidth: 50},


            3: {cellWidth: 50}
        },
 */
    // Aufruf von autoTable – alternativ: Für normale Zeilen nutzen wir das Alternating Row Style
    doc.autoTable({
        head: headers,
        body: tableBody,
        startY: startY,
        theme: 'grid',
        headStyles: {fillColor: [100, 100, 255]},
        alternateRowStyles: {fillColor: [245, 245, 245]},
        bodyStyles: {halign: 'center'},
        columnStyles: {
            0: {cellWidth: 10},
            1: {cellWidth: 20},
            2: {cellWidth: 60},
            3: {cellWidth: 50},
            4: {cellWidth: 50}
        },
        margin: {left: margin, right: margin}
    });

    return doc.output('blob');
}