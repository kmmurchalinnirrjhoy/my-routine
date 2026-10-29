# My Routine

A minimal personal routine dashboard built for GitHub Pages + Firebase Firestore.

## Included

- Daily routine and task list
- Daily Goals
- Daily Must-Do: Coding + Previous Study Revision
- Start/End activity timer
- Study / Coding / Revision time tracking
- Planned vs Actual-ready task data
- Prayer tracker with On time / Late / Qaza / Not prayed
- Prayer history by original due date
- Habit tracker + streaks
- Quick notes
- Carry Forward
- Focus Mode
- Weekly / Monthly reports
- Google Sign-in
- Firestore sync between phone and laptop
- Responsive minimal UI
- Light / dark theme

## 1. Create Firebase project

Create a Firebase project, add a Web App, enable:

- Authentication → Google provider
- Firestore Database

Copy your Firebase Web App configuration into:

`js/firebase-config.js`

## 2. Firestore rules

Publish the contents of `firestore.rules` in Firebase Console → Firestore Database → Rules.

The rules allow each signed-in user to read/write only their own `/users/{uid}/...` data.

## 3. GitHub Pages

Upload the whole folder to a GitHub repository.

GitHub:
Settings → Pages → Deploy from branch → `main` → `/ (root)`

Then open the generated Pages URL.

## Important

Do not put service-account/private keys in the frontend. The web app only uses the normal Firebase Web App configuration.

This is a solid Version 1 foundation. More advanced features such as editing old records, exact planned-vs-actual analytics, completed Qaza action, Pomodoro presets, and richer charts can be added without changing the overall structure.
