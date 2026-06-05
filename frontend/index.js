// index.js — REAL CHATBOT SCRIPT

console.log("Business Chat Widget loaded");

const input = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const messages = document.getElementById("messages");

async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    // Show user message
    messages.innerHTML += `<div class="user-msg">${text}</div>`;
    input.value = "";

    // Send to backend
    const res = await fetch("https://ai-platform-backend-ulqs.onrender.com/business/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            business_id: "rowe_ai",
            message: text
        })
    });

    const data = await res.json();

    // Show bot reply
    messages.innerHTML += `<div class="bot-msg">${data.response}</div>`;
}

sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});
