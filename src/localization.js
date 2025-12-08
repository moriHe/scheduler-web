const text = {
    blockedtime: {
        copied: "Sperrzeiten kopiert!"
    },
    addUser: {
        alreadyExists: "Die Person existiert bereits."
    },
    options: {
        chooseFile: "Bitte wählen Sie eine JSON-Datei aus.",
        duplicates: "Es gibt doppelte Personennamen in der Datei. Bitte entfernen Sie die Duplikate und versuchen Sie es erneut.",
        notValidJson: "Fehler beim Verarbeiten der Datei. Stellen Sie sicher, dass es sich um eine gültige JSON-Datei handelt.",
        uploadSuccess: "Personen wurden erfolgreich hochgeladen",
        revert: "Möchten Sie die Personen wirklich zurücksetzen?",
        revertSuccess: "Personen wurden zurückgesetzt."
    },
    create: {
        person: "Person",
        persons: "Personen",
        specificPersonMissing: "Bitte Person im ausgewählte Schichten Kalender eintragen.",
        personNotAvailableAlert: "Person kann an diesem Tag nicht. Trotzdem eintragen?",
        confirm: "Bestätigen",
        insertBlockedTime: "Generierte Sperrzeit einfügen",
        dateStringInvalidDates: "Der String ist in einem ungültigen Format. Gültig zum Beispiel: 2025-1-1 oder 2025-12-31. Nutze gerne den Sperrzeiten Kalender zur Konfiguration.",
        dateStringInvalidList: "Die Daten müssen in einer Liste eingegeben werden. Nutze gerne den Sperrzeiten Kalender zur Konfiguration.",
        generalError: "Ups etwas ging schief.",
        forceUpdatePreview: "Ups, etwas ging schief. Bitte die Vorschau mit dem Button neu laden.",
        shift: "Schicht",
        shiftTypes: "Schichttypen",
        teamSize: "Berechtigte Teamgröße",
        teamSizeAlert: "Dieser Nutzer ist für diese Schichtgröße nicht berechtigt.",
        shiftplanpdf: "dienstplan",
        shiftplan: "Dienstplan",
        shiftplanOpenInfo: "Geöffnet, keine Schichten notwendig",
        closedInfo: "Geschlossen",
        family: "Familie",
        kitaplanpdf: "elterndienstplan",
        kitashiftplan: "Elterndienstplan",
        kitashiftplanOpenInfo: "Geöffnet, kein Elterndienst notwendig",
        specialshiftsInfo: " erhält ausgewählte Schichten und wird aus der Autozuweisung entfernt.",
        notSet: "Unbesetzt",
        shouldNotHappen: "Ups, da ist eine Person zweimal im Datensatz. Das sollte nicht passieren. Gerne eine E-Mail schreiben!",
        personNotFoundOne: "Person(en) nicht im Datenset gefunden an der Stelle:",
        personNotFoundTwo: "Trotzdem fortfahren?",
        day: "Tag",
        date: "Datum"
    },
    daysShort: {
        mo: "Mo",
        di: "Di",
        mi: "Mi",
        do: "Do",
        fr: "Fr",
        sa: "Sa",
        so: "So"
    }
}

const text_en = {
    blockedtime: {
        copied: "Blackout times copied!"
    },
    addUser: {
        alreadyExists: "This person already exists."
    },
    options: {
        chooseFile: "Please select a JSON file.",
        duplicates: "There are duplicate names in the file. Please remove the duplicates and try again.",
        notValidJson: "Error processing the file. Make sure it is a valid JSON file.",
        uploadSuccess: "People were successfully uploaded.",
        revert: "Do you really want to reset the people?",
        revertSuccess: "People have been reset."
    },
    create: {
        person: "Person",
        persons: "People",
        specificPersonMissing: "Please enter a person in the selected shifts calendar.",
        personNotAvailableAlert: "This person is not available on this day. Still assign?",
        confirm: "Confirm",
        insertBlockedTime: "Insert generated blackout time",
        dateStringInvalidDates: "The string is in an invalid format. Valid examples: 2025-1-1 or 2025-12-31. Feel free to use the blackout time calendar to configure.",
        dateStringInvalidList: "The data must be entered as a list. Feel free to use the blackout time calendar to configure.",
        generalError: "Oops, something went wrong.",
        forceUpdatePreview: "Oops, something went wrong. Please reload the preview using the button.",
        shift: "Shift",
        shiftTypes: "Shift Types",
        teamSize: "Eligible Team Size",
        teamSizeAlert: "This user is not eligible for this shift size.",
        shiftplanpdf: "shiftplan",
        shiftplan: "Shift Plan",
        shiftplanOpenInfo: "Open, no shifts required",
        closedInfo: "Closed",
        family: "Family",
        kitaplanpdf: "parentdutyplan",
        kitashiftplan: "Parent Duty Plan",
        kitashiftplanOpenInfo: "Open, no parent duty required",
        specialshiftsInfo: " receives selected shifts and will be excluded from auto-assignment.",
        notSet: "Unassigned",
        shouldNotHappen: "Oops, this person appears twice in the dataset. That shouldn't happen. Feel free to send an email!",
        personNotFoundOne: "Person(s) not found in dataset at position:",
        personNotFoundTwo: "Continue anyway?",
        day: "Day",
        date: "Date"
    },
    daysShort: {
        mo: "Mon",
        di: "Tue",
        mi: "Wed",
        do: "Thu",
        fr: "Fri",
        sa: "Sat",
        so: "Sun"
    }
};

const language = 'de';
function getText(key) {
    const translations = { de: text, en: text_en };
    const obj = translations[language] || {};

    return key
        .split('.')
        .reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
}



export default getText
