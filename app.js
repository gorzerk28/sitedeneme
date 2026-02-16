const STORAGE_KEY = "kalp-postasi-requests";
const ADMIN_SESSION_KEY = "kalp-postasi-admin-session";
const ADMIN_PASSWORD = "askim123";

const state = {
  requests: loadRequests(),
};

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
    item.result || "Henüz sonuç notu eklenmedi. Talebin değerlendirilince burada gözükecek.";

  return node;
}

function renderTrackList() {
  trackList.innerHTML = "";

  if (!state.requests.length) {
    trackList.innerHTML = '<p class="muted">Henüz talep yok. İlk talebi oluşturabilirsin 💖</p>';
    return;
  }

  const ordered = [...state.requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  ordered.forEach((item) => trackList.appendChild(createTrackCard(item)));
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
    result: "Talep alındı. En kısa sürede değerlendirilecek 💞",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  state.requests.push(request);
  saveRequests();

  requestForm.reset();
  formInfo.textContent = "Talebin başarıyla gönderildi! Takip sekmesinden durumu izleyebilirsin.";

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

  loginInfo.textContent = "Şifre yanlış. Sadece admin giriş yapabilir.";
});

logoutBtn.addEventListener("click", () => {
  setAdminSession(false);
  loginInfo.textContent = "Admin oturumu kapatıldı.";
});

renderTrackList();
setAdminSession(localStorage.getItem(ADMIN_SESSION_KEY) === "1");
