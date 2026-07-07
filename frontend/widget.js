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

    let proactiveTeaserTimeout = null;
    let chatHasBeenOpened = false;
    let teaserScheduled = false;

    const style = document.createElement("style");
    style.textContent = `
        #rowe-chat-launcher {
            position: fixed !important;
            z-index: 999999 !important;
            display: block !important;
            width: auto !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        #chat-bubble {
            position: relative !important;
            display: block !important;
            z-index: 999999 !important;
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
            display: none;
            position: fixed !important;
            z-index: 1000000 !important;
            box-sizing: border-box !important;
            width: 260px !important;
            max-width: calc(100vw - 24px) !important;
            margin: 0 !important;
            padding: 10px 34px 10px 14px !important;
            border-radius: 14px !important;
            background: #ffffff !important;
            color: #1f2937 !important;
            font-family: Inter, Arial, sans-serif !important;
            font-size: 14px !important;
            line-height: 1.45 !important;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18) !important;
            border: 1px solid rgba(0, 0, 0, 0.08) !important;
            opacity: 0;
            transform: translateY(6px);
            pointer-events: none;
            transition: opacity 0.25s ease, transform 0.25s ease;
            float: none !important;
        }
        #rowe-chat-teaser-text {
            display: block !important;
            white-space: normal !important;
        }
        #rowe-chat-teaser.visible {
            display: block !important;
            opacity: 1;
            transform: translateY(0);
            pointer-events: auto;
        }
        #rowe-chat-teaser.teaser-below {
            transform: translateY(-6px);
        }
        #rowe-chat-teaser.teaser-below.visible {
            transform: translateY(0);
        }
        #rowe-chat-teaser::after {
            content: "";
            position: absolute;
            width: 14px;
            height: 14px;
            background: #ffffff;
            border-right: 1px solid rgba(0, 0, 0, 0.08);
            border-bottom: 1px solid rgba(0, 0, 0, 0.08);
            transform: rotate(45deg);
        }
        #rowe-chat-teaser.teaser-above::after {
            right: 24px;
            bottom: -7px;
        }
        #rowe-chat-teaser.teaser-above.teaser-align-left::after {
            right: auto;
            left: 24px;
        }
        #rowe-chat-teaser.teaser-below::after {
            right: 24px;
            top: -7px;
            border-right: 1px solid rgba(0, 0, 0, 0.08);
            border-bottom: none;
            border-top: 1px solid rgba(0, 0, 0, 0.08);
        }
        #rowe-chat-teaser.teaser-below.teaser-align-left::after {
            right: auto;
            left: 24px;
        }
        #rowe-chat-teaser.teaser-beside::after {
            right: -7px;
            top: 50%;
            margin-top: -7px;
            border-right: 1px solid rgba(0, 0, 0, 0.08);
            border-bottom: 1px solid rgba(0, 0, 0, 0.08);
            border-top: none;
            border-left: none;
        }
        #rowe-chat-teaser.teaser-beside.teaser-align-left::after {
            right: auto;
            left: -7px;
            border-left: 1px solid rgba(0, 0, 0, 0.08);
            border-right: none;
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

    launcher.appendChild(bubble);
    document.body.appendChild(launcher);
    document.body.appendChild(teaser);

    const TEASER_WIDTH = 260;
    const TEASER_GAP = 14;
    const VIEWPORT_PADDING = 12;

    function getLauncherPosition() {
        return launcher.dataset.position || "bottom-right";
    }

    function positionProactiveTeaser() {
        const position = getLauncherPosition();
        const rect = bubble.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const alignLeft = position.endsWith("left");

        teaser.classList.remove("teaser-above", "teaser-below", "teaser-beside", "teaser-align-left");
        if (alignLeft) {
            teaser.classList.add("teaser-align-left");
        }

        teaser.style.width = `${TEASER_WIDTH}px`;
        teaser.style.maxWidth = `calc(100vw - ${VIEWPORT_PADDING * 2}px)`;
        teaser.style.top = "auto";
        teaser.style.right = "auto";
        teaser.style.bottom = "auto";
        teaser.style.left = "auto";

        const spaceAbove = rect.top - VIEWPORT_PADDING;
        const spaceLeft = rect.left - VIEWPORT_PADDING;
        const spaceRight = viewportWidth - rect.right - VIEWPORT_PADDING;
        const canFitAbove = spaceAbove >= 72;
        const canFitBesideLeft = spaceLeft >= TEASER_WIDTH + TEASER_GAP;
        const canFitBesideRight = spaceRight >= TEASER_WIDTH + TEASER_GAP;

        if (position.startsWith("bottom") && canFitAbove) {
            teaser.classList.add("teaser-above");
            const left = Math.min(
                Math.max(VIEWPORT_PADDING, rect.right - TEASER_WIDTH),
                viewportWidth - TEASER_WIDTH - VIEWPORT_PADDING
            );
            teaser.style.left = `${left}px`;
            teaser.style.bottom = `${viewportHeight - rect.top + TEASER_GAP}px`;
            return;
        }

        if (position.startsWith("top")) {
            teaser.classList.add("teaser-below");
            const left = Math.min(
                Math.max(VIEWPORT_PADDING, rect.right - TEASER_WIDTH),
                viewportWidth - TEASER_WIDTH - VIEWPORT_PADDING
            );
            teaser.style.left = `${left}px`;
            teaser.style.top = `${rect.bottom + TEASER_GAP}px`;
            return;
        }

        if (!alignLeft && canFitBesideLeft) {
            teaser.classList.add("teaser-beside");
            teaser.style.left = `${rect.left - TEASER_WIDTH - TEASER_GAP}px`;
            teaser.style.bottom = `${viewportHeight - rect.bottom}px`;
            return;
        }

        if (alignLeft && canFitBesideRight) {
            teaser.classList.add("teaser-beside", "teaser-align-left");
            teaser.style.left = `${rect.right + TEASER_GAP}px`;
            teaser.style.bottom = `${viewportHeight - rect.bottom}px`;
            return;
        }

        teaser.classList.add("teaser-above");
        const fallbackLeft = Math.min(
            Math.max(VIEWPORT_PADDING, rect.right - TEASER_WIDTH),
            viewportWidth - TEASER_WIDTH - VIEWPORT_PADDING
        );
        teaser.style.left = `${fallbackLeft}px`;
        if (position.startsWith("top")) {
            teaser.classList.remove("teaser-above");
            teaser.classList.add("teaser-below");
            teaser.style.top = `${rect.bottom + TEASER_GAP}px`;
        } else {
            teaser.style.bottom = `${viewportHeight - rect.top + TEASER_GAP}px`;
        }
    }

    window.addEventListener("resize", () => {
        if (teaser.classList.contains("visible")) {
            positionProactiveTeaser();
        }
    });

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
    }

    function showProactiveTeaser() {
        if (chatHasBeenOpened) {
            return;
        }

        positionProactiveTeaser();
        teaser.classList.add("visible");
        requestAnimationFrame(positionProactiveTeaser);
    }

    function scheduleProactiveTeaser() {
        if (teaserScheduled || chatHasBeenOpened) {
            return;
        }

        teaserScheduled = true;
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

        try {
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

                if (teaser.classList.contains("visible")) {
                    positionProactiveTeaser();
                }
            }
        } catch (err) {
            console.warn("[Rowe AI Widget] Failed to apply launcher styles.", err);
        }
    }

    scheduleProactiveTeaser();

    const sharedScript = document.createElement("script");
    sharedScript.src = `${baseUrl}/js/widget-settings-shared.js`;
    sharedScript.onload = loadWidgetSettings;
    sharedScript.onerror = loadWidgetSettings;
    document.head.appendChild(sharedScript);
})();
