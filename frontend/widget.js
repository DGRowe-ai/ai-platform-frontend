(function () {

    const businessId = document.currentScript.getAttribute("data-business");

    // Create chat bubble
    const bubble = document.createElement("div");
    bubble.id = "chat-bubble";
    bubble.innerHTML = `<img src="https://i.imgur.com/8QfQ7kT.png">`;
    document.body.appendChild(bubble);

    // Create iframe for chat widget
    const iframe = document.createElement("iframe");

    // ⭐ FIXED: Load widget-frame.html from the SAME server as your frontend (Vite)
    iframe.src = `/widget-frame.html?business=${businessId}`;

    iframe.style.position = "fixed";
    iframe.style.bottom = "100px";
    iframe.style.right = "20px";
    iframe.style.width = "350px";
    iframe.style.height = "520px";
    iframe.style.border = "none";
    iframe.style.borderRadius = "14px";
    iframe.style.boxShadow = "0 0 12px rgba(0,0,0,0.25)";
    iframe.style.zIndex = "999999";
    iframe.style.display = "none";
    iframe.classList.add("fade-in");

    document.body.appendChild(iframe);

    // Toggle open/close
    bubble.addEventListener("click", () => {
        iframe.style.display = iframe.style.display === "none" ? "block" : "none";
    });

})();
