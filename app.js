diff --git a/app.js b/app.js
index fe5820e5a2f90604086ad9d8f1854901374e0b76..76f5278113e0b07c75d3b2a75da085752f31e97a 100644
--- a/app.js
+++ b/app.js
@@ -1,35 +1,36 @@
 const STORAGE_KEY = "kalp-postasi-requests";
 const CUSTOM_NOTIFICATIONS_KEY = "kalp-postasi-custom-notifications";
 const ADMIN_SESSION_KEY = "kalp-postasi-admin-session";
 const SITE_SESSION_KEY = "kalp-postasi-site-session";
 const PRESENCE_KEY = "kalp-postasi-presence";
 const ACTIVITY_TIMELINE_KEY = "kalp-postasi-activity-timeline";
 const LOGIN_LOGS_KEY = "kalp-postasi-login-logs";
 const DAILY_MESSAGES_KEY = "kalp-postasi-daily-messages";
 const OWNER_DEVICE_KEY = "kalp-postasi-owner-device";
 const SITE_LOGIN_ACTOR_KEY = "kalp-postasi-site-login-actor";
+const SERVICE_PAUSE_KEY = "kalp-postasi-service-pause";
 
 const config = window.APP_CONFIG || {};
 const FALLBACK_SITE_PASSWORD = "iremhasekisultan";
 const FALLBACK_ADMIN_PASSWORD = "gorzerk28";
 
 const SITE_PASSWORD = String(
   config.sitePassword || localStorage.getItem("kalp-postasi-site-password") || FALLBACK_SITE_PASSWORD
 ).trim();
 const ADMIN_PASSWORD = String(
   config.adminPassword || localStorage.getItem("kalp-postasi-admin-password") || FALLBACK_ADMIN_PASSWORD
 ).trim();
 const OWNER_SITE_PASSWORD = String(
   config.ownerSitePassword || localStorage.getItem("kalp-postasi-owner-site-password") || ADMIN_PASSWORD
 ).trim();
 const PARTNER_USERNAME = String(
   config.partnerUsername || localStorage.getItem("kalp-postasi-partner-username") || "partner"
 )
   .trim()
   .toLocaleLowerCase("tr-TR");
 const OWNER_USERNAME = String(
   config.ownerUsername || localStorage.getItem("kalp-postasi-owner-username") || "kalpsorumlusu"
 )
   .trim()
   .toLocaleLowerCase("tr-TR");
 
@@ -66,92 +67,97 @@ const REMOTE_FETCH_CREDENTIALS = REMOTE_STATE_IS_SAME_ORIGIN ? "same-origin" : "
 const STATIC_ONLY_HOSTS = ["github.io", "githubusercontent.com"];
 const RUNNING_ON_STATIC_ONLY_HOST = STATIC_ONLY_HOSTS.some((host) =>
   window.location.hostname.endsWith(host)
 );
 const PARTNER_EMAIL = String(config.partnerEmail || "").trim();
 let remoteSyncEnabled = SYNC_MODE !== "local";
 let hasWarnedRemoteUnavailable = false;
 
 const DEFAULT_DAILY_LOVE_MESSAGES = [
   "Bugün de kalbim seninle aynı ritimde atıyor. 💓",
   "Birlikte olduğumuz her gün, en sevdiğim gün oluyor. 🌸",
   "Küçük bir gülüşün bile bütün günümü aydınlatıyor. ☀️",
   "Sana yazılan her talep aslında sana duyduğum sevginin başka hali. 💌",
   "İyi ki varsın, iyi ki bizim küçük dünyamız var. 🌷",
   "Bugün ne olursa olsun, yanında olmayı seçiyorum. 🤍",
   "Seninle sıradan günler bile kutlama gibi geliyor. ✨",
 ];
 
 const state = {
   requests: loadRequests(),
   customNotifications: loadCustomNotifications(),
   activityTimeline: loadActivityTimeline(),
   loginLogs: loadLoginLogs(),
   dailyMessages: loadDailyMessages(),
   partnerPresence: loadPartnerPresence(),
+  servicePause: loadServicePause(),
   failedSiteAttempts: 0,
 };
 
 const adminDrafts = new Map();
 
 const body = document.body;
 const appShell = document.getElementById("appShell");
 const siteLoginForm = document.getElementById("siteLoginForm");
 const siteLoginInfo = document.getElementById("siteLoginInfo");
 const siteLogoutBtn = document.getElementById("siteLogoutBtn");
 const notificationBell = document.getElementById("notificationBell");
 const notificationCount = document.getElementById("notificationCount");
 const bellInfo = document.getElementById("bellInfo");
 
 const tabs = document.querySelectorAll(".tab-btn");
 const panels = document.querySelectorAll(".panel");
 const requestForm = document.getElementById("requestForm");
 const formInfo = document.getElementById("formInfo");
 const trackList = document.getElementById("trackList");
 const trackNotifications = document.getElementById("trackNotifications");
 const adminList = document.getElementById("adminList");
 const adminLoginForm = document.getElementById("adminLoginForm");
 const loginInfo = document.getElementById("loginInfo");
 const adminGate = document.getElementById("adminGate");
 const adminContent = document.getElementById("adminContent");
 const logoutBtn = document.getElementById("logoutBtn");
 const sendNotificationForm = document.getElementById("sendNotificationForm");
 const sendNotificationInfo = document.getElementById("sendNotificationInfo");
 const partnerPresence = document.getElementById("partnerPresence");
 const loveBurstLayer = document.getElementById("loveBurstLayer");
 const brandLogoImage = document.getElementById("brandLogoImage");
 const gateHeroImage = document.getElementById("gateHeroImage");
 const dailyLoveMessage = document.getElementById("dailyLoveMessage");
 const loveCalendar = document.getElementById("loveCalendar");
 const activityTimeline = document.getElementById("activityTimeline");
 const loginLogs = document.getElementById("loginLogs");
 const dailyMessageForm = document.getElementById("dailyMessageForm");
 const dailyMessageInput = document.getElementById("dailyMessageInput");
 const dailyMessageInfo = document.getElementById("dailyMessageInfo");
 const dailyMessageResetBtn = document.getElementById("dailyMessageResetBtn");
 const mailStatusBadge = document.getElementById("mailStatusBadge");
 const mailStatusHint = document.getElementById("mailStatusHint");
+const servicePauseBanner = document.getElementById("servicePauseBanner");
+const servicePauseMessage = document.getElementById("servicePauseMessage");
+const toggleServicePauseBtn = document.getElementById("toggleServicePauseBtn");
+const servicePauseAdminInfo = document.getElementById("servicePauseAdminInfo");
 
 function setFirstAvailableImage(imgEl, candidates) {
   if (!imgEl) return;
 
   const tryAt = (index) => {
     if (index >= candidates.length) {
       imgEl.style.display = "none";
       return;
     }
 
     const test = new Image();
     test.onload = () => {
       imgEl.src = candidates[index];
       imgEl.style.display = "";
     };
     test.onerror = () => tryAt(index + 1);
     test.src = candidates[index];
   };
 
   tryAt(0);
 }
 
 setFirstAvailableImage(brandLogoImage, [
   "assets/logo-kalp-isleri.png",
   "assets/logo.png",
@@ -366,104 +372,114 @@ function playCelebrationBurst(mode = "soft") {
   const count = mode === "big" ? 26 : 14;
   const emojis = mode === "big" ? ["💖", "✨", "🎉", "💘"] : ["💗", "💞", "✨"];
 
   for (let i = 0; i < count; i += 1) {
     const confetti = document.createElement("span");
     confetti.className = "celebration-heart";
     confetti.textContent = emojis[i % emojis.length];
     confetti.style.left = `${15 + Math.random() * 70}%`;
     confetti.style.top = `${60 + Math.random() * 20}%`;
     confetti.style.animationDelay = `${Math.random() * 180}ms`;
     loveBurstLayer.appendChild(confetti);
     setTimeout(() => confetti.remove(), 1700);
   }
 }
 
 function getSerializableState(options = {}) {
   const { deletedRequestIds = [] } = options;
 
   const payload = {
     requests: state.requests,
     customNotifications: state.customNotifications,
     activityTimeline: state.activityTimeline,
     loginLogs: state.loginLogs,
     dailyMessages: state.dailyMessages,
     partnerPresence: state.partnerPresence,
+    servicePause: state.servicePause,
   };
 
   if (Array.isArray(deletedRequestIds) && deletedRequestIds.length) {
     payload.deletedRequestIds = deletedRequestIds;
   }
 
   return payload;
 }
 
 function isAdminEditorActive() {
   if (!adminList) return false;
   const active = document.activeElement;
   if (!active) return false;
   if (!adminList.contains(active)) return false;
   const tag = (active.tagName || "").toLowerCase();
   return tag === "textarea" || tag === "select" || tag === "input";
 }
 
 function applyRemoteState(remote) {
   if (!remote || typeof remote !== "object") return;
 
   state.requests = Array.isArray(remote.requests) ? remote.requests : state.requests;
   state.customNotifications = Array.isArray(remote.customNotifications)
     ? remote.customNotifications
     : state.customNotifications;
   state.activityTimeline = Array.isArray(remote.activityTimeline)
     ? remote.activityTimeline
     : state.activityTimeline;
   state.loginLogs = Array.isArray(remote.loginLogs) ? remote.loginLogs : state.loginLogs;
   state.dailyMessages = Array.isArray(remote.dailyMessages) && remote.dailyMessages.length
     ? remote.dailyMessages
     : state.dailyMessages;
   state.partnerPresence = remote.partnerPresence && typeof remote.partnerPresence === "object"
     ? remote.partnerPresence
     : state.partnerPresence;
+  state.servicePause = remote.servicePause && typeof remote.servicePause === "object"
+    ? {
+        active: Boolean(remote.servicePause.active),
+        reason: String(remote.servicePause.reason || "").trim(),
+        updatedAt: remote.servicePause.updatedAt || null,
+      }
+    : state.servicePause;
 
   suppressRemotePush = true;
   saveRequests();
   saveCustomNotifications();
   saveActivityTimeline();
   saveLoginLogs();
   saveDailyMessages();
   savePartnerPresence();
+  saveServicePause();
   suppressRemotePush = false;
 
   renderTrackNotifications();
   renderTrackList();
   if (!isAdminEditorActive()) {
     renderAdminList();
   }
   renderActivityTimeline();
   renderLoginLogs();
   renderDailyLoveMessage();
   renderDailyMessageEditor();
+  renderServicePauseUI();
 }
 
 let remotePushTimer = null;
 let suppressRemotePush = false;
 let hasPendingRemoteChanges = false;
 let hasHydratedRemoteState = false;
 let remoteHydrationPromise = null;
 
 function notifyRemoteUnavailable(reason = "") {
   if (hasWarnedRemoteUnavailable) return;
   hasWarnedRemoteUnavailable = true;
   if (!siteLoginInfo) return;
 
   if (reason === "static-host") {
     siteLoginInfo.textContent =
       "Bu site şu anda GitHub Pages gibi statik bir ortamda açılmış. Farklı cihaz senkronu için siteyi Render/Turhost Node sunucusunda açmalısın.";
     return;
   }
 
   if (SYNC_MODE === "auto") {
     if (!siteLoginInfo.textContent) {
       siteLoginInfo.textContent = "Sunucu senkronu bulunamadı, yerel modda devam ediliyor.";
     }
     return;
   }
@@ -657,50 +673,99 @@ function renderPresenceBadge() {
     const isOnline = Boolean(source.partnerOnline) && Date.now() - updated < 15000;
 
     partnerPresence.textContent = isOnline ? "Sevgilin çevrimiçi" : "Sevgilin çevrimdışı";
     partnerPresence.className = `presence-badge ${isOnline ? "online" : "offline"}`;
   } catch {
     partnerPresence.textContent = "Sevgilin çevrimdışı";
     partnerPresence.className = "presence-badge offline";
   }
 }
 
 function loadPartnerPresence() {
   const raw = localStorage.getItem(PRESENCE_KEY);
   if (!raw) return { partnerOnline: false, updatedAt: null };
 
   try {
     return JSON.parse(raw);
   } catch {
     return { partnerOnline: false, updatedAt: null };
   }
 }
 
 function savePartnerPresence() {
   localStorage.setItem(PRESENCE_KEY, JSON.stringify(state.partnerPresence));
 }
 
+function loadServicePause() {
+  const raw = localStorage.getItem(SERVICE_PAUSE_KEY);
+  if (!raw) return { active: false, reason: "", updatedAt: null };
+
+  try {
+    const parsed = JSON.parse(raw);
+    return {
+      active: Boolean(parsed.active),
+      reason: String(parsed.reason || "").trim(),
+      updatedAt: parsed.updatedAt || null,
+    };
+  } catch {
+    return { active: false, reason: "", updatedAt: null };
+  }
+}
+
+function saveServicePause() {
+  localStorage.setItem(SERVICE_PAUSE_KEY, JSON.stringify(state.servicePause));
+  queueRemotePush();
+}
+
+function getServicePauseMessage() {
+  const customReason = String(state.servicePause?.reason || "").trim();
+  if (customReason) return customReason;
+  return "Şu an kalp sorumlusu sinirli veya kalbi kırık durumda. Sinirinden korktuğumuz için geçici olarak talep alamıyoruz. Lütfen hızlıca gönlünü alıp sistemi yeniden romantik moda döndür 💞";
+}
+
+function renderServicePauseUI() {
+  if (!servicePauseBanner || !requestForm) return;
+
+  const isPaused = Boolean(state.servicePause?.active);
+  requestForm.classList.toggle("hidden", isPaused);
+  servicePauseBanner.classList.toggle("hidden", !isPaused);
+
+  if (servicePauseMessage) {
+    servicePauseMessage.textContent = getServicePauseMessage();
+  }
+
+  if (toggleServicePauseBtn) {
+    toggleServicePauseBtn.textContent = isPaused ? "Sinirli Modu Kapat" : "Sinirli Modu Aç";
+  }
+
+  if (servicePauseAdminInfo) {
+    servicePauseAdminInfo.textContent = isPaused
+      ? "Sinirli mod aktif: Partner girişinde talep formu yerine barış mesajı ekranı gösteriliyor."
+      : "Sinirli mod kapalı: Partner normal şekilde talep oluşturabilir.";
+  }
+}
+
 function playLoveBurst() {
   if (!loveBurstLayer) return;
 
   const burstCount = 18;
   for (let i = 0; i < burstCount; i += 1) {
     const heart = document.createElement("span");
     heart.className = "love-heart";
     heart.textContent = i % 3 === 0 ? "💖" : i % 3 === 1 ? "💗" : "💘";
 
     const x = 20 + Math.random() * 60;
     const y = 70 + Math.random() * 12;
     heart.style.left = `${x}%`;
     heart.style.top = `${y}%`;
     heart.style.animationDelay = `${Math.random() * 180}ms`;
 
     loveBurstLayer.appendChild(heart);
     setTimeout(() => heart.remove(), 1600);
   }
 }
 
 function loadRequests() {
   const raw = localStorage.getItem(STORAGE_KEY);
   if (!raw) return [];
 
   try {
@@ -1319,52 +1384,78 @@ if (dailyMessageForm) {
     if (!lines.length) {
       dailyMessageInfo.textContent = "En az bir mesaj girmelisin.";
       return;
     }
 
     state.dailyMessages = lines;
     saveDailyMessages();
     renderDailyLoveMessage();
     renderDailyMessageEditor();
     dailyMessageInfo.textContent = "Günün mesajı listesi güncellendi 💖";
     addActivity("admin", "Günün mesajları güncellendi.");
   });
 }
 
 if (dailyMessageResetBtn) {
   dailyMessageResetBtn.addEventListener("click", () => {
     state.dailyMessages = [...DEFAULT_DAILY_LOVE_MESSAGES];
     localStorage.removeItem(DAILY_MESSAGES_KEY);
     renderDailyLoveMessage();
     renderDailyMessageEditor();
     dailyMessageInfo.textContent = "Varsayılan romantik sözlere dönüldü.";
     addActivity("admin", "Günün mesajları varsayılana döndürüldü.");
   });
 }
 
+if (toggleServicePauseBtn) {
+  toggleServicePauseBtn.addEventListener("click", async () => {
+    const nextActive = !Boolean(state.servicePause?.active);
+
+    await syncBeforeMutation();
+
+    state.servicePause = {
+      active: nextActive,
+      reason: "",
+      updatedAt: new Date().toISOString(),
+    };
+
+    saveServicePause();
+    await pushRemoteState();
+    renderServicePauseUI();
+
+    addActivity(
+      "admin",
+      nextActive
+        ? "Sinirli mod aktif edildi: talep oluşturma geçici olarak kapatıldı."
+        : "Sinirli mod kapatıldı: talep oluşturma yeniden açıldı."
+    );
+  });
+}
+
 if (!SITE_PASSWORD || !ADMIN_PASSWORD) {
   siteLoginInfo.textContent =
     "Şifre yapılandırması yüklenemedi. config.js kontrol et veya fallback şifreleri kullan.";
 }
 
 renderDailyLoveMessage();
 renderDailyMessageEditor();
+renderServicePauseUI();
 renderTrackNotifications();
 renderTrackList();
 renderActivityTimeline();
 renderLoginLogs();
 renderMailSetupStatus();
 setAdminSession(localStorage.getItem(ADMIN_SESSION_KEY) === "1");
 setSiteSession(sessionStorage.getItem(SITE_SESSION_KEY) === "1");
 renderPresenceBadge();
 if (remoteSyncEnabled) {
   if (RUNNING_ON_STATIC_ONLY_HOST && REMOTE_STATE_IS_SAME_ORIGIN) {
     remoteSyncEnabled = false;
     notifyRemoteUnavailable("static-host");
   } else {
     pullRemoteState();
     setInterval(pullRemoteState, 7000);
   }
 }
 
 setInterval(updatePresenceHeartbeat, 5000);
 setInterval(renderPresenceBadge, 5000);
