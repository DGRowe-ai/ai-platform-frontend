import { apiJson, requireAuth } from "../api.js";

async function loadBusinesses() {
  if (!requireAuth("/login.html")) return;

  const tableBody = document.getElementById("business-table-body");
  if (!tableBody) return;

  try {
    const data = await apiJson("/my_businesses");
    const businesses = Array.isArray(data) ? data : data.businesses || [];

    tableBody.innerHTML = "";

    businesses.forEach((b) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${b.id ?? ""}</td>
        <td>${b.name ?? ""}</td>
        <td>${b.owner_name ?? ""}</td>
        <td>${b.owner_email ?? ""}</td>
        <td>${b.subscription_status ?? ""}</td>
        <td>${b.created_at ?? ""}</td>
        <td>${b.last_payment ?? ""}</td>
      `;
      tableBody.appendChild(row);
    });
  } catch (err) {
    console.error("Error loading businesses:", err);
  }
}

document.addEventListener("DOMContentLoaded", loadBusinesses);
