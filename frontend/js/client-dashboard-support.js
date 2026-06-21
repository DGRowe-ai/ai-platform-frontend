(function mountClientDashboardSupport() {
  if (document.querySelector(".client-support")) {
    return;
  }

  const support = document.createElement("aside");
  support.className = "client-support";
  support.setAttribute("data-tooltip", "We're here to help.");
  support.setAttribute("aria-label", "Rowe AI support contact");

  support.innerHTML = `
    <span class="client-support-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"></circle>
        <path d="M9.5 9.25a2.75 2.75 0 0 1 5.08 1.37c0 1.63-2.33 1.88-2.33 3.63" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        <circle cx="12" cy="16.75" r="0.9" fill="currentColor"></circle>
      </svg>
    </span>
    <p class="client-support-text">
      Having trouble? Contact Rowe AI at
      <a href="mailto:support@roweai.ca">support@roweai.ca</a>
    </p>
  `;

  const main = document.querySelector("main");
  if (main) {
    main.insertAdjacentElement("afterend", support);
    return;
  }

  document.body.appendChild(support);
})();
