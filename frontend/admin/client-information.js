const API_URL = "https://ai-platform-backend-ulqs.onrender.com";

const state = {
  clients: [],
  filteredClients: [],
};

const els = {
  clientCount: document.getElementById("client-count"),
  clientTableBody: document.getElementById("client-table-body"),
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
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeClient(raw) {
  const forwardingEnabled = raw.forwarding_enabled ?? raw.call_forwarding_enabled;
  return {
    business: raw.business || raw.business_name || raw.name || "Untitled business",
    ownerEmail: raw.owner_email || raw.email || "",
    tier: raw.tier || raw.plan_type || raw.product_type || "",
    forwardingEnabled: Boolean(
      forwardingEnabled === true ||
        forwardingEnabled === 1 ||
        forwardingEnabled === "1" ||
        String(forwardingEnabled).toLowerCase() === "yes" ||
        String(forwardingEnabled).toLowerCase() === "true",
    ),
    forwardingNumber:
      raw.forwarding_number || raw.call_forwarding_number || "",
    businessPhone:
      raw.business_phone || raw.phone || raw.voice_business_phone || "",
  };
}

function formatForwardingEnabled(enabled) {
  return enabled ? "Yes" : "No";
}

function applyFilters() {
  const query = els.searchInput.value.trim().toLowerCase();

  state.filteredClients = state.clients.filter(client => {
    if (!query) {
      return true;
    }

    const haystack = [
      client.business,
      client.ownerEmail,
      client.tier,
      formatForwardingEnabled(client.forwardingEnabled),
      client.forwardingNumber,
      client.businessPhone,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });

  renderClientTable();
}

function renderClientTable() {
  const count = state.filteredClients.length;
  els.clientCount.textContent = `${count} client${count === 1 ? "" : "s"}`;
  els.clientTableBody.innerHTML = "";

  if (count === 0) {
    els.clientTableBody.innerHTML =
      '<tr><td colspan="6">No clients match your search.</td></tr>';
    return;
  }

  state.filteredClients.forEach(client => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(client.business)}</td>
      <td>${escapeHtml(client.ownerEmail || "—")}</td>
      <td>${escapeHtml(client.tier || "—")}</td>
      <td>${escapeHtml(formatForwardingEnabled(client.forwardingEnabled))}</td>
      <td>${escapeHtml(client.forwardingNumber || "—")}</td>
      <td>${escapeHtml(client.businessPhone || "—")}</td>
    `;
    els.clientTableBody.appendChild(row);
  });
}

function extractClients(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.clients)) {
    return payload.clients;
  }
  if (Array.isArray(payload?.businesses)) {
    return payload.businesses;
  }
  return [];
}

async function loadClientInformation() {
  setStatus("Loading client information...");

  try {
    const payload = await apiRequest("/admin/client-information");
    state.clients = extractClients(payload).map(normalizeClient);
    state.filteredClients = state.clients.slice();
    applyFilters();
    setStatus("Client information loaded.", "success");
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Unable to load client information.", "error");
    els.clientTableBody.innerHTML =
      '<tr><td colspan="6">Unable to load client information.</td></tr>';
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

  els.refreshBtn.addEventListener("click", loadClientInformation);
  els.logoutBtn.addEventListener("click", logout);
  els.searchInput.addEventListener("input", applyFilters);

  loadClientInformation();
});
