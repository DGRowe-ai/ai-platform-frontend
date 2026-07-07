(function (global) {
  const STORAGE_KEY = "rowe_referral_code";

  function captureReferralFromUrl(searchParams) {
    const params = searchParams || new URLSearchParams(global.location.search);
    const ref = params.get("ref");
    if (ref && ref.trim()) {
      global.sessionStorage.setItem(STORAGE_KEY, ref.trim());
      return ref.trim();
    }
    return null;
  }

  function getStoredReferralCode(fallbackFromUrl = true) {
    const stored = global.sessionStorage.getItem(STORAGE_KEY);
    if (stored && stored.trim()) {
      return stored.trim();
    }

    if (fallbackFromUrl) {
      const ref = new URLSearchParams(global.location.search).get("ref");
      if (ref && ref.trim()) {
        return ref.trim();
      }
    }

    return "";
  }

  function setStoredReferralCode(code) {
    const normalized = (code || "").trim();
    if (normalized) {
      global.sessionStorage.setItem(STORAGE_KEY, normalized);
    } else {
      global.sessionStorage.removeItem(STORAGE_KEY);
    }
    return normalized;
  }

  function buildPublicReferralLink(referralCode, planType) {
    const code = (referralCode || "").trim();
    if (!code) {
      return "";
    }

    const url = new URL("billing.html", global.location.href);
    url.searchParams.set("ref", code);
    if (planType) {
      url.searchParams.set("plan", planType);
    }
    return url.href;
  }

  function appendReferralToHref(href) {
    if (!href) {
      return href;
    }

    const code = getStoredReferralCode(false);
    if (!code) {
      return href;
    }

    try {
      const url = new URL(href, global.location.href);
      if (!url.searchParams.has("ref")) {
        url.searchParams.set("ref", code);
      }
      return url.pathname + url.search + url.hash;
    } catch (_err) {
      if (href.includes("ref=")) {
        return href;
      }
      const separator = href.includes("?") ? "&" : "?";
      return `${href}${separator}ref=${encodeURIComponent(code)}`;
    }
  }

  function applyReferralToLinks(selector) {
    global.document.querySelectorAll(selector).forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) {
        return;
      }
      link.setAttribute("href", appendReferralToHref(href));
    });
  }

  global.RoweReferral = {
    STORAGE_KEY,
    captureReferralFromUrl,
    getStoredReferralCode,
    setStoredReferralCode,
    buildPublicReferralLink,
    appendReferralToHref,
    applyReferralToLinks,
  };
})(window);
