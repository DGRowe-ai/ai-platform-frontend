/* -----------------------------
   URL + API Setup
------------------------------*/

const API_URL = "https://ai-platform-backend-ulqs.onrender.com";

const urlParams = new URLSearchParams(window.location.search);
const BUSINESS_ID = urlParams.get("business") || urlParams.get("b") || "rowe_ai";
const WIDGET_ORIGIN = window.location.origin;

/* -----------------------------
   DOM Elements
------------------------------*/

window.addEventListener("DOMContentLoaded", () => {
    const sendBtn = document.getElementById("send-btn");
    const userInput = document.getElementById("user-input");
    const messagesDiv = document.getElementById("messages");
    const lokiAvatar = document.getElementById("loki-avatar");

    /* -----------------------------
       Loki Animation System
    ------------------------------*/

    const LOKI_BASE = `${WIDGET_ORIGIN}/images/loki`;

    const LOKI_STATES = {
        idle: [`${LOKI_BASE}/idle/idle.png`],
        listening: [
            `${LOKI_BASE}/listening/listeningleft.png`,
            `${LOKI_BASE}/listening/listeningright.png`
        ],
        thinking: [
            `${LOKI_BASE}/thinking/thinkingleft.png`,
            `${LOKI_BASE}/thinking/thinkingright.png`
        ],
        talking: [
            `${LOKI_BASE}/talking/talkingmouthopen.png`,
            `${LOKI_BASE}/talking/talkingmouthshut.png`
        ]
    };

    let lokiState = "idle";
    let lokiFrameIndex = 0;
    let lokiInterval = null;
    let typingTimeout = null;

    function setLokiState(newState) {
        if (!LOKI_STATES[newState]) return;

        lokiState = newState;
        lokiFrameIndex = 0;

        if (lokiInterval) {
            clearInterval(lokiInterval);
            lokiInterval = null;
        }

        const frames = LOKI_STATES[lokiState];
        lokiAvatar.src = frames[0];

        if (frames.length > 1) {
            lokiInterval = setInterval(() => {
                lokiFrameIndex = (lokiFrameIndex + 1) % frames.length;
                lokiAvatar.src = frames[lokiFrameIndex];
            }, 250);
        }
    }

    // Start idle
    setLokiState("idle");

    /* -----------------------------
       Chat UI Helpers
    ------------------------------*/

    function extractChatResponse(data) {
        if (!data || typeof data !== "object") {
            return "";
        }

        const value = data.response ?? data.reply ?? data.answer ?? data.detail;
        if (value == null) {
            return "";
        }

        return typeof value === "string" ? value : String(value);
    }

    function addMessage(text, sender) {
        const content = (text == null ? "" : String(text)).trim();
        if (!content) {
            return;
        }

        const msg = document.createElement("div");
        msg.classList.add("message", sender);
        msg.textContent = content;
        messagesDiv.appendChild(msg);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    /* -----------------------------
       Welcome Message (NO BACKEND CALL)
    ------------------------------*/

    async function playWelcomeMessage() {
        setLokiState("talking");
        addMessage("Hello! My name is Loki, your friendly chatbot!", "bot");
        await new Promise(resolve => setTimeout(resolve, 1200));
        addMessage("How can I help you today?", "bot");
        setTimeout(() => setLokiState("idle"), 1500);
    }

    /* -----------------------------
       Send Message Logic
    ------------------------------*/

    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;

        addMessage(text, "user");
        userInput.value = "";
        setLokiState("thinking");

        try {
            const response = await fetch(`${API_URL}/business/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    business_id: BUSINESS_ID,
                    message: text
                })
            });

            let data = null;
            try {
                data = await response.json();
            } catch (parseErr) {
                console.warn("Chat response was not JSON:", parseErr);
            }

            setLokiState("talking");

            if (!response.ok) {
                const errorText =
                    extractChatResponse(data) ||
                    "Sorry, the chatbot is unavailable right now. Please try again later.";
                addMessage(errorText, "bot");
                setLokiState("idle");
                return;
            }

            const reply =
                extractChatResponse(data) ||
                "Sorry, I didn't receive a response. Please try again.";
            addMessage(reply, "bot");

            setTimeout(() => {
                if (lokiState === "talking") setLokiState("idle");
            }, 2000);
        } catch (err) {
            console.error("Chat error:", err);
            addMessage("Sorry, something went wrong.", "bot");
            setLokiState("idle");
        }
    }

    /* -----------------------------
       Input Events
    ------------------------------*/

    sendBtn.addEventListener("click", sendMessage);

    userInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            sendMessage();
        } else {
            setLokiState("listening");
            if (typingTimeout) clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                if (lokiState === "listening") setLokiState("idle");
            }, 1000);
        }
    });

    /* -----------------------------
       On Load
    ------------------------------*/

    playWelcomeMessage();
});
