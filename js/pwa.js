const status = document.getElementById('offline-status');
const updateButton = document.getElementById('app-update');
const updateStatus = document.getElementById('app-update-status');
function show(message = '') {
  status.textContent = message;
  status.hidden = !message;
}
const setupError = 'Offline setup could not finish. Reconnect and reload to try again.';
let activeRegistration = null;
let registrationAttempt;
function watchInstallation() {
  const worker = activeRegistration.installing;
  if (!worker) return;
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed' || worker.state === 'activated') {
      show();
    } else if (worker.state === 'redundant') {
      show(setupError);
    }
  });
}

async function registerWorker() {
  try {
    if (activeRegistration) {
      if (activeRegistration.active && !activeRegistration.installing) show();
      await activeRegistration.update();
    } else {
      activeRegistration = await navigator.serviceWorker.register(new URL('../sw.js', import.meta.url), { updateViaCache: 'none' });
      activeRegistration.addEventListener('updatefound', watchInstallation);
      if (activeRegistration.active && !activeRegistration.installing) show();
    }
    watchInstallation();
  } catch {
    show(setupError);
  }
}

if ('serviceWorker' in navigator) {
  registrationAttempt = registerWorker();
  addEventListener('online', () => (registrationAttempt = registerWorker()));
}

function activateUpdate(worker) {
  const serviceWorker = navigator.serviceWorker;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error('App update timed out')), 60_000);

    function finish(error) {
      clearTimeout(timeout);
      worker.removeEventListener('statechange', checkState);
      serviceWorker.removeEventListener('controllerchange', checkController);
      if (error) reject(error);
      else resolve();
    }

    function checkController() {
      if (serviceWorker.controller === worker) finish();
    }

    function checkState() {
      if (worker.state === 'installed') {
        try {
          worker.postMessage('ACTIVATE_UPDATE');
        } catch (error) {
          finish(error);
        }
      } else if (worker.state === 'redundant') {
        finish(new Error('App update did not install'));
      }
    }

    serviceWorker.addEventListener('controllerchange', checkController);
    worker.addEventListener('statechange', checkState);
    if (serviceWorker.controller === worker) finish();
    else checkState();
  });
}

function setUpdateLabel(label) {
  updateButton.textContent = label;
  updateStatus.textContent = label;
}

updateButton.addEventListener('click', async () => {
  if (!navigator.onLine) {
    setUpdateLabel('Offline. Connect to update.');
    return;
  }

  updateButton.disabled = true;
  setUpdateLabel('Checking for updates…');
  try {
    if ('serviceWorker' in navigator) {
      await registrationAttempt;
      if (!activeRegistration) await registerWorker();
      if (!activeRegistration) throw new Error('Service worker registration unavailable');
      await activeRegistration.update();
      const worker = activeRegistration.installing || activeRegistration.waiting;
      if (worker) {
        setUpdateLabel('Updating app…');
        await activateUpdate(worker);
      }
    }
    location.reload();
  } catch {
    setUpdateLabel('Update failed. Tap to retry.');
    updateButton.disabled = false;
  }
});
