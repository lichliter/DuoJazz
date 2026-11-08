const status = document.getElementById('offline-status');
function show(message = '') {
  status.textContent = message;
  status.hidden = !message;
}
const setupError = 'Offline setup could not finish. Reconnect and reload to try again.';
if ('serviceWorker' in navigator) {
  async function register() {
    try {
      const registration = await navigator.serviceWorker.register(new URL('../sw.js', import.meta.url), { updateViaCache: 'none' });
      if (registration.active && !registration.installing) show();
      const watch = () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' || worker.state === 'activated') {
            show();
          } else if (worker.state === 'redundant') {
            show(setupError);
          }
        });
      };
      registration.addEventListener('updatefound', watch);
      watch();
    } catch {
      show(setupError);
    }
  }
  void register();
  addEventListener('online', register);
}
