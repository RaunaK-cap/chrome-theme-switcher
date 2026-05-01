# ToneShift Theme Switcher

A Manifest V3 Chrome extension that lets you switch most websites into dark, light, cream, warm white, Codex-inspired, slate, rose, or solar paper themes.

Each website keeps its own theme. For example, `npmjs.com` can use Codex while `github.com` uses Light.

## Load in Chrome

1. Open `chrome://extensions`.
2. Turn on `Developer mode`.
3. Click `Load unpacked`.
4. Select this folder: `C:\Users\91969\Documents\Playground\chrome-theme-switcher`.
5. Pin `ToneShift` from the extensions menu and choose a theme for the current website.

## Notes

- The extension saves selected themes in `chrome.storage.sync` under a `siteSettings` object keyed by hostname.
- `Reset` clears only the current website's custom setting.
- Some protected Chrome pages, browser store pages, and heavily isolated embedded frames cannot be themed by extensions.
- Images and videos are gently toned so pages do not feel too bright in dark themes.
