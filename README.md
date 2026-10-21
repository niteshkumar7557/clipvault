# ClipVault

A macOS menu bar clipboard manager and snippet tool built with Electron.

## Milestone 1: App Scaffold
- Main process lifecycle & window management
- Frameless, vibrant macOS popup window (`BrowserWindow`)
- Secure IPC via preload (`contextBridge`) with `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- IPC communication verified via `app:ping` / `window.api.ping()`

## Running the App

```bash
npm install
npm start
```
