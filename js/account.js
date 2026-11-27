import { SETTINGS_KEY } from "./cloud-settings.js";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, GOOGLE_SIGN_IN_ENABLED } from "./supabase-config.js";
import { loadMastery, saveMastery, setMasteryAccount, pruneMasteryJournal, MASTERY_KEY } from "./medals.js";
import { mergeProgress, progressRows, claimGuestProgress } from "./cloud-progress.js";
import { fetchWithTimeout, withTimeout } from "./network.js";

export const googleOptions = redirectTo => ({ provider: "google", options: { scopes: "openid email profile", redirectTo } });
export function authReturnUrl(href) {
  const url = new URL(href);
  url.search = "";
  url.hash = "";
  return url.href;
}
export function accountInitials(name) {
  return String(name).trim().split(/[\s._-]+/).filter(Boolean).slice(0, 2).map(part => Array.from(part)[0]).join("").toUpperCase() || "?";
}
export function hasAuthCallbackInUrl(href) {
  try {
    const url = new URL(href);
    for (const key of ["code", "token_hash", "error", "error_code", "error_description"]) {
      if (url.searchParams.has(key)) return true;
    }
    const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
    for (const key of ["access_token", "refresh_token", "type", "error", "error_code", "error_description"]) {
      if (hash.has(key)) return true;
    }
    return false;
  } catch {
    return false;
  }
}
export function readStoredSession(key, storage = globalThis.localStorage) {
  try {
    const saved = JSON.parse(storage?.getItem(key) ?? "null");
    return saved?.user?.id && saved?.access_token && saved?.refresh_token ? saved : null;
  } catch {
    return null;
  }
}
export function isRetryableAuthError(error) {
  if (!error) return false;
  if (error.name === "AuthRetryableFetchError" || error.isRetryable === true) return true;
  if (error.status === 0 || (typeof error.status === "number" && error.status >= 500)) return true;
  return /timed out|network|failed to fetch|load failed|aborted/i.test(String(error.message ?? ""));
}

export async function initAccount({ getProgress, onProgress, onOpenProfile, settings, onSettings, onSettingsAccount }) {
  const $ = id => document.getElementById(id);
  const login = $("login-screen"), shell = $("app-shell"), chip = $("account-chip");
  const returnUrl = authReturnUrl(location.href);
  let user = null, initialized = false, restoring = true, recovery = false, busy = false;
  let viewingGuest = false;
  let generation = 0, pending = false, pendingPull = false, running = false, applying = false;
  let retryTimer, retryDelay = 5000, resendTimer, resendAt = 0;
  let syncedProgressKeys = new Set();
  const progressKey = row => `${row.lesson_id}\0${row.key_id}\0${row.kind}`;
  let confirmation = null;
  let view = new URL(location.href).searchParams.get("auth") === "signup" ? "signup" : "signin";
  const titles = { signin: "Sign in", signup: "Create account", confirmation: "Check your email", reset: "Reset password", password: "Choose a new password" };
  const say = message => { $("account-status").textContent = message; };
  const syncError = message => {
    $("account-error").textContent = message;
    $("account-error").hidden = !message;
  };
  function showView(next, { navigate = true, focus = true } = {}) {
    view = next;
    for (const panel of document.querySelectorAll("[data-auth-view]")) panel.hidden = panel.dataset.authView !== view;
    $("login-title").textContent = titles[view];
    say("");
    if (navigate) {
      const url = new URL(location.href);
      if (view === "signin") url.searchParams.delete("auth");
      else url.searchParams.set("auth", view);
      history.pushState({}, "", url);
    }
    if (focus && !login.hidden) $("login-title").focus({ preventScroll: true });
  }
  function showApp() {
    const canViewApp = (Boolean(user) || viewingGuest) && !recovery;
    $("account-loading").hidden = !restoring;
    login.hidden = restoring || canViewApp;
    shell.hidden = restoring || !canViewApp;
    shell.inert = shell.hidden;
    $("account-member").hidden = !user && !viewingGuest;
    $("account-login").hidden = Boolean(user);
    $("account-signout").hidden = !user;
    const name = user ? user.email?.split("@")[0] || "Your account" : "Guest";
    $("account-avatar").textContent = accountInitials(name);
    $("account-name").textContent = name;
    chip.setAttribute("aria-label", `Profile: ${name}${user?.email ? `, ${user.email}` : ""}`);
    $("account-identity").textContent = user ? user.email ?? "" : "Progress is saved on this device. Log in to sync your practice.";
    document.querySelector('.skip-link').href = restoring ? '#account-loading-title' : shell.hidden ? '#login-title' : '#main';
  }
  function clearPasswords() {
    for (const field of document.querySelectorAll('.password-field input')) { field.value = ""; field.type = "password"; }
    for (const button of document.querySelectorAll('[data-show-password]')) {
      button.textContent = "Show"; button.setAttribute("aria-label", "Show password"); button.setAttribute("aria-pressed", "false");
    }
  }
  document.querySelectorAll("dialog[open]").forEach(node => node.close());
  chip.onclick = onOpenProfile;
  // Guest navigation stays available even when sign-in cannot load or is offline.
  $("account-view-guest").onclick = () => {
    if (busy || restoring || recovery || user) return;
    void changeAccount(null);
    viewingGuest = true;
    clearPasswords();
    showView("signin", { focus: false });
    showApp();
    $("main").focus({ preventScroll: true });
  };
  $("account-login").onclick = () => {
    if (user) return;
    viewingGuest = false;
    // Stop any guest practice before hiding the app behind the login screen.
    onProgress(getProgress(), true);
    showApp();
    document.querySelectorAll("dialog[open]").forEach(node => node.close());
    clearPasswords();
    showView("signin");
  };
  for (const button of document.querySelectorAll("[data-auth-nav]")) button.onclick = () => {
    if (busy) return;
    if (button.dataset.authNav === "reset") $("reset-email").value = $("account-email").value;
    clearPasswords();
    showView(button.dataset.authNav);
  };
  for (const button of document.querySelectorAll("[data-show-password]")) button.onclick = () => {
    const field = $(button.dataset.showPassword), visible = field.type === "password";
    field.type = visible ? "text" : "password";
    button.textContent = visible ? "Hide" : "Show";
    button.setAttribute("aria-label", visible ? "Hide password" : "Show password");
    button.setAttribute("aria-pressed", String(visible));
  };
  addEventListener("popstate", () => {
    if (user && !recovery) return;
    const next = new URL(location.href).searchParams.get("auth");
    const target = recovery ? "password" : next === "signup" || next === "reset" ? next : "signin";
    if (target !== view) showView(target, { navigate: false });
  });
  showView(view, { navigate: false, focus: false });
  showApp();
  $("account-google").hidden = !GOOGLE_SIGN_IN_ENABLED;
  const authStorageKey = `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
  let client = null, manualSignOut = false;

  async function act(button, action, inAccount = false) {
    if (busy) return;
    busy = true;
    const original = button.textContent;
    button.disabled = true; button.textContent = "Please wait…";
    if (inAccount) syncError(""); else say("");
    try { await action(); }
    catch (error) { (inAccount ? syncError : say)(error.message || "Couldn’t connect. Please try again."); }
    finally { busy = false; button.disabled = false; button.textContent = original; }
  }
  function ensure(result) { if (result.error) throw result.error; return result.data; }

  // The offline path removes the local session without a network sign-out.
  // Other tabs must also discard their in-memory identity and stop playback.
  addEventListener("storage", event => {
    if (event.storageArea !== localStorage || (event.key !== authStorageKey && event.key !== null)) return;
    if (localStorage.getItem(authStorageKey) !== null) return;
    void changeAccount(null);
    void client?.auth.stopAutoRefresh();
    location.reload();
  });

  $("account-signout").onclick = event => act(event.currentTarget, async () => {
    if (!navigator.onLine || !client) {
      manualSignOut = true;
      localStorage.removeItem(authStorageKey);
      localStorage.removeItem(`${authStorageKey}-code-verifier`);
      location.reload();
      return;
    }
    manualSignOut = true;
    try {
      ensure(await client.auth.signOut({ scope: "local" }));
    } catch (error) {
      manualSignOut = false;
      throw error;
    }
  }, true);

  async function sync({ pull = true } = {}) {
    if (!navigator.onLine) {
      if (user) syncError("Offline — account sync will resume when you reconnect.");
      return;
    }
    pending = true;
    if (pull) pendingPull = true;
    if (running || !user || !client) return;
    clearTimeout(retryTimer);
    running = true;
    let requestGeneration = generation;
    try {
      while (pending && user) {
        pending = false;
        const shouldPull = pendingPull;
        pendingPull = false;
        const current = user, version = generation;
        requestGeneration = version;
        const results = await Promise.allSettled([
          (async () => {
            const saved = await settings.sync(client);
            if (version === generation) onSettings();
            return saved;
          })(),
          (async () => {
            // Include earned-key journal entries from a tab that may have closed
            // before this tab received its storage event.
            const local = mergeProgress(getProgress(), progressRows(loadMastery(), current.id));
            onProgress(local, false);
            const allRows = progressRows(local, current.id);
            const delta = allRows.filter(row => !syncedProgressKeys.has(progressKey(row)));
            for (let offset = 0; offset < delta.length; offset += 500) {
              if (version !== generation) break;
              const chunk = delta.slice(offset, offset + 500);
              const { error } = await client.from("practice_progress").upsert(chunk, {
                onConflict: "user_id,lesson_id,key_id,kind", ignoreDuplicates: true,
              });
              if (error) throw error;
              if (version !== generation) return false;
              for (const row of chunk) syncedProgressKeys.add(progressKey(row));
            }
            if (version !== generation) return false;
            const remote = [];
            if (shouldPull) {
              for (let offset = 0; ; offset += 500) {
                const { data, error } = await client.from("practice_progress").select("lesson_id,key_id,kind")
                  .eq("user_id", current.id).order("lesson_id").order("key_id").order("kind").range(offset, offset + 499);
                if (error) throw error;
                remote.push(...data);
                if (data.length < 500 || version !== generation) break;
              }
              if (version !== generation) return false;
              for (const row of remote) syncedProgressKeys.add(progressKey(row));
            }
            const merged = shouldPull ? mergeProgress(getProgress(), remote) : local;
            applying = true;
            onProgress(merged, false);
            const saved = saveMastery(merged);
            applying = false;
            if (saved && (delta.length || remote.length)) {
              pruneMasteryJournal(delta.length ? delta : remote);
            }
            return saved;
          })(),
        ]);
        if (version !== generation) continue;
        if (results.some(result => result.status === "rejected")) throw new Error("Account sync incomplete");
        syncError(results.every(result => result.value) ? "" : "Your changes are saved to your account, but this browser can’t save an offline copy.");
        retryDelay = 5000;
      }
    } catch {
      if (user && requestGeneration === generation) {
        syncError("Your changes haven’t reached your account yet. We’ll retry automatically.");
        pending = false;
        retryTimer = setTimeout(() => void sync({ pull: true }), retryDelay);
        retryDelay = Math.min(retryDelay * 2, 60000);
      }
    } finally {
      applying = false; running = false;
      if (pending && user && client) void sync({ pull: pendingPull });
    }
  }

  async function changeAccount(next) {
    restoring = false;
    if (initialized && (next?.id ?? null) === (user?.id ?? null)) { showApp(); return; }
    const switchingAccount = initialized;
    initialized = true; generation++; user = next; pending = false; pendingPull = false;
    syncedProgressKeys = new Set();
    viewingGuest = false;
    clearTimeout(retryTimer); syncError("");
    const version = generation;
    try {
      onSettingsAccount(user?.id ?? null, switchingAccount);
      setMasteryAccount(user?.id);
      onProgress(loadMastery(), switchingAccount);
    } finally {
      clearPasswords(); say(""); showApp();
    }
    if (!user) {
      document.querySelectorAll("dialog[open]").forEach(node => node.close());
      if (switchingAccount) showView("signin");
      return;
    }
    const id = user.id;
    const claim = () => claimGuestProgress(id);
    let rows = [];
    if (navigator.locks) {
      const controller = new AbortController();
      const lockTimer = setTimeout(() => controller.abort(), 5000);
      try {
        rows = await navigator.locks.request("duojazz-guest-migration", { mode: "exclusive", signal: controller.signal }, claim);
      } catch {
        rows = controller.signal.aborted ? [] : claim();
      } finally {
        clearTimeout(lockTimer);
      }
    } else {
      rows = claim();
    }
    if (generation !== version) return;
    if (rows.length) {
      onProgress(mergeProgress(getProgress(), rows), false);
      applying = true; saveMastery(getProgress()); applying = false;
    }
    if (!recovery) {
      const url = new URL(location.href); url.searchParams.delete("auth"); history.replaceState({}, "", url);
      $("main").focus({ preventScroll: true });
    }
    void sync();
  }

  // Returning signed-in players open into their cached account immediately while session verification runs in the background.
  // Skip pre-restoration on auth callbacks so OAuth/recovery links still hand off cleanly after token exchange.
  const savedSession = hasAuthCallbackInUrl(location.href) ? null : readStoredSession(authStorageKey);
  if (savedSession) {
    try {
      await changeAccount(savedSession.user);
    } catch {
      /* showApp() already ran in changeAccount's finally block. */
    }
  }

  try {
    if (!globalThis.supabase) {
      await withTimeout(new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = new URL("./vendor/supabase-2.119.0.js", import.meta.url).href;
        script.onload = resolve; script.onerror = reject; document.head.append(script);
      }));
    }
    client = globalThis.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { fetch: fetchWithTimeout },
    });
  } catch {
    restoring = false;
    showApp();
    if (user) {
      syncError(navigator.onLine
        ? "Couldn’t connect to account sync. Reload to try again."
        : "Offline — account sync will resume when you reconnect.");
    } else {
      say("Couldn’t load sign-in. Refresh the page to try again.");
    }
    return;
  }

  client.auth.onAuthStateChange((event, session) => {
    setTimeout(async () => {
      try {
        if (event === "PASSWORD_RECOVERY") recovery = true;
        if (event === "SIGNED_OUT") recovery = false;
        if (!session && user && event !== "SIGNED_OUT" && (!navigator.onLine || readStoredSession(authStorageKey))) {
          if (event === "INITIAL_SESSION" && navigator.onLine) {
            syncError("Your changes haven’t reached your account yet. We’ll retry automatically.");
          }
          return;
        }
        const hadUser = Boolean(user);
        await changeAccount(session?.user ?? null);
        if (event === "SIGNED_OUT") {
          if (hadUser && !manualSignOut && !recovery) say("Your session expired. Please sign in again.");
          manualSignOut = false;
        }
        if (event === "TOKEN_REFRESHED" && session?.user && user?.id === session.user.id) {
          void sync({ pull: true });
        }
        if (recovery) showView("password", { navigate: false });
      } catch {
        restoring = false;
        showApp();
      }
    }, 0);
  });

  try {
    if (navigator.onLine) {
      const version = generation;
      const { data, error } = await withTimeout(client.auth.getSession());
      if (error) throw error;
      if (version === generation) {
        const nextUser = data.session?.user ?? null;
        if (nextUser) {
          const sameUser = user?.id === nextUser.id;
          await changeAccount(nextUser);
          if (sameUser) void sync({ pull: true });
        } else if (!user || !readStoredSession(authStorageKey)) {
          const hadCachedUser = Boolean(user);
          await changeAccount(null);
          if (hadCachedUser && !manualSignOut) say("Your session expired. Please sign in again.");
        }
      }
    } else {
      restoring = false;
      showApp();
    }
  } catch (error) {
    restoring = false;
    if (user && readStoredSession(authStorageKey) && (isRetryableAuthError(error) || !navigator.onLine)) {
      showApp();
      syncError(navigator.onLine
        ? "Your changes haven’t reached your account yet. We’ll retry automatically."
        : "Offline — account sync will resume when you reconnect.");
      if (navigator.onLine) {
        clearTimeout(retryTimer);
        retryTimer = setTimeout(() => void sync({ pull: true }), retryDelay);
      }
    } else {
      if (user && !readStoredSession(authStorageKey)) await changeAccount(null);
      else showApp();
      if (!user) say("Couldn’t restore your account. Please sign in again.");
    }
  } finally {
    if (restoring) {
      restoring = false;
      showApp();
    }
  }
  function onSubmit(id, buttonId, action) {
    $(id).addEventListener("submit", event => {
      event.preventDefault();
      if ($(buttonId).disabled || !$(id).reportValidity()) return;
      void act($(buttonId), action);
    });
  }
  function cooldown() {
    clearInterval(resendTimer);
    resendAt = Date.now() + 60000;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
      $("confirmation-resend").disabled = remaining > 0 || busy;
      $("confirmation-resend").textContent = remaining ? `Resend email (${remaining}s)` : "Resend email";
      if (!remaining) clearInterval(resendTimer);
    };
    update(); resendTimer = setInterval(update, 1000);
  }
  function sent(email, kind) {
    confirmation = { email, kind };
    $("account-email").value = email;
    clearPasswords(); showView("confirmation");
    $("confirmation-message").textContent = kind === "signup"
      ? `We sent a confirmation link to ${email}. Open it to confirm your account, then sign in.`
      : `If there’s an account for ${email}, you’ll receive a link to reset your password.`;
    $("confirmation-change").dataset.authNav = kind === "signup" ? "signup" : "reset";
    cooldown();
  }
  onSubmit("account-guest", "account-signin", async () => {
    ensure(await client.auth.signInWithPassword({ email: $("account-email").value.trim(), password: $("account-password").value }));
  });
  onSubmit("signup-form", "signup-submit", async () => {
    const email = $("signup-email").value.trim();
    const data = ensure(await client.auth.signUp({
      email, password: $("signup-password").value,
      options: { emailRedirectTo: returnUrl },
    }));
    if (!data.session) sent(email, "signup");
  });
  onSubmit("reset-form", "reset-submit", async () => {
    const email = $("reset-email").value.trim();
    ensure(await client.auth.resetPasswordForEmail(email, { redirectTo: returnUrl }));
    sent(email, "recovery");
  });
  onSubmit("password-form", "password-submit", async () => {
    ensure(await client.auth.updateUser({ password: $("new-password").value }));
    recovery = false; clearPasswords(); showApp(); $("main").focus({ preventScroll: true });
    const url = new URL(location.href); url.searchParams.delete("auth"); history.replaceState({}, "", url);
  });
  $("confirmation-resend").onclick = async () => {
    if (!confirmation || Date.now() < resendAt || busy) return;
    let sentOk = false;
    await act($("confirmation-resend"), async () => {
      if (confirmation.kind === "signup") ensure(await client.auth.resend({ type: "signup", email: confirmation.email, options: { emailRedirectTo: returnUrl } }));
      else ensure(await client.auth.resetPasswordForEmail(confirmation.email, { redirectTo: returnUrl }));
      sentOk = true;
      say("Email sent. Check your inbox.");
    });
    if (sentOk) cooldown();
  };
  $("account-google").onclick = event => act(event.currentTarget, async () => ensure(await client.auth.signInWithOAuth(googleOptions(returnUrl))));
  addEventListener("duojazz-settings-changed", () => { if (user) void sync({ pull: false }); });
  addEventListener("duojazz-progress-saved", () => { if (!applying && user) void sync({ pull: false }); });
  addEventListener("online", () => { if (user) void sync({ pull: true }); });
  addEventListener("focus", () => { if (user) void sync({ pull: true }); });
  addEventListener("storage", event => {
    if (user && (event.key === `${SETTINGS_KEY}:${user.id}` || event.key?.startsWith(`${SETTINGS_KEY}:${user.id}:edit:`))) {
      settings.reload();
      onSettings();
      if (settings.hasPending()) void sync();
    }
    if (user && (event.key === `${MASTERY_KEY}:${user.id}` || event.key?.startsWith(`${MASTERY_KEY}:${user.id}:earned:`))) {
      const merged = mergeProgress(getProgress(), progressRows(loadMastery(), user.id));
      if (JSON.stringify(merged) !== JSON.stringify(getProgress())) {
        onProgress(merged, false);
        void sync();
      }
    }
  });
  for (const id of ["account-signin", "signup-submit", "reset-submit", "password-submit", "account-google"]) $(id).disabled = false;
}
