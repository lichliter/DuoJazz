const status = document.getElementById('offline-status');
function show(message = '') {
  status.textContent = message;
  status.hidden = !message;
}
function connection() {
  show(navigator.onLine ? '' : 'Offline — saved practice is available. Sign-in and sync need a connection.');
}
connection();
addEventListener('offline', connection);
addEventListener('online', connection);
if ('serviceWorker' in navigator) {
  async function register() {
    try {
      const registration = await navigator.serviceWorker.register(new URL('../sw.js', import.meta.url), { updateViaCache: 'none' });
      const watch = () => {
        const worker = registration.installing;
        if (!worker || navigator.serviceWorker.controller) return;
        if (navigator.onLine) show('Saving practice for offline use…');
        worker.addEventListener('statechange', () => {
          if (!navigator.onLine) return;
          if (worker.state === 'activated') {
            show('Ready for offline practice.');
            setTimeout(connection, 5000);
          } else if (worker.state === 'redundant') {
            show('Offline setup could not finish. Reconnect and reload to try again.');
          }
        });
      };
      registration.addEventListener('updatefound', watch);
      watch();
    } catch {
      if (navigator.onLine) show('Offline setup could not finish. Reconnect and reload to try again.');
    }
  }
  void register();
  addEventListener('online', register);
}
