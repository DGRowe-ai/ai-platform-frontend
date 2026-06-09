import { apiJson, requireAuth } from "../api.js";

document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAuth("/login.html")) return;

  try {
    const list = await apiJson("/my_businesses");

    if (!Array.isArray(list) || list.length === 0) {
      document.getElementById("dashboard").innerHTML = "<p>No business found for this account.</p>";
      return;
    }

    const biz = list[0];

    document.getElementById("biz-name").textContent = biz.name || "N/A";
    document.getElementById("biz-folder").textContent = biz.folder_name || "N/A";
    document.getElementById("biz-owner").textContent = biz.owner_email || "N/A";
    document.getElementById("biz-sub").textContent = biz.subscription_status || "N/A";
    document.getElementById("biz-created").textContent = biz.created_at || "N/A";
    document.getElementById("biz-payment").textContent = biz.last_payment || "N/A";
  } catch (err) {
    console.error(err);
    alert(err.message || "Error loading dashboard.");
  }
});
