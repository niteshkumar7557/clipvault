/**
 * Clipboard Watcher Module
 * 
 * Electron API: clipboard
 * Electron's `clipboard` API provides methods to read and write to the operating system pasteboard.
 * 
 * Why polling is needed:
 * Neither Electron nor standard macOS pasteboard APIs provide an asynchronous cross-process "onClipboardChange"
 * event hook. macOS pasteboard (`NSPasteboard`) only maintains an internal `changeCount` integer that increments
 * whenever pasteboard contents change. Electron does not expose an event for this, so periodic
 * polling (here, 500ms) of `clipboard.readText()` is the standard, reliable technique for clipboard managers.
 */

const { clipboard } = require('electron');
const EventEmitter = require('events');

class ClipboardWatcher extends EventEmitter {
  /**
   * @param {number} [intervalMs=500] - Polling interval in milliseconds
   */
  constructor(intervalMs = 500) {
    super();
    this.intervalMs = intervalMs;
    this.timer = null;
    this.lastText = '';
    this.isChecking = false;
  }

  /**
   * Starts polling the system clipboard.
   */
  async start() {
    if (this.timer) {
      return;
    }

    // Seed the initial clipboard state so existing content before app launch isn't treated as a new copy
    try {
      const initial = await clipboard.readText();
      this.lastText = typeof initial === 'string' ? initial : '';
    } catch {
      this.lastText = '';
    }

    // Poll the clipboard periodically
    this.timer = setInterval(() => {
      this.checkClipboard();
    }, this.intervalMs);
  }

  /**
   * Reads clipboard text, checks for empty strings and duplicates, and emits new items.
   */
  async checkClipboard() {
    // Prevent overlapping checks if an async read takes longer than interval
    if (this.isChecking) {
      return;
    }
    this.isChecking = true;

    try {
      // await clipboard.readText() handles both Promise and string return signatures
      const currentText = await clipboard.readText();

      // Rule 1: Ensure string type and ignore empty or whitespace-only content
      if (typeof currentText !== 'string' || currentText.trim() === '') {
        return;
      }

      // Rule 2: Deduplication - Ignore if the text matches the last recorded clipboard content
      if (currentText === this.lastText) {
        return;
      }

      // Record the new text state
      this.lastText = currentText;

      // Emit the 'change' event with the new copied string
      this.emit('change', currentText);
    } catch (err) {
      console.error('[ClipboardWatcher] Error reading clipboard:', err);
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Sets the last recorded text manually.
   * Useful when ClipVault writes to the clipboard (e.g. user selecting an item to copy)
   * so the watcher does not re-record the app's own write action.
   * 
   * @param {string} text 
   */
  setLastText(text) {
    this.lastText = typeof text === 'string' ? text : '';
  }

  /**
   * Stops polling the clipboard.
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

module.exports = {
  ClipboardWatcher
};
