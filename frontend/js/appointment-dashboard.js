(function initAppointmentDashboardModule(global) {
  function normalizeList(payload, keys) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];
    for (const key of keys) {
      if (Array.isArray(payload[key])) return payload[key];
    }
    return [];
  }

  function clearElement(element) {
    if (element) element.replaceChildren();
  }

  function createEmpty(message) {
    const node = document.createElement("p");
    node.className = "help-text";
    node.textContent = message;
    return node;
  }

  function createMetaItem(label, value) {
    const item = document.createElement("span");
    item.textContent = `${label}: ${value}`;
    return item;
  }

  function statusBadgeClass(status) {
    return String(status || "Pending").toLowerCase();
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  }

  function init(config) {
    const {
      apiRequest,
      setStatus,
      els,
      emptyMessage = "No appointment requests yet.",
    } = config;

    function toggleAppointmentNotificationFields() {
      const method = els.appointmentNotifyMethod?.value || "email";
      els.appointmentEmailWrap?.classList.toggle("hidden", method !== "email");
      els.appointmentWebhookWrap?.classList.toggle("hidden", method !== "webhook");
    }

    function renderAppointmentSettings(settings = {}) {
      if (els.appointmentTimezone) {
        els.appointmentTimezone.value = settings.timezone || "America/Toronto";
      }
      if (els.appointmentNotifyMethod) {
        els.appointmentNotifyMethod.value = settings.notification_method || "email";
      }
      if (els.appointmentNotifyEmail) {
        els.appointmentNotifyEmail.value =
          settings.ownerNotificationEmail || settings.notification_email || "";
      }
      if (els.appointmentWebhookUrl) {
        els.appointmentWebhookUrl.value = settings.webhook_url || "";
      }
      toggleAppointmentNotificationFields();
    }

    function renderAppointmentRequests(payload) {
      const requests = normalizeList(payload, ["requests", "appointment_requests", "items"]);
      clearElement(els.appointmentRequests);
      setStatus(
        els.appointmentsStatus,
        `${requests.length} request${requests.length === 1 ? "" : "s"}`,
      );

      if (!requests.length) {
        els.appointmentRequests?.appendChild(createEmpty(emptyMessage));
        return;
      }

      requests.forEach(item => {
        const card = document.createElement("article");
        card.className = "appointment-item";

        const header = document.createElement("header");
        const title = document.createElement("h3");
        title.textContent = item.customer_name || "Customer";
        header.appendChild(title);

        const badge = document.createElement("span");
        badge.className = `status-badge ${statusBadgeClass(item.status)}`;
        badge.textContent = item.status || "Pending";
        header.appendChild(badge);
        card.appendChild(header);

        const meta = document.createElement("div");
        meta.className = "appointment-meta";
        meta.appendChild(createMetaItem("Contact", item.customer_contact || "-"));
        meta.appendChild(createMetaItem("Service", item.service || "-"));
        meta.appendChild(
          createMetaItem(
            "When",
            item.normalized_datetime ||
              `${item.requested_date || ""} ${item.requested_time || ""}`.trim(),
          ),
        );
        meta.appendChild(createMetaItem("Timezone", item.timezone || "-"));
        if (item.notes) {
          meta.appendChild(createMetaItem("Notes", item.notes));
        }
        if (item.created_at) {
          meta.appendChild(createMetaItem("Submitted", formatDate(item.created_at)));
        }
        card.appendChild(meta);

        const actions = document.createElement("div");
        actions.className = "appointment-actions";

        const select = document.createElement("select");
        ["Pending", "Confirmed", "Rejected", "Done"].forEach(status => {
          const option = document.createElement("option");
          option.value = status;
          option.textContent = status;
          if ((item.status || "Pending") === status) {
            option.selected = true;
          }
          select.appendChild(option);
        });

        const saveBtn = document.createElement("button");
        saveBtn.type = "button";
        saveBtn.className = "secondary";
        saveBtn.textContent = "Update Status";
        saveBtn.addEventListener("click", async () => {
          try {
            setStatus(els.appointmentsStatus, "Updating...");
            await apiRequest(`/client/appointment_requests/${encodeURIComponent(item.id)}`, {
              method: "PATCH",
              body: JSON.stringify({ status: select.value }),
            });
            await loadAppointments();
            setStatus(els.appointmentsStatus, "Status updated.", "success");
          } catch (err) {
            setStatus(els.appointmentsStatus, err.message || "Unable to update status.", "error");
          }
        });

        actions.appendChild(select);
        actions.appendChild(saveBtn);
        card.appendChild(actions);
        els.appointmentRequests?.appendChild(card);
      });
    }

    async function loadAppointments() {
      const data = await apiRequest("/client/appointment_requests");
      renderAppointmentRequests(data);
    }

    async function loadAppointmentSettings() {
      const data = await apiRequest("/client/appointment_settings");
      renderAppointmentSettings(data);
    }

    async function saveAppointmentSettings(event) {
      event.preventDefault();
      setStatus(els.appointmentSettingsStatus, "Saving...");

      try {
        await apiRequest("/client/appointment_settings", {
          method: "POST",
          body: JSON.stringify({
            timezone: els.appointmentTimezone.value,
            notification_method: els.appointmentNotifyMethod.value,
            ownerNotificationEmail: els.appointmentNotifyEmail.value.trim(),
            notification_email: els.appointmentNotifyEmail.value.trim(),
            webhook_url: els.appointmentWebhookUrl.value.trim(),
          }),
        });
        setStatus(els.appointmentSettingsStatus, "Appointment settings saved.", "success");
      } catch (err) {
        setStatus(els.appointmentSettingsStatus, err.message || "Unable to save settings.", "error");
      }
    }

    if (els.appointmentSettingsForm) {
      els.appointmentSettingsForm.addEventListener("submit", saveAppointmentSettings);
    }
    if (els.appointmentNotifyMethod) {
      els.appointmentNotifyMethod.addEventListener("change", toggleAppointmentNotificationFields);
    }

    return {
      loadAppointments,
      loadAppointmentSettings,
      renderAppointmentSettings,
      renderAppointmentRequests,
    };
  }

  global.RoweAppointmentDashboard = { init };
})(window);
