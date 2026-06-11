const API_URL = "https://ai-platform-backend-ulqs.onrender.com";
const FRONTEND_URL = "https://ai-platform-frontend-uaaa.onrender.com";

const els = {
  analyticsCards: document.getElementById("analytics-cards"),
  businessName: document.getElementById("business-name"),
  chatHistory: document.getElementById("chat-history"),
  chatbotUrl: document.getElementById("chatbot-url"),
  historyStatus: document.getElementById("history-status"),
  copyEmbedBtn: document.getElementById("copy-embed-btn"),
  copyUrlBtn: document.getElementById("copy-url-btn"),
  copyUrlStatus: document.getElementById("copy-url-status"),
  embedCode: document.getElementById("embed-code"),
  logoutBtn: document.getElementById("logout-btn"),
  pageStatus: document.getElementById("page-status"),
  refreshBtn: document.getElementById("refresh-btn"),
  settingsForm: document.getElementById("settings-form"),
  settingsStatus: document.getElementById("settings-status"),
  passwordForm: document.getElementById("password-form"),
  passwordStatus: document.getElementById("password-status"),
  currentPassword: document.getElementById("current-password"),
  newPassword: document.getElementById("new-password"),
  confirmPassword: document.getElementById("confirm-password"),
  welcomeMessage: document.getElementById("welcome-message"),
  tone: document.getElementById("tone"),
  chatLength: document.getElementById("chat-length"),
  customInstructions: document.getElementById("custom-instructions"),
  faqs: document.getElementById("faqs"),
};

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("access_token");
}

function setStatus(element, message, type = "") {
  element.textContent = message || "";
  element.classList.remove("success", "error");
  if (type) {
    element.classList.add(type);
  }
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
    "Authorization": `Bearer ${token}`,
    ...options.headers,
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

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

function getFirstValue(source, keys) {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== "") {
      return source[key];
    }
  }

  return undefined;
}

function normalizeList(payload, keys) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  for (const key of keys) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }

  if (payload.data && typeof payload.data === "object") {
    return normalizeList(payload.data, keys);
  }

  return [];
}

function formatValue(value) {
  if (value === undefined || value === null || value === "") {
    return "0";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

function formatLabel(key) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function clearElement(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function createEmpty(message) {
  const empty = document.createElement("div");
  empty.className = "empty";
  empty.textContent = message;
  return empty;
}

function appendText(parent, text, className) {
  const element = document.createElement("div");
  if (className) {
    element.className = className;
  }
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

function renderBusinessName(data) {
  const business = data?.business || data?.business_info || data?.businesses?.[0] || data || {};
  const name = getFirstValue(business, ["name", "business_name", "businessName", "folder_name"]);

  els.businessName.textContent = name ? `Business: ${name}` : "Business dashboard";
}

function getBusinessId(data) {
  const business = data?.business || data?.business_info || data?.businesses?.[0] || data || {};
  const dashboardBusinessId = getFirstValue(business, ["folder_name", "business_id", "businessId", "id"]);

  if (dashboardBusinessId) {
    return dashboardBusinessId;
  }

  const savedBusinesses = localStorage.getItem("businesses");
  if (!savedBusinesses) {
    return "YOUR_BUSINESS_ID";
  }

  try {
    const parsed = JSON.parse(savedBusinesses);
    const savedBusiness = normalizeList(parsed, ["businesses", "items", "data"])[0];
    return getFirstValue(savedBusiness, ["folder_name", "business_id", "businessId", "id"]) || "YOUR_BUSINESS_ID";
  } catch (err) {
    console.warn("Unable to read saved businesses from localStorage", err);
    return "YOUR_BUSINESS_ID";
  }
}

function renderInstallInfo(data) {
  const businessId = getBusinessId(data);
  const widgetUrl = `${FRONTEND_URL}/widget.js`;

  els.chatbotUrl.value = widgetUrl;
  els.embedCode.value = [
    "<script",
    `  src="${widgetUrl}"`,
    `  data-business="${businessId}"`,
    "  defer",
    "></script>",
  ].join("\n");
}

function renderAnalytics(data) {
  const analytics = data?.analytics || data?.stats || data?.metrics || data || {};
  clearElement(els.analyticsCards);

  const preferredStats = [
    ["Total Conversations", ["total_conversations", "conversation_count", "conversations", "total_chats"]],
    ["Total Messages", ["total_messages", "message_count", "messages", "chat_messages"]],
    ["Unique Visitors", ["unique_visitors", "visitors", "visitor_count", "users"]],
    ["Avg Response Time", ["avg_response_time", "average_response_time", "response_time"]],
  ];

  const cards = preferredStats
    .map(([label, keys]) => ({ label, value: getFirstValue(analytics, keys) }))
    .filter(card => card.value !== undefined);

  if (cards.length === 0 && analytics && typeof analytics === "object") {
    Object.entries(analytics).forEach(([key, value]) => {
      const isRenderable = ["string", "number", "boolean"].includes(typeof value);
      const isDashboardPayload = ["business", "businesses", "settings", "chat_history", "messages", "conversations"].includes(key);
      if (isRenderable && !isDashboardPayload) {
        cards.push({ label: formatLabel(key), value });
      }
    });
  }

  if (cards.length === 0) {
    els.analyticsCards.appendChild(createEmpty("No analytics data is available yet."));
    return;
  }

  cards.slice(0, 8).forEach(card => {
    const stat = document.createElement("div");
    stat.className = "stat";

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = card.label;

    const value = document.createElement("div");
    value.className = "value";
    value.textContent = formatValue(card.value);

    stat.appendChild(label);
    stat.appendChild(value);
    els.analyticsCards.appendChild(stat);
  });
}

function getMessageText(item, keys) {
  const value = getFirstValue(item, keys);
  if (value !== undefined) {
    return String(value);
  }

  if (Array.isArray(item?.messages) && item.messages.length > 0) {
    const found = item.messages
      .slice()
      .reverse()
      .find(message => keys.some(key => message[key] !== undefined));
    return found ? String(getFirstValue(found, keys)) : "";
  }

  return "";
}

function createMetaItem(label, value) {
  const item = document.createElement("span");
  item.textContent = `${label}: ${value}`;
  return item;
}

function renderChatHistory(payload) {
  const history = normalizeList(payload, ["chat_history", "history", "messages", "conversations", "items"]);
  clearElement(els.chatHistory);
  setStatus(els.historyStatus, `${history.length} item${history.length === 1 ? "" : "s"}`);

  if (history.length === 0) {
    els.chatHistory.appendChild(createEmpty("No chat history is available yet."));
    return;
  }

  history.forEach(item => {
    const messageId = getFirstValue(item, ["id", "message_id", "chat_id"]);
    const conversationId = getFirstValue(item, ["conversation_id", "convo_id", "thread_id"]);
    const visitor = getFirstValue(item, ["visitor", "visitor_id", "customer", "customer_email", "email"]);
    const createdAt = getFirstValue(item, ["created_at", "timestamp", "time", "date"]);
    const userMessage = getMessageText(item, ["user_message", "message", "prompt", "question", "input", "user"]);
    const botResponse = getMessageText(item, ["bot_response", "response", "answer", "assistant", "output"]);

    const card = document.createElement("article");
    card.className = "chat-item";

    const meta = document.createElement("div");
    meta.className = "chat-meta";
    if (conversationId) {
      meta.appendChild(createMetaItem("Conversation", conversationId));
    }
    if (messageId) {
      meta.appendChild(createMetaItem("Message", messageId));
    }
    if (visitor) {
      meta.appendChild(createMetaItem("Visitor", visitor));
    }
    if (createdAt) {
      meta.appendChild(createMetaItem("Time", formatDate(createdAt)));
    }
    if (meta.childNodes.length > 0) {
      card.appendChild(meta);
    }

    const userRow = document.createElement("div");
    userRow.className = "chat-row";
    const userLabel = document.createElement("strong");
    userLabel.textContent = "User";
    userRow.appendChild(userLabel);
    userRow.appendChild(document.createTextNode(userMessage || "No user message recorded."));

    const botRow = document.createElement("div");
    botRow.className = "chat-row";
    const botLabel = document.createElement("strong");
    botLabel.textContent = "Bot";
    botRow.appendChild(botLabel);
    botRow.appendChild(document.createTextNode(botResponse || "No bot response recorded."));

    card.appendChild(userRow);
    card.appendChild(botRow);

    if (Array.isArray(item.messages)) {
      appendText(card, `${item.messages.length} messages in this conversation`, "help-text");
    }

    const actions = document.createElement("div");
    actions.className = "chat-actions";

    if (messageId) {
      const deleteMessageBtn = document.createElement("button");
      deleteMessageBtn.className = "danger";
      deleteMessageBtn.type = "button";
      deleteMessageBtn.textContent = "Delete message";
      deleteMessageBtn.addEventListener("click", () => deleteMessage(messageId));
      actions.appendChild(deleteMessageBtn);
    }

    if (conversationId) {
      const deleteConversationBtn = document.createElement("button");
      deleteConversationBtn.className = "danger";
      deleteConversationBtn.type = "button";
      deleteConversationBtn.textContent = "Delete conversation";
      deleteConversationBtn.addEventListener("click", () => deleteConversation(conversationId));
      actions.appendChild(deleteConversationBtn);
    }

    if (actions.childNodes.length > 0) {
      card.appendChild(actions);
    }

    els.chatHistory.appendChild(card);
  });
}

function faqsToText(faqs) {
  if (!faqs) {
    return "";
  }

  if (typeof faqs === "string") {
    return faqs;
  }

  if (Array.isArray(faqs)) {
    return faqs.map(faq => {
      if (typeof faq === "string") {
        return faq;
      }

      const question = getFirstValue(faq, ["question", "q", "prompt"]) || "";
      const answer = getFirstValue(faq, ["answer", "a", "response"]) || "";
      return answer ? `${question} | ${answer}` : question;
    }).join("\n");
  }

  if (typeof faqs === "object") {
    return Object.entries(faqs)
      .map(([question, answer]) => `${question} | ${answer}`)
      .join("\n");
  }

  return "";
}

function parseFaqs(text) {
  return text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const separatorIndex = line.indexOf("|");
      if (separatorIndex === -1) {
        return { question: line, answer: "" };
      }

      return {
        question: line.slice(0, separatorIndex).trim(),
        answer: line.slice(separatorIndex + 1).trim(),
      };
    });
}

function renderSettings(payload) {
  const settings = payload?.settings || payload || {};

  els.welcomeMessage.value = getFirstValue(settings, ["welcome_message", "welcomeMessage", "greeting", "welcome", "intro_message"]) || "";
  els.tone.value = getFirstValue(settings, ["tone", "chatbot_tone"]) || "";
  els.chatLength.value = getFirstValue(settings, ["chat_length", "max_response_length", "max_tokens", "response_length"]) || "";
  els.customInstructions.value = getFirstValue(settings, ["custom_instructions", "instructions", "system_prompt", "prompt_instructions"]) || "";
  els.faqs.value = faqsToText(getFirstValue(settings, ["faqs", "faq", "faq_list", "frequently_asked_questions"]));
}

async function loadDashboard() {
  setStatus(els.pageStatus, "Loading dashboard...");
  const data = await apiRequest("/client/dashboard");
  renderBusinessName(data);
  renderInstallInfo(data);
  renderAnalytics(data);
  setStatus(els.pageStatus, "");
}

async function loadHistory() {
  setStatus(els.historyStatus, "Loading...");
  const data = await apiRequest("/client/chat_history?limit=50");
  renderChatHistory(data);
}

async function loadSettings() {
  setStatus(els.settingsStatus, "Loading settings...");
  const data = await apiRequest("/client/chatbot_settings");
  renderSettings(data);
  setStatus(els.settingsStatus, "");
}

async function reloadDashboard() {
  try {
    await Promise.all([loadDashboard(), loadHistory(), loadSettings()]);
  } catch (err) {
    console.error(err);
    setStatus(els.pageStatus, err.message || "Unable to load dashboard.", "error");
  }
}

async function deleteMessage(messageId) {
  if (!confirm("Delete this chat message?")) {
    return;
  }

  try {
    setStatus(els.historyStatus, "Deleting...");
    await apiRequest(`/client/chat_history/${encodeURIComponent(messageId)}`, { method: "DELETE" });
    await Promise.all([loadDashboard(), loadHistory()]);
    setStatus(els.historyStatus, "Message deleted.", "success");
  } catch (err) {
    console.error(err);
    setStatus(els.historyStatus, err.message || "Unable to delete message.", "error");
  }
}

async function deleteConversation(conversationId) {
  if (!confirm("Delete this entire conversation?")) {
    return;
  }

  try {
    setStatus(els.historyStatus, "Deleting...");
    await apiRequest(`/client/conversations/${encodeURIComponent(conversationId)}`, { method: "DELETE" });
    await Promise.all([loadDashboard(), loadHistory()]);
    setStatus(els.historyStatus, "Conversation deleted.", "success");
  } catch (err) {
    console.error(err);
    setStatus(els.historyStatus, err.message || "Unable to delete conversation.", "error");
  }
}

async function changePassword(event) {
  event.preventDefault();

  const currentPassword = els.currentPassword.value;
  const newPassword = els.newPassword.value;
  const confirmPassword = els.confirmPassword.value;

  if (newPassword.length < 8) {
    setStatus(els.passwordStatus, "New password must be at least 8 characters.", "error");
    return;
  }

  if (newPassword !== confirmPassword) {
    setStatus(els.passwordStatus, "New passwords do not match.", "error");
    return;
  }

  try {
    setStatus(els.passwordStatus, "Updating password...");
    await apiRequest("/client/change_password", {
      method: "POST",
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
    els.passwordForm.reset();
    setStatus(els.passwordStatus, "Password updated successfully.", "success");
  } catch (err) {
    console.error(err);
    setStatus(els.passwordStatus, err.message || "Unable to update password.", "error");
  }
}

async function saveSettings(event) {
  event.preventDefault();

  const chatLength = Number(els.chatLength.value);
  const payload = {
    welcome_message: els.welcomeMessage.value.trim(),
    tone: els.tone.value.trim(),
    chat_length: Number.isFinite(chatLength) && chatLength > 0 ? chatLength : els.chatLength.value.trim(),
    custom_instructions: els.customInstructions.value.trim(),
    faqs: parseFaqs(els.faqs.value),
  };

  if (Number.isFinite(chatLength) && chatLength > 0) {
    payload.max_response_length = chatLength;
  }

  try {
    setStatus(els.settingsStatus, "Saving settings...");
    await apiRequest("/client/chatbot_settings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setStatus(els.settingsStatus, "Settings saved.", "success");
  } catch (err) {
    console.error(err);
    setStatus(els.settingsStatus, err.message || "Unable to save settings.", "error");
  }
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_role");
  redirectToLogin();
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    setStatus(els.copyUrlStatus, "Copied!", "success");
    setTimeout(() => {
      setStatus(els.copyUrlStatus, "");
    }, 2000);
  } catch (err) {
    console.error("Clipboard copy failed:", err);
    setStatus(els.copyUrlStatus, "Unable to copy. Please select and copy manually.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (!getToken()) {
    redirectToLogin();
    return;
  }

  els.logoutBtn.addEventListener("click", logout);
  els.refreshBtn.addEventListener("click", reloadDashboard);
  els.copyUrlBtn.addEventListener("click", () => copyToClipboard(els.chatbotUrl.value));
  els.copyEmbedBtn.addEventListener("click", () => copyToClipboard(els.embedCode.value));
  els.settingsForm.addEventListener("submit", saveSettings);
  els.passwordForm.addEventListener("submit", changePassword);

  reloadDashboard();
});
