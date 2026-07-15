const API_URL = window.RoweAppConfig?.API_URL || "https://ai-platform-backend-ulqs.onrender.com";
const getWidgetBaseUrl =
  window.RoweAppConfig?.getWidgetBaseUrl ||
  (() => "https://ai-platform-frontend-uaaa.onrender.com");

let clientBusinessId = null;

const els = {
  analyticsCards: document.getElementById("analytics-cards"),
  businessName: document.getElementById("business-name"),
  chatHistory: document.getElementById("chat-history"),
  chatbotUrl: document.getElementById("chatbot-url"),
  historyStatus: document.getElementById("history-status"),
  copyEmbedBtn: document.getElementById("copy-embed-btn"),
  copyEmbedStatus: document.getElementById("copy-embed-status"),
  copyUrlBtn: document.getElementById("copy-url-btn"),
  copyUrlStatus: document.getElementById("copy-url-status"),
  embedCode: document.getElementById("embed-code"),
  logoutBtn: document.getElementById("logout-btn"),
  manageSubscriptionBtn: document.getElementById("manage-subscription-btn"),
  voiceDashboardBtn: null,
  adminPanelBtn: document.getElementById("admin-panel-btn"),
  billingStatus: document.getElementById("billing-status"),
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
  kbFileInput: document.getElementById("kb-file"),
  kbUploadBtn: document.getElementById("kb-upload-btn"),
  kbFileList: document.getElementById("kb-file-list"),
  kbStatus: document.getElementById("kb-status"),
  kbSpinner: document.getElementById("kb-spinner"),
  chatbotMessages: document.getElementById("chatbot-messages"),
  chatbotInput: document.getElementById("chatbot-input"),
  chatbotSendBtn: document.getElementById("chatbot-send-btn"),
  chatbotTestStatus: document.getElementById("chatbot-test-status"),
  referralLink: document.getElementById("referral-link"),
  copyReferralBtn: document.getElementById("copy-referral-btn"),
  copyReferralStatus: document.getElementById("copy-referral-status"),
  referralCount: document.getElementById("referral-count"),
  freeMonthsEarned: document.getElementById("free-months-earned"),
  referralStatus: document.getElementById("referral-status"),
  deleteAccountBtn: document.getElementById("delete-account-btn"),
  deleteAccountStatus: document.getElementById("delete-account-status"),
  deleteAccountModal: document.getElementById("delete-account-modal"),
  deleteAccountCancelBtn: document.getElementById("delete-account-cancel-btn"),
  deleteAccountConfirmBtn: document.getElementById("delete-account-confirm-btn"),
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

function isPlatformAdmin() {
  return localStorage.getItem("is_platform_admin") === "1";
}

function redirectToLogin() {
  window.location.href = "login.html";
}

function hasBothProducts(subscription) {
  if (subscription?.plan_type === "duo") {
    return true;
  }
  return Boolean(subscription?.has_chatbot && subscription?.has_voicebot);
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

function buildEmbedSnippet(businessId) {
  const widgetUrl = `${getWidgetBaseUrl()}/widget.js`;
  return [
    "<script",
    `  src="${widgetUrl}"`,
    `  data-business="${businessId}"`,
    "></script>",
  ].join("\n");
}

function renderInstallInfo(data) {
  const businessId = getBusinessId(data);
  const baseUrl = getWidgetBaseUrl();

  els.chatbotUrl.value = `${baseUrl}/chat.html?b=${encodeURIComponent(businessId)}`;
  els.embedCode.value = buildEmbedSnippet(businessId);
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

function statusBadgeClass(status) {
  return String(status || "Pending").toLowerCase();
}

function toggleAppointmentNotificationFields() {
  const method = els.appointmentNotifyMethod?.value || "email";
  if (els.appointmentEmailWrap) {
    els.appointmentEmailWrap.classList.toggle("hidden", method !== "email");
  }
  if (els.appointmentWebhookWrap) {
    els.appointmentWebhookWrap.classList.toggle("hidden", method !== "webhook");
  }
}

function renderAppointmentSettings(settings = {}) {
  if (els.appointmentTimezone) {
    els.appointmentTimezone.value = settings.timezone || "America/Toronto";
  }
  if (els.appointmentNotifyMethod) {
    els.appointmentNotifyMethod.value = settings.notification_method || "email";
  }
  if (els.appointmentNotifyEmail) {
    els.appointmentNotifyEmail.value =
      settings.ownerNotificationEmail || settings.notification_email || "";
  }
  if (els.appointmentWebhookUrl) {
    els.appointmentWebhookUrl.value = settings.webhook_url || "";
  }
  toggleAppointmentNotificationFields();
}

function renderAppointmentRequests(payload) {
  const requests = normalizeList(payload, ["requests", "appointment_requests", "items"]);
  clearElement(els.appointmentRequests);
  setStatus(
    els.appointmentsStatus,
    `${requests.length} request${requests.length === 1 ? "" : "s"}`,
  );

  if (!requests.length) {
    els.appointmentRequests.appendChild(
      createEmpty("No appointment requests yet. Customers can request one through your chatbot or voicebot."),
    );
    return;
  }

  requests.forEach(item => {
    const card = document.createElement("article");
    card.className = "appointment-item";

    const header = document.createElement("header");
    const title = document.createElement("h3");
    title.textContent = item.customer_name || "Customer";
    header.appendChild(title);

    const badge = document.createElement("span");
    badge.className = `status-badge ${statusBadgeClass(item.status)}`;
    badge.textContent = item.status || "Pending";
    header.appendChild(badge);
    card.appendChild(header);

    const meta = document.createElement("div");
    meta.className = "appointment-meta";
    meta.appendChild(createMetaItem("Contact", item.customer_contact || "-"));
    meta.appendChild(createMetaItem("Service", item.service || "-"));
    meta.appendChild(
      createMetaItem(
        "When",
        item.normalized_datetime || `${item.requested_date || ""} ${item.requested_time || ""}`.trim(),
      ),
    );
    meta.appendChild(createMetaItem("Timezone", item.timezone || "-"));
    if (item.notes) {
      meta.appendChild(createMetaItem("Notes", item.notes));
    }
    if (item.created_at) {
      meta.appendChild(createMetaItem("Submitted", formatDate(item.created_at)));
    }
    card.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "appointment-actions";

    const select = document.createElement("select");
    ["Pending", "Confirmed", "Rejected", "Done"].forEach(status => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status;
      if ((item.status || "Pending") === status) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "secondary";
    saveBtn.textContent = "Update Status";
    saveBtn.addEventListener("click", async () => {
      try {
        setStatus(els.appointmentsStatus, "Updating...");
        await apiRequest(`/client/appointment_requests/${encodeURIComponent(item.id)}`, {
          method: "PATCH",
          body: JSON.stringify({ status: select.value }),
        });
        await loadAppointments();
        setStatus(els.appointmentsStatus, "Status updated.", "success");
      } catch (err) {
        console.error(err);
        setStatus(els.appointmentsStatus, err.message || "Unable to update status.", "error");
      }
    });

    actions.appendChild(select);
    actions.appendChild(saveBtn);
    card.appendChild(actions);
    els.appointmentRequests.appendChild(card);
  });
}

async function loadAppointments() {
  const data = await apiRequest("/client/appointment_requests");
  renderAppointmentRequests(data);
}

async function loadAppointmentSettings() {
  const data = await apiRequest("/client/appointment_settings");
  renderAppointmentSettings(data);
}

async function saveAppointmentSettings(event) {
  event.preventDefault();
  setStatus(els.appointmentSettingsStatus, "Saving...");

  try {
    await apiRequest("/client/appointment_settings", {
      method: "POST",
      body: JSON.stringify({
        timezone: els.appointmentTimezone.value,
        notification_method: els.appointmentNotifyMethod.value,
        ownerNotificationEmail: els.appointmentNotifyEmail.value.trim(),
        notification_email: els.appointmentNotifyEmail.value.trim(),
        webhook_url: els.appointmentWebhookUrl.value.trim(),
      }),
    });
    setStatus(els.appointmentSettingsStatus, "Appointment settings saved.", "success");
  } catch (err) {
    console.error(err);
    setStatus(els.appointmentSettingsStatus, err.message || "Unable to save settings.", "error");
  }
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
  const business = data?.business || data?.business_info || data?.businesses?.[0] || {};
  clientBusinessId = getFirstValue(business, ["id", "business_id", "businessId"]) || null;
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

function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (!Number.isFinite(size) || size <= 0) {
    return "0 B";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadedAt(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function renderKnowledgeFiles(files) {
  els.kbFileList.innerHTML = "";

  if (!files.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No knowledge files uploaded yet.";
    els.kbFileList.appendChild(empty);
    return;
  }

  files.forEach(file => {
    const item = document.createElement("div");
    item.className = "kb-file-item";

    const meta = document.createElement("div");
    meta.className = "kb-file-meta";

    const name = document.createElement("div");
    name.className = "kb-file-name";
    name.textContent = file.file_name || "Untitled file";

    const details = document.createElement("div");
    details.className = "kb-file-details";
    details.textContent = `${file.file_type || "file"} • ${formatFileSize(file.file_size)} • Uploaded ${formatUploadedAt(file.uploaded_at)}`;

    meta.appendChild(name);
    meta.appendChild(details);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "danger";
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteKnowledgeFile(file.id, file.file_name));

    item.appendChild(meta);
    item.appendChild(deleteBtn);
    els.kbFileList.appendChild(item);
  });
}

async function loadKnowledgeFiles() {
  setStatus(els.kbStatus, "Loading knowledge files...");
  try {
    const data = await apiRequest("/api/knowledge/list");
    const files = Array.isArray(data?.files) ? data.files : [];
    renderKnowledgeFiles(files);
    setStatus(els.kbStatus, "");
  } catch (err) {
    console.error(err);
    renderKnowledgeFiles([]);
    setStatus(els.kbStatus, err.message || "Unable to load knowledge files.", "error");
  }
}

async function uploadKnowledgeFile() {
  const file = els.kbFileInput.files && els.kbFileInput.files[0];
  if (!file) {
    setStatus(els.kbStatus, "Choose a file before uploading.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  els.kbUploadBtn.disabled = true;
  els.kbSpinner.classList.add("visible");
  setStatus(els.kbStatus, "");

  try {
    const token = getToken();
    const response = await fetch(`${API_URL}/api/knowledge/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
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
      return;
    }

    if (!response.ok) {
      const detail = data && typeof data === "object" ? data.detail || data.message : data;
      throw new Error(detail || "Upload failed.");
    }

    els.kbFileInput.value = "";
    await loadKnowledgeFiles();
    setStatus(els.kbStatus, data?.message || "File uploaded successfully.", "success");
  } catch (err) {
    console.error(err);
    setStatus(els.kbStatus, err.message || "Unable to upload file.", "error");
  } finally {
    els.kbUploadBtn.disabled = false;
    els.kbSpinner.classList.remove("visible");
  }
}

async function deleteKnowledgeFile(fileId, fileName) {
  if (!confirm(`Delete "${fileName}" from your knowledge base?`)) {
    return;
  }

  setStatus(els.kbStatus, "Deleting file...");
  try {
    await apiRequest(`/api/knowledge/delete/${encodeURIComponent(fileId)}`, { method: "DELETE" });
    await loadKnowledgeFiles();
    setStatus(els.kbStatus, "File deleted.", "success");
  } catch (err) {
    console.error(err);
    setStatus(els.kbStatus, err.message || "Unable to delete file.", "error");
  }
}

function appendChatbotMessage(text, role) {
  const message = document.createElement("div");
  message.className = `chatbot-message ${role}`;
  message.textContent = text;
  els.chatbotMessages.appendChild(message);
  els.chatbotMessages.scrollTop = els.chatbotMessages.scrollHeight;
  return message;
}

function scrollChatbotToBottom() {
  els.chatbotMessages.scrollTop = els.chatbotMessages.scrollHeight;
}

async function sendTestChatMessage() {
  const userMessage = els.chatbotInput.value.trim();
  if (!userMessage) {
    setStatus(els.chatbotTestStatus, "Enter a message before sending.", "error");
    return;
  }

  if (userMessage.length > 2000) {
    setStatus(els.chatbotTestStatus, "Message exceeds the 2000 character limit.", "error");
    return;
  }

  appendChatbotMessage(userMessage, "user");
  els.chatbotInput.value = "";
  els.chatbotSendBtn.disabled = true;
  setStatus(els.chatbotTestStatus, "");

  const loadingMessage = appendChatbotMessage("Thinking...", "loading");

  try {
    const payload = {
      message: userMessage,
    };

    if (clientBusinessId) {
      payload.client_id = clientBusinessId;
    }

    const data = await apiRequest("/api/chat", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    loadingMessage.remove();
    appendChatbotMessage(data?.reply || "No response received.", "bot");
  } catch (err) {
    console.error(err);
    loadingMessage.remove();
    appendChatbotMessage(err.message || "Unable to get a chatbot response.", "bot");
    setStatus(els.chatbotTestStatus, err.message || "Unable to send message.", "error");
  } finally {
    els.chatbotSendBtn.disabled = false;
    scrollChatbotToBottom();
  }
}

async function loadReferralStats() {
  if (!els.referralLink || !window.RoweReferralDashboard) {
    return;
  }

  await window.RoweReferralDashboard.loadReferralStats({
    apiRequest,
    setStatus,
    els,
  });
}

async function loadSubscription() {
  const subscription = await apiRequest("/client/subscription");
  const productType = subscription.product_type || subscription.plan_type || "chatbot";
  const tier = subscription.tier || "chatbot";
  localStorage.setItem("plan_type", productType);
  localStorage.setItem("product_type", productType);
  localStorage.setItem("tier", tier);

  const isEmbed = new URLSearchParams(window.location.search).get("embed") === "1";
  if (isEmbed || subscription.complimentary) {
    return;
  }

  if (productType === "voicebot") {
    window.location.href = "dashboard-voicebot.html";
    return;
  }
  if (productType === "duo") {
    window.location.href = "dashboard-duo.html";
    return;
  }
}

async function reloadDashboard() {
  try {
    await Promise.all([
      loadDashboard(),
      loadHistory(),
      loadSettings(),
      loadKnowledgeFiles(),
      loadReferralStats(),
      loadAppointments(),
      loadAppointmentSettings(),
      loadSubscription(),
    ]);
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
  localStorage.removeItem("is_platform_admin");
  redirectToLogin();
}

async function openCustomerPortal() {
  setStatus(els.billingStatus, "Opening billing portal...");
  els.manageSubscriptionBtn.disabled = true;

  try {
    const data = await apiRequest("/create-customer-portal-session", { method: "POST" });
    if (!data?.url) {
      throw new Error("Billing portal URL was not returned.");
    }
    window.location.href = data.url;
  } catch (err) {
    setStatus(els.billingStatus, err.message || "Unable to open billing portal.", "error");
    els.manageSubscriptionBtn.disabled = false;
  }
}

async function copyToClipboard(text, statusEl = els.copyUrlStatus) {
  try {
    await navigator.clipboard.writeText(text);
    setStatus(statusEl, "Copied!", "success");
    setTimeout(() => {
      setStatus(statusEl, "");
    }, 2000);
  } catch (err) {
    console.error("Clipboard copy failed:", err);
    setStatus(statusEl, "Unable to copy. Please select and copy manually.", "error");
  }
}

function openDeleteAccountModal() {
  if (els.deleteAccountModal) {
    els.deleteAccountModal.classList.add("open");
  }
}

function closeDeleteAccountModal() {
  if (els.deleteAccountModal) {
    els.deleteAccountModal.classList.remove("open");
  }
}

async function deleteAccount() {
  if (!els.deleteAccountConfirmBtn) {
    return;
  }

  els.deleteAccountConfirmBtn.disabled = true;
  setStatus(els.deleteAccountStatus, "Deleting your account...", "");

  try {
    const response = await apiRequest("/api/account/delete", { method: "DELETE" });
    closeDeleteAccountModal();

    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("is_platform_admin");
    localStorage.removeItem("user_id");
    localStorage.removeItem("businesses");

    sessionStorage.setItem(
      "account_deleted_message",
      response.message || "Your account has been deleted.",
    );
    window.location.href = response.redirect_url || "billing.html?account_deleted=1";
  } catch (err) {
    console.error("Account deletion failed:", err);
    setStatus(
      els.deleteAccountStatus,
      err.message || "Unable to delete your account. Please contact support.",
      "error",
    );
    els.deleteAccountConfirmBtn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (!getToken()) {
    redirectToLogin();
    return;
  }

  const role = (localStorage.getItem("user_role") || "owner").toLowerCase();
  if (isPlatformAdmin() && els.adminPanelBtn) {
    els.adminPanelBtn.style.display = "inline-block";
  }
  if (role !== "owner" && !isPlatformAdmin() && els.manageSubscriptionBtn) {
    els.manageSubscriptionBtn.closest(".billing")?.classList.add("hidden");
  }
  if (role !== "owner" && !isPlatformAdmin() && els.deleteAccountBtn) {
    els.deleteAccountBtn.closest(".account-management")?.classList.add("hidden");
  }

  els.logoutBtn.addEventListener("click", logout);
  els.manageSubscriptionBtn.addEventListener("click", openCustomerPortal);
  els.refreshBtn.addEventListener("click", reloadDashboard);
  els.copyUrlBtn.addEventListener("click", () => copyToClipboard(els.chatbotUrl.value, els.copyUrlStatus));
  els.copyEmbedBtn.addEventListener("click", () => copyToClipboard(els.embedCode.value, els.copyEmbedStatus));
  if (els.copyReferralBtn) {
    els.copyReferralBtn.addEventListener("click", () =>
      window.RoweReferralDashboard?.copyReferralLink(
        els.referralLink.value,
        els.copyReferralStatus,
      ),
    );
  }
  els.settingsForm.addEventListener("submit", saveSettings);
  els.passwordForm.addEventListener("submit", changePassword);
  els.kbUploadBtn.addEventListener("click", uploadKnowledgeFile);
  els.chatbotSendBtn.addEventListener("click", sendTestChatMessage);
  els.chatbotInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendTestChatMessage();
    }
  });

  if (els.deleteAccountBtn) {
    els.deleteAccountBtn.addEventListener("click", openDeleteAccountModal);
  }
  if (els.deleteAccountCancelBtn) {
    els.deleteAccountCancelBtn.addEventListener("click", closeDeleteAccountModal);
  }
  if (els.deleteAccountConfirmBtn) {
    els.deleteAccountConfirmBtn.addEventListener("click", deleteAccount);
  }
  if (els.deleteAccountModal) {
    els.deleteAccountModal.addEventListener("click", event => {
      if (event.target === els.deleteAccountModal) {
        closeDeleteAccountModal();
      }
    });
  }

  if (els.appointmentSettingsForm) {
    els.appointmentSettingsForm.addEventListener("submit", saveAppointmentSettings);
  }
  if (els.appointmentNotifyMethod) {
    els.appointmentNotifyMethod.addEventListener("change", toggleAppointmentNotificationFields);
  }

  reloadDashboard();
});
