const API_URL = "https://ai-platform-backend-ulqs.onrender.com"; // change to your backend URL when deployed
const token = localStorage.getItem("token"); // your admin JWT from login

document.getElementById("add-btn").addEventListener("click", addCustomer);

async function addCustomer() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const businessName = document.getElementById("business-name").value;

  if (!email || !password || !businessName) {
    alert("Fill in all fields first.");
    return;
  }

  const res = await fetch(`${API_URL}/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      email,
      password,
      business_name: businessName
    })
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.detail || "Error creating customer");
    return;
  }

  alert("Customer + business created!");
  // later: refresh business list here
}

// -----------------------------
// NEW: Add Business to Existing User
// -----------------------------
document.getElementById("add-business-btn").addEventListener("click", addBusinessToExisting);

async function addBusinessToExisting() {
  const email = document.getElementById("existing-email").value;
  const businessName = document.getElementById("existing-business-name").value;

  if (!email || !businessName) {
    alert("Fill in both fields.");
    return;
  }

  const res = await fetch(`${API_URL}/admin/create_business_for_existing_user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      email,
      business_name: businessName
    })
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.detail || "Error creating business");
    return;
  }

  alert("Business created for existing user!");
  // later: refresh business list here
}
