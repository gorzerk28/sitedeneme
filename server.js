const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 8000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const STATE_FILE = path.join(DATA_DIR, "shared-state.json");
const EMAIL_PROVIDER = String(process.env.EMAIL_PROVIDER || "").trim().toLowerCase();
const RESEND_API_KEY = String(process.env.RESEND_API_KEY || "").trim();
const EMAIL_FROM = String(process.env.EMAIL_FROM || "").trim();

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

function sendJson(req, res, status, payload) {
  const origin = req.headers.origin;
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  };

  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
    headers.Vary = "Origin";
  }

  res.writeHead(status, headers);
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

async function sendEmail(payload) {
  if (EMAIL_PROVIDER !== "resend" || !RESEND_API_KEY || !EMAIL_FROM) {
    return {
      ok: false,
      status: 501,
      error: "Email provider not configured",
      hint: "Set EMAIL_PROVIDER=resend, RESEND_API_KEY and EMAIL_FROM in Render environment.",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [payload.to],
      subject: payload.subject,
      text: payload.text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      ok: false,
      status: 502,
      error: "Failed to send email",
      details: errorText,
    };
  }

  return { ok: true, status: 200 };
}

function getNotifyStatus() {
  const missing = [];
  if (EMAIL_PROVIDER !== "resend") missing.push("EMAIL_PROVIDER=resend");
  if (!RESEND_API_KEY) missing.push("RESEND_API_KEY");
  if (!EMAIL_FROM) missing.push("EMAIL_FROM");

  return {
    ready: missing.length === 0,
    provider: EMAIL_PROVIDER || "not-set",
    from: EMAIL_FROM || "not-set",
    missing,
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    return sendJson(req, res, 204, {});
  }

  if (url.pathname === "/api/state" && req.method === "GET") {
    return sendJson(req, res, 200, readState());
  }

  if (url.pathname === "/api/state" && req.method === "PUT") {
    try {
      const raw = await readBody(req);
      const payload = raw ? JSON.parse(raw) : {};
      const saved = writeState(payload);
      return sendJson(req, res, 200, saved);
    } catch (error) {
      return sendJson(req, res, 400, { error: "Invalid JSON payload" });
    }
  }

  if (url.pathname === "/api/notify/status" && req.method === "GET") {
    return sendJson(req, res, 200, getNotifyStatus());
  }

  if (url.pathname === "/api/notify" && req.method === "POST") {
    try {
      const raw = await readBody(req);
      const payload = raw ? JSON.parse(raw) : {};

      if (payload.channel !== "email" || !payload.to || !payload.subject || !payload.text) {
        return sendJson(req, res, 400, {
          ok: false,
          error: "Invalid payload",
          expected: "{ channel: 'email', to, subject, text }",
        });
      }

      const result = await sendEmail(payload);
      return sendJson(req, res, result.status, result);
    } catch {
      return sendJson(req, res, 400, { ok: false, error: "Invalid JSON payload" });
    }
  }

  return serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  ensureStateFile();
  console.log(`Kalp Postası server running on http://0.0.0.0:${PORT}`);
});
