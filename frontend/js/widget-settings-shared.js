(function (global) {
  const DEFAULT_WIDGET_SETTINGS = {
    primaryColor: "#4F46E5",
    secondaryColor: "#FFFFFF",
    chatBubbleColor: "#4F46E5",
    textColor: "#000000",
    welcomeMessage: "Hi there! How can I help you today?",
    position: "bottom-right",
    showAvatar: true,
    avatarUrl: null,
    widgetShape: "rounded",
    fontFamily: "Inter",
    customCSS: "",
    enableShadow: true,
    enableTypingAnimation: true,
  };

  function mergeWidgetSettings(settings) {
    return { ...DEFAULT_WIDGET_SETTINGS, ...(settings || {}) };
  }

  function positionStyles(position) {
    const offset = "20px";
    const styles = { top: "auto", right: "auto", bottom: "auto", left: "auto" };
    switch (position) {
      case "bottom-left":
        styles.bottom = offset;
        styles.left = offset;
        break;
      case "top-right":
        styles.top = offset;
        styles.right = offset;
        break;
      case "top-left":
        styles.top = offset;
        styles.left = offset;
        break;
      default:
        styles.bottom = offset;
        styles.right = offset;
    }
    return styles;
  }

  function shapeRadius(shape) {
    if (shape === "square") return "12px";
    if (shape === "circle") return "50%";
    return "16px";
  }

  function bubbleSize(shape) {
    return shape === "circle" ? "64px" : "60px";
  }

  function applyLauncherStyles({
    launcher,
    bubble,
    iframe,
    settings,
    fallbackAvatarUrl,
  }) {
    if (!bubble) return;

    const resolved = mergeWidgetSettings(settings);
    const launcherPosition = positionStyles(resolved.position);
    const size = bubbleSize(resolved.widgetShape);
    const positionTarget = launcher || bubble;

    Object.assign(positionTarget.style, {
      top: launcherPosition.top,
      right: launcherPosition.right,
      bottom: launcherPosition.bottom,
      left: launcherPosition.left,
    });

    Object.assign(bubble.style, {
      width: size,
      height: size,
      borderRadius: shapeRadius(resolved.widgetShape),
      background: resolved.secondaryColor,
      border: `2px solid ${resolved.chatBubbleColor}`,
      boxShadow: resolved.enableShadow ? "0 4px 16px rgba(0, 0, 0, 0.25)" : "none",
    });

    const avatar = bubble.querySelector("img");
    if (avatar) {
      if (resolved.showAvatar && resolved.avatarUrl) {
        avatar.src = resolved.avatarUrl;
        avatar.style.display = "block";
      } else if (fallbackAvatarUrl) {
        avatar.src = fallbackAvatarUrl;
        avatar.style.display = "block";
      } else {
        avatar.style.display = "none";
      }
    }

    if (iframe) {
      const iframeOffset = resolved.position.startsWith("top") ? "100px" : "auto";
      const iframeBottom = resolved.position.startsWith("bottom") ? "100px" : "auto";
      const iframeTop = resolved.position.startsWith("top") ? "90px" : "auto";

      Object.assign(iframe.style, {
        top: launcherPosition.top === "auto" ? "auto" : iframeTop,
        right: launcherPosition.right,
        bottom: launcherPosition.bottom === "auto" ? "auto" : iframeBottom,
        left: launcherPosition.left,
        borderRadius: shapeRadius(resolved.widgetShape),
        boxShadow: resolved.enableShadow ? "0 0 12px rgba(0, 0, 0, 0.25)" : "none",
      });
    }
  }

  function applyFrameStyles({
    wrapper,
    header,
    messages,
    inputArea,
    sendBtn,
    branding,
    avatar,
    settings,
    fallbackAvatarUrl,
  }) {
    if (!wrapper) return;

    const resolved = mergeWidgetSettings(settings);
    wrapper.style.fontFamily = `${resolved.fontFamily}, Arial, sans-serif`;
    wrapper.style.borderColor = resolved.primaryColor;
    wrapper.style.background = resolved.secondaryColor;
    wrapper.style.boxShadow = resolved.enableShadow ? "0 4px 12px rgba(0,0,0,0.25)" : "none";
    wrapper.style.borderRadius = shapeRadius(resolved.widgetShape);

    if (header) {
      header.style.background = resolved.primaryColor;
      header.style.borderBottom = `1px solid ${resolved.chatBubbleColor}`;
    }

    if (messages) {
      messages.style.color = resolved.textColor;
      messages.style.background = resolved.secondaryColor;
    }

    if (inputArea) {
      inputArea.style.background = resolved.secondaryColor;
    }

    if (sendBtn) {
      sendBtn.style.background = resolved.primaryColor;
      sendBtn.style.color = resolved.secondaryColor;
    }

    if (branding) {
      branding.style.color = resolved.textColor;
    }

    if (avatar) {
      if (resolved.showAvatar && resolved.avatarUrl) {
        avatar.src = resolved.avatarUrl;
        avatar.style.display = "block";
      } else if (fallbackAvatarUrl) {
        avatar.src = fallbackAvatarUrl;
        avatar.style.display = "block";
      } else {
        avatar.style.display = "none";
      }
    }

    let customStyleTag = document.getElementById("rowe-widget-custom-css");
    if (!customStyleTag) {
      customStyleTag = document.createElement("style");
      customStyleTag.id = "rowe-widget-custom-css";
      document.head.appendChild(customStyleTag);
    }
    customStyleTag.textContent = resolved.customCSS || "";
  }

  global.RoweWidgetSettings = {
    DEFAULT_WIDGET_SETTINGS,
    mergeWidgetSettings,
    applyLauncherStyles,
    applyFrameStyles,
    shapeRadius,
  };
})(window);
