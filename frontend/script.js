/* -----------------------------
   DOM Elements
------------------------------*/

const sendBtn = document.getElementById("send-btn");
const userInput = document.getElementById("user-input");
const messagesDiv = document.getElementById("messages");

// Business ID for dashboard + widget
const BUSINESS_ID = "rowe_ai";

// Render backend
const API_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000"
    : "https://ai-platform-backend-ulqs.onrender.com";

/* -----------------------------
   Chat UI Helpers
------------------------------*/

function addMessage(text, sender) {
    const msg = document.createElement("div");
    msg.classList.add("message", sender);
    msg.textContent = text;
    messagesDiv.appendChild(msg);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

/* -----------------------------
   Main Chat (NOT the test button)
------------------------------*/

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    addMessage(text, "user");
    userInput.value = "";

    const response = await fetch(`${API_URL}/business/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({
            business_id: BUSINESS_ID,
            message: text
        })
    });

    const data = await response.json();
    addMessage(data.response, "bot");
}

sendBtn.addEventListener("click", sendMessage);

userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

/* -----------------------------
   Admin Button
------------------------------*/

const role = "admin";

if (role === "admin") {
    document.getElementById("admin-btn").style.display = "inline-block";
}

document.getElementById("admin-btn").addEventListener("click", () => {
    window.location.href = "../admin.html";
});

/* -----------------------------
   TEST CHATBOT BUTTON (FIXED)
------------------------------*/

document.getElementById("test-btn").addEventListener("click", async () => {
    const message = document.getElementById("test-input").value;

    const res = await fetch(`${API_URL}/business/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            business_id: BUSINESS_ID,
            message
        })
    });

    const data = await res.json();
    document.getElementById("test-output").innerText = data.response;
});
