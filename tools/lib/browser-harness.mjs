import { existsSync } from "node:fs";
import { startStaticServer } from "../dev-server.mjs";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

/** Locate a local Chromium/Chrome binary if one is present on standard paths or CHROME_PATH. */
export function findChromium() {
  return CHROME_CANDIDATES.find((candidate) => existsSync(candidate)) ?? null;
}

/** Load Playwright from PLAYWRIGHT_MODULE, 'playwright', or 'playwright-core'. */
export async function loadPlaywright() {
  const candidates = [process.env.PLAYWRIGHT_MODULE, "playwright", "playwright-core"].filter(Boolean);
  let lastError = null;
  for (const spec of candidates) {
    try {
      return await import(spec);
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `Playwright module not found. Set PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs (${lastError?.message ?? "not installed"})`,
  );
}

/** Launch headless Chromium using findChromium() when available. */
export async function launchBrowser(extraOptions = {}) {
  const { chromium } = await loadPlaywright();
  const executablePath = findChromium();
  return chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
    ...(executablePath ? { executablePath } : {}),
    ...extraOptions,
  });
}

/** Provide APP_URL (existing server) or spin up an ephemeral no-store static server for fn(appUrl). */
export async function withAppUrl(fn) {
  if (process.env.APP_URL) return fn(process.env.APP_URL);
  const server = await startStaticServer({ host: "127.0.0.1", port: 0, liveReload: false });
  try {
    return await fn(server.url);
  } finally {
    await server.close();
  }
}

export async function poll(fn, { timeoutMs = 10000, intervalMs = 100 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    if (fn()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("Timed out waiting for cloud save");
}

/** Shared in-memory Supabase transport mock for isolated account/library browser verification. */
export function createCloudMock({ accountId = "test-account-a", email = "test@example.com" } = {}) {
  const rows = new Map();
  const progress = new Map();
  let progressRequests = 0;
  let fail = false;

  const clientScript = `
let identity = {id:${JSON.stringify(accountId)},email:${JSON.stringify(email)}}, listener;
window.testSwitchAccount = (id) => { identity = id ? {id,email:id+'@example.com'} : null; listener(id?'SIGNED_IN':'SIGNED_OUT',identity?{user:identity}:null); };
const request = async (table, body) => { try {const r = await fetch('/test-cloud/'+table,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); return await r.json();} catch {return {error:{message:'offline'}};} };
window.supabase = {createClient: () => ({auth:{
 onAuthStateChange(cb) {listener=cb;}, async getSession(){return {data:{session:{user:identity}}};}, async signOut(){window.testSwitchAccount(null); return {};}, async stopAutoRefresh(){}
}, rpc(name,args){return request('rpc',{id:identity.id,...args});}, from(table){return {
 select(){let id,from=0,to=499;const q={eq(_,v){id=v;return q;},order(){return q;},range(a,b){from=a;to=b;return q;},then(resolve,reject){return request(table,{id,from,to}).then(resolve,reject);}};return q;},
 upsert(batch, options){return request(table,{batch,options});}
};}})};
`;

  async function installRoutes(context, { blockPwa = true, deferStorageEvents = true } = {}) {
    if (deferStorageEvents) {
      await context.addInitScript(() => {
        const add = window.addEventListener.bind(window);
        const waiting = [];
        window.addEventListener = (type, fn, opts) => (type === "storage" ? waiting.push([fn, opts]) : add(type, fn, opts));
        window.testEnableStorage = () => {
          for (const [fn, opts] of waiting.splice(0)) add("storage", fn, opts);
        };
      });
    }
    if (blockPwa) {
      await context.route("**/js/pwa.js*", (route) => route.fulfill({ contentType: "application/javascript", body: "" }));
    }
    await context.route("https://*.supabase.co/**", (route) => route.abort());
    await context.route("**/js/vendor/supabase-2.119.0.js", (route) =>
      route.fulfill({ contentType: "application/javascript", body: clientScript }),
    );
    await context.route("**/test-cloud/*", async (route) => {
      const table = route.request().url().split("/").at(-1);
      const body = route.request().postDataJSON();
      if (fail && (table === "user_preferences" || table === "rpc")) {
        return route.fulfill({ json: { error: { message: "temporary failure" } } });
      }
      if (table === "practice_progress") {
        progressRequests += 1;
        if (body.batch) {
          for (const r of body.batch) progress.set([r.user_id, r.lesson_id, r.key_id, r.kind].join(":"), r);
          return route.fulfill({ json: {} });
        }
        return route.fulfill({ json: { data: [...progress.values()].filter((r) => r.user_id === body.id) } });
      }
      if (table === "rpc") {
        for (const row of body.changes) {
          const key = `${body.id}:${row.name}`;
          const old = rows.get(key);
          if (!old || row.edit_clock > old.edit_clock || (row.edit_clock === old.edit_clock && row.edit_id > old.edit_id)) {
            rows.set(key, { ...row, user_id: body.id });
          }
        }
        return route.fulfill({ json: {} });
      }
      if (body.batch) {
        for (const row of body.batch) {
          const key = `${row.user_id}:${row.name}`;
          if (!body.options.ignoreDuplicates || !rows.has(key)) rows.set(key, row);
        }
        return route.fulfill({ json: {} });
      }
      return route.fulfill({
        json: {
          data: [...rows.values()]
            .filter((r) => r.user_id === body.id)
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(body.from, body.to + 1),
        },
      });
    });
  }

  return {
    rows,
    progress,
    clientScript,
    installRoutes,
    setFail(value) {
      fail = Boolean(value);
    },
    getProgressRequests() {
      return progressRequests;
    },
    resetProgressRequests() {
      progressRequests = 0;
    },
  };
}
