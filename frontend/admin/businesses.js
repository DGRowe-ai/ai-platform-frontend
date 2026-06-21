const API_URL = "https://ai-platform-backend-ulqs.onrender.com";

const state = {
  analytics: {},
  businesses: [],
  filteredBusinesses: [],
  showOverdueOnly: false,
};

const els = {
  analyticsCards: document.getElementById("analytics-cards"),
  businessCount: document.getElementById("business-count"),
  clearFiltersBtn: document.getElementById("clear-filters-btn"),
  logoutBtn: document.getElementById("logout-btn"),
  modalActions: document.getElementById("modal-actions"),
  modalBackdrop: document.getElementById("modal-backdrop"),
  modalBody: document.getElementById("modal-body"),
  modalTitle: document.getElementById("modal-title"),
  overdueFilterBtn: document.getElementById("overdue-filter-btn"),
  pageStatus: document.getElementById("page-status"),
  paymentFilter: document.getElementById("payment-filter"),
  refreshBtn: document.getElementById("refresh-btn"),
  reportStatus: document.getElementById("report-status"),
  dailyReportPreview: document.getElementById("daily-report-preview"),
  previewDailyBtn: document.getElementById("preview-daily-btn"),
  sendDailyBtn: document.getElementById("send-daily-btn"),
  downloadMonthlyBtn: document.getElementById("download-monthly-btn"),
  sendMonthlyBtn: document.getElementById("send-monthly-btn"),
  searchInput: document.getElementById("search-input"),
  statusFilter: document.getElementById("status-filter"),
  tableBody: document.getElementById("business-table-body"),
};

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("access_token");
}

function redirectToLogin() {
  localStorage.removeItem("token");
  localStorage.removeItem("access_token");
  window.location.href = "login.html";
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
    businessKey: folderName || id,
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

function isBusinessSuspended(business) {
  if (business.raw.service_suspended === true) {
    return true;
  }

  const billingStatus = String(firstValue(business.raw, ["billing_status"], "")).toLowerCase();
  const status = String(firstValue(business.raw, ["status", "business_status", "subscription_status"], "")).toLowerCase();
  const paymentStatus = String(firstValue(business.raw, ["payment_status", "paymentStatus"], "")).toLowerCase();

  return billingStatus === "suspended" || status === "suspended" || paymentStatus === "suspended";
}

function isBusinessActive(business) {
  if (isBusinessSuspended(business)) {
    return false;
  }

  const rawStatus = String(firstValue(business.raw, ["status", "business_status", "subscription_status"], "")).toLowerCase();

  if (business.raw.disabled === true || business.raw.is_disabled === true || rawStatus === "disabled") {
    return false;
  }

  if (business.raw.active === false || business.raw.enabled === false) {
    return false;
  }

  return true;
}

function getPaymentState(business) {
  if (isBusinessSuspended(business)) {
    return "suspended";
  }

  const rawStatus = String(firstValue(business.raw, ["payment_status", "paymentStatus"], "")).toLowerCase();

  if (rawStatus.includes("suspended")) {
    return "suspended";
  }

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

  return date.toLocaleDateString();
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

function appendCell(row, content) {
  const cell = document.createElement("td");

  if (content instanceof Node) {
    cell.appendChild(content);
  } else {
    cell.textContent = content;
  }

  row.appendChild(cell);
  return cell;
}

function renderAnalytics() {
  const analytics = state.analytics || {};
  clearElement(els.analyticsCards);

  const activeCount = state.businesses.filter(isBusinessActive).length;
  const totalConversations = state.businesses.reduce((sum, business) => sum + Number(business.totalConversations || 0), 0);
  const totalMessages = state.businesses.reduce((sum, business) => sum + Number(business.totalMessages || 0), 0);

  const cards = [
    ["Total Businesses", firstValue(analytics, ["total_businesses", "business_count"], state.businesses.length)],
    ["Active Businesses", firstValue(analytics, ["total_active_businesses", "active_businesses"], activeCount)],
    ["Total Conversations", firstValue(analytics, ["total_conversations", "conversation_count"], totalConversations)],
    ["Total Messages", firstValue(analytics, ["total_messages", "message_count"], totalMessages)],
  ];

  cards.forEach(([label, value]) => {
    const card = document.createElement("div");
    card.className = "stat";

    const labelEl = document.createElement("div");
    labelEl.className = "label";
    labelEl.textContent = label;

    const valueEl = document.createElement("div");
    valueEl.className = "value";
    valueEl.textContent = formatNumber(value);

    card.appendChild(labelEl);
    card.appendChild(valueEl);
    els.analyticsCards.appendChild(card);
  });
}

function renderPaymentCell(business) {
  const wrapper = document.createElement("div");
  const paymentState = getPaymentState(business);

  if (paymentState === "overdue") {
    wrapper.appendChild(createBadge("Overdue", "danger"));
  } else if (paymentState === "suspended") {
    wrapper.appendChild(createBadge("Suspended", "danger"));
  } else if (paymentState === "none") {
    wrapper.appendChild(createBadge("No payments recorded", "warning"));
  } else {
    wrapper.appendChild(createBadge("Paid / up to date", "success"));
  }

  const lastPayment = document.createElement("div");
  lastPayment.className = "muted";
  lastPayment.textContent = `Last: ${formatDate(business.lastPaymentAt)}`;
  wrapper.appendChild(lastPayment);

  return wrapper;
}

function renderStatusCell(business) {
  if (isBusinessSuspended(business)) {
    return createBadge("Suspended", "danger");
  }

  return createBadge(
    isBusinessActive(business) ? "Active" : "Disabled",
    isBusinessActive(business) ? "success" : "danger",
  );
}

function renderActionsCell(business) {
  const actions = document.createElement("div");
  actions.className = "actions";

  const history = document.createElement("button");
  history.className = "secondary";
  history.type = "button";
  history.textContent = "Payment History";
  history.addEventListener("click", event => {
    event.stopPropagation();
    showPaymentHistory(business);
  });
  actions.appendChild(history);

  const accounting = document.createElement("a");
  accounting.className = "button-link secondary";
  accounting.href = `accounting-detail.html?b=${encodeURIComponent(business.businessKey)}`;
  accounting.textContent = "View Accounting";
  actions.appendChild(accounting);

  const record = document.createElement("button");
  record.type = "button";
  record.textContent = "Record Payment";
  record.addEventListener("click", event => {
    event.stopPropagation();
    showRecordPaymentModal(business);
  });
  actions.appendChild(record);

  const paid = document.createElement("button");
  paid.className = "secondary";
  paid.type = "button";
  paid.textContent = "Mark Paid";
  paid.addEventListener("click", event => {
    event.stopPropagation();
    confirmMarkPaid(business);
  });
  actions.appendChild(paid);

  if (isBusinessSuspended(business)) {
    const reactivate = document.createElement("button");
    reactivate.type = "button";
    reactivate.textContent = "Reactivate Service";
    reactivate.addEventListener("click", event => {
      event.stopPropagation();
      confirmReactivateService(business);
    });
    actions.appendChild(reactivate);
  } else {
    const suspend = document.createElement("button");
    suspend.className = "warning";
    suspend.type = "button";
    suspend.textContent = "Suspend Service";
    suspend.addEventListener("click", event => {
      event.stopPropagation();
      confirmSuspendService(business);
    });
    actions.appendChild(suspend);
  }

  const deleteClient = document.createElement("button");
  deleteClient.className = "danger";
  deleteClient.type = "button";
  deleteClient.textContent = "Delete Client";
  deleteClient.addEventListener("click", event => {
    event.stopPropagation();
    confirmDeleteClient(business);
  });
  actions.appendChild(deleteClient);

  return actions;
}

function renderBusinesses() {
  clearElement(els.tableBody);
  els.businessCount.textContent = `${state.filteredBusinesses.length} of ${state.businesses.length} businesses`;

  if (state.filteredBusinesses.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.appendChild(createEmpty(
      state.businesses.length === 0
        ? "No clients have been added yet. When a business signs up, it will appear in this list."
        : "No businesses match the current filters."
    ));
    row.appendChild(cell);
    els.tableBody.appendChild(row);
    return;
  }

  state.filteredBusinesses.forEach(business => {
    const row = document.createElement("tr");

    appendCell(row, business.name);
    appendCell(row, business.ownerEmail || "-");
    appendCell(row, formatDate(business.createdAt));
    appendCell(row, renderStatusCell(business));
    appendCell(row, renderPaymentCell(business));
    appendCell(row, formatDate(business.nextRenewalAt));
    appendCell(row, renderActionsCell(business));

    if (getPaymentState(business) === "overdue") {
      row.style.background = "#fff7f7";
    }

    els.tableBody.appendChild(row);
  });
}

function createEmpty(message) {
  const empty = document.createElement("div");
  empty.className = "empty";
  empty.textContent = message;
  return empty;
}

function applyFilters() {
  const search = els.searchInput.value.trim().toLowerCase();
  const status = els.statusFilter.value;
  const payment = els.paymentFilter.value;

  state.filteredBusinesses = state.businesses.filter(business => {
    const matchesSearch = !search ||
      business.name.toLowerCase().includes(search) ||
      String(business.ownerEmail || "").toLowerCase().includes(search);
    const matchesStatus = status === "all" ||
      (status === "active" && isBusinessActive(business)) ||
      (status === "suspended" && isBusinessSuspended(business)) ||
      (status === "disabled" && !isBusinessActive(business) && !isBusinessSuspended(business));
    const paymentState = getPaymentState(business);
    const matchesPayment = payment === "all" || payment === paymentState;
    const matchesOverdue = !state.showOverdueOnly || paymentState === "overdue";

    return matchesSearch && matchesStatus && matchesPayment && matchesOverdue;
  });

  renderBusinesses();
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
  const wrapper = document.createElement("div");
  wrapper.textContent = message;
  return wrapper;
}

function buildDeleteConfirmBody(business, errorMessage = "") {
  const wrapper = document.createElement("div");
  wrapper.className = "modal-body-content";

  const intro = document.createElement("p");
  intro.textContent = `This permanently deletes ${business.name}, removes its chatbot files, and deletes the owner account if they have no other businesses.`;

  const instruction = document.createElement("p");
  instruction.className = "muted";
  instruction.innerHTML = `Type <strong>${escapeHtml(business.name)}</strong> below to confirm.`;

  const field = document.createElement("div");
  field.className = "modal-confirm-field";

  const label = document.createElement("label");
  label.setAttribute("for", "delete-confirm-input");
  label.textContent = "Business name";

  const input = document.createElement("input");
  input.id = "delete-confirm-input";
  input.type = "text";
  input.placeholder = "Enter business name exactly";
  input.autocomplete = "off";
  input.spellcheck = false;

  const error = document.createElement("div");
  error.className = "modal-confirm-error";
  error.id = "delete-confirm-error";
  error.textContent = errorMessage;

  field.appendChild(label);
  field.appendChild(input);
  field.appendChild(error);

  wrapper.appendChild(intro);
  wrapper.appendChild(instruction);
  wrapper.appendChild(field);

  return wrapper;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function focusDeleteConfirmInput() {
  const input = document.getElementById("delete-confirm-input");
  if (input) {
    input.focus();
  }
}

async function recordPayment(business, payload) {
  const businessId = encodeURIComponent(business.businessKey);
  return tryApi([
    `/admin/businesses/${businessId}/payments`,
    `/admin/payments/${businessId}`,
    "/admin/record_payment",
    "/record_payment",
  ], {
    method: "POST",
    body: JSON.stringify({
      business_id: business.businessKey,
      ...payload,
    }),
  });
}

function showRecordPaymentModal(business) {
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

  const save = modalButton("Record Payment", "", async () => {
    const amount = document.getElementById("payment-amount").value;
    const paymentDate = document.getElementById("payment-date").value;
    const renewalDate = document.getElementById("renewal-date").value;
    const note = document.getElementById("payment-note").value;

    try {
      await recordPayment(business, {
        amount: amount ? Number(amount) : undefined,
        payment_date: paymentDate || new Date().toISOString(),
        next_renewal_date: renewalDate || undefined,
        note,
      });
      closeModal();
      await loadDashboard();
      setStatus("Payment recorded.", "success");
    } catch (err) {
      console.error(err);
      openModal("Payment route unavailable", messageNode(err.message), [
        modalButton("Close", "secondary", closeModal),
      ]);
    }
  });

  openModal(`Record payment for ${business.name}`, form, [
    modalButton("Cancel", "secondary", closeModal),
    save,
  ]);
}

async function deleteClientBusiness(business) {
  const businessKey = encodeURIComponent(business.businessKey);
  return apiRequest(`/admin/businesses/${businessKey}`, {
    method: "DELETE",
  });
}

async function suspendClientBusiness(business, sendEmail = true) {
  const businessKey = encodeURIComponent(business.businessKey);
  return apiRequest(`/admin/businesses/${businessKey}/suspend`, {
    method: "POST",
    body: JSON.stringify({ send_email: sendEmail }),
  });
}

async function reactivateClientBusiness(business) {
  const businessKey = encodeURIComponent(business.businessKey);
  return apiRequest(`/admin/businesses/${businessKey}/reactivate`, {
    method: "POST",
  });
}

function confirmSuspendService(business) {
  openModal(
    "Suspend client service?",
    messageNode(
      `Suspend ${business.name}? The chatbot will stop responding on their website and an email will be sent to ${business.ownerEmail || "the owner"} explaining how to reactivate.`,
    ),
    [
      modalButton("Cancel", "secondary", closeModal),
      modalButton("Suspend Service", "warning", async () => {
        try {
          const result = await suspendClientBusiness(business, true);
          closeModal();
          await loadDashboard();
          const emailNote = result.email_sent ? " Suspension email sent." : " Suspension email could not be sent.";
          setStatus(`${business.name} suspended.${emailNote}`, "success");
        } catch (err) {
          console.error(err);
          openModal("Unable to suspend service", messageNode(err.message), [
            modalButton("Close", "secondary", closeModal),
          ]);
        }
      }),
    ],
  );
}

function confirmReactivateService(business) {
  openModal(
    "Reactivate client service?",
    messageNode(`Restore chatbot service for ${business.name}?`),
    [
      modalButton("Cancel", "secondary", closeModal),
      modalButton("Reactivate Service", "", async () => {
        try {
          await reactivateClientBusiness(business);
          closeModal();
          await loadDashboard();
          setStatus(`${business.name} reactivated.`, "success");
        } catch (err) {
          console.error(err);
          openModal("Unable to reactivate service", messageNode(err.message), [
            modalButton("Close", "secondary", closeModal),
          ]);
        }
      }),
    ],
  );
}

function confirmDeleteClient(business) {
  const body = buildDeleteConfirmBody(business);

  openModal(
    "Delete client business?",
    body,
    [
      modalButton("Cancel", "secondary", closeModal),
      modalButton("Delete Client", "danger", async () => {
        const input = document.getElementById("delete-confirm-input");
        const errorEl = document.getElementById("delete-confirm-error");
        const typed = input ? input.value.trim() : "";

        if (typed !== business.name) {
          if (errorEl) {
            errorEl.textContent = `Enter the exact business name: ${business.name}`;
          }
          if (input) {
            input.focus();
            input.select();
          }
          return;
        }

        try {
          await deleteClientBusiness(business);
          closeModal();
          await loadDashboard();
          setStatus(`${business.name} deleted.`, "success");
        } catch (err) {
          console.error(err);
          if (errorEl) {
            errorEl.textContent = err.message || "Unable to delete client.";
          }
          if (input) {
            input.focus();
          }
        }
      }),
    ],
  );

  focusDeleteConfirmInput();
}

function confirmMarkPaid(business) {
  openModal(
    "Mark business as paid?",
    messageNode(`Mark ${business.name} as paid and up to date.`),
    [
      modalButton("Cancel", "secondary", closeModal),
      modalButton("Mark Paid", "", async () => {
        try {
          await recordPayment(business, {
            mark_paid: true,
            payment_date: new Date().toISOString(),
          });
          closeModal();
          await loadDashboard();
          setStatus("Business marked as paid.", "success");
        } catch (err) {
          console.error(err);
          openModal("Payment route unavailable", messageNode(err.message), [
            modalButton("Close", "secondary", closeModal),
          ]);
        }
      }),
    ],
  );
}

async function showPaymentHistory(business) {
  const businessId = encodeURIComponent(business.businessKey);

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
        const item = document.createElement("div");
        item.className = "detail-item";
        item.textContent = `${formatDate(firstValue(payment, ["payment_date", "date", "created_at"]))} - ${firstValue(payment, ["amount", "total"], "Payment recorded")} - ${firstValue(payment, ["status", "note"], "")}`;
        body.appendChild(item);
      });
    }

    openModal(`Payment history for ${business.name}`, body, [
      modalButton("Close", "secondary", closeModal),
    ]);
  } catch (err) {
    console.error(err);
    openModal("Payment route unavailable", messageNode(err.message), [
      modalButton("Close", "secondary", closeModal),
    ]);
  }
}

function formatReportPreview(data) {
  const metrics = data.summary_metrics || {};
  const lines = [
    `Rowe AI Daily Business Status Report`,
    `Date: ${data.report_date || "No data provided."}`,
    "",
    "SUMMARY METRICS",
    `- Total businesses signed up: ${metrics.total_businesses_signed_up ?? "No data provided."}`,
    `- New signups in the last 24 hours: ${metrics.new_signups_last_24h ?? "No data provided."}`,
    `- Businesses who have not activated their chatbot yet: ${metrics.businesses_not_activated ?? "No data provided."}`,
    `- Active businesses: ${metrics.active_businesses ?? "No data provided."}`,
    `- Inactive businesses (no chat activity): ${metrics.inactive_businesses ?? "No data provided."}`,
    `- Total chats in the last 24 hours: ${metrics.total_chats_last_24h ?? "No data provided."}`,
    `- Errors or warnings detected: ${metrics.errors_or_warnings ?? "No data provided."}`,
    `- Overdue clients: ${metrics.overdue_clients ?? "No data provided."}`,
    `- Upcoming renewals (next 7 days): ${metrics.upcoming_renewals_next_7_days ?? "No data provided."}`,
    "",
    "RECOMMENDED ACTIONS",
  ];

  (data.recommended_actions || []).forEach(action => lines.push(`- ${action}`));
  return lines.join("\n");
}

async function loadReportStatus() {
  if (!els.reportStatus) {
    return;
  }

  try {
    const status = await apiRequest("/admin/reports/status");
    const parts = [
      `Reports are sent to ${status.recipient || "rowe-ai@outlook.com"}.`,
      status.last_daily_report ? `Last daily report: ${formatDate(status.last_daily_report)}` : "Last daily report: No data provided.",
      status.last_monthly_report ? `Last monthly report: ${formatDate(status.last_monthly_report)}` : "Last monthly report: No data provided.",
    ];
    els.reportStatus.textContent = parts.join(" ");
  } catch (err) {
    console.warn("Report status unavailable:", err);
    els.reportStatus.textContent = "Report status unavailable on this backend.";
  }
}

async function previewDailyReport() {
  setStatus("Loading daily report preview...");
  try {
    const data = await apiRequest("/admin/reports/daily-preview");
    els.dailyReportPreview.hidden = false;
    els.dailyReportPreview.textContent = formatReportPreview(data);
    setStatus("Daily report preview loaded.", "success");
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Unable to load daily report preview.", "error");
  }
}

async function sendDailyReport() {
  setStatus("Sending daily report email...");
  try {
    const result = await apiRequest("/admin/reports/send-daily", { method: "POST" });
    if (result.preview) {
      els.dailyReportPreview.hidden = false;
      els.dailyReportPreview.textContent = formatReportPreview(result.preview);
    }
    await loadReportStatus();
    setStatus(`Daily report sent to ${result.recipient || "rowe-ai@outlook.com"}.`, "success");
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Unable to send daily report.", "error");
  }
}

async function downloadMonthlyReport() {
  setStatus("Preparing monthly PDF...");
  try {
    const token = getToken();
    const response = await fetch(`${API_URL}/admin/reports/monthly.pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401 || response.status === 403) {
      redirectToLogin();
      return;
    }

    if (!response.ok) {
      throw new Error("Unable to download monthly PDF.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const now = new Date();
    link.href = url;
    link.download = `rowe-ai-monthly-report-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Monthly PDF downloaded.", "success");
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Unable to download monthly PDF.", "error");
  }
}

async function sendMonthlyReport() {
  setStatus("Sending monthly PDF report...");
  try {
    const result = await apiRequest("/admin/reports/send-monthly", { method: "POST" });
    await loadReportStatus();
    setStatus(`Monthly report sent to ${result.recipient || "rowe-ai@outlook.com"}.`, "success");
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Unable to send monthly report.", "error");
  }
}

async function loadDashboard() {
  setStatus("Loading admin dashboard...");

  try {
    const [analyticsPayload, businessPayload] = await Promise.all([
      apiRequest("/admin/analytics").catch(err => {
        console.warn("Admin analytics unavailable:", err);
        return {};
      }),
      apiRequest("/admin/businesses"),
    ]);

    state.analytics = analyticsPayload && typeof analyticsPayload === "object" ? analyticsPayload : {};
    state.businesses = normalizeList(businessPayload, ["businesses", "items", "data"]).map(normalizeBusiness);
    state.filteredBusinesses = state.businesses.slice();

    renderAnalytics();
    applyFilters();
    await loadReportStatus();
    setStatus("Admin dashboard loaded.", "success");
  } catch (err) {
    console.error("Error loading admin dashboard:", err);
    setStatus(err.message || "Unable to load admin dashboard.", "error");
  }
}

function clearFilters() {
  els.searchInput.value = "";
  els.statusFilter.value = "all";
  els.paymentFilter.value = "all";
  state.showOverdueOnly = false;
  els.overdueFilterBtn.textContent = "View Overdue Businesses";
  applyFilters();
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

  els.refreshBtn.addEventListener("click", loadDashboard);
  els.logoutBtn.addEventListener("click", logout);
  if (els.previewDailyBtn) els.previewDailyBtn.addEventListener("click", previewDailyReport);
  if (els.sendDailyBtn) els.sendDailyBtn.addEventListener("click", sendDailyReport);
  if (els.downloadMonthlyBtn) els.downloadMonthlyBtn.addEventListener("click", downloadMonthlyReport);
  if (els.sendMonthlyBtn) els.sendMonthlyBtn.addEventListener("click", sendMonthlyReport);
  els.searchInput.addEventListener("input", applyFilters);
  els.statusFilter.addEventListener("change", applyFilters);
  els.paymentFilter.addEventListener("change", applyFilters);
  els.clearFiltersBtn.addEventListener("click", clearFilters);
  els.overdueFilterBtn.addEventListener("click", () => {
    state.showOverdueOnly = !state.showOverdueOnly;
    els.overdueFilterBtn.textContent = state.showOverdueOnly ? "Show All Businesses" : "View Overdue Businesses";
    applyFilters();
  });
  els.modalBackdrop.addEventListener("click", event => {
    if (event.target === els.modalBackdrop) {
      closeModal();
    }
  });

  loadDashboard();
});