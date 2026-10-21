/**
 * Notifications Module - Milestone 7
 * 
 * Electron API: Notification
 * Manages native OS desktop notifications.
 * Respects user preferences in settings (`showNotifications`).
 */

const { Notification } = require('electron');
const { getSettings } = require('./store');

/**
 * Truncates notification body text for clean display.
 * @param {string} text 
 * @param {number} [max=60] 
 * @returns {string}
 */
function truncateText(text, max = 60) {
  if (!text) return '';
  const clean = text.replace(/[\r\n\t]+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 3) + '...';
}

/**
 * Displays a native macOS notification if supported and enabled in settings.
 * 
 * @param {Object} options
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {boolean} [options.silent=true] - Whether to suppress system chime
 */
function showNotification({ title, body, silent = true }) {
  const settings = getSettings();
  if (!settings || settings.showNotifications === false) {
    return;
  }

  if (!Notification.isSupported()) {
    return;
  }

  try {
    const notification = new Notification({
      title: title || 'ClipVault',
      body: truncateText(body),
      silent
    });
    notification.show();
  } catch (err) {
    console.error('[Notification] Failed to display notification:', err);
  }
}

/**
 * Shortcut helper for copy notification.
 * @param {string} content 
 */
function notifyCopied(content) {
  showNotification({
    title: 'ClipVault: Copied',
    body: content
  });
}

/**
 * Shortcut helper for pin notification.
 * @param {string} content 
 * @param {boolean} isPinned 
 */
function notifyPinned(content, isPinned) {
  showNotification({
    title: isPinned ? 'ClipVault: Pinned' : 'ClipVault: Unpinned',
    body: content
  });
}

module.exports = {
  showNotification,
  notifyCopied,
  notifyPinned
};
