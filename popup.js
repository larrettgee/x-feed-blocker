const DEFAULTS = {
  enabled: true,
  home: true,
  explore: true,
  sidebar: true,
  discoverMore: true,
};

chrome.storage.sync.get(DEFAULTS, (settings) => {
  for (const key of Object.keys(DEFAULTS)) {
    const input = document.getElementById(key);
    input.checked = settings[key];
    input.addEventListener("change", () => {
      chrome.storage.sync.set({ [key]: input.checked });
      if (key === "enabled") document.body.classList.toggle("disabled", !input.checked);
    });
  }
  document.body.classList.toggle("disabled", !settings.enabled);
});
