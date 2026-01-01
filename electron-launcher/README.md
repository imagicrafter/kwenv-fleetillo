# RouteIQ Electron Launcher

Electron desktop application launcher for RouteIQ.

## Prerequisites

- Node.js >= 18.0.0
- npm

## Installation

```bash
cd electron-launcher
npm install
```

## Running the App

**Important:** The Electron app must be launched from the `electron-launcher` directory, not the project root.

### Option 1: Run from project root

```bash
cd electron-launcher && npm start
```

### Option 2: Run from within electron-launcher directory

```bash
cd electron-launcher
npm start
```

### Running with the Express server

If your app requires the backend server, run both in separate terminals:

```bash
# Terminal 1: Start the Express server (from project root)
npm start

# Terminal 2: Start the Electron app
cd electron-launcher && npm start
```

This launches the Electron application using `src/main.js` as the entry point.
