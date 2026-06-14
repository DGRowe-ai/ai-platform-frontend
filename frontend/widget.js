(function () {
    const script =
        document.currentScript ||
        document.querySelector('script[src*="widget.js"][data-business]');

    if (!script) {
        console.error("[Rowe AI Widget] Could not find widget script tag.");
        return;
    }

    const businessId = script.getAttribute("data-business");
    if (!businessId) {
        console.error("[Rowe AI Widget] Missing data-business attribute on script tag.");
        return;
    }

    let baseUrl = "https://ai-platform-frontend-uaaa.onrender.com";
    try {
        if (script.src) {
            baseUrl = new URL(script.src, window.location.href).origin;
        }
    } catch (err) {
        console.warn("[Rowe AI Widget] Using default frontend URL.", err);
    }

    const style = document.createElement("style");
    style.textContent = `
        #chat-bubble {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 999999;
            cursor: pointer;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            overflow: hidden;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
            background: #ffffff;
            border: 2px solid #009688;
        }
        #chat-bubble img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
        #rowe-ai-chat-widget {
            position: fixed;
            bottom: 100px;
            right: 20px;
            width: 350px;
            height: 520px;
            max-width: calc(100vw - 40px);
            max-height: calc(100vh - 120px);
            border: none;
            border-radius: 14px;
            box-shadow: 0 0 12px rgba(0, 0, 0, 0.25);
            z-index: 999999;
            display: none;
        }
    `;
    (document.head || document.documentElement).appendChild(style);

    const bubble = document.createElement("div");
    bubble.id = "chat-bubble";
    bubble.setAttribute("role", "button");
    bubble.setAttribute("aria-label", "Open chat");
    bubble.innerHTML = `<img src="${baseUrl}/images/loki/idle/idle.png" alt="Chat" width="60" height="60">`;
    document.body.appendChild(bubble);

    const iframe = document.createElement("iframe");
    iframe.id = "rowe-ai-chat-widget";
    iframe.title = "Rowe AI Chat";
    iframe.src = `${baseUrl}/widget-frame.html?business=${encodeURIComponent(businessId)}&embed=1`;

    document.body.appendChild(iframe);

    bubble.addEventListener("click", () => {
        const isHidden = iframe.style.display === "none" || !iframe.style.display;
        iframe.style.display = isHidden ? "block" : "none";
    });
})();
