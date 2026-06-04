const sendBtn = document.getElementById("send-btn");
const userInput = document.getElementById("user-input");
const messagesDiv = document.getElementById("messages");

// Set the business ID for this widget
const BUSINESS_ID = "test_business";

// Use Render backend
const API_URL = "https://ai-platform-backend-ulqs.onrender.com";

function addMessage(text, sender) {
    const msg = document.createElement("div");
    msg.classList.add("message", sender);
    msg.textContent = text;
    messagesDiv.appendChild(msg);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    addMessage(text, "user");
    userInput.value = "";

    const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({
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

// TEMP: hardcode you as admin so the button always shows
const role = "admin";

if (role === "admin") {
    document.getElementById("admin-btn").style.display = "inline-block";
}

document.getElementById("admin-btn").addEventListener("click", () => {
    window.location.href = "../admin.html";
});
