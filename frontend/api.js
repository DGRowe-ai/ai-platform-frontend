function resolveApiUrl() {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://localhost:8000";
  }
  return "https://ai-platform-backend-ulqs.onrender.com";
}

export const API_URL = resolveApiUrl();

export function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("access_token");
}

export function setToken(token) {
  localStorage.setItem("token", token);
  localStorage.setItem("access_token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
  localStorage.removeItem("access_token");
}

export function requireAuth(loginPath = "/login.html") {
  if (!getToken()) {
    window.location.href = loginPath;
    return false;
  }
  return true;
}

export async function apiFetch(path, options = {}) {
  const { body, headers: customHeaders = {}, auth = true, ...rest } = options;
  const headers = { ...customHeaders };

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let payload = body;
  if (
    body !== undefined &&
    body !== null &&
    typeof body === "object" &&
    !(body instanceof FormData)
  ) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  return fetch(`${API_URL}${path}`, { ...rest, headers, body: payload });
}

export async function apiJson(path, options = {}) {
  const res = await apiFetch(path, options);
  const contentType = res.headers.get("content-type") || "";

  let data;
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    const text = await res.text();
    throw new Error(
      res.ok
        ? "Invalid server response"
        : `Server error (${res.status}): ${text.slice(0, 120)}`
    );
  }

  if (!res.ok) {
    const detail = data.detail;
    const message =
      typeof detail === "string"
        ? detail
        : detail
          ? JSON.stringify(detail)
          : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

// Backward-compatible helpers for scripts that used the old api.js shape
export async function apiGet(path) {
  return apiJson(path);
}

export async function apiPost(path, data) {
  return apiJson(path, { method: "POST", body: data });
}
