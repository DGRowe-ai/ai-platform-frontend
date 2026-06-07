const API_URL = "https://ai-platform-backend-uaaa.onrender.com";

async function loadBusinesses() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    const tableBody = document.getElementById("business-table-body");

    try {
fetch(`${API_URL}/my_businesses`, {
  headers: { Authorization: `Bearer ${token}` }
})


        if (!res.ok) {
            console.error("Failed to load businesses");
            return;
        }

        const data = await res.json();
        tableBody.innerHTML = "";

        data.forEach(b => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${b.id}</td>
                <td>${b.name}</td>
                <td>${b.owner_name}</td>
                <td>${b.owner_email}</td>
                <td>${b.subscription_status}</td>
                <td>${b.created_at}</td>
                <td>${b.last_payment}</td>
            `;
            tableBody.appendChild(row);
        });

    } catch (err) {
        console.error("Error loading businesses:", err);
    }
}

document.addEventListener("DOMContentLoaded", loadBusinesses);