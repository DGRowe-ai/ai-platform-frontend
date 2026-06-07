document.addEventListener("DOMContentLoaded", async () => {
const token = localStorage.getItem("access_token");

    if (!token) {
        alert("You are not logged in.");
        window.location.href = "/login.html";
        return;
    }

    try {
        const response = await fetch("https://ai-platform-backend-uaaa.onrender.com/my_businesses", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("Failed to load business data");
        }

        const data = await response.json();

        if (!data.businesses || data.businesses.length === 0) {
            document.getElementById("dashboard").innerHTML = "<p>No business found for this account.</p>";
            return;
        }

        const biz = data.businesses[0];

        document.getElementById("biz-name").textContent = biz.business_name || "N/A";
        document.getElementById("biz-folder").textContent = biz.folder_name || "N/A";
        document.getElementById("biz-owner").textContent = biz.owner_email || "N/A";
        document.getElementById("biz-sub").textContent = biz.subscription_status || "N/A";
        document.getElementById("biz-created").textContent = biz.created_at || "N/A";
        document.getElementById("biz-payment").textContent = biz.last_payment || "N/A";

    } catch (err) {
        console.error(err);
        alert("Error loading dashboard.");
    }
});
