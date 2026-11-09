import { SETTINGS_KEY } from "./cloud-settings.js";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, GOOGLE_SIGN_IN_ENABLED } from "./supabase-config.js";
import { loadMastery, saveMastery, setMasteryAccount, MASTERY_KEY } from "./medals.js";
import { mergeProgress, progressRows, claimGuestProgress } from "./cloud-progress.js";

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

export async function initAccount({ getProgress, onProgress, onOpenProfile, settings, onSettings, onSettingsAccount }) {
  const $ = id => document.getElementById(id);
  const login = $("login-screen"), shell = $("app-shell"), chip = $("account-chip");
  const returnUrl = authReturnUrl(location.href);
  let user = null, initialized = false, recovery = false, busy = false;
  let generation = 0, pending = false, running = false, applying = false;
  let retryTimer, retryDelay = 5000, resendTimer, resendAt = 0;
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
    if (focus) $("login-title").focus({ preventScroll: true });
  }
  function showApp() {
    login.hidden = Boolean(user) && !recovery;
    shell.hidden = !user || recovery;
    shell.inert = shell.hidden;
    $("account-member").hidden = !user;
  }
  function clearPasswords() {
    for (const field of document.querySelectorAll('.password-field input')) { field.value = ""; field.type = "password"; }
    for (const button of document.querySelectorAll('[data-show-password]')) {
      button.textContent = "Show"; button.setAttribute("aria-label", "Show password"); button.setAttribute("aria-pressed", "false");
    }
  }
  document.querySelectorAll("dialog[open]").forEach(node => node.close());
  chip.onclick = onOpenProfile;
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
    showView(recovery ? "password" : next === "signup" || next === "reset" ? next : "signin", { navigate: false });
  });
  showView(view, { navigate: false, focus: false });
  $("account-google").hidden = !GOOGLE_SIGN_IN_ENABLED;
  let client;
  try {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL("./vendor/supabase-2.119.0.js", import.meta.url).href;
      script.onload = resolve; script.onerror = reject; document.head.append(script);
    });
    client = globalThis.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  } catch {
    showApp();
    say("Couldn’t load sign-in. Refresh the page to try again.");
    return;
  }

  const authStorageKey = `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
  // The offline path removes the local session without a network sign-out.
  // Other tabs must also discard their in-memory identity and stop playback.
  addEventListener("storage", event => {
    if (event.storageArea !== localStorage || (event.key !== authStorageKey && event.key !== null)) return;
    if (localStorage.getItem(authStorageKey) !== null) return;
    void changeAccount(null);
    void client.auth.stopAutoRefresh();
    location.reload();
  });

  async function sync() {
    if (!navigator.onLine) {
      if (user) syncError("Offline — account sync will resume when you reconnect.");
      return;
    }
    pending = true;
    if (running || !user) return;
    clearTimeout(retryTimer);
    running = true;
    let requestGeneration = generation;
    try {
      while (pending && user) {
        pending = false;
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
            const rows = progressRows(local, current.id);
            for (let offset = 0; offset < rows.length; offset += 500) {
              if (version !== generation) break;
              const { error } = await client.from("practice_progress").upsert(rows.slice(offset, offset + 500), {
                onConflict: "user_id,lesson_id,key_id,kind", ignoreDuplicates: true,
              });
              if (error) throw error;
            }
            if (version !== generation) return false;
            const remote = [];
            for (let offset = 0; ; offset += 500) {
              const { data, error } = await client.from("practice_progress").select("lesson_id,key_id,kind")
                .eq("user_id", current.id).order("lesson_id").order("key_id").order("kind").range(offset, offset + 499);
              if (error) throw error;
              remote.push(...data);
              if (data.length < 500 || version !== generation) break;
            }
            if (version !== generation) return false;
            const merged = mergeProgress(getProgress(), remote);
            applying = true;
            onProgress(merged, false);
            const saved = saveMastery(merged);
            applying = false;
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
        retryTimer = setTimeout(() => void sync(), retryDelay);
        retryDelay = Math.min(retryDelay * 2, 60000);
      }
    } finally {
      applying = false; running = false;
      if (pending && user) void sync();
    }
  }

  async function changeAccount(next) {
    if (initialized && (next?.id ?? null) === (user?.id ?? null)) { showApp(); return; }
    const switchingAccount = initialized;
    initialized = true; generation++; user = next; pending = false;
    clearTimeout(retryTimer); syncError("");
    const version = generation;
    onSettingsAccount(user?.id ?? null);
    setMasteryAccount(user?.id);
    onProgress(loadMastery(), switchingAccount);
    const name = user?.email?.split("@")[0] || "Your account";
    $("account-avatar").textContent = accountInitials(name);
    $("account-name").textContent = name;
    chip.setAttribute("aria-label", `Profile: ${name}${user?.email ? `, ${user.email}` : ""}`);
    $("account-identity").textContent = user?.email ?? "";
    clearPasswords(); say(""); showApp();
    if (!user) {
      document.querySelectorAll("dialog[open]").forEach(node => node.close());
      if (switchingAccount) showView("signin");
      return;
    }
    const id = user.id;
    const claim = () => claimGuestProgress(id);
    const rows = navigator.locks ? await navigator.locks.request("duojazz-guest-migration", claim) : claim();
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
  client.auth.onAuthStateChange((event, session) => {
    setTimeout(() => {
      if (event === "PASSWORD_RECOVERY") recovery = true;
      if (event === "SIGNED_OUT") recovery = false;
      if (!navigator.onLine && user && !session && event !== "SIGNED_OUT") return;
      void changeAccount(session?.user ?? null);
      if (recovery) showView("password", { navigate: false });
    }, 0);
  });
  // This identity only selects local practice data; server access still requires auth.
  if (!navigator.onLine) {
    try {
      const key = `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
      const saved = JSON.parse(localStorage.getItem(key));
      if (saved?.user?.id && saved?.access_token && saved?.refresh_token) await changeAccount(saved.user);
    } catch { /* Missing or unavailable local session: keep the sign-in screen. */ }
  }
  try {
    if (navigator.onLine) {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      await changeAccount(data.session?.user ?? null);
    } else showApp();
  } catch {
    showApp();
    if (!user) say("Couldn’t restore your account. Please sign in again.");
  }

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
    await act($("confirmation-resend"), async () => {
      if (confirmation.kind === "signup") ensure(await client.auth.resend({ type: "signup", email: confirmation.email, options: { emailRedirectTo: returnUrl } }));
      else ensure(await client.auth.resetPasswordForEmail(confirmation.email, { redirectTo: returnUrl }));
      say("Email sent. Check your inbox.");
    });
    cooldown();
  };
  $("account-google").onclick = event => act(event.currentTarget, async () => ensure(await client.auth.signInWithOAuth(googleOptions(returnUrl))));
  $("account-signout").onclick = event => act(event.currentTarget, async () => {
    if (!navigator.onLine) {
      const key = `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}-code-verifier`);
      location.reload();
      return;
    }
    ensure(await client.auth.signOut({ scope: "local" }));
  }, true);
  addEventListener("duojazz-settings-changed", () => { if (user) void sync(); });
  addEventListener("duojazz-progress-saved", () => { if (!applying && user) void sync(); });
  addEventListener("online", () => { if (user) void sync(); });
  addEventListener("focus", () => { if (user) void sync(); });
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
