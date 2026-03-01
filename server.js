diff --git a/server.js b/server.js
index 5ebbd42f9827306e459c29287084363e92a2005b..7669d1695218b79bc74fd21d53a53ce9dff795cf 100644
--- a/server.js
+++ b/server.js
@@ -14,109 +14,126 @@ const EMAIL_FROM = String(process.env.EMAIL_FROM || "").trim();
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
     deletedRequestIds: [],
     customNotifications: [],
     activityTimeline: [],
     loginLogs: [],
     dailyMessages: [],
     partnerPresence: {
       partnerOnline: false,
       updatedAt: null,
     },
+    servicePause: {
+      active: false,
+      reason: "",
+      updatedAt: null,
+    },
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
       deletedRequestIds: Array.isArray(parsed.deletedRequestIds)
         ? parsed.deletedRequestIds.map((id) => String(id))
         : [],
       customNotifications: Array.isArray(parsed.customNotifications) ? parsed.customNotifications : [],
       activityTimeline: Array.isArray(parsed.activityTimeline) ? parsed.activityTimeline : [],
       loginLogs: Array.isArray(parsed.loginLogs) ? parsed.loginLogs : [],
       dailyMessages: Array.isArray(parsed.dailyMessages) ? parsed.dailyMessages : [],
       partnerPresence:
         parsed.partnerPresence && typeof parsed.partnerPresence === "object"
           ? parsed.partnerPresence
           : { partnerOnline: false, updatedAt: null },
+      servicePause:
+        parsed.servicePause && typeof parsed.servicePause === "object"
+          ? parsed.servicePause
+          : { active: false, reason: "", updatedAt: null },
     };
   } catch {
     return defaultState();
   }
 }
 
 function writeState(next) {
   ensureStateFile();
   const deletedSet = new Set(
     Array.isArray(next.deletedRequestIds) ? next.deletedRequestIds.map((id) => String(id)) : []
   );
   const sanitizedRequests = Array.isArray(next.requests)
     ? next.requests.filter((item) => !deletedSet.has(String(item.id)))
     : [];
 
   const safe = {
     ...defaultState(),
     ...next,
     requests: sanitizedRequests,
     deletedRequestIds: [...deletedSet],
     customNotifications: Array.isArray(next.customNotifications) ? next.customNotifications : [],
     activityTimeline: Array.isArray(next.activityTimeline) ? next.activityTimeline : [],
     loginLogs: Array.isArray(next.loginLogs) ? next.loginLogs : [],
     dailyMessages: Array.isArray(next.dailyMessages) ? next.dailyMessages : [],
     partnerPresence:
       next.partnerPresence && typeof next.partnerPresence === "object"
         ? next.partnerPresence
         : { partnerOnline: false, updatedAt: null },
+    servicePause:
+      next.servicePause && typeof next.servicePause === "object"
+        ? {
+            active: Boolean(next.servicePause.active),
+            reason: String(next.servicePause.reason || "").trim(),
+            updatedAt: next.servicePause.updatedAt || new Date().toISOString(),
+          }
+        : { active: false, reason: "", updatedAt: null },
     updatedAt: new Date().toISOString(),
   };
   fs.writeFileSync(STATE_FILE, JSON.stringify(safe, null, 2));
   return safe;
 }
 
 function getRequestRevision(item) {
   const parsed = Number(item?._rev ?? 0);
   if (!Number.isFinite(parsed) || parsed < 0) return 0;
   return Math.floor(parsed);
 }
 
 function mergeState(next) {
   const current = readState();
   const incomingRequests = Array.isArray(next.requests) ? next.requests : [];
   const incomingDeleted = Array.isArray(next.deletedRequestIds)
     ? next.deletedRequestIds.map((id) => String(id))
     : [];
 
   const deletedSet = new Set([...(current.deletedRequestIds || []), ...incomingDeleted]);
   const requestMap = new Map();
 
   current.requests.forEach((item) => {
     requestMap.set(String(item.id), item);
   });
@@ -179,51 +196,55 @@ function writePresence(nextPresence) {
     partnerPresence: safePresence,
   });
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
-  const fullPath = path.join(ROOT, path.normalize(safePath));
+  const normalizedRelativePath = path
+    .normalize(safePath)
+    .replace(/^([/\\])+/, "")
+    .replace(/^(\.\.(?:[/\\]|$))+/, "");
+  const fullPath = path.join(ROOT, normalizedRelativePath);
 
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
