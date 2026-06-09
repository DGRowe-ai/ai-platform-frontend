import { API_URL, apiJson, requireAuth } from "../api.js";

if (!requireAuth("/login.html")) {
  throw new Error("Not authenticated");
}

let BUSINESS_ID = null;

async function loadMyBusinesses() {
  const list = await apiJson("/my_businesses");

  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("No businesses found for this account.");
  }

  return list[0].folder_name;
}

async function loadBusiness() {
  try {
    if (!BUSINESS_ID) {
      BUSINESS_ID = await loadMyBusinesses();
    }

    const data = await apiJson(`/business/${BUSINESS_ID}`);

    document.getElementById("name").value = data.profile?.name || "";
    document.getElementById("industry").value = data.profile?.industry || "";
    document.getElementById("email").value = data.profile?.contact_email || "";
    document.getElementById("website").value = data.profile?.website || "";

    document.getElementById("greeting").value = data.settings?.greeting || "";
    document.getElementById("tone").value = data.settings?.tone || "";
    document.getElementById("maxlen").value = data.settings?.max_response_length || "";

    document.getElementById("knowledge").value = data.knowledge || "";
  } catch (err) {
    console.error("Failed to load business:", err);
    alert(err.message || "Could not load your dashboard. Please log in again.");
    window.location.href = "/login.html";
  }
}

async function saveBusiness() {
  const payload = {
    business_id: BUSINESS_ID,
    profile: {
      name: document.getElementById("name").value,
      industry: document.getElementById("industry").value,
      contact_email: document.getElementById("email").value,
      website: document.getElementById("website").value,
    },
    settings: {
      greeting: document.getElementById("greeting").value,
      tone: document.getElementById("tone").value,
      max_response_length: parseInt(document.getElementById("maxlen").value, 10) || 0,
    },
    knowledge: document.getElementById("knowledge").value,
  };

  try {
    await apiJson("/update_business", { method: "POST", body: payload });
    alert("Saved!");
  } catch (err) {
    console.error("Save failed:", err);
    alert(err.message || "Failed to save changes.");
  }
}

async function testChat() {
  const msg = document.getElementById("test-input").value.trim();
  if (!msg) return;

  try {
    const data = await apiJson("/business/chat", {
      method: "POST",
      auth: false,
      body: { business_id: BUSINESS_ID, message: msg },
    });
    document.getElementById("test-output").innerText = data.response;
  } catch (err) {
    console.error("Chat test failed:", err);
    document.getElementById("test-output").innerText = err.message || "Chat failed.";
  }
}

async function downloadCSV(url, filename) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token") || localStorage.getItem("access_token")}` },
  });

  if (!res.ok) {
    throw new Error(`Export failed (${res.status})`);
  }

  const text = await res.text();
  const blob = new Blob([text], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

document.getElementById("save-btn").addEventListener("click", saveBusiness);
document.getElementById("test-btn").addEventListener("click", testChat);

document.getElementById("export-all").onclick = async () => {
  try {
    await downloadCSV(`${API_URL}/export/all`, "all_conversations.csv");
  } catch (err) {
    alert(err.message || "Export failed.");
  }
};

document.getElementById("export-single").onclick = () => {
  alert("Single conversation export requires conversation selection (coming in Step 21)");
};

document.getElementById("export-filtered").onclick = () => {
  alert("Filtered export requires filters/search UI (coming in Step 21)");
};

loadBusiness();
