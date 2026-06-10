const API_URL = "https://ai-platform-backend-ulqs.onrender.com";
const token = localStorage.getItem("token");

// Load current business info
async function loadBusiness() {
  const res = await fetch(`${API_URL}/my_businesses`, {
    headers: { "Authorization": "Bearer " + token }
  });

  if (!res.ok) {
    console.error("Failed to load business:", res.status);
    return;
  }

  const data = await res.json();
  const business = data[0]; // first business for now

  // Example: fill dashboard fields
  document.getElementById("business-name").value = business.name || "";
  document.getElementById("folder-name").value = business.folder_name || "";
}

// Save business changes
async function saveBusiness() {
  const name = document.getElementById("business-name").value;
  const folder = document.getElementById("folder-name").value;

  const res = await fetch(`${API_URL}/business/${folder}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({ name })
  });

  if (!res.ok) {
    alert("Failed to save business");
    return;
  }

  alert("Business saved!");
}

// Hook up buttons
document.getElementById("save-btn").addEventListener("click", saveBusiness);

// Load data when page opens
loadBusiness();
