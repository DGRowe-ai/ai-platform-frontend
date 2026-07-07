/* -----------------------------
   URL + API Setup
------------------------------*/

const API_URL = "https://ai-platform-backend-ulqs.onrender.com";

const urlParams = new URLSearchParams(window.location.search);
const BUSINESS_ID = urlParams.get("business") || urlParams.get("b") || "rowe_ai";
const WIDGET_ORIGIN = window.location.origin;

let widgetSettings = null;
let enableTypingAnimation = true;

/* -----------------------------
   DOM Elements
------------------------------*/

window.addEventListener("DOMContentLoaded", async () => {
    const sendBtn = document.getElementById("send-btn");
    const userInput = document.getElementById("user-input");
    const messagesDiv = document.getElementById("messages");
    const lokiAvatar = document.getElementById("loki-avatar");
    const wrapper = document.getElementById("chat-widget-wrapper");
    const header = document.getElementById("loki-header");
    const inputArea = document.getElementById("input-area");
    const branding = document.getElementById("branding");

    await loadWidgetSettings({
        wrapper,
        header,
        messagesDiv,
        inputArea,
        sendBtn,
        branding,
        lokiAvatar,
    });

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
    let welcomePlayed = false;

    const isEmbedded = urlParams.get("embed") === "1";

    function setLokiState(newState) {
        if (!enableTypingAnimation) {
            return;
        }

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

    function playWelcomeMessage() {
        if (welcomePlayed) {
            return;
        }

        welcomePlayed = true;

        const welcomeMessage =
            widgetSettings?.welcomeMessage ||
            "Hi there! How can I help you today?";

        if (enableTypingAnimation) {
            setLokiState("talking");
        }

        addMessage(welcomeMessage, "bot");

        if (enableTypingAnimation) {
            setTimeout(() => setLokiState("idle"), 1500);
        }
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
        } else if (enableTypingAnimation) {
            setLokiState("listening");
            if (typingTimeout) clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                if (lokiState === "listening") setLokiState("idle");
            }, 1000);
        }
    });

    if (isEmbedded) {
        window.addEventListener("message", (event) => {
            if (event.source !== window.parent) {
                return;
            }

            const payload = event.data;
            if (payload && payload.type === "rowe-widget-open") {
                playWelcomeMessage();
            }
        });
    } else {
        playWelcomeMessage();
    }
});

async function loadWidgetSettings(elements) {
    const fallbackAvatarUrl = `${WIDGET_ORIGIN}/images/loki/idle/idle.png`;

    try {
        const response = await fetch(
            `${API_URL}/api/widget/settings?client_id=${encodeURIComponent(BUSINESS_ID)}`
        );
        if (response.ok) {
            const data = await response.json();
            widgetSettings = data.settings || null;
            enableTypingAnimation = widgetSettings?.enableTypingAnimation !== false;
        }
    } catch (err) {
        console.warn("Widget settings unavailable, using defaults.", err);
    }

    await ensureSharedSettingsScript();

    if (window.RoweWidgetSettings) {
        window.RoweWidgetSettings.applyFrameStyles({
            wrapper: elements.wrapper,
            header: elements.header,
            messages: elements.messagesDiv,
            inputArea: elements.inputArea,
            sendBtn: elements.sendBtn,
            branding: elements.branding,
            avatar: elements.lokiAvatar,
            settings: widgetSettings,
            fallbackAvatarUrl,
        });
    }
}

function ensureSharedSettingsScript() {
    if (window.RoweWidgetSettings) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        const existing = document.querySelector('script[src*="widget-settings-shared.js"]');
        if (existing) {
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener("error", () => resolve(), { once: true });
            return;
        }

        const script = document.createElement("script");
        script.src = `${WIDGET_ORIGIN}/js/widget-settings-shared.js`;
        script.onload = () => resolve();
        script.onerror = () => resolve();
        document.head.appendChild(script);
    });
}
