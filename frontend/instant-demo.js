function resolveApiUrl() {
  const params = new URLSearchParams(window.location.search);
  const override = params.get("api");
  if (override) {
    return override.replace(/\/$/, "");
  }

  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://localhost:8000";
  }

  return "https://ai-platform-backend-ulqs.onrender.com";
}

const API_URL = resolveApiUrl();
const REGISTER_URL = "billing.html";

function getRegisterUrl() {
  if (window.RoweReferral) {
    RoweReferral.captureReferralFromUrl();
    return RoweReferral.appendReferralToHref(REGISTER_URL);
  }
  return REGISTER_URL;
}

console.info("[Instant Demo] API base URL:", API_URL);

const state = {
  instanceId: null,
  businessData: null,
  isGenerating: false,
  isSending: false,
};

const els = {
  websiteUrl: document.getElementById("website-url"),
  generateBtn: document.getElementById("generate-demo-btn"),
  status: document.getElementById("demo-status"),
  chatSection: document.getElementById("demo-chat-section"),
  chatMessages: document.getElementById("demo-chat-messages"),
  chatForm: document.getElementById("demo-chat-form"),
  chatInput: document.getElementById("demo-chat-input"),
  chatSend: document.getElementById("demo-chat-send"),
  businessSummary: document.getElementById("demo-business-summary"),
  cta: document.getElementById("demo-cta"),
  registerLink: document.getElementById("register-link"),
};

els.registerLink.href = getRegisterUrl();

function setStatus(message, type = "") {
  els.status.textContent = message || "";
  els.status.classList.remove("error", "success");
  if (type) {
    els.status.classList.add(type);
  }
}

function appendMessage(text, role) {
  const bubble = document.createElement("div");
  bubble.className = `demo-message ${role}`;
  bubble.textContent = text;
  els.chatMessages.appendChild(bubble);
  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
  return bubble;
}

function renderBusinessSummary(businessData) {
  const services = Array.isArray(businessData.services) ? businessData.services.slice(0, 3) : [];
  const servicesText = services.length ? `Services: ${services.join(", ")}` : "";

  els.businessSummary.innerHTML = `
    <h2>${escapeHtml(businessData.name || "Your Business")}</h2>
    <p>${escapeHtml(businessData.description || "Demo chatbot generated from your website.")}</p>
    ${servicesText ? `<p>${escapeHtml(servicesText)}</p>` : ""}
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function logFetchFailure(label, err, details = {}) {
  console.error(`[Instant Demo] ${label} failed`, {
    error: err,
    name: err?.name,
    message: err?.message,
    stack: err?.stack,
    ...details,
  });
}

function formatFetchError(err, endpoint) {
  if (err?.name === "TypeError" && err?.message === "Failed to fetch") {
    return (
      `Network error reaching ${endpoint}. ` +
      "This is usually a CORS or connectivity issue. " +
      "Check the browser console for details."
    );
  }
  return err?.message || "Request failed.";
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    console.warn("[Instant Demo] Non-JSON response body:", text);
    return { detail: text };
  }
}

async function generateDemo() {
  const url = els.websiteUrl.value.trim();
  if (!url || state.isGenerating) {
    return;
  }

  const endpoint = `${API_URL}/api/generate-demo`;
  const requestBody = { url };

  state.isGenerating = true;
  els.generateBtn.disabled = true;
  setStatus("Analyzing your website and building your demo chatbot...");
  els.chatSection.classList.add("hidden");
  els.cta.classList.add("hidden");
  els.chatMessages.innerHTML = "";

  console.info("[Instant Demo] POST", endpoint, requestBody);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await parseJsonResponse(response);
    console.info("[Instant Demo] generate-demo response", {
      ok: response.ok,
      status: response.status,
      data,
    });

    if (!response.ok) {
      const detail = data.detail;
      const message = Array.isArray(detail)
        ? detail.map(item => item.msg || JSON.stringify(item)).join(", ")
        : detail || `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    if (!data.instanceId) {
      throw new Error("Demo API did not return an instanceId.");
    }

    state.instanceId = data.instanceId;
    state.businessData = data.businessData || {};

    renderBusinessSummary(state.businessData);
    appendMessage(
      `Hi! I'm the demo chatbot for ${state.businessData.name || "your business"}. Ask me anything about the business.`,
      "assistant",
    );

    els.chatSection.classList.remove("hidden");
    els.cta.classList.remove("hidden");
    setStatus("Demo ready. Try chatting below.", "success");
    els.chatInput.focus();
  } catch (err) {
    logFetchFailure("generate-demo", err, { endpoint, requestBody });
    setStatus(formatFetchError(err, endpoint), "error");
  } finally {
    state.isGenerating = false;
    els.generateBtn.disabled = false;
  }
}

async function streamDemoChat(message) {
  const endpoint = `${API_URL}/api/chat/${encodeURIComponent(state.instanceId)}`;
  const requestBody = { message };

  console.info("[Instant Demo] POST", endpoint, requestBody);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const data = await parseJsonResponse(response);
    console.error("[Instant Demo] chat error response", {
      status: response.status,
      data,
    });
    const detail = data.detail;
    throw new Error(detail || `Demo chat unavailable (${response.status}).`);
  }

  if (!response.body) {
    throw new Error("Streaming is not supported in this browser.");
  }

  const assistantBubble = appendMessage("", "assistant");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      const line = event
        .split("\n")
        .find(entry => entry.startsWith("data: "));

      if (!line) {
        continue;
      }

      const payload = line.slice(6);
      if (payload === "[DONE]") {
        continue;
      }

      try {
        const parsed = JSON.parse(payload);
        if (parsed.error) {
          throw new Error(parsed.error);
        }
        if (parsed.content) {
          assistantBubble.textContent += parsed.content;
          els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
        }
      } catch (err) {
        if (err.message && err.message !== "Unexpected end of JSON input") {
          throw err;
        }
      }
    }
  }

  if (!assistantBubble.textContent.trim()) {
    assistantBubble.textContent = "Sorry, I couldn't generate a response. Please try again.";
  }
}

async function sendChatMessage(event) {
  event.preventDefault();

  const message = els.chatInput.value.trim();
  if (!message || !state.instanceId || state.isSending) {
    return;
  }

  state.isSending = true;
  els.chatSend.disabled = true;
  els.chatInput.disabled = true;
  appendMessage(message, "user");
  els.chatInput.value = "";

  try {
    await streamDemoChat(message);
  } catch (err) {
    logFetchFailure("chat", err, {
      endpoint: `${API_URL}/api/chat/${state.instanceId}`,
      message,
    });
    appendMessage(formatFetchError(err, "demo chat"), "assistant");
  } finally {
    state.isSending = false;
    els.chatSend.disabled = false;
    els.chatInput.disabled = false;
    els.chatInput.focus();
  }
}

els.generateBtn.addEventListener("click", generateDemo);
els.websiteUrl.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    generateDemo();
  }
});
els.chatForm.addEventListener("submit", sendChatMessage);
