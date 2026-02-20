const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 8000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const STATE_FILE = path.join(DATA_DIR, "shared-state.json");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
};

function defaultState() {
  return {
    requests: [],
    customNotifications: [],
    activityTimeline: [],
    loginLogs: [],
    dailyMessages: [],
    updatedAt: new Date().toISOString(),
  };
}

function ensureStateFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STATE_FILE)) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(defaultState(), null, 2));
  }
}

function readState() {
  ensureStateFile();
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...defaultState(),
      ...parsed,
      requests: Array.isArray(parsed.requests) ? parsed.requests : [],
      customNotifications: Array.isArray(parsed.customNotifications) ? parsed.customNotifications : [],
      activityTimeline: Array.isArray(parsed.activityTimeline) ? parsed.activityTimeline : [],
      loginLogs: Array.isArray(parsed.loginLogs) ? parsed.loginLogs : [],
      dailyMessages: Array.isArray(parsed.dailyMessages) ? parsed.dailyMessages : [],
    };
  } catch {
    return defaultState();
  }
}

function writeState(next) {
  ensureStateFile();
  const safe = {
    ...defaultState(),
    ...next,
    requests: Array.isArray(next.requests) ? next.requests : [],
    customNotifications: Array.isArray(next.customNotifications) ? next.customNotifications : [],
    activityTimeline: Array.isArray(next.activityTimeline) ? next.activityTimeline : [],
    loginLogs: Array.isArray(next.loginLogs) ? next.loginLogs : [],
    dailyMessages: Array.isArray(next.dailyMessages) ? next.dailyMessages : [],
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(safe, null, 2));
  return safe;
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function serveStatic(req, res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const fullPath = path.join(ROOT, path.normalize(safePath));

  if (!fullPath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    return sendJson(res, 204, {});
  }

  if (url.pathname === "/api/state" && req.method === "GET") {
    return sendJson(res, 200, readState());
  }

  if (url.pathname === "/api/state" && req.method === "PUT") {
    try {
      const raw = await readBody(req);
      const payload = raw ? JSON.parse(raw) : {};
      const saved = writeState(payload);
      return sendJson(res, 200, saved);
    } catch (error) {
      return sendJson(res, 400, { error: "Invalid JSON payload" });
    }
  }

  return serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  ensureStateFile();
  console.log(`Kalp Postası server running on http://0.0.0.0:${PORT}`);
});
