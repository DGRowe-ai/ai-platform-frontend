const API_URL = "https://ai-platform-backend-ulqs.onrender.com";

const state = {
  businesses: [],
  filteredBusinesses: [],
};

const els = {
  businessCount: document.getElementById("business-count"),
  directoryTableBody: document.getElementById("directory-table-body"),
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

function applyFilters() {
  const query = els.searchInput.value.trim().toLowerCase();

  state.filteredBusinesses = state.businesses.filter(business => {
    if (!query) {
      return true;
    }

    const haystack = [
      business.name,
      business.email,
      business.owner_email,
      business.phone,
      business.business_key,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });

  renderDirectoryTable();
}

function renderDirectoryTable() {
  const count = state.filteredBusinesses.length;
  els.businessCount.textContent = `${count} business${count === 1 ? "" : "es"}`;
  els.directoryTableBody.innerHTML = "";

  if (count === 0) {
    els.directoryTableBody.innerHTML =
      '<tr><td colspan="3">No businesses match your search.</td></tr>';
    return;
  }

  state.filteredBusinesses.forEach(business => {
    const row = document.createElement("tr");
    const businessKey = encodeURIComponent(business.business_key || business.folder_name || "");
    const businessName = business.name || "Untitled business";
    const email = business.email || business.owner_email || "—";
    const phone = business.phone || "—";

    row.innerHTML = `
      <td>
        <a href="accounting-detail.html?b=${businessKey}">${escapeHtml(businessName)}</a>
      </td>
      <td>${escapeHtml(email)}</td>
      <td>${escapeHtml(phone)}</td>
    `;
    els.directoryTableBody.appendChild(row);
  });
}

async function loadBusinessDirectory() {
  setStatus("Loading business directory...");

  try {
    const payload = await apiRequest("/admin/directory/businesses");
    state.businesses = Array.isArray(payload?.businesses) ? payload.businesses : [];
    state.filteredBusinesses = state.businesses.slice();
    applyFilters();
    setStatus("Business directory loaded.", "success");
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Unable to load business directory.", "error");
    els.directoryTableBody.innerHTML =
      '<tr><td colspan="3">Unable to load businesses.</td></tr>';
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

  els.refreshBtn.addEventListener("click", loadBusinessDirectory);
  els.logoutBtn.addEventListener("click", logout);
  els.searchInput.addEventListener("input", applyFilters);

  loadBusinessDirectory();
});
