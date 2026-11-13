# Study Timer

A customizable study timer built with React and TypeScript to help users manage focused study sessions.

The application features flexible countdown durations, a color-coded progress indicator, reusable recent durations, and configurable completion notifications.

## Features

- **Custom Study Durations:** Set a countdown using hours, minutes, and seconds.
- **Timer Controls:** Start, pause, resume, and reset study sessions.
- **Visual Progress Indicator:** A circular countdown that changes color as time runs out:
  - Green: More than 50% remaining
  - Yellow: 15–50% remaining
  - Red: 15% or less remaining
- **Recent Durations:** Automatically remembers the four most recently used unique durations.
- **Persistent Preferences:** Saves recent durations and sound settings using browser localStorage.
- **Completion Alarm:** Plays an audible notification when the countdown reaches zero.
- **Sound Controls:** Enable or disable the completion alarm.
- **Completion Feedback:** Displays a completion message and updates the browser tab title.
- **Responsive Interface:** Dark-themed layout designed for desktop and mobile devices.
- **Accessibility:** Keyboard focus indicators and accessible timer status.

## Technologies Used

- React
- TypeScript
- Vite
- CSS
- Web Audio API
- Browser localStorage
- Git and GitHub

## Getting Started

### Prerequisites

- Node.js and npm

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/chrislff02/study-timer
   ```

2. Navigate into the project:

   ```bash
   cd study-timer
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open the local URL displayed in the terminal.

## Available Commands

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the development server         |
| `npm run build`   | Build the application for production |
| `npm run preview` | Preview the production build         |
| `npm run lint`    | Run ESLint                           |

## How to Use

1. Enter a study duration using the Hours, Minutes, and Seconds fields.
2. Click **Start** to begin the countdown.
3. Use **Pause**, **Resume**, or **Reset** to control the session.
4. Watch the circular progress indicator change color as time decreases.
5. When the timer reaches zero, a completion message appears and an alarm plays if sound is enabled.
6. Select a previously used duration from the Recent Durations section to quickly start another session.

## Project Highlights

This project focuses on accurate countdown behavior, persistent browser storage, and a responsive user interface.

The countdown uses a target completion timestamp to calculate the remaining time rather than relying solely on interval ticks. This reduces accumulated timing drift when users switch browser tabs.

Recent durations are stored as seconds and maintained as a list of the four most recently used unique values.

The application runs entirely in the browser and does not require a backend or database.
