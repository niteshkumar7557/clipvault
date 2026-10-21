/**
 * Settings Renderer Script - Milestone 6
 * 
 * Manages live preference updates:
 * - History limit (50, 100, 200, 500, 1000)
 * - Global shortcut re-registration
 * - Launch at login (`app.setLoginItemSettings`)
 * - Notifications toggle
 */

document.addEventListener('DOMContentLoaded', async () => {
  const shortcutInput = document.getElementById('shortcut-input');
  const saveShortcutBtn = document.getElementById('save-shortcut-btn');
  const historyLimitSelect = document.getElementById('history-limit-select');
  const launchAtLoginToggle = document.getElementById('launch-at-login-toggle');
  const notificationsToggle = document.getElementById('notifications-toggle');
  const statusMessage = document.getElementById('status-message');

  let bannerTimer = null;

  function showStatus(text, isError = false) {
    if (bannerTimer) clearTimeout(bannerTimer);
    statusMessage.textContent = text;
    statusMessage.className = `status-banner ${isError ? 'error' : 'success'}`;
    statusMessage.style.display = 'block';

    bannerTimer = setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 3500);
  }

  // 1. Initial Load: Load current settings
  try {
    const settings = await window.api.settings.get();
    if (settings) {
      if (shortcutInput) shortcutInput.value = settings.shortcut || 'CommandOrControl+Shift+V';
      if (historyLimitSelect) historyLimitSelect.value = String(settings.historyLimit || 200);
      if (launchAtLoginToggle) launchAtLoginToggle.checked = Boolean(settings.launchAtLogin);
      if (notificationsToggle) notificationsToggle.checked = settings.showNotifications !== false;
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
    showStatus('Failed to load settings: ' + err.message, true);
  }

  // 2. History Limit Change
  if (historyLimitSelect) {
    historyLimitSelect.addEventListener('change', async () => {
      const val = parseInt(historyLimitSelect.value, 10);
      try {
        await window.api.settings.set('historyLimit', val);
        showStatus(`✓ History limit set to ${val} items (applied immediately)`);
      } catch (err) {
        showStatus(err.message, true);
      }
    });
  }

  // 3. Shortcut Customization (Live Re-registration)
  async function applyShortcut() {
    const val = shortcutInput.value.trim();
    if (!val) {
      showStatus('Shortcut string cannot be empty', true);
      return;
    }

    try {
      await window.api.settings.set('shortcut', val);
      showStatus(`✓ Global shortcut updated to "${val}" live!`);
    } catch (err) {
      showStatus(`Error updating shortcut: ${err.message}`, true);
    }
  }

  if (saveShortcutBtn) {
    saveShortcutBtn.addEventListener('click', applyShortcut);
  }
  if (shortcutInput) {
    shortcutInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyShortcut();
      }
    });
  }

  // 4. Launch at Login
  if (launchAtLoginToggle) {
    launchAtLoginToggle.addEventListener('change', async () => {
      const checked = launchAtLoginToggle.checked;
      try {
        await window.api.settings.set('launchAtLogin', checked);
        showStatus(checked ? '✓ ClipVault will now launch on system login' : '✓ Launch at login disabled');
      } catch (err) {
        showStatus('Failed to update login setting: ' + err.message, true);
      }
    });
  }

  // 5. Notifications Toggle
  if (notificationsToggle) {
    notificationsToggle.addEventListener('change', async () => {
      const checked = notificationsToggle.checked;
      try {
        await window.api.settings.set('showNotifications', checked);
        showStatus(checked ? '✓ Notifications enabled' : '✓ Notifications disabled');
      } catch (err) {
        showStatus('Failed to update notifications: ' + err.message, true);
      }
    });
  }
});
