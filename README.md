# Scheduler Web — Knowledge Document

## Überblick

Scheduler Web ist eine browserbasierte Anwendung zur Erstellung von Dienst- bzw. Schichtplänen.

Das Projekt begann als Planer für Elterndienste und wurde auf mehrere Schichten pro Tag sowie mehrere Personen pro Schicht erweitert.

## Funktionen

- Auswahl zwischen zwei oder drei Schichten pro Tag
- normaler Schichtplan mit einer Person bzw. einem frei definierbaren Wert pro Schicht
- Pro-Schichtplan mit ein bis drei Personen pro Schicht und Tag
- Berücksichtigung von Nichtverfügbarkeiten
- automatische Warnung, wenn eine Person für eine Schicht als nicht verfügbar markiert wurde
- Funktionen zum Hinzufügen von Personen
- Definieren blockierter Zeiten
- Erstellen von Plänen
- lokalisierte bzw. englischsprachige Bereiche

## Architektur

Scheduler Web ist bewusst eine statische Client-Anwendung und benötigt kein Backend.

Die Anwendung wird mit Parcel gebaut.

Der Source-Bereich ist funktional gegliedert, beispielsweise in:

- `addUser`
- `blockedtime`
- `create`
- `options`
- `shiftplan`
- `pro`
- `kitashiftplan`
- `utils`
- Testdaten

Die statische Architektur macht das Projekt zu einem Beispiel für eine Anwendung, deren Fachlogik vollständig im Browser umgesetzt wird.

## Build und Deployment

Parcel übernimmt Development Server und Bundling.

Der Produktions-Build schreibt die Anwendung in den `docs`-Ordner und verwendet einen passenden Public Path für das Hosting.

Im Build-Prozess wird JavaScript zusätzlich für die erzeugten Unterverzeichnisse verarbeitet bzw. obfuskiert.

## Tests und Qualität

Das Repository besitzt:

- einen eigenen `cypress`-Bereich
- eine Cypress-Konfiguration
- ESLint-Konfiguration

Damit enthält das Projekt sowohl End-to-End-Testinfrastruktur als auch statische Codequalitätswerkzeuge.

## Technisch interessante Aspekte

### Fachlogik ohne Backend

Die Planungslogik wird vollständig im Client modelliert.

Dazu gehören:

- Personen
- Schichten
- Verfügbarkeiten
- Konflikte

### Validierung von Verfügbarkeiten

Ein wichtiger fachlicher Aspekt ist das Erkennen einer Konfliktsituation:

Eine Person soll einer Schicht zugewiesen werden, obwohl sie diese Zeit als nicht verfügbar markiert hat.

### Unterschiedliche Planungsmodi

Die Anwendung unterstützt unterschiedliche Regeln für normale und erweiterte Schichtpläne.

Dadurch muss die UI mit variabler Anzahl von Schichten und Teilnehmern umgehen können.

## Demonstrierte Kenntnisse

- JavaScript-basierte Frontend-Entwicklung
- clientseitige Geschäftslogik
- UI- und Zustandsmodellierung
- Validierung und Konflikterkennung
- Parcel und Frontend-Build-Prozesse
- Cypress / End-to-End-Tests
- ESLint
- statisches Web-Deployment
- Internationalisierung / Lokalisierungsstruktur

## Einordnung

Scheduler Web ist ein gutes Beispiel für pragmatische Frontend-Entwicklung ohne unnötiges Backend.

Das Projekt zeigt, dass Architektur an die Problemgröße angepasst wurde: Die Anwendung benötigt keine Serverkomponente, um ihren Kernzweck zu erfüllen.

## Gute Retrieval-Fragen

- Welche Erfahrung gibt es mit Frontend-Entwicklung?
- Wurde schon eine Anwendung ohne Backend gebaut?
- Gibt es Erfahrung mit Cypress?
- Wie wurde Konflikterkennung oder Validierung umgesetzt?
- Welche Projekte enthalten Planungs- oder Scheduling-Logik?
- Gibt es Erfahrung mit Parcel und statischem Deployment?

## Quelle

GitHub Repository: moriHe/scheduler-web
