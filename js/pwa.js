const status = document.getElementById('offline-status');
function show(message = '') {
  status.textContent = message;
  status.hidden = !message;
}
const setupError = 'Offline setup could not finish. Reconnect and reload to try again.';
if ('serviceWorker' in navigator) {
  let activeRegistration = null;
  let watchingRegistration = false;
  const watch = () => {
    const worker = activeRegistration?.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' || worker.state === 'activated') {
        show();
      } else if (worker.state === 'redundant') {
        show(setupError);
      }
    });
  };
  async function register() {
    try {
      if (activeRegistration) {
        if (activeRegistration.active && !activeRegistration.installing) show();
        await activeRegistration.update?.();
        watch();
        return;
      }
      const registration = await navigator.serviceWorker.register(new URL('../sw.js', import.meta.url), { updateViaCache: 'none' });
      activeRegistration = registration;
      if (registration.active && !registration.installing) show();
      if (!watchingRegistration) {
        watchingRegistration = true;
        registration.addEventListener('updatefound', watch);
      }
      watch();
    } catch {
      show(setupError);
    }
  }
  void register();
  addEventListener('online', register);
}
