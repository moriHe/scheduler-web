# Scheduler Web — Knowledge Document

## Overview

Scheduler Web is a browser-based application for creating duty and shift schedules.

The project originally started as a scheduler for parent duties and was later extended to support multiple shifts per day and multiple people per shift.

## Features

- Selection between two or three shifts per day
- Standard shift plan with one person or a freely defined value per shift
- Advanced shift plan with one to three people per shift and day
- Consideration of individual unavailability
- Automatic warning when a person is assigned to a shift during a period in which they are marked as unavailable
- Functions for adding people
- Definition of blocked times
- Schedule creation
- Localized and English-language areas

## Architecture

Scheduler Web is intentionally implemented as a static client-side application and does not require a backend.

The application is built using Parcel.

The source code is organized by functionality into areas such as:

- `addUser`
- `blockedtime`
- `create`
- `options`
- `shiftplan`
- `pro`
- `kitashiftplan`
- `utils`
- Test data

The static architecture makes this project an example of an application where the domain logic is implemented entirely in the browser.

## Build and Deployment

Parcel provides the development server and application bundling.

The production build writes the application into the `docs` directory and uses an appropriate public path for hosting.

During the build process, JavaScript is additionally processed or obfuscated for generated subdirectories.

## Testing and Quality

The repository contains:

- A dedicated `cypress` area
- Cypress configuration
- ESLint configuration

The project therefore includes both end-to-end testing infrastructure and static code-quality tooling.

## Technically Interesting Aspects

### Business Logic Without a Backend

The scheduling logic is modeled entirely on the client side.

This includes:

- People
- Shifts
- Availability
- Conflicts

### Availability Validation

An important domain requirement is detecting conflicts.

For example, the application must detect when a person is assigned to a shift even though that person has marked the corresponding time as unavailable.

### Different Scheduling Modes

The application supports different rules for standard and advanced shift plans.

The UI therefore needs to support a variable number of shifts and participants.

## Demonstrated Skills

- JavaScript-based frontend development
- Client-side business logic
- UI and state modeling
- Validation and conflict detection
- Parcel and frontend build processes
- Cypress / end-to-end testing
- ESLint
- Static web deployment
- Internationalization / localization structure

## Project Classification

Scheduler Web is a good example of pragmatic frontend development without an unnecessary backend.

The project demonstrates that architecture was adapted to the size and requirements of the problem: the application does not require a server component to fulfill its core purpose.

## Useful Retrieval Questions

- What frontend development experience does the developer have?
- Has the developer built an application without a backend?
- Does the developer have experience with Cypress?
- How was conflict detection or validation implemented?
- Which projects contain planning or scheduling logic?
- Does the developer have experience with Parcel and static deployment?

## Source

GitHub Repository: moriHe/scheduler-web
