# CareCompanion

CareCompanion is a Post-Surgery Recovery Tracker application built with plain HTML, CSS, and vanilla JavaScript. It is designed precisely to be a simple, standalone, client-side web application capturing the recovery progress locally.

## File Structure

The project has been refactored into a clear, modular file structure:
* **`index.html`** - The primary markup defining the navigation tabs, dashboard structure, check-in forms, and printable reports layout.
* **`style.css`** - The CSS stylesheet that controls the premium design aesthetics, grid layouts, themes, responsive sizes, and print optimizations.
* **`script.js`** - Contains all the application logic, standard `localStorage` capabilities including:
  - Form validation and submission handling
  - Trend generation using Chart.js
  - Automatic `danger`/`warning` alert calculations based on inputs
  - Streak calculator mechanics
  - Speech-to-text dictation and real-time translations via Google Apps integration

## Features

1. **Dashboard Check-ins:** Allows tracking of Daily Pain Levels spanning 1-10 through a responsive slider, Body Temperature metrics natively checking against fever severity, Wound Status, Activity Level, and Audio Notes.
2. **Dynamic Chart Visuals:** Plots all data inputs into a timeline visualizing "Pain Trends" and "Temperature Trends".
3. **Medical Report Generator:** A print-only layout stripping out UI chrome and neatly formatting a unified timeline grid perfect for doctor check-ins or medical storage formats.
4. **Offline Persistence:** Data securely resides on your device through localStorage without relying on any external databases.

## Usage
Simply launch the `index.html` directly in your browser. Since it runs completely locally on your machine via JavaScript, no development server or database setup is inherently required unless adjusting the local path permissions for browser audio dictation.
