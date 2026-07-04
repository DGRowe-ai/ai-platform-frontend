const API_URL = window.RoweAppConfig?.API_URL || "https://ai-platform-backend-ulqs.onrender.com";

const els = {
  businessName: document.getElementById("business-name"),
  pageStatus: document.getElementById("page-status"),
  analyticsCards: document.getElementById("analytics-cards"),
  callHistory: document.getElementById("call-history"),
  historyStatus: document.getElementById("history-status"),
  settingsForm: document.getElementById("settings-form"),
  settingsStatus: document.getElementById("settings-status"),
  tone: document.getElementById("tone"),
  knowledge: document.getElementById("knowledge"),
  spellName: document.getElementById("spell-name"),
  kbFileInput: document.getElementById("kb-file"),
  kbUploadBtn: document.getElementById("kb-upload-btn"),
  kbFileList: document.getElementById("kb-file-list"),
  kbStatus: document.getElementById("kb-status"),
  logoutBtn: document.getElementById("logout-btn"),
  refreshBtn: document.getElementById("refresh-btn"),
  chatDashboardBtn: document.getElementById("chat-dashboard-btn"),
  chatDashboardNav: document.getElementById("chat-dashboard-nav"),
  cancelServiceBtn: document.getElementById("cancel-service-btn"),
  confirmCancelBtn: document.getElementById("confirm-cancel-btn"),
  cancelStatus: document.getElementById("cancel-status"),
};

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("access_token");
}

function setStatus(element, message, type = "") {
  if (!element) return;
  element.textContent = message || "";
  element.classList.remove("success", "error");
  if (type) element.classList.add(type);
}

function redirectToLogin() {
  window.location.href = "login.html";
}

async function apiRequest(path, options = {}) {
  const token = getToken();
  if (!token) {
    redirectToLogin();
    throw new Error("You are not logged in.");
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (err) {
      data = text;
    }
  }

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    redirectToLogin();
  }

  if (!response.ok) {
    const detail = data && typeof data === "object" ? data.detail || data.message : data;
    throw new Error(detail || `Request failed with status ${response.status}`);
  }

  return data;
}

function formatDateTime(value) {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function renderAnalytics(payload) {
  const analytics = payload?.analytics || {};
  els.analyticsCards.innerHTML = `
    <div class="stat">
      <div class="label">Total Calls</div>
      <div class="value">${analytics.total_calls ?? 0}</div>
    </div>
    <div class="stat">
      <div class="label">Latest Call</div>
      <div class="value" style="font-size:18px;">${formatDateTime(analytics.latest_call_at)}</div>
    </div>
    <div class="stat">
      <div class="label">Plan</div>
      <div class="value" style="font-size:18px;text-transform:capitalize;">${payload?.subscription?.plan_type || "voicebot"}</div>
    </div>
  `;
}

function renderCallHistory(calls) {
  if (!calls.length) {
    els.callHistory.innerHTML = `<p class="help-text">No calls recorded yet. Incoming calls will appear here with date, time, and transcript.</p>`;
    return;
  }

  els.callHistory.innerHTML = calls
    .map(call => {
      const transcript = (call.transcript || "").trim() || "No transcript captured for this call.";
      return `
        <article class="call-item">
          <div class="call-meta">
            <span><strong>Started:</strong> ${formatDateTime(call.started_at)}</span>
            <span><strong>Ended:</strong> ${formatDateTime(call.ended_at)}</span>
            <span><strong>Caller:</strong> ${call.caller_number || "Unknown"}</span>
          </div>
          <div class="call-transcript">${transcript.replace(/</g, "&lt;")}</div>
        </article>
      `;
    })
    .join("");
}

function renderKnowledgeFiles(files) {
  if (!files.length) {
    els.kbFileList.innerHTML = `<p class="help-text">No files uploaded yet.</p>`;
    return;
  }

  els.kbFileList.innerHTML = files
    .map(file => `<div class="kb-file-item"><span>${file.file_name}</span><span>${formatDateTime(file.uploaded_at)}</span></div>`)
    .join("");
}

function applySubscription(subscription) {
  const planType = subscription?.plan_type || localStorage.getItem("plan_type") || "";
  localStorage.setItem("plan_type", planType);
  const showChat = planType === "duo";
  els.chatDashboardBtn?.classList.toggle("hidden", !showChat);
  els.chatDashboardNav?.classList.toggle("hidden", !showChat);
}

async function loadDashboard() {
  setStatus(els.pageStatus, "Loading dashboard...");
  const [dashboard, settings, history, files, subscription] = await Promise.all([
    apiRequest("/client/voicebot/dashboard"),
    apiRequest("/client/voicebot_settings"),
    apiRequest("/client/voice_call_history"),
    apiRequest("/api/knowledge/list"),
    apiRequest("/client/subscription"),
  ]);

  els.businessName.textContent = dashboard.business?.name || "Your Business";
  renderAnalytics(dashboard);
  applySubscription(subscription);

  els.tone.value = settings.tone || "friendly";
  els.knowledge.value = settings.knowledge || settings.custom_instructions || "";
  els.spellName.checked = Boolean(settings.spell_name);

  renderCallHistory(history.calls || []);
  renderKnowledgeFiles(files.files || []);
  setStatus(els.pageStatus, "", "");
}

async function saveSettings(event) {
  event.preventDefault();
  try {
    setStatus(els.settingsStatus, "Saving settings...");
    await apiRequest("/client/voicebot_settings", {
      method: "POST",
      body: JSON.stringify({
        tone: els.tone.value,
        knowledge: els.knowledge.value.trim(),
        spell_name: els.spellName.checked,
      }),
    });
    setStatus(els.settingsStatus, "Settings saved.", "success");
  } catch (err) {
    setStatus(els.settingsStatus, err.message || "Unable to save settings.", "error");
  }
}

async function uploadKnowledgeFile() {
  const file = els.kbFileInput.files?.[0];
  if (!file) {
    setStatus(els.kbStatus, "Choose a file to upload.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    setStatus(els.kbStatus, "Uploading file...");
    const token = getToken();
    const response = await fetch(`${API_URL}/api/knowledge/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Upload failed.");
    }
    els.kbFileInput.value = "";
    setStatus(els.kbStatus, "File uploaded.", "success");
    const files = await apiRequest("/api/knowledge/list");
    renderKnowledgeFiles(files.files || []);
  } catch (err) {
    setStatus(els.kbStatus, err.message || "Upload failed.", "error");
  }
}

function showCancelConfirmation() {
  els.confirmCancelBtn.classList.remove("hidden");
  setStatus(
    els.cancelStatus,
    "Please review your choice, then click Confirm Cancelation to finish.",
    "error",
  );
}

async function confirmCancellation() {
  try {
    els.confirmCancelBtn.disabled = true;
    setStatus(els.cancelStatus, "Cancelling voicebot service...");
    const response = await apiRequest("/client/voicebot/cancel", { method: "POST", body: "{}" });
    localStorage.setItem("plan_type", response.plan_type || "chatbot");
    setStatus(els.cancelStatus, response.message || "Voicebot service cancelled.", "success");
    if (response.plan_type === "chatbot") {
      window.location.href = "client-dashboard.html";
    }
  } catch (err) {
    setStatus(els.cancelStatus, err.message || "Unable to cancel service.", "error");
    els.confirmCancelBtn.disabled = false;
  }
}

function logout() {
  localStorage.clear();
  redirectToLogin();
}

document.addEventListener("DOMContentLoaded", () => {
  if (!getToken()) {
    redirectToLogin();
    return;
  }

  els.logoutBtn.addEventListener("click", logout);
  els.refreshBtn.addEventListener("click", () => {
    loadDashboard().catch(err => setStatus(els.pageStatus, err.message, "error"));
  });
  els.settingsForm.addEventListener("submit", saveSettings);
  els.kbUploadBtn.addEventListener("click", uploadKnowledgeFile);
  els.cancelServiceBtn.addEventListener("click", showCancelConfirmation);
  els.confirmCancelBtn.addEventListener("click", confirmCancellation);

  loadDashboard().catch(err => {
    if (err.message.includes("voicebot dashboard")) {
      window.location.href = "client-dashboard.html";
      return;
    }
    setStatus(els.pageStatus, err.message || "Unable to load dashboard.", "error");
  });
});
