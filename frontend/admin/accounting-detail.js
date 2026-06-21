const API_URL = "https://ai-platform-backend-ulqs.onrender.com";

const els = {
  businessSubtitle: document.getElementById("business-subtitle"),
  businessTitle: document.getElementById("business-title"),
  clientSummary: document.getElementById("client-summary"),
  databasePaymentBody: document.getElementById("database-payment-body"),
  logPath: document.getElementById("log-path"),
  logSummary: document.getElementById("log-summary"),
  logoutBtn: document.getElementById("logout-btn"),
  pageStatus: document.getElementById("page-status"),
  paymentLogBody: document.getElementById("payment-log-body"),
  refreshBtn: document.getElementById("refresh-btn"),
};

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("access_token");
}

function getBusinessKey() {
  return new URLSearchParams(window.location.search).get("b");
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
    throw new Error("Admin access required.");
  }

  if (!response.ok) {
    const detail = data && typeof data === "object" ? data.detail : null;
    throw new Error(detail || text || `Request failed (${response.status}).`);
  }

  return data;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  if (!value) {
    return "—";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString();
}

function renderSummaryItem(label, value) {
  const item = document.createElement("div");
  item.className = "detail-list-item";
  item.innerHTML = `<strong>${escapeHtml(label)}</strong>${escapeHtml(value || "—")}`;
  return item;
}

function renderEmptyRow(tableBody, message, columnCount) {
  tableBody.innerHTML = `<tr><td colspan="${columnCount}">${escapeHtml(message)}</td></tr>`;
}

function renderDetail(data) {
  const business = data.business || {};
  const paymentLog = data.payment_log || {};
  const dbPayments = Array.isArray(data.database_payments) ? data.database_payments : [];
  const entries = Array.isArray(paymentLog.entries) ? paymentLog.entries : [];

  els.businessTitle.textContent = business.name || "Business Accounting";
  els.businessSubtitle.textContent = business.owner_email
    ? `Payment log and billing details for ${business.owner_email}.`
    : "Payment log and billing details for this client.";

  els.clientSummary.innerHTML = "";
  [
    ["Business Key", business.business_key],
    ["Owner Email", business.owner_email],
    ["Billing Status", business.billing_status],
    ["Subscription Active", business.subscription_active ? "Yes" : "No"],
    ["Stripe Customer ID", business.stripe_customer_id],
  ].forEach(([label, value]) => {
    els.clientSummary.appendChild(renderSummaryItem(label, value));
  });

  els.logSummary.innerHTML = "";
  [
    ["Payment Folder", paymentLog.payment_folder],
    ["Log Exists", paymentLog.log_exists ? "Yes" : "No"],
    ["Log Entries", String(paymentLog.entry_count ?? 0)],
    ["Last Payment Date", paymentLog.last_payment_date],
    ["Last Payment Amount", paymentLog.last_payment_amount],
  ].forEach(([label, value]) => {
    els.logSummary.appendChild(renderSummaryItem(label, value));
  });

  els.logPath.textContent = paymentLog.log_path || "No payment log path available.";

  els.paymentLogBody.innerHTML = "";
  if (entries.length === 0) {
    renderEmptyRow(els.paymentLogBody, "No Stripe payment log entries yet.", 4);
  } else {
    entries.slice().reverse().forEach(entry => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(entry.date || "—")}</td>
        <td>${escapeHtml(entry.amount || "—")}</td>
        <td>${escapeHtml(entry.invoice_id || "—")}</td>
        <td>${escapeHtml(entry.description || "—")}</td>
      `;
      els.paymentLogBody.appendChild(row);
    });
  }

  els.databasePaymentBody.innerHTML = "";
  if (dbPayments.length === 0) {
    renderEmptyRow(els.databasePaymentBody, "No database payment records for this business.", 5);
  } else {
    dbPayments.forEach(payment => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(formatDate(payment.payment_date))}</td>
        <td>${escapeHtml(payment.amount != null ? String(payment.amount) : "—")}</td>
        <td>${escapeHtml(formatDate(payment.next_renewal_date))}</td>
        <td>${escapeHtml(payment.payment_type || "—")}</td>
        <td>${escapeHtml(payment.note || "—")}</td>
      `;
      els.databasePaymentBody.appendChild(row);
    });
  }
}

async function loadBusinessAccounting() {
  const businessKey = getBusinessKey();
  if (!businessKey) {
    setStatus("Missing business key.", "error");
    return;
  }

  setStatus("Loading business accounting...");

  try {
    const data = await apiRequest(
      `/admin/accounting/businesses/${encodeURIComponent(businessKey)}`,
    );
    renderDetail(data);
    setStatus("Business accounting loaded.", "success");
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Unable to load business accounting.", "error");
  }
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

  els.refreshBtn.addEventListener("click", loadBusinessAccounting);
  els.logoutBtn.addEventListener("click", logout);

  loadBusinessAccounting();
});
