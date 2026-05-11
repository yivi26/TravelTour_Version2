(() => {
  const SETTINGS_URL = "/api/settings";
  const CACHE_KEY = "traveltour_system_settings_v1";
  const CACHE_TTL_MS = 60_000;

  function now() {
    return Date.now();
  }

  function safeJsonParse(value) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  function getCached() {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = safeJsonParse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.savedAt || now() - parsed.savedAt > CACHE_TTL_MS) return null;
    return parsed.data || null;
  }

  function setCached(data) {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: now(), data }));
  }

  async function fetchSettings() {
    const cached = getCached();
    if (cached) return cached;

    const res = await fetch(SETTINGS_URL, { method: "GET" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || "Không tải được cài đặt");
    const data = json?.data || {};
    setCached(data);
    return data;
  }

  function applyText(key, value) {
    const nodes = document.querySelectorAll(`[data-setting-text="${key}"]`);
    if (!nodes.length) return;
    for (const node of nodes) node.textContent = value == null ? "" : String(value);
  }

  function applyColor(key, value) {
    if (key !== "theme_primary_color" || !value) return;
    document.documentElement.style.setProperty("--primary-color", String(value));
  }

  function applyTitle(settings) {
    const platform = String(settings?.platform_name || "").trim();
    if (!platform) return;
    if (document.title && document.title.includes("TravelTour")) {
      document.title = document.title.replaceAll("TravelTour", platform);
    } else if (!document.title) {
      document.title = platform;
    }
  }

  async function init() {
    try {
      const settings = await fetchSettings();
      applyTitle(settings);

      for (const [k, v] of Object.entries(settings)) {
        applyText(k, v);
        applyColor(k, v);
      }
    } catch (err) {
      // Silent fail: keep hard-coded UI if API not available
      console.warn("caidat:", err?.message || err);
    }
  }

  window.TravelTourSettings = {
    fetch: fetchSettings
  };

  document.addEventListener("DOMContentLoaded", init);
})();

