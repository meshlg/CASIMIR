<div align="center">

# CASIMIR

**Cryptographic Authentication System In Micro Interval Randomness**

[![Greasemonkey](https://img.shields.io/badge/Greasemonkey-Supported-orange.svg)](https://www.greasespot.net/)
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Supported-green.svg)](https://www.tampermonkey.net/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/Version-1.0.0.0358-blue.svg)](CHANGELOG.md)

---

[English](#english) · [Русский (Russian)](./README-ru.md)

</div>

---

<a name="english"></a>

## 📖 Table of Contents

1. [Overview](#-overview)
2. [Features](#-key-features)
3. [Installation](#-installation)
4. [Usage](#-usage)
5. [Security](#-security)
6. [Technologies](#-technologies)
7. [License](#-license)
8. [Author](#-author)

---

## 🚀 Overview

**CASIMIR** is a premium password generator userscript designed for advanced security and true randomness. It leverages quantum mechanics (ANU QRNG) to generate unpredictable sequences, bypassing the limitations of standard pseudo-random number generators.

### What is CASIMIR?

CASIMIR is a browser-based password generator that runs as a userscript (Tampermonkey/Greasemonkey). It provides:

- 🔐 **Military-grade password generation** using quantum entropy
- 📊 **Real-time strength analysis** with entropy calculations
- 🔍 **Breach detection** via Have I Been Pwned API
- 🌐 **Bilingual interface** (English/Russian)
- 🎨 **Modern UI** with dark/light themes

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **Quantum Entropy** | True random numbers from quantum vacuum fluctuations via ANU QRNG API |
| **Perfect Distribution** | Rejection Sampling eliminates modulo bias |
| **Real-time Analysis** | Shannon entropy, GPU crack-time estimation, pattern detection |
| **HIBP Integration** | k-Anonymity protocol checks passwords without revealing them |
| **I18n Support** | Full English and Russian localization |
| **Dual Themes** | Light and dark modes with smooth transitions |
| **Keyboard Shortcuts** | Global hotkey `Alt + C` for quick access |

### Advanced Options

- **Start with letter** — Ensures first character is A-Z or a-z
- **Remove similar characters** — Excludes ambiguous characters (i, l, 1, O, 0, etc.)
- **Unique characters** — No repeated characters in password
- **Custom length** — Adjustable password length

---

## 🛠 Installation

### Prerequisites

- [Tampermonkey](https://www.tampermonkey.net/) (recommended) or
- [Greasemonkey](https://www.greasespot.net/) for Firefox

### Steps

1. Install a userscript manager extension for your browser
2. Click the **Raw** button on `CASIMIR.js` in this repository
3. Your browser will prompt you to install the script
4. Press `Alt + C` on any webpage to open the generator
5. Or look for the CASIMIR icon in the bottom-right corner

---

## 📖 Usage

### Generating a Password

1. Press `Alt + C` or click the floating icon
2. Configure your password options (length, characters, options)
3. Click **Generate**
4. Copy the password using the copy button

### Analyzing a Password

1. Enter any password in the analysis field
2. View real-time metrics:
   - Shannon entropy (bits)
   - Estimated crack time (GPU-based)
   - Pattern detection results
   - HIBP breach status

### Changing Language

Click the language toggle button (EN/RU) in the header to switch between English and Russian.

---

## 🔒 Security

CASIMIR is designed with security as the top priority:

| Principle | Implementation |
|-----------|-----------------|
| **No data collection** | Passwords never leave your browser |
| **k-Anonymity** | Only first 5 chars of SHA-1 hash sent to HIBP |
| **Local storage** | Settings saved locally in browser |
| **No network calls** | Quantum random numbers are optional |
| **IFrame protection** | Script only runs in main window |

### What CASIMIR Doesn't Protect Against

- **Phishing** — Always verify website URLs
- **Keyloggers** — Use hardware security keys
- **Cookie hijacking** — Enable 2FA everywhere
- **Social engineering** — Stay vigilant

---

## 🛠 Technologies

- **JavaScript (ES6+)** — Core functionality
- **Web Crypto API** — SHA-1 hashing for HIBP
- **ANU QRNG API** — Quantum random number generation
- **Have I Been Pwned API** — Breach detection
- **CSS3** — Modern styling with animations

---

## 📄 License

This project is licensed under the **MIT License**.

See the [LICENSE](LICENSE) file for full details.

---

## 👤 Author

**Created with ❤️ by [meshlg](https://github.com/meshlg)**

---

<div align="center">

*[Back to top](#casimir)*

</div>
