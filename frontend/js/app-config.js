(function initRoweAppConfig(global) {
  const API_URL = "https://ai-platform-backend-ulqs.onrender.com";
  const PUBLIC_FRONTEND_URL = "https://ai-platform-frontend-uaaa.onrender.com";

  function getWidgetBaseUrl() {
    const origin = global.location?.origin || "";
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
      return origin.replace(/\/$/, "");
    }
    return PUBLIC_FRONTEND_URL;
  }

  global.RoweAppConfig = {
    API_URL,
    PUBLIC_FRONTEND_URL,
    getWidgetBaseUrl,
  };
})(window);
