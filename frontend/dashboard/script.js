// -----------------------------
// Grab the JWT token
// -----------------------------
let token = localStorage.getItem("token");

const API_URL = "https://ai-platform-backend-ulqs.onrender.com";

// -----------------------------
// TEMP FIX — bypass /my_businesses (401 error)
// -----------------------------
async function loadMyBusinesses() {
    // Instead of calling the protected route, return your business folder directly
    return "rowe_ai";
}

// BUSINESS_ID is now dynamic
let BUSINESS_ID = null;

// -----------------------------
// Load business data
// -----------------------------
async function loadBusiness() {

    // Wait for BUSINESS_ID to be loaded
    if (!BUSINESS_ID) {
        BUSINESS_ID = await loadMyBusinesses();
    }

    const res = await fetch(`${API_URL}/business/${BUSINESS_ID}`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    const data = await res.json();

    document.getElementById("name").value = data.profile.name;
    document.getElementById("industry").value = data.profile.industry;
    document.getElementById("email").value = data.profile.contact_email;
    document.getElementById("website").value = data.profile.website;

    document.getElementById("greeting").value = data.settings.greeting;
    document.getElementById("tone").value = data.settings.tone;
    document.getElementById("maxlen").value = data.settings.max_response_length;

    document.getElementById("knowledge").value = data.knowledge;
}

// -----------------------------
// Save business changes
// -----------------------------
async function saveBusiness() {

    const payload = {
        business_id: BUSINESS_ID,

        profile: {
            name: document.getElementById("name").value,
            industry: document.getElementById("industry").value,
            contact_email: document.getElementById("email").value,
            website: document.getElementById("website").value
        },

        settings: {
            greeting: document.getElementById("greeting").value,
            tone: document.getElementById("tone").value,
            max_response_length: parseInt(document.getElementById("maxlen").value)
        },

        knowledge: document.getElementById("knowledge").value
    };

    await fetch(`${API_URL}/update_business`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });

    alert("Saved!");
}

// -----------------------------
// Test chatbot (FIXED)
// -----------------------------
async function testChat() {

    const msg = document.getElementById("test-input").value;

    const res = await fetch(`${API_URL}/business/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
            business_id: BUSINESS_ID,
            message: msg
        })
    });

    const data = await res.json();
    document.getElementById("test-output").innerText = data.response;
}

// -----------------------------
// Button listeners
// -----------------------------
document.getElementById("save-btn").addEventListener("click", saveBusiness);
document.getElementById("test-btn").addEventListener("click", testChat);

// -----------------------------
// Load data on page start
// -----------------------------
loadBusiness();


// =====================================================
// STEP 20 — EXPORT ROUTES (FRONTEND)
// =====================================================

// -----------------------------
// CSV Download Helper
// -----------------------------
async function downloadCSV(url, filename) {
    const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    const text = await res.text();
    const blob = new Blob([text], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

// -----------------------------
// Export All Conversations
// -----------------------------
document.getElementById("export-all").onclick = () => {
    downloadCSV(`${API_URL}/export/all`, "all_conversations.csv");
};

// -----------------------------
// Export Single (placeholder)
// -----------------------------
document.getElementById("export-single").onclick = () => {
    alert("Single conversation export requires conversation selection (coming in Step 21)");
};

// -----------------------------
// Export Filtered (placeholder)
// -----------------------------
document.getElementById("export-filtered").onclick = () => {
    alert("Filtered export requires filters/search UI (coming in Step 21)");
};
