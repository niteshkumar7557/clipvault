/**
 * Popup Renderer Script
 * 
 * Note: Under contextIsolation: true and nodeIntegration: false,
 * this script has NO access to Node.js APIs (e.g., require, process).
 * All interaction with the Main process occurs via the exposed `window.api` bridge.
 */

document.addEventListener('DOMContentLoaded', () => {
  const pingBtn = document.getElementById('ping-btn');
  const pingResult = document.getElementById('ping-result');

  if (!pingBtn || !pingResult) {
    console.error('Required DOM elements not found.');
    return;
  }

  pingBtn.addEventListener('click', async () => {
    pingResult.textContent = 'Pinging main process...';
    pingResult.style.opacity = '0.6';

    try {
      // Calls the preload contextBridge method
      const response = await window.api.ping();
      pingResult.textContent = response;
      pingResult.style.opacity = '1';
    } catch (err) {
      pingResult.textContent = `Error: ${err.message}`;
      pingResult.style.color = '#ff3b30';
    }
  });
});
