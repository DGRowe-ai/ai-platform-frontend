const API_URL = "https://ai-platform-backend-uaaa.onrender.com";


export async function apiGet(path) {
  const res = await fetch(API_URL + path, { credentials: "include" });
  return res.json();
}

export async function apiPost(path, data) {
  const res = await fetch(API_URL + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  return res.json();
}
