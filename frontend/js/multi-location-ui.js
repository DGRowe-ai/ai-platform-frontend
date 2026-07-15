(function mountMultiLocationUI(global) {
  function emptyLocation() {
    return {
      name: "",
      address: "",
      phone: "",
      hours: "",
      services: "",
      staff: "",
      knowledge: "",
      personality: "",
      forwarding_number: "",
    };
  }

  function ensureEls(root) {
    return {
      section: root.querySelector("#multi-location-section"),
      toggle: root.querySelector("#multi-location-toggle"),
      fields: root.querySelector("#multi-location-fields"),
      list: root.querySelector("#locations-list"),
      addBtn: root.querySelector("#add-location-btn"),
      proFeatures: root.querySelector("#tier-pro-features"),
      premiumFlags: root.querySelector("#tier-premium-flags"),
      callForwardingEnabled: root.querySelector("#call-forwarding-enabled"),
      callForwardingNumber: root.querySelector("#call-forwarding-number"),
      monthlyOptimization: root.querySelector("#monthly-optimization"),
      dedicatedSupport: root.querySelector("#dedicated-support"),
    };
  }

  function renderLocationCard(location, index) {
    return `
      <div class="location-card" data-index="${index}" style="border:1px solid var(--border,#d9e2ef);border-radius:12px;padding:14px;margin-bottom:12px;background:#fff;">
        <strong>Location ${index + 1}</strong>
        <label>Location name</label>
        <input data-field="name" type="text" value="${escapeAttr(location.name)}">
        <label>Address</label>
        <input data-field="address" type="text" value="${escapeAttr(location.address)}">
        <label>Phone number</label>
        <input data-field="phone" type="tel" value="${escapeAttr(location.phone)}">
        <label>Hours</label>
        <textarea data-field="hours" rows="2">${escapeHtml(location.hours)}</textarea>
        <label>Services</label>
        <textarea data-field="services" rows="2">${escapeHtml(location.services)}</textarea>
        <label>Staff</label>
        <textarea data-field="staff" rows="2">${escapeHtml(location.staff)}</textarea>
        <label>Knowledge base text</label>
        <textarea data-field="knowledge" rows="3">${escapeHtml(location.knowledge)}</textarea>
        <label>Personality</label>
        <textarea data-field="personality" rows="2">${escapeHtml(location.personality)}</textarea>
        <label>Forwarding number</label>
        <input data-field="forwarding_number" type="tel" value="${escapeAttr(location.forwarding_number)}">
        <button type="button" class="secondary remove-location-btn" data-index="${index}" style="margin-top:8px;">Remove</button>
      </div>
    `;
  }

  function escapeAttr(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;");
  }

  function collectLocations(listEl) {
    if (!listEl) return [];
    return Array.from(listEl.querySelectorAll(".location-card")).map(card => {
      const data = emptyLocation();
      card.querySelectorAll("[data-field]").forEach(input => {
        data[input.dataset.field] = input.value.trim();
      });
      return data;
    });
  }

  function init(root = document) {
    const els = ensureEls(root);
    let locations = [];

    function syncVisibility(features, settings) {
      const canMulti = Boolean(features?.multi_location);
      const canForward = Boolean(features?.call_forwarding);
      const isPremium = Boolean(features?.custom_workflows || features?.monthly_optimization);

      els.section?.classList.toggle("hidden", !canMulti);
      els.proFeatures?.classList.toggle("hidden", !canForward);
      els.premiumFlags?.classList.toggle("hidden", !isPremium);

      if (settings) {
        if (els.toggle) {
          els.toggle.checked = Boolean(settings.multiLocationEnabled || settings.multi_location_enabled);
        }
        locations = Array.isArray(settings.locations) ? settings.locations.map(item => ({ ...emptyLocation(), ...item })) : [];
        if (!locations.length && els.toggle?.checked) {
          locations = [emptyLocation()];
        }
        if (els.callForwardingEnabled) {
          els.callForwardingEnabled.checked = Boolean(
            settings.callForwardingEnabled || settings.call_forwarding_enabled,
          );
        }
        if (els.callForwardingNumber) {
          els.callForwardingNumber.value =
            settings.callForwardingNumber || settings.call_forwarding_number || "";
        }
        if (els.monthlyOptimization) {
          els.monthlyOptimization.checked = Boolean(settings.monthlyOptimization);
        }
        if (els.dedicatedSupport) {
          els.dedicatedSupport.checked = Boolean(settings.dedicatedSupport);
        }
      }

      els.fields?.classList.toggle("hidden", !(canMulti && els.toggle?.checked));
      render();
    }

    function render() {
      if (!els.list) return;
      if (!els.toggle?.checked) {
        els.list.innerHTML = "";
        return;
      }
      if (!locations.length) {
        locations = [emptyLocation()];
      }
      els.list.innerHTML = locations.map((loc, index) => renderLocationCard(loc, index)).join("");
      els.list.querySelectorAll(".remove-location-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const index = Number(btn.dataset.index);
          locations = collectLocations(els.list);
          locations.splice(index, 1);
          if (!locations.length) {
            locations = [emptyLocation()];
          }
          render();
        });
      });
    }

    els.toggle?.addEventListener("change", () => {
      els.fields?.classList.toggle("hidden", !els.toggle.checked);
      if (els.toggle.checked && !locations.length) {
        locations = [emptyLocation()];
      }
      render();
    });

    els.addBtn?.addEventListener("click", () => {
      locations = collectLocations(els.list);
      locations.push(emptyLocation());
      render();
    });

    return {
      applyFromSettings(settings, features) {
        syncVisibility(features || settings?.features || {}, settings || {});
      },
      buildPayload() {
        const payload = {};
        if (els.section && !els.section.classList.contains("hidden")) {
          payload.multiLocationEnabled = Boolean(els.toggle?.checked);
          payload.locations = els.toggle?.checked ? collectLocations(els.list) : [];
        }
        if (els.proFeatures && !els.proFeatures.classList.contains("hidden")) {
          payload.callForwardingEnabled = Boolean(els.callForwardingEnabled?.checked);
          payload.callForwardingNumber = els.callForwardingNumber?.value.trim() || "";
        }
        if (els.premiumFlags && !els.premiumFlags.classList.contains("hidden")) {
          payload.monthlyOptimization = Boolean(els.monthlyOptimization?.checked);
          payload.dedicatedSupport = Boolean(els.dedicatedSupport?.checked);
        }
        return payload;
      },
    };
  }

  global.RoweMultiLocationUI = { init };
})(window);
