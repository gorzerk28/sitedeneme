const STORAGE_KEY = "kalp-postasi-requests";
const ADMIN_SESSION_KEY = "kalp-postasi-admin-session";
const SITE_SESSION_KEY = "kalp-postasi-site-session";

const config = window.APP_CONFIG || {};
const SITE_PASSWORD = config.sitePassword || "";
const ADMIN_PASSWORD = config.adminPassword || "";

const state = {
  requests: loadRequests(),
  failedSiteAttempts: 0,
};

const body = document.body;
const appShell = document.getElementById("appShell");
const siteLoginForm = document.getElementById("siteLoginForm");
const siteLoginInfo = document.getElementById("siteLoginInfo");
const siteLogoutBtn = document.getElementById("siteLogoutBtn");
const notificationBell = document.getElementById("notificationBell");
const notificationCount = document.getElementById("notificationCount");

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

function saveRequests() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.requests));
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

siteLoginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const entered = siteLoginForm.elements.sitePassword.value;

  if (SITE_PASSWORD && entered === SITE_PASSWORD) {
    setSiteSession(true);
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
  siteLoginForm.reset();
  activateTab("create");
});

notificationBell.addEventListener("click", () => {
  activateTab("track");
  trackNotifications.scrollIntoView({ behavior: "smooth", block: "start" });
});

function getUnreadNotifications() {
  return state.requests.filter((item) => !item.partnerNotified && item.updatedAt !== item.createdAt);
}

function updateNotificationBell() {
  const unreadCount = getUnreadNotifications().length;
  notificationCount.textContent = String(unreadCount);
  notificationCount.classList.toggle("hidden", unreadCount === 0);
}

function createTrackNotification(item) {
  const template = document.getElementById("trackNotificationTemplate");
  const node = template.content.firstElementChild.cloneNode(true);

  node.querySelector('[data-field="notifyText"]').textContent =
    `💖 Bir tanem, "${item.title}" talebin cevaplandı. Talep Takip kısmından detayını görebilirsin.`;

  node.querySelector('[data-role="seenBtn"]').addEventListener("click", () => {
    const target = state.requests.find((req) => req.id === item.id);
    if (!target) return;

    target.partnerNotified = true;
    saveRequests();
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
    return;
  }

  const ordered = [...state.requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  ordered.forEach((item) => trackList.appendChild(createTrackCard(item)));
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

  renderTrackNotifications();
  renderTrackList();
  renderAdminList();
  activateTab("track");
});

function setAdminSession(isActive) {
  localStorage.setItem(ADMIN_SESSION_KEY, isActive ? "1" : "0");
  adminGate.classList.toggle("hidden", isActive);
  adminContent.classList.toggle("hidden", !isActive);

  if (isActive) {
    renderAdminList();
  }
}

adminLoginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const entered = adminLoginForm.elements.password.value;

  if (entered === ADMIN_PASSWORD) {
    setAdminSession(true);
    loginInfo.textContent = "";
    adminLoginForm.reset();
    return;
  }

  loginInfo.textContent = "Şifre yanlış. Bu alan sadece admin kullanımına açık.";
});

logoutBtn.addEventListener("click", () => {
  setAdminSession(false);
  loginInfo.textContent = "Admin oturumu kapatıldı.";
});

if (!SITE_PASSWORD || !ADMIN_PASSWORD) {
  siteLoginInfo.textContent = "Yapılandırma eksik: config.js dosyasındaki şifreleri kontrol edin.";
}

renderTrackNotifications();
renderTrackList();
setAdminSession(localStorage.getItem(ADMIN_SESSION_KEY) === "1");
setSiteSession(sessionStorage.getItem(SITE_SESSION_KEY) === "1");
