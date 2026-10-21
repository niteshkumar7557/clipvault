# ClipVault: Design Document

A macOS menu bar clipboard manager and snippet tool built with Electron.
It records everything you copy, lets you search history from a global shortcut popup, and stores reusable snippets.

## 1. Goals

- Demonstrate the core Electron APIs: main/renderer processes, IPC, preload + contextBridge, Tray, globalShortcut, BrowserWindow, Menu, Notification, dialog, clipboard, nativeTheme, shell, app lifecycle.
- Feel like a native macOS app (menu bar only, vibrancy, template tray icon, dark/light mode).
- Stay simple enough to explain every file in a viva.

## 2. Non-Goals

- No cloud sync, accounts, or networking.
- No Windows/Linux support (macOS only).
- No rich-text/HTML clipboard formats in v1 (text first, images in a later milestone).

## 3. Tech Stack

| Area | Choice | Reason |
|---|---|---|
| Runtime | Electron (latest stable) | Required by assignment |
| UI | Vanilla HTML/CSS/JS | Fewer moving parts, easier to explain |
| Storage | `electron-store` (JSON) | Simple persistence, no native module issues |
| Packaging | `electron-builder` | Produces a `.dmg` |
| Security | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` | Electron security best practice |

## 4. Architecture

```
┌────────────────────────── Main Process (Node) ──────────────────────────┐
│ app lifecycle · Tray · globalShortcut · clipboard watcher · store       │
│ windows (popup, settings) · Menu · Notification · dialog · shell        │
└───────────────▲─────────────────────────────────────────────┬───────────┘
                │ ipcMain.handle / webContents.send           │
┌───────────────┴──────────── Preload (contextBridge) ────────▼───────────┐
│ exposes window.api = { getHistory, search, pin, delete, paste, ... }    │
└───────────────▲─────────────────────────────────────────────┬───────────┘
                │ window.api.*                                │
┌───────────────┴────────────── Renderer (UI) ────────────────▼───────────┐
│ popup/ (search + list)           settings/ (preferences)                │
└──────────────────────────────────────────────────────────────────────────┘
```

Rule: the renderer never touches Node or Electron directly. All privileged work happens in main and is reached through the preload API.

## 5. Folder Structure

```
clipvault/
├── package.json
├── design.md
├── README.md
├── assets/
│   ├── trayTemplate.png        (16x16, black + alpha, macOS template image)
│   ├── trayTemplate@2x.png
│   └── icon.icns
└── src/
    ├── main/
    │   ├── main.js              (app entry, lifecycle, wiring)
    │   ├── windows.js           (create popup + settings windows)
    │   ├── tray.js              (menu bar icon + menu)
    │   ├── shortcuts.js         (globalShortcut register/unregister)
    │   ├── clipboard-watcher.js (polling + dedupe)
    │   ├── store.js             (history, snippets, settings)
    │   ├── ipc.js               (all ipcMain handlers)
    │   ├── menu.js              (application menu)
    │   └── notifications.js
    ├── preload/
    │   └── preload.js
    └── renderer/
        ├── popup/    (index.html, popup.js, popup.css)
        ├── settings/ (index.html, settings.js, settings.css)
        └── shared/   (theme.css)
```

## 6. Data Model

```js
// History item
{
  id: "uuid",
  type: "text",            // "text" | "image" (later)
  content: "copied string",
  createdAt: 1730000000000,
  pinned: false,
  sourceApp: null          // optional, later milestone
}

// Snippet
{ id: "uuid", title: "Email sign-off", content: "Best,\nName", tags: ["email"], createdAt: 0 }

// Settings
{
  historyLimit: 200,
  shortcut: "CommandOrControl+Shift+V",
  launchAtLogin: false,
  showNotifications: true,
  ignoredApps: []
}
```

## 7. Features

### MVP
1. **Clipboard watcher**: poll `clipboard.readText()` every 500 ms, ignore empty or duplicate values, save new items.
2. **History store**: capped by `historyLimit`, pinned items never evicted.
3. **Popup window**: frameless, always-on-top, vibrancy, hides on blur. Search box + list.
4. **Global shortcut**: `Cmd+Shift+V` toggles the popup from any app.
5. **Keyboard navigation**: Up/Down to move, Enter to copy selected item, Esc to close.
6. **Tray**: template icon, menu shows last 5 items, plus "Open ClipVault", "Settings", "Quit".
7. **Pin / delete** items.

### Phase 2
8. **Snippets**: create, edit, delete, tag, and search.
9. **Settings window**: history limit, shortcut customization, launch at login, notifications toggle.
10. **Application menu and context menus** (right-click an item: Copy, Pin, Delete, Open URL).
11. **Notifications**: "Copied", "Pinned".
12. **Export / import** history as JSON using `dialog`; confirm dialog for "Clear all".
13. **Open URLs** from copied items using `shell.openExternal` (only `http(s)`).

### Phase 3 (stretch)
14. Image clipboard support.
15. Ignore specific apps.
16. Package as `.dmg`.

## 8. IPC API

All channels use `ipcMain.handle` / `ipcRenderer.invoke` unless noted.

| Channel | Direction | Purpose |
|---|---|---|
| `history:get` | renderer → main | Return all history items |
| `history:search` | renderer → main | Return items matching a query |
| `history:copy` | renderer → main | Write item back to clipboard, close popup |
| `history:pin` | renderer → main | Toggle pin |
| `history:delete` | renderer → main | Delete one item |
| `history:clear` | renderer → main | Clear all (after confirm dialog) |
| `history:updated` | main → renderer (send) | Notify UI that history changed |
| `snippets:*` | renderer → main | CRUD for snippets |
| `settings:get` / `settings:set` | renderer → main | Read/update settings |
| `app:openExternal` | renderer → main | Open a validated URL |
| `data:export` / `data:import` | renderer → main | JSON export/import via dialog |

Preload exposes these as `window.api.history.get()`, `window.api.settings.set(...)`, etc. Never expose `ipcRenderer` itself.

## 9. Window Specs

**Popup**
- 420x480, `frame: false`, `show: false`, `alwaysOnTop: true`, `resizable: false`
- `vibrancy: 'under-window'`, `visualEffectState: 'active'`
- `skipTaskbar: true`; hide on `blur`
- Positioned near the cursor or screen center when the shortcut fires

**Settings**
- 500x400, standard frame, opens from tray or app menu
- Single instance (focus existing window if already open)

## 10. macOS-Specific Behavior

- `app.dock.hide()` so the app lives only in the menu bar.
- Tray icon uses a template image (filename ends in `Template`).
- `nativeTheme` drives light/dark UI; also listen for `updated` events.
- `app.setLoginItemSettings({ openAtLogin })` for launch at login.
- Do not quit when all windows close (`window-all-closed` handler does nothing on macOS).
- Single instance lock via `app.requestSingleInstanceLock()`.

## 11. Security Checklist

- [ ] `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- [ ] Preload exposes only a small, named API
- [ ] Validate all IPC arguments in main
- [ ] Only open `http:`/`https:` URLs with `shell.openExternal`
- [ ] Content Security Policy meta tag in each HTML file
- [ ] No remote content loaded
- [ ] Clipboard data stored locally only; document that passwords copied from password managers may be recorded (add an "ignore" or "pause recording" toggle)

## 12. Milestones

| # | Milestone | Done when |
|---|---|---|
| 1 | Scaffold | App launches, popup window opens, preload + one IPC call works |
| 2 | Clipboard core | Copies are detected, stored, and shown in the popup |
| 3 | Shortcut + keyboard nav | `Cmd+Shift+V` toggles popup; Enter copies selected item |
| 4 | Tray + menu bar mode | Dock icon hidden, tray menu lists last 5 items |
| 5 | Pin, delete, search | All work and persist after restart |
| 6 | Snippets + settings | CRUD works; settings apply live |
| 7 | Dialogs, notifications, context menus | Export/import, confirm clear, notifications |
| 8 | Polish + package | Dark mode, icons, `.dmg` builds and runs |

## 13. Testing Checklist (manual)

- Copy 10 different strings; all appear, newest first, no duplicates.
- Quit and relaunch; history and pins persist.
- Shortcut works while another app is focused.
- Popup hides on blur and on Esc.
- Switch macOS between light and dark mode; UI updates.
- Change shortcut in settings; old one stops working, new one works.
- Export, clear, import; data restored.
- Built `.dmg` app runs on a clean user account.
