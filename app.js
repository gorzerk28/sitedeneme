const STORAGE_KEY = "kalp-postasi-requests";
const ADMIN_SESSION_KEY = "kalp-postasi-admin-session";
const SITE_SESSION_KEY = "kalp-postasi-site-session";
const SITE_ROLE_KEY = "kalp-postasi-site-role";

const config = window.APP_CONFIG || {};
const sitePasswords = config.siteAccessPasswords || {};
const ADMIN_PASSWORD = config.adminPassword || "";

const state = {
  requests: loadRequests(),
  failedSiteAttempts: 0,
  siteRole: sessionStorage.getItem(SITE_ROLE_KEY) || "sevgilim",
};

const body = document.body;
const appShell = document.getElementById("appShell");
const siteLoginForm = document.getElementById("siteLoginForm");
const siteLoginInfo = document.getElementById("siteLoginInfo");
const siteLogoutBtn = document.getElementById("siteLogoutBtn");
const activeRoleLabel = document.getElementById("activeRoleLabel");
const adminTabBtn = document.getElementById("adminTabBtn");

const tabs = document.querySelectorAll(".tab-btn");
const panels = document.querySelectorAll(".panel");
const requestForm = document.getElementById("requestForm");
const formInfo = document.getElementById("formInfo");
const trackList = document.getElementById("trackList");
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
    return Array.isArray(parsed) ? parsed : [];
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

function roleLabel(role) {
  return role === "ben" ? "Ben (Admin)" : "Sevgilim";
}

function lockSite() {
  sessionStorage.setItem(SITE_SESSION_KEY, "0");
  sessionStorage.removeItem(SITE_ROLE_KEY);
  state.siteRole = "sevgilim";
  setAdminSession(false);
  setSiteSession(false);
  siteLoginForm.reset();
  activateTab("create");
}

function applyRoleAccess() {
  activeRoleLabel.textContent = roleLabel(state.siteRole);
  const isAdminRole = state.siteRole === "ben";

  adminTabBtn.classList.toggle("hidden", !isAdminRole);
  if (!isAdminRole) {
    setAdminSession(false);
    activateTab("create");
  }
}

function setSiteSession(isActive) {
  sessionStorage.setItem(SITE_SESSION_KEY, isActive ? "1" : "0");

  body.classList.toggle("is-locked", !isActive);
  body.classList.toggle("is-unlocked", isActive);
  appShell.setAttribute("aria-hidden", String(!isActive));

  if (isActive) {
    applyRoleAccess();
  }
}

function activateTab(tabId) {
  if (tabId === "admin" && state.siteRole !== "ben") {
    return;
  }

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

  const role = siteLoginForm.elements.siteRole.value;
  const entered = siteLoginForm.elements.sitePassword.value;
  const expected = sitePasswords[role];

  if (expected && entered === expected) {
    state.siteRole = role;
    sessionStorage.setItem(SITE_ROLE_KEY, role);
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
  lockSite();
});

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

    saveRequests();
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  state.requests.push(request);
  saveRequests();

  requestForm.reset();
  formInfo.textContent = "Talebin başarıyla gönderildi! Aşk Takibi sekmesinden durumu izleyebilirsin.";

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

if (!sitePasswords.sevgilim || !sitePasswords.ben || !ADMIN_PASSWORD) {
  siteLoginInfo.textContent = "Yapılandırma eksik: config.js dosyasındaki şifreleri kontrol edin.";
}

renderTrackList();
setAdminSession(localStorage.getItem(ADMIN_SESSION_KEY) === "1" && state.siteRole === "ben");
setSiteSession(sessionStorage.getItem(SITE_SESSION_KEY) === "1");
applyRoleAccess();
