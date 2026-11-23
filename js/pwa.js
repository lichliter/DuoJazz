const status = document.getElementById('offline-status');
const updateButton = document.getElementById('app-update');
const updateStatus = document.getElementById('app-update-status');
const headerButton = document.getElementById('header-update');
const headerStatus = document.getElementById('header-update-status');
const serviceWorker = navigator.serviceWorker;

function show(message = '') {
  status.textContent = message;
  status.hidden = !message;
}
const setupError = 'Offline setup could not finish. Reconnect and reload to try again.';
let activeRegistration = null;
let updateCheck;
let pageController = serviceWorker?.controller;
const watchedWorkers = new WeakSet();

function syncUpdateIndicator() {
  const controller = serviceWorker.controller;
  pageController ??= controller;
  const available = Boolean(controller && (activeRegistration?.waiting || controller !== pageController));
  if (headerButton.hidden === !available) return;
  headerButton.hidden = !available;
  if (!headerButton.disabled) setHeaderStatus(available ? 'App update available.' : '');
}

function watchInstallation() {
  const registration = activeRegistration;
  const worker = registration?.installing;
  if (!worker || watchedWorkers.has(worker)) return;
  watchedWorkers.add(worker);
  function onStateChange() {
    if (worker.state === 'installed' || worker.state === 'activated') {
      show();
    } else if (worker.state === 'redundant' && !registration.active && activeRegistration === registration) {
      activeRegistration = null;
      show(setupError);
    }
    if (worker.state === 'activated' || worker.state === 'redundant') {
      worker.removeEventListener('statechange', onStateChange);
    }
    syncUpdateIndicator();
  }
  worker.addEventListener('statechange', onStateChange);
}

async function checkForUpdate() {
  if (updateCheck) return updateCheck;
  updateCheck = (async () => {
    if (!activeRegistration) {
      activeRegistration = await serviceWorker.register(new URL('../sw.js', import.meta.url), { updateViaCache: 'none' });
      activeRegistration.addEventListener('updatefound', watchInstallation);
    }
    watchInstallation();
    syncUpdateIndicator();
    if (!activeRegistration.installing) {
      if (activeRegistration.active) show();
      if (navigator.onLine) await activeRegistration.update();
      watchInstallation();
      syncUpdateIndicator();
    }
  })();
  try {
    await updateCheck;
  } finally {
    updateCheck = null;
  }
}

async function refreshUpdateAvailability() {
  try {
    await checkForUpdate();
  } catch {
    if (!activeRegistration?.active) show(setupError);
  }
}

if (serviceWorker) {
  serviceWorker.addEventListener('controllerchange', syncUpdateIndicator);
  refreshUpdateAvailability();
  addEventListener('online', refreshUpdateAvailability);
  function checkWhileVisible() {
    if (document.visibilityState === 'visible' && navigator.onLine) refreshUpdateAvailability();
  }
  document.addEventListener('visibilitychange', checkWhileVisible);
  setInterval(checkWhileVisible, 5 * 60_000);
}

function activateUpdate(worker) {
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

function setHeaderStatus(message, visible = false) {
  headerStatus.classList.toggle('sr-only', !visible);
  headerStatus.textContent = message;
}

async function applyUpdate(event) {
  const fromHeader = event.currentTarget === headerButton;
  const report = fromHeader ? message => setHeaderStatus(message, true) : setUpdateLabel;
  if (updateButton.disabled) return;
  const ready = !headerButton.hidden;
  if (!ready && !navigator.onLine) {
    setUpdateLabel('Offline. Connect to update.');
    return;
  }

  updateButton.disabled = true;
  headerButton.disabled = true;
  try {
    report(ready ? 'Updating app…' : 'Checking for updates…');
    if (serviceWorker) {
      if (!ready) await checkForUpdate();
      const worker = activeRegistration?.waiting ||
        (ready ? activeRegistration?.active : activeRegistration?.installing);
      if (worker) {
        report('Updating app…');
        await activateUpdate(worker);
      }
    }
    location.reload();
  } catch {
    updateButton.disabled = false;
    headerButton.disabled = false;
    report('Update failed. Tap to retry.');
  }
}

updateButton.addEventListener('click', applyUpdate);
headerButton.addEventListener('click', applyUpdate);
