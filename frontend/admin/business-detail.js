const API_URL = "https://ai-platform-backend-ulqs.onrender.com";

const state = {
  business: null,
  businessData: null,
  conversations: [],
};

const els = {
  analyticsCards: document.getElementById("analytics-cards"),
  backendErrorsBtn: document.getElementById("backend-errors-btn"),
  businessInfo: document.getElementById("business-info"),
  businessStatus: document.getElementById("business-status"),
  conversationList: document.getElementById("conversation-list"),
  conversationStatus: document.getElementById("conversation-status"),
  debugOutput: document.getElementById("debug-output"),
  deleteAllConversationsBtn: document.getElementById("delete-all-conversations-btn"),
  deleteBusinessBtn: document.getElementById("delete-business-btn"),
  exportBusinessLink: document.getElementById("export-business-link"),
  impersonateBtn: document.getElementById("impersonate-btn"),
  logoutBtn: document.getElementById("logout-btn"),
  markPaidBtn: document.getElementById("mark-paid-btn"),
  modalActions: document.getElementById("modal-actions"),
  modalBackdrop: document.getElementById("modal-backdrop"),
  modalBody: document.getElementById("modal-body"),
  modalTitle: document.getElementById("modal-title"),
  pageStatus: document.getElementById("page-status"),
  pageTitle: document.getElementById("page-title"),
  paymentHistoryBtn: document.getElementById("payment-history-btn"),
  paymentInfo: document.getElementById("payment-info"),
  paymentReminderBtn: document.getElementById("payment-reminder-btn"),
  recordPaymentBtn: document.getElementById("record-payment-btn"),
  refreshBtn: document.getElementById("refresh-btn"),
  regenerateAnalyticsBtn: document.getElementById("regenerate-analytics-btn"),
  resetSettingsBtn: document.getElementById("reset-settings-btn"),
  settingsInfo: document.getElementById("settings-info"),
  toggleStatusBtn: document.getElementById("toggle-status-btn"),
};

function getBusinessId() {
  return new URLSearchParams(window.location.search).get("id") || "";
}

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("access_token");
}

function redirectToLogin() {
  localStorage.removeItem("token");
  localStorage.removeItem("access_token");
  window.location.href = "../login.html";
}

function setStatus(message, type = "") {
  els.pageStatus.textContent = message || "";
  els.pageStatus.classList.remove("error", "success");
  if (type) {
    els.pageStatus.classList.add(type);
  }
}

async function apiRequest(path, options = {}) {
  const token = getToken();
  const { allowForbidden = false, ...fetchOptions } = options;

  if (!token) {
    redirectToLogin();
    throw new Error("Missing admin token");
  }

  const headers = {
    "Authorization": `Bearer ${token}`,
    ...options.headers,
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
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

  if (response.status === 401 || (response.status === 403 && !allowForbidden)) {
    redirectToLogin();
  }

  if (!response.ok) {
    const detail = data && typeof data === "object" ? data.detail || data.message : data;
    const error = new Error(typeof detail === "string" ? detail : `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function tryApi(paths, options = {}) {
  const errors = [];

  for (const path of paths) {
    try {
      return await apiRequest(path, options);
    } catch (err) {
      errors.push(err);
      if (err.status !== 404 && err.status !== 405) {
        throw err;
      }
    }
  }

  const error = new Error("This backend route is not available yet.");
  error.status = 404;
  error.errors = errors;
  throw error;
}

function firstValue(source, keys, fallback = "") {
  if (!source || typeof source !== "object") {
    return fallback;
  }

  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== "") {
      return source[key];
    }
  }

  return fallback;
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

function normalizeBusiness(raw) {
  const id = firstValue(raw, ["id", "business_id", "businessId", "folder_name"]);
  const folderName = firstValue(raw, ["folder_name", "business_id", "slug", "id"]);
  const name = firstValue(raw, ["name", "business_name", "businessName", "folder_name"], "Untitled business");

  return {
    ...raw,
    id,
    folderName,
    detailId: folderName || id,
    name,
    ownerEmail: firstValue(raw, ["owner_email", "ownerEmail", "email", "owner"]),
    createdAt: firstValue(raw, ["created_at", "created", "createdDate"]),
    lastActiveAt: firstValue(raw, ["last_active_at", "last_active", "lastActiveDate"]),
    lastPaymentAt: firstValue(raw, ["last_payment", "last_payment_date", "lastPaymentDate"]),
    nextRenewalAt: firstValue(raw, ["next_renewal", "next_renewal_date", "renewal_date", "renewalDate"]),
    totalConversations: firstValue(raw, ["total_conversations", "conversation_count", "conversations"], 0),
    totalMessages: firstValue(raw, ["total_messages", "message_count", "messages"], 0),
    raw,
  };
}

function isBusinessActive(business) {
  const rawStatus = String(firstValue(business.raw || business, ["status", "business_status", "subscription_status"], "")).toLowerCase();

  if ((business.raw || business).disabled === true || (business.raw || business).is_disabled === true || rawStatus === "disabled") {
    return false;
  }

  if ((business.raw || business).active === false || (business.raw || business).enabled === false) {
    return false;
  }

  return true;
}

function getPaymentState(business) {
  const rawStatus = String(firstValue(business.raw || business, ["payment_status", "paymentStatus"], "")).toLowerCase();

  if (rawStatus.includes("overdue")) {
    return "overdue";
  }

  if (rawStatus.includes("paid") || rawStatus.includes("up to date") || rawStatus.includes("current")) {
    return "paid";
  }

  if (!business.lastPaymentAt) {
    return "none";
  }

  if (business.nextRenewalAt) {
    const renewal = new Date(business.nextRenewalAt);
    if (!Number.isNaN(renewal.getTime()) && renewal < new Date()) {
      return "overdue";
    }
  }

  return "paid";
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function formatNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toLocaleString() : String(value);
}

function clearElement(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function createBadge(text, type) {
  const badge = document.createElement("span");
  badge.className = `badge ${type}`;
  badge.textContent = text;
  return badge;
}

function createEmpty(message) {
  const empty = document.createElement("div");
  empty.className = "empty";
  empty.textContent = message;
  return empty;
}

function appendDetail(parent, label, value) {
  const item = document.createElement("div");
  item.className = "detail-item";

  const strong = document.createElement("strong");
  strong.textContent = label;

  const valueEl = document.createElement("div");
  valueEl.textContent = value || "-";

  item.appendChild(strong);
  item.appendChild(valueEl);
  parent.appendChild(item);
}

function openModal(title, bodyNode, actions) {
  els.modalTitle.textContent = title;
  clearElement(els.modalBody);
  clearElement(els.modalActions);
  els.modalBody.appendChild(bodyNode);
  actions.forEach(action => els.modalActions.appendChild(action));
  els.modalBackdrop.classList.add("open");
}

function closeModal() {
  els.modalBackdrop.classList.remove("open");
}

function modalButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  if (className) {
    button.className = className;
  }
  button.addEventListener("click", onClick);
  return button;
}

function messageNode(message) {
  const node = document.createElement("div");
  node.textContent = message;
  return node;
}

function renderBusinessInfo() {
  const business = state.business;
  const businessData = state.businessData || {};
  const profile = businessData.profile || {};

  els.pageTitle.textContent = business.name;
  clearElement(els.businessInfo);
  clearElement(els.businessStatus);

  els.businessStatus.appendChild(createBadge(isBusinessActive(business) ? "Active" : "Disabled", isBusinessActive(business) ? "success" : "danger"));

  appendDetail(els.businessInfo, "Business name", firstValue(profile, ["name", "business_name"], business.name));
  appendDetail(els.businessInfo, "Owner email", business.ownerEmail);
  appendDetail(els.businessInfo, "Created date", formatDate(business.createdAt));
  appendDetail(els.businessInfo, "Last active date", formatDate(business.lastActiveAt));
  appendDetail(els.businessInfo, "Business ID", business.detailId);
}

function renderAnalytics() {
  clearElement(els.analyticsCards);

  const cards = [
    ["Total Conversations", state.business.totalConversations],
    ["Total Messages", state.business.totalMessages],
    ["Last Active", formatDate(state.business.lastActiveAt)],
    ["Payment Status", getPaymentLabel(state.business)],
  ];

  cards.forEach(([label, value]) => {
    const card = document.createElement("div");
    card.className = "stat";

    const labelEl = document.createElement("div");
    labelEl.className = "label";
    labelEl.textContent = label;

    const valueEl = document.createElement("div");
    valueEl.className = "value";
    valueEl.textContent = typeof value === "number" ? formatNumber(value) : value;

    card.appendChild(labelEl);
    card.appendChild(valueEl);
    els.analyticsCards.appendChild(card);
  });
}

function getPaymentLabel(business) {
  const status = getPaymentState(business);
  if (status === "overdue") {
    return "Overdue";
  }
  if (status === "none") {
    return "No payments";
  }
  return "Paid";
}

function renderSettings() {
  const data = state.businessData || {};
  const settings = data.settings || data.chatbot_settings || {};

  clearElement(els.settingsInfo);
  appendDetail(els.settingsInfo, "Welcome message", firstValue(settings, ["welcome_message", "greeting", "welcomeMessage"]));
  appendDetail(els.settingsInfo, "Tone", firstValue(settings, ["tone"]));
  appendDetail(els.settingsInfo, "Chat length", firstValue(settings, ["chat_length", "max_response_length", "max_tokens"]));
  appendDetail(els.settingsInfo, "Custom instructions", firstValue(settings, ["custom_instructions", "instructions", "system_prompt"]));
  appendDetail(els.settingsInfo, "FAQs", formatFaqs(firstValue(settings, ["faqs", "faq_list", "frequently_asked_questions"])));
}

function formatFaqs(faqs) {
  if (!faqs) {
    return "-";
  }

  if (typeof faqs === "string") {
    return faqs;
  }

  if (Array.isArray(faqs)) {
    return faqs.map(faq => {
      if (typeof faq === "string") {
        return faq;
      }
      return `${firstValue(faq, ["question", "q"])} - ${firstValue(faq, ["answer", "a"])}`;
    }).join("\n");
  }

  return JSON.stringify(faqs);
}

function renderPayment() {
  clearElement(els.paymentInfo);

  const status = getPaymentState(state.business);
  appendDetail(els.paymentInfo, "Payment status", getPaymentLabel(state.business));
  appendDetail(els.paymentInfo, "Last payment date", formatDate(state.business.lastPaymentAt));
  appendDetail(els.paymentInfo, "Next renewal date", formatDate(state.business.nextRenewalAt));

  if (status === "overdue") {
    els.paymentInfo.appendChild(createBadge("Overdue businesses are highlighted in red.", "danger"));
  } else if (status === "paid") {
    els.paymentInfo.appendChild(createBadge("Up to date", "success"));
  } else {
    els.paymentInfo.appendChild(createBadge("No payments recorded", "warning"));
  }
}

function getConversationId(conversation) {
  return firstValue(conversation, ["conversation_id", "convo_id", "id", "thread_id"]);
}

function renderConversations() {
  clearElement(els.conversationList);
  els.conversationStatus.textContent = `${state.conversations.length} conversation${state.conversations.length === 1 ? "" : "s"}`;

  if (state.conversations.length === 0) {
    els.conversationList.appendChild(createEmpty("Conversation history is not available from the current backend routes."));
    return;
  }

  state.conversations.forEach(conversation => {
    const conversationId = getConversationId(conversation);
    const card = document.createElement("div");
    card.className = "conversation";

    appendDetail(card, "Conversation", conversationId || "Unknown");
    appendDetail(card, "Created", formatDate(firstValue(conversation, ["created_at", "timestamp", "date"])));

    const messages = normalizeList(conversation, ["messages", "items"]);
    if (messages.length > 0) {
      const messageList = document.createElement("div");
      messageList.className = "message-list";
      messages.forEach(message => {
        const messageCard = document.createElement("div");
        messageCard.className = "message";
        appendDetail(messageCard, "User", firstValue(message, ["user_message", "message", "question", "user"]));
        appendDetail(messageCard, "Bot", firstValue(message, ["bot_response", "response", "answer", "assistant"]));
        messageList.appendChild(messageCard);
      });
      card.appendChild(messageList);
    }

    if (conversationId) {
      const deleteButton = document.createElement("button");
      deleteButton.className = "danger";
      deleteButton.type = "button";
      deleteButton.textContent = "Delete Conversation";
      deleteButton.addEventListener("click", () => confirmDeleteConversation(conversationId));
      card.appendChild(deleteButton);
    }

    els.conversationList.appendChild(card);
  });
}

async function loadBusinessListRecord(businessId) {
  const payload = await apiRequest("/admin/businesses");
  const businesses = normalizeList(payload, ["businesses", "items", "data"]).map(normalizeBusiness);
  return businesses.find(business => String(business.detailId) === String(businessId) || String(business.id) === String(businessId));
}

async function loadBusinessData(businessId) {
  try {
    return await apiRequest(`/business/${encodeURIComponent(businessId)}`, { allowForbidden: true });
  } catch (err) {
    console.warn("Business detail route unavailable:", err);
    return {};
  }
}

async function loadConversations(businessId) {
  try {
    const payload = await tryApi([
      `/admin/businesses/${encodeURIComponent(businessId)}/conversations`,
      `/admin/businesses/${encodeURIComponent(businessId)}/chat_history`,
      `/admin/chat_history?business_id=${encodeURIComponent(businessId)}`,
    ]);
    state.conversations = normalizeList(payload, ["conversations", "chat_history", "history", "items", "data"]);
  } catch (err) {
    console.warn("Conversation routes unavailable:", err);
    state.conversations = [];
  }
}

async function loadDetail() {
  const businessId = getBusinessId();

  if (!businessId) {
    setStatus("No business ID was provided.", "error");
    return;
  }

  setStatus("Loading business...");

  try {
    const listRecord = await loadBusinessListRecord(businessId);
    if (!listRecord) {
      throw new Error("Business was not found.");
    }

    state.business = listRecord;
    state.businessData = await loadBusinessData(listRecord.detailId);
    await loadConversations(listRecord.detailId);

    els.exportBusinessLink.href = `${API_URL}/export/business/${encodeURIComponent(listRecord.detailId)}`;
    renderBusinessInfo();
    renderAnalytics();
    renderSettings();
    renderPayment();
    renderConversations();
    setStatus("Business detail loaded.", "success");
  } catch (err) {
    console.error("Error loading business detail:", err);
    setStatus(err.message || "Unable to load business detail.", "error");
  }
}

async function runBusinessAction(action, options = {}) {
  const businessId = encodeURIComponent(state.business.detailId);
  return tryApi(options.paths || [
    `/admin/businesses/${businessId}/${action}`,
    `/admin/business/${businessId}/${action}`,
  ], {
    method: options.method || "POST",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

function confirmBusinessAction(title, message, action, className = "") {
  openModal(title, messageNode(message), [
    modalButton("Cancel", "secondary", closeModal),
    modalButton("Confirm", className, async () => {
      try {
        await action();
        closeModal();
        await loadDetail();
      } catch (err) {
        console.error(err);
        openModal("Backend route unavailable", messageNode(err.message), [
          modalButton("Close", "secondary", closeModal),
        ]);
      }
    }),
  ]);
}

function confirmToggleStatus() {
  const active = isBusinessActive(state.business);
  confirmBusinessAction(
    active ? "Disable business?" : "Enable business?",
    `${active ? "Disable" : "Enable"} ${state.business.name}.`,
    () => runBusinessAction(active ? "disable" : "enable"),
    active ? "warning" : "",
  );
}

function confirmDeleteBusiness() {
  confirmBusinessAction(
    "Delete business?",
    `Delete ${state.business.name}? This action should only be used when you are sure.`,
    () => runBusinessAction("delete", { method: "DELETE" }),
    "danger",
  );
}

function confirmResetSettings() {
  confirmBusinessAction(
    "Reset chatbot settings?",
    `Reset chatbot settings for ${state.business.name} to defaults.`,
    () => runBusinessAction("reset_chatbot_settings"),
    "warning",
  );
}

function confirmImpersonate() {
  confirmBusinessAction(
    "Impersonate business owner?",
    `Start an impersonation session for ${state.business.ownerEmail || state.business.name}.`,
    () => runBusinessAction("impersonate"),
    "warning",
  );
}

async function recordPayment(payload) {
  const businessId = encodeURIComponent(state.business.detailId);
  return tryApi([
    `/admin/businesses/${businessId}/payments`,
    `/admin/payments/${businessId}`,
    "/admin/record_payment",
    "/record_payment",
  ], {
    method: "POST",
    body: JSON.stringify({
      business_id: state.business.detailId,
      ...payload,
    }),
  });
}

function showRecordPaymentModal() {
  const form = document.createElement("form");
  form.innerHTML = `
    <label for="payment-amount">Amount</label>
    <input id="payment-amount" type="number" min="0" step="0.01" placeholder="0.00">
    <label for="payment-date">Payment Date</label>
    <input id="payment-date" type="date">
    <label for="renewal-date">Next Renewal Date</label>
    <input id="renewal-date" type="date">
    <label for="payment-note">Note</label>
    <textarea id="payment-note" placeholder="Manual payment note"></textarea>
  `;

  openModal(`Record payment for ${state.business.name}`, form, [
    modalButton("Cancel", "secondary", closeModal),
    modalButton("Record Payment", "", async () => {
      try {
        await recordPayment({
          amount: Number(document.getElementById("payment-amount").value || 0),
          payment_date: document.getElementById("payment-date").value || new Date().toISOString(),
          next_renewal_date: document.getElementById("renewal-date").value || undefined,
          note: document.getElementById("payment-note").value,
        });
        closeModal();
        await loadDetail();
      } catch (err) {
        console.error(err);
        openModal("Payment route unavailable", messageNode(err.message), [
          modalButton("Close", "secondary", closeModal),
        ]);
      }
    }),
  ]);
}

function confirmMarkPaid() {
  confirmBusinessAction(
    "Mark as paid?",
    `Mark ${state.business.name} as paid and up to date.`,
    () => recordPayment({ mark_paid: true, payment_date: new Date().toISOString() }),
  );
}

async function showPaymentHistory() {
  const businessId = encodeURIComponent(state.business.detailId);

  try {
    const payload = await tryApi([
      `/admin/businesses/${businessId}/payments`,
      `/admin/payments/${businessId}`,
      `/payments/${businessId}`,
      `/list_payments?business_id=${businessId}`,
    ]);
    const payments = normalizeList(payload, ["payments", "history", "items", "data"]);
    const body = document.createElement("div");

    if (payments.length === 0) {
      body.appendChild(createEmpty("No payments recorded for this business."));
    } else {
      payments.forEach(payment => {
        appendDetail(body, formatDate(firstValue(payment, ["payment_date", "date", "created_at"])), `${firstValue(payment, ["amount", "total"], "Payment")} ${firstValue(payment, ["status", "note"], "")}`);
      });
    }

    openModal("Payment History", body, [
      modalButton("Close", "secondary", closeModal),
    ]);
  } catch (err) {
    console.error(err);
    openModal("Payment route unavailable", messageNode(err.message), [
      modalButton("Close", "secondary", closeModal),
    ]);
  }
}

function confirmDeleteConversation(conversationId) {
  confirmBusinessAction(
    "Delete conversation?",
    `Delete conversation ${conversationId}?`,
    () => apiRequest(`/delete_conversation/${encodeURIComponent(conversationId)}`, { method: "DELETE" }),
    "danger",
  );
}

function confirmDeleteAllConversations() {
  confirmBusinessAction(
    "Delete all conversations?",
    `Delete all conversations for ${state.business.name}?`,
    () => runBusinessAction("conversations", {
      method: "DELETE",
      paths: [
        `/admin/businesses/${encodeURIComponent(state.business.detailId)}/conversations`,
        `/admin/conversations?business_id=${encodeURIComponent(state.business.detailId)}`,
      ],
    }),
    "danger",
  );
}

async function regenerateAnalytics() {
  try {
    await runBusinessAction("regenerate_analytics", {
      paths: [
        `/admin/businesses/${encodeURIComponent(state.business.detailId)}/regenerate_analytics`,
        `/admin/analytics/${encodeURIComponent(state.business.detailId)}/regenerate`,
      ],
    });
    setStatus("Analytics regeneration requested.", "success");
  } catch (err) {
    console.error(err);
    openModal("Analytics route unavailable", messageNode(err.message), [
      modalButton("Close", "secondary", closeModal),
    ]);
  }
}

async function viewBackendErrors() {
  try {
    const payload = await tryApi([
      `/admin/businesses/${encodeURIComponent(state.business.detailId)}/errors`,
      `/admin/errors?business_id=${encodeURIComponent(state.business.detailId)}`,
    ]);
    clearElement(els.debugOutput);
    const errors = normalizeList(payload, ["errors", "items", "data"]);
    if (errors.length === 0) {
      els.debugOutput.appendChild(createEmpty("No backend errors found for this business."));
      return;
    }
    errors.forEach(error => appendDetail(els.debugOutput, formatDate(firstValue(error, ["created_at", "timestamp", "date"])), firstValue(error, ["message", "detail", "error"], JSON.stringify(error))));
  } catch (err) {
    console.error(err);
    clearElement(els.debugOutput);
    els.debugOutput.appendChild(createEmpty(err.message));
  }
}

async function downloadBusinessExport(event) {
  event.preventDefault();

  try {
    const token = getToken();
    const response = await fetch(`${API_URL}/export/business/${encodeURIComponent(state.business.detailId)}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Export failed with status ${response.status}`);
    }

    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${state.business.detailId || "business"}-export.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (err) {
    console.error(err);
    openModal("Export unavailable", messageNode(err.message), [
      modalButton("Close", "secondary", closeModal),
    ]);
  }
}

function sendPaymentReminder() {
  confirmBusinessAction(
    "Send payment reminder?",
    `Send a payment reminder email to ${state.business.ownerEmail || state.business.name}.`,
    () => runBusinessAction("send_payment_reminder"),
  );
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_role");
  redirectToLogin();
}

document.addEventListener("DOMContentLoaded", () => {
  if (!getToken()) {
    redirectToLogin();
    return;
  }

  els.refreshBtn.addEventListener("click", loadDetail);
  els.logoutBtn.addEventListener("click", logout);
  els.toggleStatusBtn.addEventListener("click", confirmToggleStatus);
  els.deleteBusinessBtn.addEventListener("click", confirmDeleteBusiness);
  els.resetSettingsBtn.addEventListener("click", confirmResetSettings);
  els.impersonateBtn.addEventListener("click", confirmImpersonate);
  els.paymentHistoryBtn.addEventListener("click", showPaymentHistory);
  els.recordPaymentBtn.addEventListener("click", showRecordPaymentModal);
  els.markPaidBtn.addEventListener("click", confirmMarkPaid);
  els.paymentReminderBtn.addEventListener("click", sendPaymentReminder);
  els.deleteAllConversationsBtn.addEventListener("click", confirmDeleteAllConversations);
  els.regenerateAnalyticsBtn.addEventListener("click", regenerateAnalytics);
  els.backendErrorsBtn.addEventListener("click", viewBackendErrors);
  els.exportBusinessLink.addEventListener("click", downloadBusinessExport);
  els.modalBackdrop.addEventListener("click", event => {
    if (event.target === els.modalBackdrop) {
      closeModal();
    }
  });

  loadDetail();
});
