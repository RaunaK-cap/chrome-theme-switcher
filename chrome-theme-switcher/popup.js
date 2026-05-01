const SITE_SETTINGS_KEY = "siteSettings";
const DEFAULT_SETTINGS = {
  enabled: true,
  theme: "codex",
  contrast: 92,
  imageTone: 88
};

const THEMES = [
  { id: "dark", label: "Dark", outer: "#101114", inner: "#8bb8ff" },
  { id: "light", label: "Light", outer: "#fbfbfd", inner: "#2459c9" },
  { id: "cream", label: "Cream", outer: "#f7eedc", inner: "#7b4f10" },
  { id: "warmWhite", label: "Warm white", outer: "#fffaf0", inner: "#8a4d17" },
  { id: "codex", label: "Codex", outer: "#15130f", inner: "#f0b86a" },
  { id: "slate", label: "Slate", outer: "#0f1517", inner: "#7ad7cc" },
  { id: "rose", label: "Rose dusk", outer: "#24171b", inner: "#ff9eb4" },
  { id: "solar", label: "Solar paper", outer: "#f4ecd8", inner: "#246a8f" }
];

const enabledInput = document.getElementById("enabled");
const contrastInput = document.getElementById("contrast");
const imageToneInput = document.getElementById("imageTone");
const themeGrid = document.getElementById("themeGrid");
const resetButton = document.getElementById("reset");
const siteLabel = document.getElementById("siteLabel");

let settings = { ...DEFAULT_SETTINGS };
let siteSettings = {};
let siteKey = "local";

function getSiteKey(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "") || hostname || "local";
  } catch (_error) {
    return "local";
  }
}

function getSiteLabel(key) {
  if (key === "local") return "This website";
  return key;
}

function getCurrentTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => resolve(tab));
  });
}

function getStoredSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ [SITE_SETTINGS_KEY]: {} }, resolve);
  });
}

function setStoredSettings(nextSiteSettings) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [SITE_SETTINGS_KEY]: nextSiteSettings }, resolve);
  });
}

async function save(next) {
  settings = { ...settings, ...next };
  siteSettings = {
    ...siteSettings,
    [siteKey]: settings
  };

  await setStoredSettings(siteSettings);
  render();
}

function renderThemes() {
  themeGrid.textContent = "";

  THEMES.forEach((theme) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-button";
    button.setAttribute("aria-pressed", String(settings.theme === theme.id));
    button.addEventListener("click", () => save({ theme: theme.id, enabled: true }));

    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.setProperty("--swatch-outer", theme.outer);
    swatch.style.setProperty("--swatch-inner", theme.inner);

    const label = document.createElement("span");
    label.className = "theme-name";
    label.textContent = theme.label;

    button.append(swatch, label);
    themeGrid.append(button);
  });
}

function render() {
  siteLabel.textContent = getSiteLabel(siteKey);
  enabledInput.checked = settings.enabled;
  contrastInput.value = settings.contrast;
  imageToneInput.value = settings.imageTone;
  renderThemes();
}

async function resetCurrentSite() {
  const nextSiteSettings = { ...siteSettings };
  delete nextSiteSettings[siteKey];
  siteSettings = nextSiteSettings;
  settings = { ...DEFAULT_SETTINGS };

  await setStoredSettings(siteSettings);
  render();
}

enabledInput.addEventListener("change", () => save({ enabled: enabledInput.checked }));
contrastInput.addEventListener("input", () => save({ contrast: Number(contrastInput.value) }));
imageToneInput.addEventListener("input", () => save({ imageTone: Number(imageToneInput.value) }));
resetButton.addEventListener("click", resetCurrentSite);

async function init() {
  const tab = await getCurrentTab();
  siteKey = getSiteKey(tab?.url || "");

  const stored = await getStoredSettings();
  siteSettings = stored[SITE_SETTINGS_KEY] || {};
  settings = { ...DEFAULT_SETTINGS, ...(siteSettings[siteKey] || {}) };
  render();
}

init();
