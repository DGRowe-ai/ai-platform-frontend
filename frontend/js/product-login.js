(function initProductLogin(global) {
  const DEFAULT_API_URL = "https://ai-platform-backend-ulqs.onrender.com";

  const DASHBOARD_BY_PRODUCT = {
    chatbot: "dashboard-chatbot.html",
    voicebot: "dashboard-voicebot.html",
    duo: "dashboard-duo.html",
  };

  function parseJwtPayload(token) {
    if (!token || !token.includes(".")) {
      return {};
    }

    try {
      const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const paddedPayload = payload.padEnd(payload.length + (4 - payload.length % 4) % 4, "=");
      return JSON.parse(atob(paddedPayload));
    } catch (err) {
      console.warn("Unable to parse login token payload", err);
      return {};
    }
  }

  function getUserRole(data, tokenPayload) {
    const role =
      data.role ||
      data.user_role ||
      data.account_role ||
      data.user?.role ||
      data.user?.user_role ||
      data.current_user?.role ||
      tokenPayload.role ||
      tokenPayload.user_role ||
      "";

    return String(role).toLowerCase();
  }

  function isAdminUser(data, tokenPayload) {
    return Boolean(
      data.is_admin ||
        data.is_platform_admin ||
        data.user?.is_admin ||
        data.user?.is_platform_admin ||
        data.current_user?.is_admin ||
        data.current_user?.is_platform_admin ||
        tokenPayload.is_admin ||
        tokenPayload.is_platform_admin,
    );
  }

  function resolveProductType(data) {
    if (data.product_type) {
      return String(data.product_type).toLowerCase();
    }
    if (data.plan_type === "duo" || (data.has_chatbot && data.has_voicebot)) {
      return "duo";
    }
    if (data.plan_type === "voicebot" || data.has_voicebot) {
      return "voicebot";
    }
    return "chatbot";
  }

  function resolveDashboardUrl(data, fallback) {
    if (data.dashboard_url) {
      return data.dashboard_url;
    }
    return DASHBOARD_BY_PRODUCT[resolveProductType(data)] || fallback || DASHBOARD_BY_PRODUCT.chatbot;
  }

  function storeSession(data, token, tokenPayload) {
    const role = getUserRole(data, tokenPayload);
    const productType = resolveProductType(data);

    localStorage.setItem("token", token);
    localStorage.setItem("access_token", token);
    localStorage.setItem("user_role", role);
    localStorage.setItem("is_platform_admin", isAdminUser(data, tokenPayload) ? "1" : "0");

    if (data.user_id) {
      localStorage.setItem("user_id", data.user_id);
    }

    if (data.businesses) {
      localStorage.setItem("businesses", JSON.stringify(data.businesses));
    }

    localStorage.setItem("plan_type", data.plan_type || productType);
    localStorage.setItem("product_type", productType);
    if (data.tier) {
      localStorage.setItem("tier", data.tier);
    }
    localStorage.setItem("has_voicebot", data.has_voicebot ? "1" : "0");
    localStorage.setItem("has_chatbot", data.has_chatbot ? "1" : "0");
    localStorage.setItem("dashboard_url", resolveDashboardUrl(data));
  }

  function init(config) {
    const apiUrl = global.RoweAppConfig?.API_URL || DEFAULT_API_URL;
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const loginBtn = document.getElementById("login-btn");
    const errorEl = document.getElementById("login-error");

    function setError(message) {
      if (!errorEl) {
        if (message) {
          alert(message);
        }
        return;
      }

      if (!message) {
        errorEl.textContent = "";
        errorEl.classList.add("hidden");
        return;
      }

      errorEl.textContent = message;
      errorEl.classList.remove("hidden");
    }

    async function login() {
      setError("");
      const email = emailInput?.value?.trim();
      const password = passwordInput?.value || "";

      if (!email || !password) {
        setError("Enter your email and password.");
        return;
      }

      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = "Signing in...";
      }

      try {
        const response = await fetch(`${apiUrl}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.detail || "Login failed.");
          return;
        }

        const token = data.access_token || data.token;
        if (!token) {
          setError("Login response did not include an access token.");
          return;
        }

        const tokenPayload = parseJwtPayload(token);
        const isAdmin = isAdminUser(data, tokenPayload);
        const productType = resolveProductType(data);

        // Unified login: always route by purchased product_type.
        // Product-specific login pages only allow matching product (admins exempt).
        if (config.product && config.product !== "any" && !isAdmin) {
          if (config.product === "chatbot" && productType !== "chatbot" && productType !== "duo") {
            // chatbot-only page should reject pure voicebot accounts
            if (productType === "voicebot") {
              setError("This account uses the voicebot dashboard. Sign in from the main login page.");
              return;
            }
          }
          if (config.product === "voicebot" && productType !== "voicebot" && productType !== "duo") {
            if (productType === "chatbot") {
              setError("This account uses the chatbot dashboard. Sign in from the main login page.");
              return;
            }
          }
          if (config.product === "chatbot" && !data.has_chatbot && productType !== "duo") {
            setError("This account does not include the chatbot dashboard.");
            return;
          }
          if (config.product === "voicebot" && !data.has_voicebot && productType !== "duo") {
            setError("This account does not include the voicebot dashboard.");
            return;
          }
        }

        storeSession(data, token, tokenPayload);
        if (config.forceDashboardUrl && config.dashboardUrl) {
          window.location.href = config.dashboardUrl;
        } else {
          window.location.href = resolveDashboardUrl(data, config.dashboardUrl);
        }
      } catch (err) {
        console.error("Login error:", err);
        setError("Unable to login. Please try again.");
      } finally {
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.textContent = config.loginButtonLabel || "Login";
        }
      }
    }

    if (loginBtn) {
      loginBtn.addEventListener("click", login);
    }

    passwordInput?.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        login();
      }
    });

    const params = new URLSearchParams(global.location.search);
    if (params.get("reset") === "success") {
      document.getElementById("reset-success-message")?.classList.remove("hidden");
    }
  }

  global.RoweProductLogin = {
    init,
    resolveProductType,
    resolveDashboardUrl,
  };
})(window);
