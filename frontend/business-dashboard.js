import { apiJson, requireAuth } from "./api.js";

if (!requireAuth("/login.html")) {
  throw new Error("Not authenticated");
}

async function loadBusiness() {
  try {
    const data = await apiJson("/my_businesses");
    const businesses = Array.isArray(data) ? data : data.businesses || [];
    const business = businesses[0];

    if (!business) return;

    const nameEl = document.getElementById("business-name");
    const folderEl = document.getElementById("folder-name");
    if (nameEl) nameEl.value = business.name || "";
    if (folderEl) folderEl.value = business.folder_name || "";
  } catch (err) {
    console.error("Failed to load business:", err);
  }
}

async function saveBusiness() {
  const name = document.getElementById("business-name").value;
  const folder = document.getElementById("folder-name").value;

  try {
    await apiJson(`/business/${folder}`, {
      method: "PUT",
      body: { name },
    });
    alert("Business saved!");
  } catch (err) {
    alert(err.message || "Failed to save business");
  }
}

const saveBtn = document.getElementById("save-btn");
if (saveBtn) saveBtn.addEventListener("click", saveBusiness);

loadBusiness();
