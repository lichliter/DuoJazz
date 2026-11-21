import { createServer } from "node:http";
import { createReadStream, watch } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = fileURLToPath(new URL("../", import.meta.url));

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

const RELOAD_SNIPPET = `<script>new EventSource('/__dev_reload').addEventListener('reload', () => location.reload());</script></body>`;

function safeFilePath(rootDir, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const clean = decoded === "/" ? "/index.html" : decoded;
  const target = resolve(rootDir, "." + (clean.startsWith("/") ? clean : `/${clean}`));
  const rel = relative(rootDir, target);
  if (!rel || rel.startsWith("..") || rel.includes(`..${sep}`) || target === rootDir) return null;
  return target;
}

/** Start a zero-dependency HTTP/1.1 static server with no-store caching and optional SSE live reload. */
export async function startStaticServer({
  root = DEFAULT_ROOT,
  host = "127.0.0.1",
  port = 4173,
  liveReload = false,
} = {}) {
  const rootDir = resolve(root);
  const sseClients = new Set();
  const watchers = [];
  let reloadTimer = null;

  const notifyReload = () => {
    for (const res of sseClients) {
      try {
        res.write("event: reload\ndata: 1\n\n");
      } catch {
        sseClients.delete(res);
      }
    }
  };

  const scheduleReload = (filename) => {
    if (filename && (filename.endsWith(".test.mjs") || filename.includes(`vendor${sep}`) || filename.startsWith("vendor/"))) return;
    if (reloadTimer) clearTimeout(reloadTimer);
    reloadTimer = setTimeout(notifyReload, 120);
  };

  if (liveReload) {
    for (const target of ["index.html", "gallery.html", "sound.html", "css", "js"]) {
      const full = resolve(rootDir, target);
      try {
        const info = await stat(full);
        const w = watch(full, info.isDirectory() ? { recursive: true } : {}, (_, file) => scheduleReload(file));
        watchers.push(w);
      } catch {
        // Ignore missing optional paths.
      }
    }
  }

  const server = createServer(async (req, res) => {
    const method = req.method ?? "GET";
    if (method !== "GET" && method !== "HEAD") {
      res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      res.end("Method Not Allowed");
      return;
    }

    const rawUrl = req.url ?? "/";
    const rawPath = rawUrl.split(/[?#]/, 1)[0] || "/";
    if (liveReload && rawPath === "/__dev_reload") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
      });
      res.write(": connected\n\n");
      sseClients.add(res);
      req.on("close", () => sseClients.delete(res));
      return;
    }

    let filePath = safeFilePath(rootDir, rawPath);
    if (!filePath) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      res.end("Forbidden");
      return;
    }

    let info;
    try {
      info = await stat(filePath);
      if (info.isDirectory()) {
        filePath = resolve(filePath, "index.html");
        info = await stat(filePath);
      }
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      res.end("Not Found");
      return;
    }

    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

    if (liveReload && ext === ".html") {
      const html = await readFile(filePath, "utf8");
      const body = html.includes("</body>") ? html.replace("</body>", RELOAD_SNIPPET) : html;
      const buf = Buffer.from(body, "utf8");
      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": buf.length,
        "Cache-Control": "no-store",
      });
      res.end(method === "HEAD" ? undefined : buf);
      return;
    }

    const range = req.headers.range;
    if (range && info.size > 0) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      if (match) {
        const start = match[1] ? Number(match[1]) : 0;
        const end = match[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1;
        if (!Number.isInteger(start) || !Number.isInteger(end) || start > end || start >= info.size) {
          res.writeHead(416, { "Content-Range": `bytes */${info.size}`, "Cache-Control": "no-store" });
          res.end();
          return;
        }
        res.writeHead(206, {
          "Content-Type": contentType,
          "Content-Range": `bytes ${start}-${end}/${info.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": end - start + 1,
          "Cache-Control": "no-store",
        });
        if (method === "HEAD") res.end();
        else createReadStream(filePath, { start, end }).pipe(res);
        return;
      }
    }

    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": info.size,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    });
    if (method === "HEAD") res.end();
    else createReadStream(filePath).pipe(res);
  });

  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(port, host, () => resolveListen());
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  const url = `http://${host}:${actualPort}/`;

  return {
    server,
    port: actualPort,
    url,
    async close() {
      if (reloadTimer) clearTimeout(reloadTimer);
      for (const w of watchers) w.close();
      for (const res of sseClients) res.end();
      sseClients.clear();
      await new Promise((resolveClose) => {
        server.close(() => resolveClose());
        server.closeAllConnections?.();
      });
    },
  };
}

if (process.argv[1] && new URL(process.argv[1], "file:").href === import.meta.url) {
  const port = Number(process.env.PORT ?? 4173);
  const host = process.env.HOST ?? "127.0.0.1";
  const liveReload = process.env.DEV_RELOAD !== "0";
  const instance = await startStaticServer({ host, port, liveReload });
  console.log(`Serving DuoJazz at ${instance.url} (no-store${liveReload ? ", live-reload" : ""})`);
  const shutdown = async () => {
    await instance.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
