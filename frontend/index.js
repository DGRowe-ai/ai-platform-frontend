import { apiJson } from "./api.js";

console.log("Business Chat Widget loaded");

const input = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const messages = document.getElementById("messages");

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  messages.innerHTML += `<div class="user-msg">${text}</div>`;
  input.value = "";

  try {
    const data = await apiJson("/business/chat", {
      method: "POST",
      auth: false,
      body: { business_id: "rowe_ai", message: text },
    });
    messages.innerHTML += `<div class="bot-msg">${data.response}</div>`;
  } catch (err) {
    messages.innerHTML += `<div class="bot-msg">Sorry, something went wrong.</div>`;
    console.error(err);
  }
}

sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});