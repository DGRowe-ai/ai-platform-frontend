import { apiJson, requireAuth } from "./api.js";

if (!requireAuth("/login.html")) {
  throw new Error("Not authenticated");
}

document.getElementById("add-btn").addEventListener("click", addCustomer);

async function addCustomer() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const businessName = document.getElementById("business-name").value.trim();

  if (!email || !password || !businessName) {
    alert("Fill in all fields first.");
    return;
  }

  try {
    await apiJson("/signup", {
      method: "POST",
      body: { email, password, business_name: businessName },
    });
    alert("Customer + business created!");
    loadBusinesses();
  } catch (err) {
    alert(err.message || "Error creating customer");
  }
}

document.getElementById("add-business-btn").addEventListener("click", addBusinessToExisting);

async function addBusinessToExisting() {
  const email = document.getElementById("existing-email").value.trim();
  const businessName = document.getElementById("existing-business-name").value.trim();

  if (!email || !businessName) {
    alert("Fill in both fields.");
    return;
  }

  try {
    await apiJson("/admin/create_business_for_existing_user", {
      method: "POST",
      body: { email, business_name: businessName },
    });
    alert("Business created for existing user!");
    loadBusinesses();
  } catch (err) {
    alert(err.message || "Error creating business");
  }
}

async function loadBusinesses() {
  try {
    const data = await apiJson("/my_businesses");
    const businesses = Array.isArray(data) ? data : data.businesses || [];

    const tableBody = document.querySelector("#business-table tbody");
    if (!tableBody) return;

    tableBody.innerHTML = businesses
      .map(
        (b) =>
          `<tr><td>${b.id}</td><td>${b.name || ""}</td><td>${b.folder_name || ""}</td><td>${b.owner_email || ""}</td><td>${b.subscription_status || ""}</td><td></td><td></td></tr>`
      )
      .join("");
  } catch (err) {
    console.error("Failed to load businesses", err);
  }
}

loadBusinesses();
