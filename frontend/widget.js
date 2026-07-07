(function () {
    const API_URL = "https://ai-platform-backend-ulqs.onrender.com";

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

    const PROACTIVE_TEASER_TEXT = "Hi! I'm here if you need me.";
    const PROACTIVE_TEASER_STORAGE_KEY = `rowe_chatbot_proactive_teaser_${businessId}`;

    let proactiveTeaserTimeout = null;
    let chatHasBeenOpened = false;

    const style = document.createElement("style");
    style.textContent = `
        #rowe-chat-launcher {
            position: fixed;
            z-index: 999999;
            overflow: visible;
        }
        #chat-bubble {
            position: relative;
            z-index: 1;
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
        #rowe-chat-teaser {
            position: absolute;
            z-index: 2;
            box-sizing: border-box;
            width: 230px;
            max-width: calc(100vw - 32px);
            padding: 10px 34px 10px 14px;
            border-radius: 14px;
            background: #ffffff;
            color: #1f2937;
            font-family: Inter, Arial, sans-serif;
            font-size: 14px;
            line-height: 1.45;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
            border: 1px solid rgba(0, 0, 0, 0.08);
            opacity: 0;
            transform: translateY(8px);
            pointer-events: none;
            transition: opacity 0.25s ease, transform 0.25s ease;
            right: 0;
            bottom: calc(100% + 18px);
        }
        #rowe-chat-teaser-text {
            display: block;
        }
        #rowe-chat-launcher[data-position="bottom-left"] #rowe-chat-teaser,
        #rowe-chat-launcher[data-position="top-left"] #rowe-chat-teaser {
            right: auto;
            left: 0;
        }
        #rowe-chat-launcher[data-position^="top"] #rowe-chat-teaser {
            bottom: auto;
            top: calc(100% + 18px);
            transform: translateY(-8px);
        }
        #rowe-chat-launcher[data-position^="top"] #rowe-chat-teaser.visible {
            transform: translateY(0);
        }
        @media (max-width: 520px) {
            #rowe-chat-teaser {
                width: min(230px, calc(100vw - 32px));
                right: 0;
                bottom: calc(100% + 18px);
            }
            #rowe-chat-launcher[data-position="bottom-left"] #rowe-chat-teaser {
                right: auto;
                left: 0;
            }
        }
        #rowe-chat-teaser.visible {
            opacity: 1;
            transform: translateY(0);
            pointer-events: auto;
        }
        #rowe-chat-teaser::after {
            content: "";
            position: absolute;
            right: 20px;
            bottom: -7px;
            width: 14px;
            height: 14px;
            background: #ffffff;
            border-right: 1px solid rgba(0, 0, 0, 0.08);
            border-bottom: 1px solid rgba(0, 0, 0, 0.08);
            transform: rotate(45deg);
            z-index: -1;
        }
        #rowe-chat-launcher[data-position="bottom-left"] #rowe-chat-teaser::after,
        #rowe-chat-launcher[data-position="top-left"] #rowe-chat-teaser::after {
            right: auto;
            left: 20px;
        }
        #rowe-chat-launcher[data-position^="top"] #rowe-chat-teaser::after {
            bottom: auto;
            top: -7px;
            border-right: 1px solid rgba(0, 0, 0, 0.08);
            border-bottom: none;
            border-top: 1px solid rgba(0, 0, 0, 0.08);
        }
        #rowe-chat-teaser-dismiss {
            position: absolute;
            top: 6px;
            right: 8px;
            width: 22px;
            height: 22px;
            border: none;
            border-radius: 50%;
            background: transparent;
            color: #6b7280;
            font-size: 16px;
            line-height: 1;
            cursor: pointer;
            padding: 0;
        }
        #rowe-chat-teaser-dismiss:hover {
            color: #111827;
            background: rgba(0, 0, 0, 0.05);
        }
        #rowe-ai-chat-widget {
            position: fixed;
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

    const launcher = document.createElement("div");
    launcher.id = "rowe-chat-launcher";

    const teaser = document.createElement("div");
    teaser.id = "rowe-chat-teaser";
    teaser.setAttribute("role", "status");
    teaser.setAttribute("aria-live", "polite");
    teaser.innerHTML = `
        <span id="rowe-chat-teaser-text"></span>
        <button type="button" id="rowe-chat-teaser-dismiss" aria-label="Dismiss">&times;</button>
    `;
    teaser.querySelector("#rowe-chat-teaser-text").textContent = PROACTIVE_TEASER_TEXT;

    const bubble = document.createElement("div");
    bubble.id = "chat-bubble";
    bubble.setAttribute("role", "button");
    bubble.setAttribute("aria-label", "Open chat");
    bubble.innerHTML = `<img src="${baseUrl}/images/loki/idle/idle.png" alt="Chat" width="60" height="60">`;

    launcher.appendChild(teaser);
    launcher.appendChild(bubble);
    document.body.appendChild(launcher);

    const iframe = document.createElement("iframe");
    iframe.id = "rowe-ai-chat-widget";
    iframe.title = "Rowe AI Chat";
    iframe.src = `${baseUrl}/widget-frame.html?business=${encodeURIComponent(businessId)}&embed=1`;
    document.body.appendChild(iframe);

    function hideProactiveTeaser() {
        if (proactiveTeaserTimeout) {
            clearTimeout(proactiveTeaserTimeout);
            proactiveTeaserTimeout = null;
        }

        teaser.classList.remove("visible");
        sessionStorage.setItem(PROACTIVE_TEASER_STORAGE_KEY, "1");
    }

    function showProactiveTeaser() {
        if (sessionStorage.getItem(PROACTIVE_TEASER_STORAGE_KEY) === "1") {
            return;
        }

        if (chatHasBeenOpened) {
            return;
        }

        teaser.classList.add("visible");
        sessionStorage.setItem(PROACTIVE_TEASER_STORAGE_KEY, "1");
    }

    function scheduleProactiveTeaser() {
        if (sessionStorage.getItem(PROACTIVE_TEASER_STORAGE_KEY) === "1") {
            return;
        }

        const delayMs = 1000 + Math.floor(Math.random() * 2001);
        proactiveTeaserTimeout = setTimeout(() => {
            proactiveTeaserTimeout = null;
            showProactiveTeaser();
        }, delayMs);
    }

    function notifyIframeOpened() {
        try {
            iframe.contentWindow.postMessage({ type: "rowe-widget-open" }, baseUrl);
        } catch (err) {
            console.warn("[Rowe AI Widget] Could not notify chat frame.", err);
        }
    }

    function openChat() {
        iframe.style.display = "block";
        chatHasBeenOpened = true;
        hideProactiveTeaser();
        notifyIframeOpened();
    }

    function closeChat() {
        iframe.style.display = "none";
    }

    bubble.addEventListener("click", () => {
        const isHidden = iframe.style.display === "none" || !iframe.style.display;
        if (isHidden) {
            openChat();
        } else {
            closeChat();
        }
    });

    teaser.addEventListener("click", (event) => {
        if (event.target.id === "rowe-chat-teaser-dismiss") {
            hideProactiveTeaser();
            return;
        }

        openChat();
    });

    teaser.querySelector("#rowe-chat-teaser-dismiss").addEventListener("click", (event) => {
        event.stopPropagation();
        hideProactiveTeaser();
    });

    async function loadWidgetSettings() {
        const fallbackAvatarUrl = `${baseUrl}/images/loki/idle/idle.png`;
        let settings = null;

        try {
            const response = await fetch(
                `${API_URL}/api/widget/settings?client_id=${encodeURIComponent(businessId)}`
            );
            if (response.ok) {
                const data = await response.json();
                settings = data.settings;
            }
        } catch (err) {
            console.warn("[Rowe AI Widget] Using default widget settings.", err);
        }

        if (window.RoweWidgetSettings) {
            const resolved = window.RoweWidgetSettings.mergeWidgetSettings(settings);
            launcher.dataset.position = resolved.position || "bottom-right";

            window.RoweWidgetSettings.applyLauncherStyles({
                launcher,
                bubble,
                iframe,
                settings,
                fallbackAvatarUrl,
            });
        }

        scheduleProactiveTeaser();
    }

    const sharedScript = document.createElement("script");
    sharedScript.src = `${baseUrl}/js/widget-settings-shared.js`;
    sharedScript.onload = loadWidgetSettings;
    sharedScript.onerror = loadWidgetSettings;
    document.head.appendChild(sharedScript);
})();
