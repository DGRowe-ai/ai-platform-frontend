const API_URL = "https://ai-platform-backend-ulqs.onrender.com";

const els = {
  businessName: document.getElementById("business-name"),
  emptyState: document.getElementById("empty-state"),
  logoutBtn: document.getElementById("logout-btn"),
  pageStatus: document.getElementById("page-status"),
  paymentHistoryBody: document.getElementById("payment-history-body"),
  refreshBtn: document.getElementById("refresh-btn"),
};

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("access_token");
}

function redirectToLogin() {
  window.location.href = "login.html";
}

function setStatus(message, type = "") {
  els.pageStatus.textContent = message || "";
  els.pageStatus.classList.remove("success", "error");
  if (type) {
    els.pageStatus.classList.add(type);
  }
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
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    redirectToLogin();
    throw new Error("You are not authorized to view this page.");
  }

  if (!response.ok) {
    const detail = data && typeof data === "object" ? data.detail || data.message : data;
    throw new Error(detail || `Request failed with status ${response.status}`);
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

function renderPaymentHistory(data) {
  const business = data?.business || {};
  const entries = Array.isArray(data?.entries) ? data.entries : [];

  els.businessName.textContent = business.name
    ? `Business: ${business.name}`
    : "Business dashboard";

  els.paymentHistoryBody.innerHTML = "";

  if (entries.length === 0) {
    els.emptyState.hidden = false;
    return;
  }

  els.emptyState.hidden = true;

  entries.forEach(entry => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(entry.date || "—")}</td>
      <td>${escapeHtml(entry.amount || "—")}</td>
      <td>${escapeHtml(entry.invoice_id || "—")}</td>
      <td>${escapeHtml(entry.description || "—")}</td>
    `;
    els.paymentHistoryBody.appendChild(row);
  });
}

async function loadPaymentHistory() {
  setStatus("Loading payment history...");

  try {
    const data = await apiRequest("/client/payment_history");
    renderPaymentHistory(data);
    setStatus("Payment history loaded.", "success");
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Unable to load payment history.", "error");
    els.emptyState.hidden = false;
    els.emptyState.textContent = "Unable to load payment history right now.";
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

  els.refreshBtn.addEventListener("click", loadPaymentHistory);
  els.logoutBtn.addEventListener("click", logout);

  loadPaymentHistory();
});
