(function (global) {
  async function copyReferralLink(text, statusEl) {
    const value = (text || "").trim();
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      if (statusEl) {
        statusEl.textContent = "Referral link copied.";
        statusEl.classList.remove("error");
        statusEl.classList.add("success");
      }
    } catch (_err) {
      if (statusEl) {
        statusEl.textContent = "Unable to copy link.";
        statusEl.classList.remove("success");
        statusEl.classList.add("error");
      }
    }
  }

  async function loadReferralStats({ apiRequest, setStatus, els }) {
    if (!els?.referralLink) {
      return;
    }

    try {
      const data = await apiRequest("/client/referral-stats");
      const code = data.referralCode || "";
      const link =
        (global.RoweReferral && global.RoweReferral.buildPublicReferralLink(code)) ||
        data.referralLink ||
        "";

      els.referralLink.value = link;

      if (els.referralCount) {
        els.referralCount.textContent = String(data.successfulReferrals ?? 0);
      }
      if (els.freeMonthsEarned) {
        els.freeMonthsEarned.textContent = String(data.freeMonthsEarned ?? 0);
      }
      if (els.referralStatus) {
        setStatus(els.referralStatus, "");
      }
    } catch (err) {
      console.error("Referral stats unavailable:", err);
      if (els.referralStatus) {
        setStatus(
          els.referralStatus,
          err.message || "Referral rewards are unavailable right now.",
          "error",
        );
      }
    }
  }

  function initReferralDashboard({ apiRequest, setStatus, els }) {
    if (els?.copyReferralBtn && els?.referralLink) {
      els.copyReferralBtn.addEventListener("click", () => {
        copyReferralLink(els.referralLink.value, els.copyReferralStatus);
      });
    }

    return loadReferralStats({ apiRequest, setStatus, els });
  }

  global.RoweReferralDashboard = {
    copyReferralLink,
    loadReferralStats,
    initReferralDashboard,
  };
})(window);
