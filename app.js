const STORAGE_KEY = "kalp-postasi-requests";
const CUSTOM_NOTIFICATIONS_KEY = "kalp-postasi-custom-notifications";
const ADMIN_SESSION_KEY = "kalp-postasi-admin-session";
const SITE_SESSION_KEY = "kalp-postasi-site-session";
const PRESENCE_KEY = "kalp-postasi-presence";
const ACTIVITY_TIMELINE_KEY = "kalp-postasi-activity-timeline";

const config = window.APP_CONFIG || {};
const SITE_PASSWORD = config.sitePassword || "";
const ADMIN_PASSWORD = config.adminPassword || "";

const state = {
  requests: loadRequests(),
  customNotifications: loadCustomNotifications(),
  activityTimeline: loadActivityTimeline(),
  failedSiteAttempts: 0,
};

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
  "assets/logo-2.png",
  "logo-kalp-isleri.png",
  "logo.png",
]);

setFirstAvailableImage(gateHeroImage, [
  "assets/hero-envelope.png",
  "assets/hero.png",
  "assets/envelope.png",
  "hero-envelope.png",
  "hero.png",
]);

const DAILY_LOVE_MESSAGES = [
  "Bugün de kalbim seninle aynı ritimde atıyor. 💓",
  "Birlikte olduğumuz her gün, en sevdiğim gün oluyor. 🌸",
  "Küçük bir gülüşün bile bütün günümü aydınlatıyor. ☀️",
  "Sana yazılan her talep aslında sana duyduğum sevginin başka hali. 💌",
  "İyi ki varsın, iyi ki bizim küçük dünyamız var. 🌷",
  "Bugün ne olursa olsun, yanında olmayı seçiyorum. 🤍",
  "Seninle sıradan günler bile kutlama gibi geliyor. ✨",
];

function getDayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function renderDailyLoveMessage() {
  if (!dailyLoveMessage) return;

  const index = getDayOfYear() % DAILY_LOVE_MESSAGES.length;
  dailyLoveMessage.textContent = DAILY_LOVE_MESSAGES[index];
}

function loadActivityTimeline() {
  const raw = localStorage.getItem(ACTIVITY_TIMELINE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveActivityTimeline() {
  localStorage.setItem(ACTIVITY_TIMELINE_KEY, JSON.stringify(state.activityTimeline));
}

function addActivity(type, text) {
  const item = {
    id: `a-${Date.now().toString(36)}`,
    type,
    text,
    createdAt: new Date().toISOString(),
  };

  state.activityTimeline.unshift(item);
  state.activityTimeline = state.activityTimeline.slice(0, 30);
  saveActivityTimeline();
  renderActivityTimeline();
}

function renderActivityTimeline() {
  if (!activityTimeline) return;

  activityTimeline.innerHTML = "";

  if (!state.activityTimeline.length) {
    activityTimeline.innerHTML = '<p class="muted">Henüz aktivite yok. İlk hareket burada görünecek 💫</p>';
    return;
  }

  const list = document.createElement("ul");
  list.className = "activity-list";

  state.activityTimeline.forEach((item) => {
    const li = document.createElement("li");
    li.className = "activity-item";
    const dateText = new Date(item.createdAt).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    li.innerHTML = `<span class="activity-dot"></span><div><p>${item.text}</p><small>${dateText}</small></div>`;
    list.appendChild(li);
  });

  activityTimeline.appendChild(list);
}

function renderLoveCalendar() {
  if (!loveCalendar) return;

  loveCalendar.innerHTML = "";

  if (!state.requests.length) {
    loveCalendar.innerHTML = '<p class="muted">Takvim henüz boş. İlk planı ekleyince burada gözükecek 💞</p>';
    return;
  }

  const ordered = [...state.requests]
    .filter((item) => item.targetDate)
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate))
    .slice(0, 6);

  ordered.forEach((item) => {
    const card = document.createElement("article");
    card.className = "calendar-item";
    card.innerHTML = `
      <p class="calendar-date">${formatDate(item.targetDate)}</p>
      <h4>${item.title}</h4>
      <p class="muted">${item.category} • ${item.status}</p>
    `;
    loveCalendar.appendChild(card);
  });
}

function playCelebrationBurst(mode = "soft") {
  if (!loveBurstLayer) return;

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

function updatePresenceHeartbeat() {
  const isSiteUnlocked = sessionStorage.getItem(SITE_SESSION_KEY) === "1";
  const isKalpSorumlusuSession = localStorage.getItem(ADMIN_SESSION_KEY) === "1";

  localStorage.setItem(
    PRESENCE_KEY,
    JSON.stringify({
      partnerOnline: isSiteUnlocked && !isKalpSorumlusuSession,
      updatedAt: new Date().toISOString(),
    })
  );
}

function renderPresenceBadge() {
  if (!partnerPresence) return;

  const raw = localStorage.getItem(PRESENCE_KEY);
  if (!raw) {
    partnerPresence.textContent = "Sevgilin çevrimdışı";
    partnerPresence.className = "presence-badge offline";
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    const updated = parsed.updatedAt ? new Date(parsed.updatedAt).getTime() : 0;
    const isOnline = Boolean(parsed.partnerOnline) && Date.now() - updated < 15000;

    partnerPresence.textContent = isOnline ? "Sevgilin çevrimiçi" : "Sevgilin çevrimdışı";
    partnerPresence.className = `presence-badge ${isOnline ? "online" : "offline"}`;
  } catch {
    partnerPresence.textContent = "Sevgilin çevrimdışı";
    partnerPresence.className = "presence-badge offline";
  }
}

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
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => ({
      ...item,
      partnerNotified: item.partnerNotified ?? true,
    }));
  } catch {
    return [];
  }
}

function loadCustomNotifications() {
  const raw = localStorage.getItem(CUSTOM_NOTIFICATIONS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => ({
      ...item,
      read: item.read ?? false,
    }));
  } catch {
    return [];
  }
}

function saveRequests() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.requests));
}

function saveCustomNotifications() {
  localStorage.setItem(CUSTOM_NOTIFICATIONS_KEY, JSON.stringify(state.customNotifications));
}

function formatDate(isoDate) {
  if (!isoDate) return "Belirtilmedi";
  return new Date(isoDate).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function setSiteSession(isActive) {
  sessionStorage.setItem(SITE_SESSION_KEY, isActive ? "1" : "0");

  body.classList.toggle("is-locked", !isActive);
  body.classList.toggle("is-unlocked", isActive);
  appShell.setAttribute("aria-hidden", String(!isActive));
  updatePresenceHeartbeat();
  renderPresenceBadge();
}

function activateTab(tabId) {
  tabs.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });

  panels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabId);
  });
}

tabs.forEach((btn) => {
  btn.addEventListener("click", () => activateTab(btn.dataset.tab));
});

window.addEventListener("storage", () => {
  renderPresenceBadge();
  state.activityTimeline = loadActivityTimeline();
  renderActivityTimeline();
});

siteLoginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const entered = siteLoginForm.elements.sitePassword.value;

  if (SITE_PASSWORD && entered === SITE_PASSWORD) {
    setSiteSession(true);
    addActivity("partner", "Sevgilin siteye giriş yaptı.");
    siteLoginInfo.textContent = "";
    siteLoginForm.reset();
    return;
  }

  state.failedSiteAttempts += 1;

  if (state.failedSiteAttempts >= 5) {
    siteLoginInfo.textContent =
      "Çok fazla hatalı deneme yapıldı. Lütfen 30 saniye sonra tekrar deneyin.";
    siteLoginForm.querySelector("button").disabled = true;
    setTimeout(() => {
      state.failedSiteAttempts = 0;
      siteLoginForm.querySelector("button").disabled = false;
      siteLoginInfo.textContent = "";
    }, 30000);
    return;
  }

  siteLoginInfo.textContent = "Şifre yanlış. Bu alan yalnızca size özel.";
});

siteLogoutBtn.addEventListener("click", () => {
  setAdminSession(false);
  setSiteSession(false);
  addActivity("partner", "Site kilitlendi / kullanıcı çıkış yaptı.");
  siteLoginForm.reset();
  activateTab("create");
});

function getUnreadRequestNotifications() {
  return state.requests
    .filter((item) => !item.partnerNotified && item.updatedAt !== item.createdAt)
    .map((item) => ({
      type: "request",
      id: item.id,
      updatedAt: item.updatedAt,
      text: `💖 Bir tanem, "${item.title}" talebin cevaplandı. Talep Takip kısmından detayını görebilirsin.`,
    }));
}

function getUnreadCustomNotifications() {
  return state.customNotifications
    .filter((item) => !item.read)
    .map((item) => ({
      type: "custom",
      id: item.id,
      updatedAt: item.createdAt,
      text: `💘 ${item.title}: ${item.message}`,
    }));
}

function getUnreadNotifications() {
  return [...getUnreadRequestNotifications(), ...getUnreadCustomNotifications()];
}

function updateNotificationBell() {
  const unreadCount = getUnreadNotifications().length;
  notificationCount.textContent = String(unreadCount);
  notificationCount.classList.toggle("hidden", unreadCount === 0);
}

notificationBell.addEventListener("click", () => {
  const unreadCount = getUnreadNotifications().length;

  if (unreadCount === 0) {
    bellInfo.textContent = "Şu an yeni bildirim yok 💗";
    return;
  }

  bellInfo.textContent = `${unreadCount} yeni bildirim var 💖`;
  activateTab("track");
  trackNotifications.scrollIntoView({ behavior: "smooth", block: "start" });
});

function createTrackNotification(item) {
  const template = document.getElementById("trackNotificationTemplate");
  const node = template.content.firstElementChild.cloneNode(true);

  node.querySelector('[data-field="notifyText"]').textContent = item.text;

  node.querySelector('[data-role="seenBtn"]').addEventListener("click", () => {
    if (item.type === "request") {
      const target = state.requests.find((req) => req.id === item.id);
      if (!target) return;

      target.partnerNotified = true;
      saveRequests();
    } else {
      const target = state.customNotifications.find((notif) => notif.id === item.id);
      if (!target) return;

      target.read = true;
      saveCustomNotifications();
    }

    bellInfo.textContent = "Bildirim okundu 💞";
    addActivity("partner", "Sevgilin bir bildirimi okudu.");
    renderTrackNotifications();
  });

  return node;
}

function renderTrackNotifications() {
  trackNotifications.innerHTML = "";

  const notifications = getUnreadNotifications().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  updateNotificationBell();

  if (!notifications.length) {
    return;
  }

  notifications.forEach((item) => trackNotifications.appendChild(createTrackNotification(item)));
}

function createTrackCard(item) {
  const template = document.getElementById("trackItemTemplate");
  const node = template.content.firstElementChild.cloneNode(true);

  node.querySelector('[data-field="title"]').textContent = item.title;

  const badge = node.querySelector('[data-field="status"]');
  badge.textContent = item.status;
  badge.dataset.status = item.status;

  node.querySelector('[data-field="meta"]').textContent = `${item.category} • ${item.priority} • Hedef: ${formatDate(
    item.targetDate
  )}`;

  node.querySelector('[data-field="detail"]').textContent = item.detail;
  node.querySelector('[data-field="result"]').textContent =
    item.result || "Henüz sonuç notu eklenmedi. Değerlendirme sonrası burada gözükecek.";

  return node;
}

function renderTrackList() {
  trackList.innerHTML = "";

  if (!state.requests.length) {
    trackList.innerHTML = '<p class="muted">Henüz talep yok. İlk isteğini bırakabilirsin 💖</p>';
    renderLoveCalendar();
    return;
  }

  const ordered = [...state.requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  ordered.forEach((item) => trackList.appendChild(createTrackCard(item)));
  renderLoveCalendar();
}

function buildNotificationText(item, status, result) {
  return `💌 Kalp Postası Güncellemesi\nTalep: ${item.title}\nDurum: ${status}\nNot: ${result || "Not eklenmedi"}`;
}

function createAdminCard(item) {
  const template = document.getElementById("adminItemTemplate");
  const node = template.content.firstElementChild.cloneNode(true);

  node.querySelector('[data-field="title"]').textContent = item.title;

  const badge = node.querySelector('[data-field="status"]');
  badge.textContent = item.status;
  badge.dataset.status = item.status;

  node.querySelector('[data-field="meta"]').textContent = `#${item.id} • ${item.category} • ${item.priority} • ${formatDate(
    item.targetDate
  )}`;

  node.querySelector('[data-field="detail"]').textContent = item.detail;

  const form = node.querySelector('[data-role="updateForm"]');
  const notifyBtn = node.querySelector('[data-role="notifyBtn"]');
  const deleteBtn = node.querySelector('[data-role="deleteBtn"]');
  const notifyInfo = node.querySelector('[data-role="notifyInfo"]');

  form.elements.status.value = item.status;
  form.elements.result.value = item.result;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const status = form.elements.status.value;
    const result = form.elements.result.value.trim();

    const target = state.requests.find((req) => req.id === item.id);
    if (!target) return;

    target.status = status;
    target.result = result;
    target.updatedAt = new Date().toISOString();
    target.partnerNotified = false;

    saveRequests();
    addActivity("admin", `Talep güncellendi: ${item.title} → ${status}`);

    if (status === "Kabul Edildi" || status === "Tamamlandı") {
      playCelebrationBurst("big");
    }

    renderTrackNotifications();
    renderTrackList();
    renderAdminList();
  });

  notifyBtn.addEventListener("click", async () => {
    const status = form.elements.status.value;
    const result = form.elements.result.value.trim();
    const text = buildNotificationText(item, status, result);

    try {
      await navigator.clipboard.writeText(text);
      notifyInfo.textContent = "Bildirim metni panoya kopyalandı. WhatsApp/Telegram'dan paylaşabilirsin.";
    } catch {
      notifyInfo.textContent = "Panoya kopyalama başarısız. Elle kopyalayarak gönderebilirsin.";
    }
  });

  deleteBtn.addEventListener("click", () => {
    const confirmed = confirm(`"${item.title}" talebini kalıcı olarak silmek istiyor musun?`);
    if (!confirmed) return;

    state.requests = state.requests.filter((req) => req.id !== item.id);
    saveRequests();
    addActivity("admin", `Talep silindi: ${item.title}`);

    renderTrackNotifications();
    renderTrackList();
    renderAdminList();
  });

  return node;
}

function renderAdminList() {
  adminList.innerHTML = "";

  if (!state.requests.length) {
    adminList.innerHTML = '<p class="muted">Yönetilecek talep bulunamadı.</p>';
    return;
  }

  const ordered = [...state.requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  ordered.forEach((item) => adminList.appendChild(createAdminCard(item)));
}

sendNotificationForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(sendNotificationForm);
  const title = formData.get("notifyTitle").toString().trim();
  const message = formData.get("notifyMessage").toString().trim();

  const customNotification = {
    id: `n-${Date.now().toString(36)}`,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  };

  state.customNotifications.push(customNotification);
  saveCustomNotifications();
  renderTrackNotifications();

  sendNotificationForm.reset();
  sendNotificationInfo.textContent = "Bildirim gönderildi. Kalp simgesine düştü 💖";
  bellInfo.textContent = "Yeni bir bildirim geldi 💘";
  addActivity("admin", `Özel bildirim gönderildi: ${title}`);
  playCelebrationBurst("soft");
});

requestForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(requestForm);
  const request = {
    id: Date.now().toString().slice(-6),
    title: formData.get("title").toString().trim(),
    category: formData.get("category").toString(),
    priority: formData.get("priority").toString(),
    detail: formData.get("detail").toString().trim(),
    targetDate: formData.get("targetDate").toString(),
    status: "Beklemede",
    result: "Talebin sevgiyle alındı. En kısa sürede değerlendirilecek 💞",
    partnerNotified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  state.requests.push(request);
  saveRequests();

  requestForm.reset();
  formInfo.textContent = "Talebin başarıyla gönderildi! Talep Takip sekmesinden durumu izleyebilirsin.";

  addActivity("partner", `Yeni talep oluşturuldu: ${request.title}`);

  renderTrackNotifications();
  renderTrackList();
  renderAdminList();
  playLoveBurst();
  playCelebrationBurst("soft");
  activateTab("track");
});

function setAdminSession(isActive) {
  localStorage.setItem(ADMIN_SESSION_KEY, isActive ? "1" : "0");
  adminGate.classList.toggle("hidden", isActive);
  adminContent.classList.toggle("hidden", !isActive);
  updatePresenceHeartbeat();

  if (isActive) {
    renderAdminList();
    renderPresenceBadge();
    renderActivityTimeline();
  }
}

adminLoginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const entered = adminLoginForm.elements.password.value;

  if (entered === ADMIN_PASSWORD) {
    setAdminSession(true);
    addActivity("admin", "Kalp Sorumlusu panele giriş yaptı.");
    loginInfo.textContent = "";
    adminLoginForm.reset();
    return;
  }

  loginInfo.textContent = "Şifre yanlış. Bu alan sadece Kalp Sorumlusu kullanımına açık.";
});

logoutBtn.addEventListener("click", () => {
  setAdminSession(false);
  addActivity("admin", "Kalp Sorumlusu panelden çıkış yaptı.");
  loginInfo.textContent = "Kalp Sorumlusu oturumu kapatıldı.";
});

if (!SITE_PASSWORD || !ADMIN_PASSWORD) {
  siteLoginInfo.textContent = "Yapılandırma eksik: config.js dosyasındaki şifreleri kontrol edin.";
}

renderDailyLoveMessage();
renderTrackNotifications();
renderTrackList();
renderActivityTimeline();
setAdminSession(localStorage.getItem(ADMIN_SESSION_KEY) === "1");
setSiteSession(sessionStorage.getItem(SITE_SESSION_KEY) === "1");
renderPresenceBadge();
setInterval(updatePresenceHeartbeat, 5000);
setInterval(renderPresenceBadge, 5000);
