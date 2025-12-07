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
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Titel
    const title = isKita ? getText("create.kitashiftplan") : getText("create.shiftplan");
    doc.setFontSize(16);
    doc.text(title, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    const monthYear = window.dateFns.format(
        new Date(year, month - 1), 'MMMM yyyy', { locale: window.dateFns.locale.de }
    );
    doc.text(monthYear, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });

    // Legende
    const legendY = 28;
    const pageWidth = doc.internal.pageSize.getWidth();
    const legendX = (pageWidth - 150) / 2;
    const box = 6;
    doc.setFillColor(255, 230, 153);
    doc.rect(legendX, legendY, box, box, 'F');
    doc.setFontSize(10);
    doc.text(
        isKita ? getText("create.kitashiftplanOpenInfo") : getText("create.shiftplanOpenInfo"),
        legendX + box + 5, legendY + box - 1
    );
    const redX = legendX + 90;
    doc.setFillColor(255, 204, 204);
    doc.rect(redX, legendY, box, box, 'F');
    doc.text(getText("create.closedInfo"), redX + box + 5, legendY + box - 1);

    // Bau der Tabellen-Daten
    const rows = [];
    Object.entries(calendar).forEach(([day, data]) => {
        const { shifts, isValidDay, isKitaOpenNoEd, invalidText } = data;
        const dow = formatDayOfWeek(day, month, year);
        const date = formatDate(day, month, year);

        if (!isValidDay || isKitaOpenNoEd) {
            // Zusammengefasste Maske über alle Schichten
            rows.push({
                data: [
                    dow,
                    date,
                    {
                        content: invalidText || '',
                        colSpan: cols,
                        styles: {
                            halign: 'center',
                            fillColor: isKitaOpenNoEd ? [255, 230, 153] : [255, 204, 204],
                            textColor: [50,50,50]
                        }
                    }
                ],
                meta: { isValidDay, isKitaOpenNoEd }
            });
        } else {
            // Jede Schicht als mehrzeiliger Text
            const shiftCells = [];
            for (let i = 1; i <= cols; i++) {
                const key = `shift${i}`;
                const names = shifts[key] || [];
                shiftCells.push(names.join('\n'));
            }
            rows.push({ data: [dow, date, ...shiftCells], meta: { isValidDay } });
        }
    });

    // Tabellen-Header
    const headers = getHeaders(isKita, cols)

    // AutoTable-Aufruf
    const margin = (pageWidth - (cols === 2 ? 150 : 190)) / 2;
    doc.autoTable({
        head: headers,
        body: rows.map(r => r.data),
        startY: legendY + 10,
        theme: 'grid',
        headStyles: { fillColor: [100, 100, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        bodyStyles: { halign: 'center' },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 20 },
            // Rest je nach Spaltenzahl
            ...(cols === 3
                ? { 2: { cellWidth: 60 }, 3: { cellWidth: 50 }, 4: { cellWidth: 50 } }
                : { 2: { cellWidth: 50 }, 3: { cellWidth: 50 } })
        },
        margin: { left: margin, right: margin }
    });

    return doc.output('blob');
}
