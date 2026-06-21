const API_URL = "https://ai-platform-backend-ulqs.onrender.com";

const state = {
  businesses: [],
  filteredBusinesses: [],
};

const els = {
  businessCount: document.getElementById("business-count"),
  businessList: document.getElementById("business-list"),
  logoutBtn: document.getElementById("logout-btn"),
  pageStatus: document.getElementById("page-status"),
  refreshBtn: document.getElementById("refresh-btn"),
  searchInput: document.getElementById("search-input"),
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

function formatCountLabel(count) {
  return `${count} business${count === 1 ? "" : "es"}`;
}

function applyFilters() {
  const query = els.searchInput.value.trim().toLowerCase();

  state.filteredBusinesses = state.businesses.filter(business => {
    if (!query) {
      return true;
    }

    const haystack = [
      business.name,
      business.owner_email,
      business.business_key,
      business.payment_log?.payment_folder,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });

  renderBusinessList();
}

function renderBusinessList() {
  els.businessCount.textContent = formatCountLabel(state.filteredBusinesses.length);
  els.businessList.innerHTML = "";

  if (state.filteredBusinesses.length === 0) {
    els.businessList.innerHTML = '<div class="empty-state">No businesses match your search.</div>';
    return;
  }

  state.filteredBusinesses.forEach(business => {
    const link = document.createElement("a");
    link.className = "business-link-item";
    link.href = `accounting-detail.html?b=${encodeURIComponent(business.business_key)}`;

    const entryCount = business.payment_log?.entry_count ?? 0;
    const lastPayment = business.payment_log?.last_payment_date || "No payments logged";
    const billingStatus = business.billing_status || "inactive";

    link.innerHTML = `
      <div>
        <h3>${escapeHtml(business.name)}</h3>
        <p>${escapeHtml(business.owner_email || "No owner email")}</p>
      </div>
      <div class="business-link-meta">
        <div>${escapeHtml(billingStatus)}</div>
        <div>${entryCount} log entr${entryCount === 1 ? "y" : "ies"}</div>
        <div>Last payment: ${escapeHtml(lastPayment)}</div>
      </div>
    `;

    els.businessList.appendChild(link);
  });
}

async function loadAccountingBusinesses() {
  setStatus("Loading accounting data...");

  try {
    const payload = await apiRequest("/admin/accounting/businesses");
    state.businesses = Array.isArray(payload?.businesses) ? payload.businesses : [];
    state.filteredBusinesses = state.businesses.slice();
    applyFilters();
    setStatus("Accounting data loaded.", "success");
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Unable to load accounting data.", "error");
    els.businessList.innerHTML = '<div class="empty-state">Unable to load businesses.</div>';
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

  els.refreshBtn.addEventListener("click", loadAccountingBusinesses);
  els.logoutBtn.addEventListener("click", logout);
  els.searchInput.addEventListener("input", applyFilters);

  loadAccountingBusinesses();
});
