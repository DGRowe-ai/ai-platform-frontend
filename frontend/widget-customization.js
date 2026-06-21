const API_URL = "https://ai-platform-backend-ulqs.onrender.com";

const DEFAULTS = window.RoweWidgetSettings.DEFAULT_WIDGET_SETTINGS;

const state = {
  settings: { ...DEFAULTS },
  clientId: null,
};

const els = {
  avatarFile: document.getElementById("avatar-file"),
  avatarStatus: document.getElementById("avatar-status"),
  avatarUploadBtn: document.getElementById("avatar-upload-btn"),
  businessName: document.getElementById("business-name"),
  chatBubbleColor: document.getElementById("chat-bubble-color"),
  customCss: document.getElementById("custom-css"),
  enableShadow: document.getElementById("enable-shadow"),
  enableTypingAnimation: document.getElementById("enable-typing-animation"),
  fontFamily: document.getElementById("font-family"),
  logoutBtn: document.getElementById("logout-btn"),
  pageStatus: document.getElementById("page-status"),
  position: document.getElementById("position"),
  previewBubble: document.getElementById("preview-bubble"),
  previewFrame: document.getElementById("preview-frame"),
  previewMessages: document.getElementById("preview-messages"),
  primaryColor: document.getElementById("primary-color"),
  refreshBtn: document.getElementById("refresh-btn"),
  resetBtn: document.getElementById("reset-btn"),
  saveBtn: document.getElementById("save-btn"),
  saveStatus: document.getElementById("save-status"),
  secondaryColor: document.getElementById("secondary-color"),
  showAvatar: document.getElementById("show-avatar"),
  textColor: document.getElementById("text-color"),
  welcomeMessage: document.getElementById("welcome-message"),
  widgetShape: document.getElementById("widget-shape"),
};

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("access_token");
}

function redirectToLogin() {
  window.location.href = "login.html";
}

function setStatus(element, message, type = "") {
  element.textContent = message || "";
  element.classList.remove("success", "error");
  if (type) element.classList.add(type);
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

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

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
    redirectToLogin();
    throw new Error("You are not authorized.");
  }

  if (!response.ok) {
    const detail = data && typeof data === "object" ? data.detail || data.message : data;
    throw new Error(detail || `Request failed (${response.status}).`);
  }

  return data;
}

function readFormSettings() {
  return {
    primaryColor: els.primaryColor.value,
    secondaryColor: els.secondaryColor.value,
    chatBubbleColor: els.chatBubbleColor.value,
    textColor: els.textColor.value,
    welcomeMessage: els.welcomeMessage.value.trim(),
    position: els.position.value,
    showAvatar: els.showAvatar.checked,
    avatarUrl: state.settings.avatarUrl || null,
    widgetShape: els.widgetShape.value,
    fontFamily: els.fontFamily.value.trim(),
    customCSS: els.customCss.value,
    enableShadow: els.enableShadow.checked,
    enableTypingAnimation: els.enableTypingAnimation.checked,
  };
}

function fillForm(settings) {
  const resolved = window.RoweWidgetSettings.mergeWidgetSettings(settings);
  state.settings = resolved;

  els.primaryColor.value = resolved.primaryColor;
  els.secondaryColor.value = resolved.secondaryColor;
  els.chatBubbleColor.value = resolved.chatBubbleColor;
  els.textColor.value = resolved.textColor;
  els.welcomeMessage.value = resolved.welcomeMessage;
  els.position.value = resolved.position;
  els.showAvatar.checked = Boolean(resolved.showAvatar);
  els.widgetShape.value = resolved.widgetShape;
  els.fontFamily.value = resolved.fontFamily;
  els.customCss.value = resolved.customCSS || "";
  els.enableShadow.checked = Boolean(resolved.enableShadow);
  els.enableTypingAnimation.checked = Boolean(resolved.enableTypingAnimation);

  renderPreview();
}

function renderPreview() {
  const settings = readFormSettings();
  const fallbackAvatar = `${window.location.origin}/images/loki/idle/idle.png`;

  window.RoweWidgetSettings.applyLauncherStyles({
    bubble: els.previewBubble,
    iframe: null,
    settings,
    fallbackAvatarUrl: fallbackAvatar,
  });

  window.RoweWidgetSettings.applyFrameStyles({
    wrapper: els.previewFrame,
    header: document.getElementById("preview-header"),
    messages: els.previewMessages,
    inputArea: document.getElementById("preview-input-area"),
    sendBtn: document.getElementById("preview-send-btn"),
    branding: document.getElementById("preview-branding"),
    avatar: document.getElementById("preview-avatar"),
    settings,
    fallbackAvatarUrl: fallbackAvatar,
  });

  els.previewMessages.innerHTML = "";
  const welcome = document.createElement("div");
  welcome.className = "preview-message bot";
  welcome.textContent = settings.welcomeMessage;
  els.previewMessages.appendChild(welcome);
}

async function loadWidgetSettings() {
  setStatus(els.pageStatus, "Loading widget settings...");

  try {
    const data = await apiRequest("/api/widget/settings");
    state.clientId = data.client_id;
    els.businessName.textContent = data.client_id
      ? `Business: ${data.client_id}`
      : "Widget customization";
    fillForm(data.settings || DEFAULTS);
    setStatus(els.pageStatus, "Widget settings loaded.", "success");
  } catch (err) {
    console.error(err);
    setStatus(els.pageStatus, err.message || "Unable to load widget settings.", "error");
  }
}

async function saveWidgetSettings() {
  setStatus(els.saveStatus, "Saving...");

  try {
    const payload = readFormSettings();
    const data = await apiRequest("/api/widget/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    fillForm(data.settings);
    setStatus(els.saveStatus, "Widget settings saved.", "success");
  } catch (err) {
    console.error(err);
    setStatus(els.saveStatus, err.message || "Unable to save widget settings.", "error");
  }
}

async function uploadAvatar() {
  const file = els.avatarFile.files[0];
  if (!file) {
    setStatus(els.avatarStatus, "Choose an image file first.", "error");
    return;
  }

  setStatus(els.avatarStatus, "Uploading avatar...");

  try {
    const formData = new FormData();
    formData.append("file", file);

    const token = getToken();
    const response = await fetch(`${API_URL}/api/widget/avatar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Avatar upload failed.");
    }

    fillForm(data.settings);
    setStatus(els.avatarStatus, "Avatar uploaded.", "success");
    els.avatarFile.value = "";
  } catch (err) {
    console.error(err);
    setStatus(els.avatarStatus, err.message || "Unable to upload avatar.", "error");
  }
}

function resetToDefaults() {
  fillForm(DEFAULTS);
  setStatus(els.saveStatus, "Defaults restored in preview. Click Save to apply.", "success");
}

function bindPreviewUpdates() {
  [
    els.primaryColor,
    els.secondaryColor,
    els.chatBubbleColor,
    els.textColor,
    els.welcomeMessage,
    els.position,
    els.showAvatar,
    els.widgetShape,
    els.fontFamily,
    els.customCss,
    els.enableShadow,
    els.enableTypingAnimation,
  ].forEach(element => {
    element.addEventListener("input", renderPreview);
    element.addEventListener("change", renderPreview);
  });
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_role");
  localStorage.removeItem("is_platform_admin");
  redirectToLogin();
}

document.addEventListener("DOMContentLoaded", () => {
  if (!getToken()) {
    redirectToLogin();
    return;
  }

  bindPreviewUpdates();
  els.refreshBtn.addEventListener("click", loadWidgetSettings);
  els.saveBtn.addEventListener("click", saveWidgetSettings);
  els.resetBtn.addEventListener("click", resetToDefaults);
  els.avatarUploadBtn.addEventListener("click", uploadAvatar);
  els.logoutBtn.addEventListener("click", logout);

  loadWidgetSettings();
});
