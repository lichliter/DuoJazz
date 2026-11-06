import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, GOOGLE_SIGN_IN_ENABLED } from "./supabase-config.js";
import { loadMastery, saveMastery, setMasteryAccount, MASTERY_KEY } from "./medals.js";
import { mergeProgress, progressRows } from "./cloud-progress.js";

export const googleOptions = redirectTo => ({
  provider: "google",
  options: { scopes: "openid email profile", redirectTo },
});

export async function initAccount({ getProgress, onProgress }) {
  const status = document.getElementById("account-status");
  const guest = document.getElementById("account-guest");
  const member = document.getElementById("account-member");
  const email = document.getElementById("account-email");
  const password = document.getElementById("account-password");
  const login = document.getElementById("login-screen");
  const shell = document.getElementById("app-shell");
  const dialog = document.getElementById("account-dialog");
  const chip = document.getElementById("account-chip");
  let initialized = false;
  // Deep links must not open an app dialog over the signed-out screen.
  document.querySelectorAll("dialog[open]").forEach(node => node.close());
  chip.onclick = () => dialog.showModal();
  document.getElementById("account-close").onclick = () => dialog.close();
  dialog.addEventListener("click", event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  document.getElementById("account-google").hidden = !GOOGLE_SIGN_IN_ENABLED;
  let user = null;
  let generation = 0;
  let pending = false;
  let running = false;
  let applying = false;
  const say = message => {
    status.textContent = message;
    document.getElementById("account-sync-status").textContent = message;
  };
  let client;
  try {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL("./vendor/supabase-2.119.0.js", import.meta.url).href;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
    client = globalThis.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  } catch {
    say("Couldn’t load sign-in. Please refresh the page to try again.");
    return;
  }

  async function sync() {
    pending = true;
    if (running || !user) return;
    running = true;
    try {
      while (pending && user) {
        pending = false;
        const current = user;
        const version = generation;
        say("Syncing progress…");
        const rows = progressRows(getProgress(), current.id);
        // Insert-only union: another device can never erase an earned pass.
        for (let offset = 0; offset < rows.length; offset += 500) {
          if (version !== generation) break;
          const { error } = await client.from("practice_progress").upsert(rows.slice(offset, offset + 500), {
            onConflict: "user_id,lesson_id,key_id,kind", ignoreDuplicates: true,
          });
          if (error) throw error;
        }
        if (version !== generation) continue;
        const remote = [];
        for (let offset = 0; ; offset += 500) {
          const { data, error } = await client.from("practice_progress").select("lesson_id,key_id,kind")
            .eq("user_id", current.id).order("lesson_id").order("key_id").order("kind").range(offset, offset + 499);
          if (error) throw error;
          remote.push(...data);
          if (data.length < 500 || version !== generation) break;
        }
        if (version !== generation) continue;
        const merged = mergeProgress(getProgress(), remote);
        applying = true;
        onProgress(merged, false);
        const saved = saveMastery(merged);
        applying = false;
        say(saved ? "Progress synced." : "Progress synced. Browser storage is unavailable.");
      }
    } catch {
      say("Couldn’t sync. Keep practicing; use Sync now to retry when online.");
    } finally {
      applying = false;
      running = false;
      if (pending && user) void sync();
    }
  }

  function changeAccount(next) {
    if (initialized && (next?.id ?? null) === (user?.id ?? null)) return;
    const switchingAccount = initialized;
    initialized = true;
    generation++;
    user = next;
    pending = false;
    setMasteryAccount(user?.id);
    onProgress(loadMastery(), switchingAccount);
    guest.hidden = Boolean(user);
    member.hidden = !user;
    login.hidden = Boolean(user);
    shell.hidden = !user;
    shell.inert = !user;
    const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Your account";
    const initials = String(name).trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
    document.getElementById("account-avatar").textContent = initials;
    document.getElementById("account-chip-name").textContent = name;
    document.getElementById("account-name").textContent = name;
    chip.setAttribute("aria-label", `Account: ${name}${user?.email ? `, ${user.email}` : ""}`);
    document.getElementById("account-identity").textContent = user?.email ?? "";
    password.value = "";
    say(user ? "Syncing progress…" : "");
    if (!user) {
      document.querySelectorAll("dialog[open]").forEach(node => node.close());
      email.focus({ preventScroll: true });
    } else chip.focus({ preventScroll: true });
    if (user) void sync();
  }
  client.auth.onAuthStateChange((_event, session) => {
    // Keep Supabase calls outside the auth callback's internal lock.
    setTimeout(() => changeAccount(session?.user ?? null), 0);
  });
  const { data, error } = await client.auth.getSession();
  if (error) say("Couldn’t restore your account. Please sign in again.");
  else changeAccount(data.session?.user ?? null);

  async function act(button, action) {
    button.disabled = true;
    try {
      const result = await action();
      if (result?.error) throw result.error;
    } catch (error) {
      say(error.message || "Couldn’t connect. Please try again.");
    } finally { button.disabled = false; }
  }
  function credentials() {
    if (!email.reportValidity() || !password.reportValidity()) return null;
    return { email: email.value.trim(), password: password.value };
  }
  guest.addEventListener("submit", event => {
    event.preventDefault();
    const button = document.getElementById("account-signin");
    if (button.disabled) return;
    void act(button, async () => {
      const values = credentials();
      if (values) return client.auth.signInWithPassword(values);
    });
  });
  document.getElementById("account-signup").onclick = event => act(event.currentTarget, async () => {
    const values = credentials();
    if (!values) return;
    const result = await client.auth.signUp(values);
    if (!result.error && !result.data.session) say("Check your email to confirm your account, then return here to sign in.");
    return result;
  });
  document.getElementById("account-google").onclick = event => act(event.currentTarget, () =>
    client.auth.signInWithOAuth(googleOptions(new URL(location.pathname, location.origin).href)));
  document.getElementById("account-signout").onclick = event => act(event.currentTarget, () => client.auth.signOut({ scope: "local" }));
  document.getElementById("account-sync").onclick = () => void sync();
  document.getElementById("account-import").onclick = () => {
    if (!user) return;
    const merged = mergeProgress(getProgress(), progressRows(loadMastery(MASTERY_KEY), user.id));
    onProgress(merged, false);
    saveMastery(merged);
  };
  addEventListener("duojazz-progress-saved", () => { if (!applying && user) void sync(); });
  addEventListener("online", () => { if (user) void sync(); });
  addEventListener("focus", () => { if (user) void sync(); });
  addEventListener("storage", event => {
    if (user && event.key === `${MASTERY_KEY}:${user.id}`) {
      onProgress(mergeProgress(getProgress(), progressRows(loadMastery(), user.id)), false);
      void sync();
    }
  });
  for (const button of guest.querySelectorAll("button")) button.disabled = false;
}
