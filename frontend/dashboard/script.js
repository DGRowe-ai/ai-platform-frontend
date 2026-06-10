const API_URL = "https://ai-platform-backend-ulqs.onrender.com";
let BUSINESS_ID = null;

// -----------------------------
// API helpers
// -----------------------------
function getToken() {
    return localStorage.getItem("token") || localStorage.getItem("access_token");
}

function setOutput(message) {
    document.getElementById("test-output").innerText = message || "";
}

function redirectToLogin(message) {
    if (message) {
        alert(message);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    window.location.href = "../login.html";
}

async function apiFetch(path, options = {}) {
    const token = getToken();

    if (!token) {
        redirectToLogin("Please log in again.");
        throw new Error("Missing login token");
    }

    const headers = {
        "Authorization": `Bearer ${token}`,
        ...options.headers
    };

    if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers
    });

    const text = await res.text();
    let data = null;

    if (text) {
        try {
            data = JSON.parse(text);
        } catch (err) {
            data = text;
        }
    }

    if (res.status === 401 || res.status === 403) {
        redirectToLogin("Your session expired. Please log in again.");
        throw new Error("Unauthorized");
    }

    if (!res.ok) {
        const detail = data && typeof data === "object" ? data.detail || data.message : data;
        const error = new Error(
            typeof detail === "string" ? detail : `Request failed with status ${res.status}`
        );
        error.status = res.status;
        error.data = data;
        throw error;
    }

    return data;
}

function firstValue(source, keys, fallback = "") {
    if (!source || typeof source !== "object") {
        return fallback;
    }

    for (const key of keys) {
        if (source[key] !== undefined && source[key] !== null && source[key] !== "") {
            return source[key];
        }
    }

    return fallback;
}

function normalizeBusinessList(payload) {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (!payload || typeof payload !== "object") {
        return [];
    }

    if (Array.isArray(payload.businesses)) {
        return payload.businesses;
    }

    if (Array.isArray(payload.data)) {
        return payload.data;
    }

    if (Array.isArray(payload.items)) {
        return payload.items;
    }

    return [];
}

function getChatbotResponse(data) {
    if (!data || typeof data !== "object") {
        return "";
    }

    return firstValue(data, [
        "response",
        "reply",
        "answer",
        "message",
        "content",
        "bot_response",
        "assistant_response"
    ]);
}

function getDashboardPayload() {
    const maxLen = parseInt(document.getElementById("maxlen").value, 10);
    const maxResponseLength = Number.isFinite(maxLen) && maxLen > 0 ? maxLen : 250;

    const profile = {
        name: document.getElementById("name").value.trim(),
        industry: document.getElementById("industry").value.trim(),
        contact_email: document.getElementById("email").value.trim(),
        website: document.getElementById("website").value.trim()
    };

    const settings = {
        greeting: document.getElementById("greeting").value.trim(),
        welcome_message: document.getElementById("greeting").value.trim(),
        tone: document.getElementById("tone").value.trim(),
        max_response_length: maxResponseLength,
        chat_length: maxResponseLength
    };

    return {
        business_id: BUSINESS_ID,
        profile,
        settings,
        knowledge: document.getElementById("knowledge").value,
        name: profile.name,
        industry: profile.industry,
        contact_email: profile.contact_email,
        website: profile.website,
        greeting: settings.greeting,
        welcome_message: settings.welcome_message,
        tone: settings.tone,
        max_response_length: settings.max_response_length,
        chat_length: settings.chat_length
    };
}

// -----------------------------
// Step 11E - Load user's business automatically
// -----------------------------
async function loadMyBusinesses() {
    const savedBusinesses = localStorage.getItem("businesses");

    if (savedBusinesses) {
        try {
            const parsed = JSON.parse(savedBusinesses);
            const savedList = normalizeBusinessList(parsed);
            const savedBusiness = savedList[0];
            const savedFolder = firstValue(savedBusiness, ["folder_name", "business_id", "id"]);

            if (savedFolder) {
                return savedFolder;
            }
        } catch (err) {
            console.warn("Unable to read saved businesses from localStorage", err);
        }
    }

    const list = await apiFetch("/my_businesses");
    console.log("MY BUSINESSES RESPONSE:", list);

    const businesses = normalizeBusinessList(list);
    if (businesses.length === 0) {
        throw new Error("No business was found for this account.");
    }

    return firstValue(businesses[0], ["folder_name", "business_id", "id"]);
}

// -----------------------------
// Load business data
// -----------------------------
async function loadBusiness() {
    try {
        if (!BUSINESS_ID) {
            BUSINESS_ID = await loadMyBusinesses();
        }

        const data = await apiFetch(`/business/${encodeURIComponent(BUSINESS_ID)}`);
        const profile = data.profile || data.business || {};
        const settings = data.settings || data.chatbot_settings || data || {};

        document.getElementById("name").value = firstValue(profile, ["name", "business_name"]);
        document.getElementById("industry").value = firstValue(profile, ["industry"]);
        document.getElementById("email").value = firstValue(profile, ["contact_email", "email"]);
        document.getElementById("website").value = firstValue(profile, ["website", "url"]);

        document.getElementById("greeting").value = firstValue(settings, ["greeting", "welcome_message", "welcomeMessage"]);
        document.getElementById("tone").value = firstValue(settings, ["tone"]);
        document.getElementById("maxlen").value = firstValue(settings, ["max_response_length", "chat_length", "max_tokens"], 250);

        document.getElementById("knowledge").value = firstValue(data, ["knowledge", "knowledge_base"]);
    } catch (err) {
        console.error("Error loading business:", err);
        alert(err.message || "Unable to load business dashboard.");
    }
}

// -----------------------------
// Save business changes
// -----------------------------
async function saveBusiness() {
    try {
        if (!BUSINESS_ID) {
            BUSINESS_ID = await loadMyBusinesses();
        }

        const payload = getDashboardPayload();

        try {
            await apiFetch("/business/settings", {
                method: "POST",
                body: JSON.stringify(payload)
            });
        } catch (err) {
            if (err.status !== 404) {
                throw err;
            }

            await apiFetch("/update_business", {
                method: "POST",
                body: JSON.stringify(payload)
            });
        }

        alert("Saved!");
    } catch (err) {
        console.error("Error saving business:", err);
        alert(err.message || "Unable to save business.");
    }
}

// -----------------------------
// Test chatbot
// -----------------------------
async function testChat() {
    const msg = document.getElementById("test-input").value.trim();

    if (!msg) {
        setOutput("Please enter a message to test.");
        return;
    }

    try {
        if (!BUSINESS_ID) {
            BUSINESS_ID = await loadMyBusinesses();
        }

        setOutput("Testing chatbot...");

        let data;
        try {
            data = await apiFetch("/chat", {
                method: "POST",
                body: JSON.stringify({ message: msg })
            });
        } catch (err) {
            if (err.status !== 404 && err.status !== 422) {
                throw err;
            }

            data = await apiFetch("/business/chat", {
                method: "POST",
                body: JSON.stringify({
                    business_id: BUSINESS_ID,
                    message: msg
                })
            });
        }

        const response = getChatbotResponse(data);
        setOutput(response || JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error testing chatbot:", err);
        setOutput(err.message || "Unable to test chatbot.");
    }
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
    const token = getToken();
    const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.status === 401 || res.status === 403) {
        redirectToLogin("Your session expired. Please log in again.");
        return;
    }

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
