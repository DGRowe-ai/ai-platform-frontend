// -----------------------------
// TEMP: Disable auth-based loading
// -----------------------------
let token = localStorage.getItem("token");

const API_URL = "https://ai-platform-backend-ulqs.onrender.com";

// -----------------------------
// TEMP FIX — bypass /my_businesses
// -----------------------------
async function loadMyBusinesses() {
    return "rowe_ai"; // your real folder
}

// BUSINESS_ID is now static
let BUSINESS_ID = "rowe_ai";

// -----------------------------
// TEMP FIX — load business data WITHOUT auth
// -----------------------------
async function loadBusiness() {

    // Load raw business JSON directly from public folder
    const res = await fetch(`${API_URL}/business/${BUSINESS_ID}/public`);
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
            "Content-Type": "application/json"
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
            "Content-Type": "application/json"
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
