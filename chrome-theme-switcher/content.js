const STYLE_ID = "toneshift-theme-style";
const CONTRAST_ATTR = "data-toneshift-contrast";
const BG_ATTR = "data-toneshift-bg";
const ORIGINAL_COLOR_ATTR = "data-toneshift-original-color";
const ORIGINAL_COLOR_PRIORITY_ATTR = "data-toneshift-original-color-priority";
const ORIGINAL_CARET_ATTR = "data-toneshift-original-caret";
const ORIGINAL_CARET_PRIORITY_ATTR = "data-toneshift-original-caret-priority";
const ORIGINAL_BG_ATTR = "data-toneshift-original-bg";
const ORIGINAL_BG_PRIORITY_ATTR = "data-toneshift-original-bg-priority";
const SITE_SETTINGS_KEY = "siteSettings";
const DEFAULT_SETTINGS = {
  enabled: true,
  theme: "codex",
  contrast: 92,
  imageTone: 88
};

const THEMES = {
  dark: {
    page: "#101114",
    surface: "#181a1f",
    elevated: "#20232a",
    text: "#f3f4f8",
    muted: "#b8beca",
    border: "#343844",
    link: "#8bb8ff",
    selection: "#355d93"
  },
  light: {
    page: "#fbfbfd",
    surface: "#ffffff",
    elevated: "#f0f2f6",
    text: "#15171c",
    muted: "#5e6470",
    border: "#d8dce5",
    link: "#2459c9",
    selection: "#bcd4ff"
  },
  cream: {
    page: "#f7eedc",
    surface: "#fff7e8",
    elevated: "#efe0c4",
    text: "#2c2418",
    muted: "#6a5d49",
    border: "#d6c2a1",
    link: "#7b4f10",
    selection: "#e7c98f"
  },
  warmWhite: {
    page: "#fffaf0",
    surface: "#fffdf8",
    elevated: "#f4ebdc",
    text: "#24211d",
    muted: "#675f54",
    border: "#ddd0bf",
    link: "#8a4d17",
    selection: "#f3d9a9"
  },
  codex: {
    page: "#15130f",
    surface: "#1f1c16",
    elevated: "#2a251d",
    text: "#f5efe3",
    muted: "#c9bda9",
    border: "#4b4234",
    link: "#f0b86a",
    selection: "#6b4d28"
  },
  slate: {
    page: "#0f1517",
    surface: "#172023",
    elevated: "#213036",
    text: "#eef5f3",
    muted: "#aec1bc",
    border: "#365057",
    link: "#7ad7cc",
    selection: "#246b73"
  },
  rose: {
    page: "#24171b",
    surface: "#302025",
    elevated: "#3b2930",
    text: "#fff1f4",
    muted: "#d9b8c0",
    border: "#63404a",
    link: "#ff9eb4",
    selection: "#733448"
  },
  solar: {
    page: "#f4ecd8",
    surface: "#fff8e5",
    elevated: "#e8dcc0",
    text: "#243236",
    muted: "#5f6f70",
    border: "#cbbf9e",
    link: "#246a8f",
    selection: "#d9c37c"
  }
};

let currentSettings = { ...DEFAULT_SETTINGS };
const siteKey = getSiteKey();
let contrastObserver;
let contrastFrame = 0;

function getSiteKey() {
  return window.location.hostname.replace(/^www\./, "") || window.location.hostname || "local";
}

function getSettingsForSite(siteSettings = {}) {
  return { ...DEFAULT_SETTINGS, ...(siteSettings[siteKey] || {}) };
}

function getTheme(name) {
  return THEMES[name] || THEMES.codex;
}

function isDarkTheme(name = currentSettings.theme) {
  return name === "dark" || name === "codex" || name === "slate" || name === "rose";
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return null;

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
}

function parseRgb(color) {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([.\d]+))?\)/i);
  if (!match) return null;

  const alpha = match[4] === undefined ? 1 : Number(match[4]);
  if (alpha === 0) return null;

  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3])
  };
}

function getRelativeLuminance({ r, g, b }) {
  const channels = [r, g, b].map((value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function getEffectiveBackground(element) {
  let current = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const background = parseRgb(getComputedStyle(current).backgroundColor);
    if (background) return background;
    current = current.parentElement;
  }

  return parseRgb(getComputedStyle(document.body).backgroundColor) || parseRgb(getComputedStyle(document.documentElement).backgroundColor);
}

function getOwnBackground(element) {
  return parseRgb(getComputedStyle(element).backgroundColor);
}

function shouldConsiderElement(element) {
  if (element.id === STYLE_ID || element.closest("svg, canvas, video, picture, img, source")) {
    return false;
  }

  const tag = element.tagName.toLowerCase();
  return !["script", "style", "meta", "link", "noscript", "template"].includes(tag);
}

function shouldCheckElement(element) {
  if (!shouldConsiderElement(element)) return false;

  return Boolean(
    element.children.length === 0 ||
    element.matches("a, button, input, textarea, select, option, label, summary, td, th, li, p, span, small, strong, em, h1, h2, h3, h4, h5, h6, code, pre")
  );
}

function rememberInlineStyle(element, property, valueAttr, priorityAttr) {
  if (element.hasAttribute(valueAttr)) return;

  element.setAttribute(valueAttr, element.style.getPropertyValue(property));
  element.setAttribute(priorityAttr, element.style.getPropertyPriority(property));
}

function restoreInlineStyle(element, property, valueAttr, priorityAttr) {
  if (!element.hasAttribute(valueAttr)) return;

  const value = element.getAttribute(valueAttr);
  const priority = element.getAttribute(priorityAttr);

  if (value) {
    element.style.setProperty(property, value, priority || "");
  } else {
    element.style.removeProperty(property);
  }

  element.removeAttribute(valueAttr);
  element.removeAttribute(priorityAttr);
}

function shouldNormalizeBackground(element, luminance) {
  if (element === document.documentElement || element === document.body) {
    return false;
  }

  const hasVisualRole = element.matches(
    "a, button, input, textarea, select, option, table, thead, tbody, tr, td, th, pre, code, blockquote, header, footer, nav, aside, main, section, article, form, dialog, details, summary, [role='button'], [role='dialog'], [role='menu'], [role='listbox'], [class*='card' i], [class*='panel' i], [class*='modal' i], [class*='box' i], [class*='container' i], [class*='sidebar' i]"
  );

  if (isDarkTheme()) {
    return luminance > 0.68 || (hasVisualRole && luminance > 0.52);
  }

  return luminance < 0.2 || (hasVisualRole && luminance < 0.14);
}

function getNormalizedBackground(element) {
  const theme = getTheme(currentSettings.theme);
  if (element.matches("input, textarea, select, button, pre, code, blockquote, [role='button'], [role='dialog'], [role='menu'], [role='listbox']")) {
    return theme.elevated;
  }

  return theme.surface;
}

function normalizeBackground(element) {
  if (!shouldConsiderElement(element)) return null;

  const ownBackground = getOwnBackground(element);
  if (!ownBackground) return null;

  const ownLuminance = getRelativeLuminance(ownBackground);
  if (!shouldNormalizeBackground(element, ownLuminance)) {
    return null;
  }

  const background = getNormalizedBackground(element);
  rememberInlineStyle(element, "background-color", ORIGINAL_BG_ATTR, ORIGINAL_BG_PRIORITY_ATTR);
  element.setAttribute(BG_ATTR, "normalized");

  if (element.style.getPropertyValue("background-color") !== background || element.style.getPropertyPriority("background-color") !== "important") {
    element.style.setProperty("background-color", background, "important");
  }

  return hexToRgb(background);
}

function applyReadableText(element, normalizedBackground = null) {
  const background = normalizedBackground || getEffectiveBackground(element);
  if (!background) return;

  const luminance = getRelativeLuminance(background);
  const theme = getTheme(currentSettings.theme);
  const isLightBackground = luminance > 0.56;
  const readableText = isLightBackground ? "#151515" : "#f7f7f7";
  const readableMuted = isLightBackground ? "#4d4d4d" : "#c8c8c8";
  const readableLink = isLightBackground ? "#1d4fbf" : theme.link;

  const isLink = element.closest("a[href]");
  const color = isLink ? readableLink : readableText;
  const mode = isLightBackground ? "light-bg" : "dark-bg";
  const caretColor = isLink ? readableLink : color;

  rememberInlineStyle(element, "color", ORIGINAL_COLOR_ATTR, ORIGINAL_COLOR_PRIORITY_ATTR);
  rememberInlineStyle(element, "caret-color", ORIGINAL_CARET_ATTR, ORIGINAL_CARET_PRIORITY_ATTR);

  if (element.getAttribute(CONTRAST_ATTR) !== mode) {
    element.setAttribute(CONTRAST_ATTR, mode);
  }
  if (element.style.getPropertyValue("color") !== color || element.style.getPropertyPriority("color") !== "important") {
    element.style.setProperty("color", color, "important");
  }
  if (element.style.getPropertyValue("caret-color") !== caretColor || element.style.getPropertyPriority("caret-color") !== "important") {
    element.style.setProperty("caret-color", caretColor, "important");
  }
  if (element.style.getPropertyValue("--toneshift-readable-color") !== color) {
    element.style.setProperty("--toneshift-readable-color", color);
  }
  if (element.style.getPropertyValue("--toneshift-readable-caret") !== caretColor) {
    element.style.setProperty("--toneshift-readable-caret", caretColor);
  }

  if (element.matches("input, textarea") && element.value === "") {
    if (element.style.getPropertyValue("--toneshift-readable-placeholder") !== readableMuted) {
      element.style.setProperty("--toneshift-readable-placeholder", readableMuted);
    }
  }
}

function clearReadableText() {
  document.querySelectorAll(`[${CONTRAST_ATTR}], [${BG_ATTR}]`).forEach((element) => {
    element.removeAttribute(CONTRAST_ATTR);
    element.removeAttribute(BG_ATTR);
    restoreInlineStyle(element, "color", ORIGINAL_COLOR_ATTR, ORIGINAL_COLOR_PRIORITY_ATTR);
    restoreInlineStyle(element, "caret-color", ORIGINAL_CARET_ATTR, ORIGINAL_CARET_PRIORITY_ATTR);
    restoreInlineStyle(element, "background-color", ORIGINAL_BG_ATTR, ORIGINAL_BG_PRIORITY_ATTR);
    element.style.removeProperty("--toneshift-readable-color");
    element.style.removeProperty("--toneshift-readable-caret");
    element.style.removeProperty("--toneshift-readable-placeholder");
  });
}

function runContrastGuard() {
  if (!currentSettings.enabled || !document.body) return;

  const elements = document.querySelectorAll("body, body *");
  elements.forEach((element) => {
    if (!shouldConsiderElement(element)) return;

    const normalizedBackground = normalizeBackground(element);
    if (shouldCheckElement(element)) applyReadableText(element, normalizedBackground);
  });
}

function scheduleContrastGuard() {
  if (contrastFrame) return;
  contrastFrame = requestAnimationFrame(() => {
    contrastFrame = 0;
    runContrastGuard();
  });
}

function startContrastGuard() {
  stopContrastGuard(false);
  scheduleContrastGuard();

  contrastObserver = new MutationObserver(scheduleContrastGuard);
  contrastObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "hidden", "open"]
  });
}

function stopContrastGuard(shouldClear = true) {
  if (contrastObserver) {
    contrastObserver.disconnect();
    contrastObserver = undefined;
  }

  if (contrastFrame) {
    cancelAnimationFrame(contrastFrame);
    contrastFrame = 0;
  }

  if (shouldClear && document.body) {
    clearReadableText();
  }
}

function buildCss(settings) {
  const theme = getTheme(settings.theme);
  const contrast = Number(settings.contrast) / 100;
  const imageTone = Number(settings.imageTone) / 100;
  const isDark = isDarkTheme(settings.theme);
  const imageFilter = isDark
    ? `brightness(${Math.max(0.6, imageTone)}) contrast(${Math.max(0.82, contrast)})`
    : `brightness(${Math.max(0.9, imageTone)}) contrast(${Math.max(0.88, contrast)})`;

  return `
    :root {
      color-scheme: ${isDark ? "dark" : "light"} !important;
      --toneshift-page: ${theme.page};
      --toneshift-surface: ${theme.surface};
      --toneshift-elevated: ${theme.elevated};
      --toneshift-text: ${theme.text};
      --toneshift-muted: ${theme.muted};
      --toneshift-border: ${theme.border};
      --toneshift-link: ${theme.link};
      --toneshift-selection: ${theme.selection};
    }

    html,
    body {
      background: var(--toneshift-page) !important;
      color: var(--toneshift-text) !important;
    }

    body *:not(svg):not(svg *):not(canvas):not(video):not(img):not(picture):not(source) {
      border-color: var(--toneshift-border) !important;
      caret-color: var(--toneshift-link) !important;
      text-shadow: none !important;
    }

    [${CONTRAST_ATTR}] {
      color: var(--toneshift-readable-color) !important;
      caret-color: var(--toneshift-readable-caret) !important;
    }

    main, section, article, aside, header, footer, nav,
    form, dialog, details, summary, ul, ol, li,
    table, thead, tbody, tr, td, th {
      background-color: color-mix(in srgb, var(--toneshift-surface) 88%, transparent) !important;
      color: var(--toneshift-text) !important;
    }

    body > div,
    body > main {
      background-color: var(--toneshift-page) !important;
    }

    [class*="card" i], [class*="panel" i], [class*="modal" i],
    [class*="popover" i], [class*="dropdown" i], [role="dialog"],
    [role="menu"], [role="listbox"] {
      background-color: var(--toneshift-elevated) !important;
      color: var(--toneshift-text) !important;
      box-shadow: none !important;
    }

    p, span, small, strong, em, label, legend, h1, h2, h3, h4, h5, h6,
    code, pre, blockquote, figcaption, cite, time {
      color: inherit !important;
    }

    a, a:visited {
      color: var(--toneshift-link) !important;
    }

    input, textarea, select, button {
      background-color: var(--toneshift-elevated) !important;
      color: var(--toneshift-text) !important;
      border-color: var(--toneshift-border) !important;
      box-shadow: none !important;
    }

    input::placeholder,
    textarea::placeholder {
      color: var(--toneshift-readable-placeholder, var(--toneshift-muted)) !important;
      opacity: 1 !important;
    }

    pre, code, kbd, samp {
      background-color: var(--toneshift-elevated) !important;
      color: var(--toneshift-text) !important;
    }

    img, picture, video, canvas, iframe {
      filter: ${imageFilter} !important;
    }

    svg {
      color: var(--toneshift-text) !important;
    }

    ::selection {
      background: var(--toneshift-selection) !important;
      color: var(--toneshift-text) !important;
    }
  `;
}

function applyTheme(settings) {
  currentSettings = { ...DEFAULT_SETTINGS, ...settings };
  let style = document.getElementById(STYLE_ID);

  if (!currentSettings.enabled) {
    if (style) style.remove();
    stopContrastGuard();
    return;
  }

  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.documentElement.appendChild(style);
  }

  style.textContent = buildCss(currentSettings);
  startContrastGuard();
}

chrome.storage.sync.get({ [SITE_SETTINGS_KEY]: {} }, (stored) => {
  applyTheme(getSettingsForSite(stored[SITE_SETTINGS_KEY]));
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (!changes[SITE_SETTINGS_KEY]) return;

  applyTheme(getSettingsForSite(changes[SITE_SETTINGS_KEY].newValue || {}));
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "TONESHIFT_GET_SETTINGS") {
    sendResponse(currentSettings);
  }
});
