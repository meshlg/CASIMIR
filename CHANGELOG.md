# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1.1132] - 2026-02-24

### Added

- CSP-safe style injection via constructable stylesheets (`adoptedStyleSheets`) for host and shadow DOM styling.
- Fail-closed mount behavior when Shadow DOM/style injection is unavailable or blocked.
- Localized `hide_btn` labels for RU/EN and consistent analysis toggle localization.

### Fixed

- Removed modulo bias in quantum/API-assisted generation by using rejection sampling end-to-end.
- Eliminated sensitive HIBP diagnostic leakage from logs/UI; breach checks now expose only safe result fields.
- Restored robust dictionary fallback to `COMMON_PASSWORDS` when dictionary decode fails.
- Corrected recommendation grouping for dictionary and leetspeak findings.
- Unified symbol alphabet size calculations through shared `SYMBOL_CHARSET` usage.
- Hardened Shadow DOM initialization against monkeypatched/hijacked `attachShadow` behavior.
- Resolved analysis toggle localization update issues on language switch.
- Fixed hidden-panel visual artifact: ambient glow accents no longer remain visible when panel is closed.

### Changed

- Refined UI visual system for light/dark themes: updated tokens, depth, panel/header styling, buttons, and analysis blocks.
- Improved panel atmosphere with subtle decorative gradients while preserving responsive layout and existing logic.

## [1.0.0.0358] - 2026-02-21

### Initial release

- **Quantum Entropy**: Optional true random number generation using quantum vacuum fluctuations via Australian National University (ANU QRNG) API
- **Perfect Distribution**: Rejection Sampling method to eliminate modulo bias, ensuring equal probability for every character
- **Real-time Strength Analysis**: Shannon entropy calculation, GPU crack-time estimation, and pattern detection (sequences, leetspeak, dictionary words)
- **HIBP Integration**: Local SHA-1 hashing with k-Anonymity protocol (first 5 characters of hash) to check against billions of leaked passwords without revealing the full password
- **Premium UI**: Fully responsive dual-column layout with dark/light themes, smooth animations, and keyboard shortcuts
- **Internationalization (i18n)**: Full localization in English and Russian with auto-detection from browser locale
- **Generation Options**:
  - Start with letter option (ensures first character is A-Z, a-z)
  - Remove similar characters (i, l, 1, L, o, 0, O)
  - Unique characters mode (no repetitions)
- **Visual Feedback**:
  - Crack time block animations (red pulse for weak passwords, quantum neon glow for 120+ bit entropy)
  - Dark/Light theme toggle with persistence
- **Stealth Launch Modes**:
  - Global hotkey: `Alt + C` to toggle panel
  - Tampermonkey menu integration
  - Floating button visibility toggle
- **Security Info Accordion**: Educational content about attack vectors outside password responsibility (phishing, keyloggers, cookie hijacking, timing attacks)

### Fixed

- IFrame duplication prevention (UI only injects into main/parent window)
- HIBP API regex parser fixed for `\r\n` line ending issues
- Input field clearing logic (separate fields for generated vs manual input)
- UI density optimization for horizontal panel
- Percentage display rounding (whole integers only)
- Crack time display now shows offline fast GPU estimation by default
- Leetspeak detection threshold scales dynamically with password length

### Changed

- Default theme changed to light mode (with toggle to dark)
- UI redesign from vertical to responsive horizontal dual-column layout on desktop
- Analysis section stays visible by default on desktop
