# ClipVault

> A native macOS menu bar clipboard manager and reusable snippet tool built with Electron.

ClipVault lives exclusively in your macOS menu bar. It records copied text in the background, enables instant searching and keyboard navigation from a global shortcut floating HUD, stores reusable text snippets, and adheres strictly to Electron security best practices.

---

## Architecture Overview

ClipVault follows Electron's strict **three-tier security architecture**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Main Process (Node.js)                         │
│  • App lifecycle & single instance lock (app.dock.hide())               │
│  • System Tray menu bar icon & live context menu                        │
│  • Global keyboard shortcut hooks (CommandOrControl+Shift+V)            │
│  • Background clipboard polling & deduplication (every 500ms)           │
│  • Persistent storage (electron-store)                                  │
│  • Native dialogs, Notifications, Menu, shell.openExternal              │
└────────────────────────────────────▲────────────────────────────────────┘
                                     │
                  ipcMain.handle     │     webContents.send
                  ipcRenderer.invoke │     (e.g., 'history:updated')
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                         Preload Script (Bridge)                         │
│  • contextBridge.exposeInMainWorld('api', { ... })                      │
│  • Secure, typed API whitelist (history, snippets, settings, data)      │
│  • contextIsolation: true, nodeIntegration: false, sandbox: true        │
└────────────────────────────────────▲────────────────────────────────────┘
                                     │
                                     │  window.api.*
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                       Renderer Process (Chromium UI)                    │
│  • Popup HUD: Frosted-glass vibrancy, live search, keyboard navigation  │
│  • Snippets Tab: Inline creation, tag management, fast copy             │
│  • Preferences Window: Live settings configuration (single instance)    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Features (Milestones 1 – 8)

- **Menu Bar Accessory**: Runs as a lightweight macOS utility (`app.dock.hide()`); stays alive when windows close.
- **Background Clipboard Polling**: Checks pasteboard every 500ms, ignores empty strings, and deduplicates copied text.
- **Persistent Storage**: Backed by `electron-store`. Respects `historyLimit`; pinned items are guaranteed never to be evicted.
- **Global Shortcut HUD**: Press `Cmd+Shift+V` from any application to summon the floating HUD directly under the mouse cursor.
- **Keyboard Navigation**: `↑` / `↓` arrow keys cycle items, `Enter` writes the selected clip to clipboard and closes the popup, `Esc` dismisses the window.
- **Live Search**: Instant substring filtering across clips as you type.
- **Pin & Delete**: Pin essential clips to the top with `📌` indicators; delete unwanted clips.
- **Right-Click Context Menu**: Native macOS context menu (`Menu.popup`) with Copy, Pin/Unpin, Open in Browser, and Delete.
- **Reusable Snippets**: Dedicated Snippets tab with full CRUD (Title, Content, `#tags`) for repetitive templates.
- **Preferences Window (Single-Instance)**: Customize history limit, change global shortcut with live re-registration, toggle Launch at Login, and toggle notifications.
- **JSON Backup & Restore**: Native `dialog.showSaveDialog` and `dialog.showOpenDialog` for JSON export and import.
- **Native Notifications & Confirmation**: macOS notifications for copy/pin actions; `dialog.showMessageBox` confirmation modal before clearing history.
- **macOS Vibrancy & Theme**: Real-time dark/light mode switching powered by `nativeTheme` and `vibrancy: 'under-window'`.
- **Privacy & Security**: Native template tray icon, Pause/Resume recording toggle, and strict `http:`/`https:` URL protocol validation.

---

## Installation & Setup

### Prerequisites
- macOS (Apple Silicon or Intel)
- Node.js (v18+)
- npm (v9+)

### Install Dependencies
```bash
npm install
```

---

## Running & Packaging

### Run in Development
```bash
npm start
```
- Summons popup via `Cmd+Shift+V`
- Opens Settings via `Cmd+,` or menu bar Tray icon $\rightarrow$ **Settings...**

### Package Application Directory
```bash
npm run pack
```
Packages the native `.app` bundle into `dist/mac-arm64/ClipVault.app`.

### Build macOS Installer (.dmg)
```bash
npm run build
```
Generates a standalone installer `.dmg` and distribution `.zip` in the `dist/` directory:
- `dist/ClipVault-1.0.0-arm64.dmg`
- `dist/ClipVault-1.0.0-arm64-mac.zip`

---

## Electron APIs Reference (Viva Guide)

Every Electron API used in ClipVault is isolated and documented below:

| Electron API | Module / File | Key Functions & Usage |
|---|---|---|
| `app` | [`src/main/main.js`](file:///Users/kero-mac/Desktop/clipvault/src/main/main.js)<br>[`src/main/ipc.js`](file:///Users/kero-mac/Desktop/clipvault/src/main/ipc.js) | `app.whenReady()`, `app.requestSingleInstanceLock()`, `app.dock.hide()`, `app.setLoginItemSettings()`, `app.getLoginItemSettings()`, `app.quit()` |
| `BrowserWindow` | [`src/main/windows.js`](file:///Users/kero-mac/Desktop/clipvault/src/main/windows.js)<br>[`src/main/ipc.js`](file:///Users/kero-mac/Desktop/clipvault/src/main/ipc.js) | `new BrowserWindow()` (creates vibrant popup and native settings windows), `win.show()`, `win.hide()`, `win.focus()`, `BrowserWindow.fromWebContents()` |
| `clipboard` | [`src/main/clipboard-watcher.js`](file:///Users/kero-mac/Desktop/clipvault/src/main/clipboard-watcher.js)<br>[`src/main/ipc.js`](file:///Users/kero-mac/Desktop/clipvault/src/main/ipc.js)<br>[`src/main/tray.js`](file:///Users/kero-mac/Desktop/clipvault/src/main/tray.js) | `clipboard.readText()` (polls pasteboard every 500ms), `clipboard.writeText()` (writes selected clip or snippet back to OS pasteboard) |
| `Tray` | [`src/main/tray.js`](file:///Users/kero-mac/Desktop/clipvault/src/main/tray.js) | `new Tray(icon)`, `tray.setToolTip()`, `tray.setContextMenu()` (attaches top-5 history menu and app controls) |
| `Menu` / `MenuItem` | [`src/main/menu.js`](file:///Users/kero-mac/Desktop/clipvault/src/main/menu.js)<br>[`src/main/tray.js`](file:///Users/kero-mac/Desktop/clipvault/src/main/tray.js)<br>[`src/main/ipc.js`](file:///Users/kero-mac/Desktop/clipvault/src/main/ipc.js) | `Menu.buildFromTemplate()`, `Menu.setApplicationMenu()` (native macOS menu bar), `menu.popup()` (anchors native right-click context menu to window) |
| `globalShortcut` | [`src/main/shortcuts.js`](file:///Users/kero-mac/Desktop/clipvault/src/main/shortcuts.js) | `globalShortcut.register()` (system-wide hotkey `Cmd+Shift+V`), `globalShortcut.unregister()`, `globalShortcut.unregisterAll()` (releases hooks on quit) |
| `nativeImage` | [`src/main/tray.js`](file:///Users/kero-mac/Desktop/clipvault/src/main/tray.js) | `nativeImage.createFromPath()`, `trayIcon.setTemplateImage(true)` (enables dynamic dark/light mode tinting for menu bar icons) |
| `nativeTheme` | [`src/main/main.js`](file:///Users/kero-mac/Desktop/clipvault/src/main/main.js)<br>[`src/main/ipc.js`](file:///Users/kero-mac/Desktop/clipvault/src/main/ipc.js) | `nativeTheme.on('updated')` (monitors macOS system appearance changes live), `nativeTheme.shouldUseDarkColors`, `nativeTheme.themeSource` |
| `dialog` | [`src/main/ipc.js`](file:///Users/kero-mac/Desktop/clipvault/src/main/ipc.js) | `dialog.showSaveDialog()` (JSON export), `dialog.showOpenDialog()` (JSON import), `dialog.showMessageBox()` (confirmation modal for clearing history) |
| `Notification` | [`src/main/notifications.js`](file:///Users/kero-mac/Desktop/clipvault/src/main/notifications.js) | `new Notification({ title, body, silent })`, `Notification.isSupported()` (sends native macOS banners on copy/pin) |
| `screen` | [`src/main/windows.js`](file:///Users/kero-mac/Desktop/clipvault/src/main/windows.js) | `screen.getCursorScreenPoint()`, `screen.getDisplayNearestPoint()` (calculates coordinates to position popup near cursor within screen work area) |
| `shell` | [`src/main/ipc.js`](file:///Users/kero-mac/Desktop/clipvault/src/main/ipc.js) | `shell.openExternal()` (opens validated web links in the default browser) |
| `ipcMain` | [`src/main/ipc.js`](file:///Users/kero-mac/Desktop/clipvault/src/main/ipc.js) | `ipcMain.handle()` (registers request-response channels: `history:*`, `snippets:*`, `settings:*`, `data:*`) |
| `ipcRenderer` | [`src/preload/preload.js`](file:///Users/kero-mac/Desktop/clipvault/src/preload/preload.js) | `ipcRenderer.invoke()`, `ipcRenderer.on()`, `ipcRenderer.removeListener()` (wrapped inside clean, leak-free subscriptions) |
| `contextBridge` | [`src/preload/preload.js`](file:///Users/kero-mac/Desktop/clipvault/src/preload/preload.js) | `contextBridge.exposeInMainWorld('api', { ... })` (bridges isolated context to renderer without leaking Node internals) |

---

## Security Audit (Section 11 Checklist)

| Checklist Requirement | Status | Implementation Details |
|---|:---:|---|
| `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` | **PASSED** | Explicitly configured in `webPreferences` for both Popup and Settings `BrowserWindow` instances ([`windows.js`](file:///Users/kero-mac/Desktop/clipvault/src/main/windows.js#L35-L42)). |
| Preload exposes only a small, named API | **PASSED** | Only typed methods exposed via `contextBridge.exposeInMainWorld('api', ...)`; raw `ipcRenderer` is never leaked ([`preload.js`](file:///Users/kero-mac/Desktop/clipvault/src/preload/preload.js)). |
| Validate all IPC arguments in main | **PASSED** | Every IPC handler in `ipc.js` validates argument types (non-empty strings, objects, numbers) and rejects malformed inputs ([`ipc.js`](file:///Users/kero-mac/Desktop/clipvault/src/main/ipc.js#L140-L280)). |
| Only open `http:`/`https:` URLs with `shell.openExternal` | **PASSED** | `isValidHttpUrl()` strictly enforces `http:` and `https:` schemes, preventing arbitrary protocol execution ([`ipc.js`](file:///Users/kero-mac/Desktop/clipvault/src/main/ipc.js#L44-L54)). |
| Content Security Policy meta tag in each HTML file | **PASSED** | Strict CSP `<meta>` tags present in both [`popup/index.html`](file:///Users/kero-mac/Desktop/clipvault/src/renderer/popup/index.html#L6) and [`settings/index.html`](file:///Users/kero-mac/Desktop/clipvault/src/renderer/settings/index.html#L6). |
| No remote content loaded | **PASSED** | Windows load strictly local HTML files from disk using `win.loadFile()`. Zero remote assets or scripts are fetched. |
| Clipboard data stored locally & Password Privacy | **PASSED** | History is stored strictly on local disk (`electron-store`). A **Pause Recording** toggle is provided in the menu bar Tray to allow users to pause pasteboard recording when working with password managers. |
