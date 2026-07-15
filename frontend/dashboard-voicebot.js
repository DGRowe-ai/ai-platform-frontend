const API_URL = window.RoweAppConfig?.API_URL || "https://ai-platform-backend-ulqs.onrender.com";

let cachedCalls = [];

const els = {
  businessName: document.getElementById("business-name"),
  pageStatus: document.getElementById("page-status"),
  analyticsCards: document.getElementById("analytics-cards"),
  callHistory: document.getElementById("call-history"),
  historyStatus: document.getElementById("history-status"),
  settingsForm: document.getElementById("settings-form"),
  settingsStatus: document.getElementById("settings-status"),
  tone: document.getElementById("tone"),
  voiceBusinessName: document.getElementById("voice-business-name"),
  knowledge: document.getElementById("knowledge"),
  spellName: document.getElementById("spell-name"),
  kbFileInput: document.getElementById("kb-file"),
  kbUploadBtn: document.getElementById("kb-upload-btn"),
  kbFileList: document.getElementById("kb-file-list"),
  kbStatus: document.getElementById("kb-status"),
  logoutBtn: document.getElementById("logout-btn"),
  refreshBtn: document.getElementById("refresh-btn"),
  chatDashboardBtn: null,
  chatDashboardNav: null,
  cancelServiceBtn: document.getElementById("cancel-service-btn"),
  confirmCancelBtn: document.getElementById("confirm-cancel-btn"),
  cancelStatus: document.getElementById("cancel-status"),
  businessPhoneCard: document.getElementById("business-phone-card"),
  callForwardingCard: document.getElementById("call-forwarding-card"),
  businessPhoneForm: document.getElementById("business-phone-form"),
  businessPhoneInput: document.getElementById("business-phone"),
  businessPhoneStatus: document.getElementById("business-phone-status"),
  voiceSetupRow: document.getElementById("voice-setup-row"),
  exportHistoryBtn: document.getElementById("export-history-btn"),
  deleteHistoryBtn: document.getElementById("delete-history-btn"),
  deleteHistoryModal: document.getElementById("delete-history-modal"),
  deleteHistoryCancelBtn: document.getElementById("delete-history-cancel-btn"),
  deleteHistoryConfirmBtn: document.getElementById("delete-history-confirm-btn"),
  appointmentRequests: document.getElementById("appointment-requests"),
  appointmentsStatus: document.getElementById("appointments-status"),
  appointmentSettingsForm: document.getElementById("appointment-settings-form"),
  appointmentSettingsStatus: document.getElementById("appointment-settings-status"),
  appointmentTimezone: document.getElementById("appointment-timezone"),
  appointmentNotifyMethod: document.getElementById("appointment-notify-method"),
  appointmentNotifyEmail: document.getElementById("appointment-notify-email"),
  appointmentWebhookUrl: document.getElementById("appointment-webhook-url"),
  appointmentEmailWrap: document.getElementById("appointment-email-wrap"),
  appointmentWebhookWrap: document.getElementById("appointment-webhook-wrap"),
  referralLink: document.getElementById("referral-link"),
  copyReferralBtn: document.getElementById("copy-referral-btn"),
  copyReferralStatus: document.getElementById("copy-referral-status"),
  referralCount: document.getElementById("referral-count"),
  freeMonthsEarned: document.getElementById("free-months-earned"),
  referralStatus: document.getElementById("referral-status"),
};

let appointmentDashboard = null;

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

let voiceMultiLocationUI = null;

function hasBothProducts(subscription) {
  if (subscription?.plan_type === "duo") {
    return true;
  }
  return Boolean(subscription?.has_chatbot && subscription?.has_voicebot);
}

function hasVoiceAccess(subscription) {
  return Boolean(subscription?.has_voicebot || subscription?.plan_type === "duo");
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

function normalizeUtcDate(value) {
  if (!value) return null;
  if (typeof value === "string" && !value.endsWith("Z") && !value.includes("+")) {
    return `${value}Z`;
  }
  return value;
}

function formatDateTime(value) {
  if (!value) return "Unknown time";
  const date = new Date(normalizeUtcDate(value));
  if (Number.isNaN(date.getTime())) return value;

  const datePart = new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  const tzPart = new Intl.DateTimeFormat(undefined, {
    timeZoneName: "short",
  })
    .formatToParts(date)
    .find(part => part.type === "timeZoneName")?.value;

  return `${datePart} — ${timePart}${tzPart ? ` (${tzPart})` : ""}`;
}

function exportTimestamp() {
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function buildHistoryExportText(calls) {
  if (!calls.length) {
    return "No call history available.";
  }

  const sections = [...calls]
    .sort((a, b) => new Date(normalizeUtcDate(a.started_at)) - new Date(normalizeUtcDate(b.started_at)))
    .map(call => {
      const header = [
        `Call started: ${formatDateTime(call.started_at)}`,
        `Call ended: ${formatDateTime(call.ended_at)}`,
        `Caller: ${call.caller_number || "Unknown"}`,
      ].join("\n");
      const transcript = (call.transcript || "").trim() || "No transcript captured for this call.";
      return `${header}\n\n${transcript}`;
    });

  return sections.join("\n\n------------------------------\n\n");
}

function exportCallHistory() {
  if (!cachedCalls.length) {
    setStatus(els.historyStatus, "No call history to export.", "error");
    return;
  }

  const content = buildHistoryExportText(cachedCalls);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `voicebot_chat_history_${exportTimestamp()}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus(els.historyStatus, "Call history exported.", "success");
}

function openDeleteHistoryModal() {
  els.deleteHistoryModal?.classList.add("open");
}

function closeDeleteHistoryModal() {
  els.deleteHistoryModal?.classList.remove("open");
}

async function confirmDeleteCallHistory() {
  try {
    setStatus(els.historyStatus, "Deleting call history...");
    await apiRequest("/client/voice_call_history", { method: "DELETE" });
    cachedCalls = [];
    renderCallHistory([]);
    closeDeleteHistoryModal();
    setStatus(els.historyStatus, "Call history deleted.", "success");
  } catch (err) {
    setStatus(els.historyStatus, err.message || "Unable to delete call history.", "error");
  }
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
  cachedCalls = calls || [];
  if (!cachedCalls.length) {
    els.callHistory.innerHTML = `<p class="help-text">No calls recorded yet. Incoming calls will appear here with date, time, and transcript.</p>`;
    return;
  }

  els.callHistory.innerHTML = cachedCalls
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
  const productType = subscription?.product_type || subscription?.plan_type || localStorage.getItem("product_type") || "";
  const tier = subscription?.tier || localStorage.getItem("tier") || "";
  localStorage.setItem("plan_type", productType);
  localStorage.setItem("product_type", productType);
  localStorage.setItem("tier", tier);
  localStorage.setItem("has_voicebot", subscription?.has_voicebot ? "1" : "0");
  localStorage.setItem("has_chatbot", subscription?.has_chatbot ? "1" : "0");

  const isEmbed = new URLSearchParams(window.location.search).get("embed") === "1";
  if (!isEmbed && !subscription?.complimentary) {
    if (productType === "chatbot") {
      window.location.href = "dashboard-chatbot.html";
      return false;
    }
    if (productType === "duo") {
      window.location.href = "dashboard-duo.html";
      return false;
    }
  }

  const showVoiceSections = hasVoiceAccess(subscription);
  els.voiceSetupRow?.classList.toggle("hidden", !showVoiceSections);
  return true;
}

async function loadDashboard() {
  setStatus(els.pageStatus, "Loading dashboard...");
  const [dashboard, settings, history, files, subscription] = await Promise.all([
    apiRequest("/client/voicebot/dashboard"),
    apiRequest("/voicebot/settings"),
    apiRequest("/client/voice_call_history"),
    apiRequest("/api/knowledge/list"),
    apiRequest("/client/subscription"),
  ]);

  const appointmentLoads = appointmentDashboard
    ? Promise.all([
        appointmentDashboard.loadAppointments(),
        appointmentDashboard.loadAppointmentSettings(),
      ])
    : Promise.resolve();

  els.businessName.textContent = dashboard.business?.name || "Your Business";
  renderAnalytics(dashboard);
  if (!applySubscription(subscription)) {
    return;
  }

  if (!subscription.has_voicebot && localStorage.getItem("is_platform_admin") !== "1") {
    window.location.href = "dashboard-chatbot.html";
    return;
  }

  els.tone.value = settings.tone || "friendly";
  if (els.voiceBusinessName) {
    els.voiceBusinessName.value =
      settings.voiceBusinessName || settings.businessName || settings.business_name || "";
  }
  els.knowledge.value = settings.knowledge || settings.custom_instructions || "";
  els.spellName.checked = Boolean(settings.spell_name);
  if (els.businessPhoneInput) {
    els.businessPhoneInput.value = settings.businessPhoneNumber || settings.business_phone_number || "";
  }

  if (window.voiceMultiLocationUI) {
    window.voiceMultiLocationUI.applyFromSettings(settings, subscription.features || settings.features);
  }

  renderCallHistory(history.calls || []);
  renderKnowledgeFiles(files.files || []);
  await appointmentLoads;
  setStatus(els.pageStatus, "", "");
}

async function saveBusinessPhone(event) {
  event.preventDefault();
  try {
    setStatus(els.businessPhoneStatus, "Saving phone number...");
    await apiRequest("/voicebot/settings", {
      method: "POST",
      body: JSON.stringify({
        businessPhoneNumber: els.businessPhoneInput.value.trim(),
      }),
    });
    setStatus(els.businessPhoneStatus, "Business phone number saved.", "success");
  } catch (err) {
    setStatus(els.businessPhoneStatus, err.message || "Unable to save phone number.", "error");
  }
}

async function saveSettings(event) {
  event.preventDefault();
  try {
    setStatus(els.settingsStatus, "Saving settings...");
    const multiPayload = window.voiceMultiLocationUI?.buildPayload() || {};
    await apiRequest("/client/voicebot_settings", {
      method: "POST",
      body: JSON.stringify({
        tone: els.tone.value,
        businessName: els.voiceBusinessName?.value.trim() || "",
        knowledge: els.knowledge.value.trim(),
        spell_name: els.spellName.checked,
        ...multiPayload,
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
    if (response.plan_type === "chatbot" || response.product_type === "chatbot") {
      window.location.href = "dashboard-chatbot.html";
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

  if (window.RoweAppointmentDashboard) {
    appointmentDashboard = window.RoweAppointmentDashboard.init({
      apiRequest,
      setStatus,
      els,
      emptyMessage:
        "No appointment requests yet. Customers can request one through your voicebot or chatbot.",
    });
  }

  if (window.RoweMultiLocationUI) {
    window.voiceMultiLocationUI = window.RoweMultiLocationUI.init(document);
  }

  els.logoutBtn.addEventListener("click", logout);
  els.refreshBtn.addEventListener("click", () => {
    loadDashboard().catch(err => setStatus(els.pageStatus, err.message, "error"));
  });
  els.settingsForm.addEventListener("submit", saveSettings);
  if (els.businessPhoneForm) {
    els.businessPhoneForm.addEventListener("submit", saveBusinessPhone);
  }
  els.kbUploadBtn.addEventListener("click", uploadKnowledgeFile);
  els.cancelServiceBtn.addEventListener("click", showCancelConfirmation);
  els.confirmCancelBtn.addEventListener("click", confirmCancellation);
  els.exportHistoryBtn?.addEventListener("click", exportCallHistory);
  els.deleteHistoryBtn?.addEventListener("click", openDeleteHistoryModal);
  els.deleteHistoryCancelBtn?.addEventListener("click", closeDeleteHistoryModal);
  els.deleteHistoryConfirmBtn?.addEventListener("click", confirmDeleteCallHistory);
  els.deleteHistoryModal?.addEventListener("click", event => {
    if (event.target === els.deleteHistoryModal) {
      closeDeleteHistoryModal();
    }
  });

  loadDashboard().catch(err => {
    if (err.message.includes("voicebot dashboard")) {
      window.location.href = "dashboard-chatbot.html";
      return;
    }
    setStatus(els.pageStatus, err.message || "Unable to load dashboard.", "error");
  });

  if (window.RoweReferralDashboard) {
    window.RoweReferralDashboard.initReferralDashboard({
      apiRequest,
      setStatus,
      els,
    });
  }
});
