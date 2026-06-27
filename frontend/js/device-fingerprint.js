(function initRoweDeviceFingerprint(global) {
  const STORAGE_KEY = "rowe_device_fp";

  async function sha256Hex(value) {
    const data = new TextEncoder().encode(value);
    const hash = await global.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  async function getDeviceFingerprint() {
    const stored = global.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return stored;
    }

    const components = [
      global.navigator.userAgent || "",
      global.navigator.language || "",
      `${global.screen.width}x${global.screen.height}`,
      String(global.screen.colorDepth || ""),
      String(new Date().getTimezoneOffset()),
      String(global.navigator.hardwareConcurrency || ""),
      global.navigator.platform || "",
    ];
    const fingerprint = await sha256Hex(components.join("|"));
    global.localStorage.setItem(STORAGE_KEY, fingerprint);
    return fingerprint;
  }

  global.RoweDeviceFingerprint = {
    getDeviceFingerprint,
  };
})(window);
