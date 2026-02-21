<div align="center">

# CASIMIR

**Cryptographic Authentication System In Micro Interval Randomness**

[Русский](README-ru.md) | [English](README.md)

<p align="center">
  <a href="https://greasyfork.org/en/scripts/566920-casimir-cryptographic-authentication-system-in-micro-interval-randomness"><img src="https://img.shields.io/badge/Greasy%20Fork-Install-blue" alt="Greasy Fork"></a>
  <a href="https://www.tampermonkey.net/"><img src="https://img.shields.io/badge/Tampermonkey-Supported-green" alt="Tampermonkey"></a>
  <a href="https://www.greasespot.net/"><img src="https://img.shields.io/badge/Greasemonkey-Supported-orange" alt="Greasemonkey"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/meshlg/CASIMIR" alt="License"></a>
  <a href="CHANGELOG.md"><img src="https://img.shields.io/badge/Version-1.0.0.0358-blue" alt="Version"></a>
  <br>
  <a href="https://github.com/meshlg/CASIMIR/stargazers"><img src="https://img.shields.io/github/stars/meshlg/CASIMIR?style=social" alt="GitHub Stars"></a>
  <a href="https://github.com/meshlg/CASIMIR/network"><img src="https://img.shields.io/github/forks/meshlg/CASIMIR?style=social" alt="GitHub Forks"></a>
  <a href="https://github.com/meshlg/CASIMIR/issues"><img src="https://img.shields.io/github/issues/meshlg/CASIMIR" alt="GitHub Issues"></a>
</p>

<p><em>Premium password generator userscript with quantum entropy, advanced analysis, and HIBP breach detection.</em></p>

<p>
  <a href="#quick-start"><kbd>Quick Start</kbd></a>
  <a href="#features"><kbd>Features</kbd></a>
  <a href="#security"><kbd>Security</kbd></a>
  <a href="#installation"><kbd>Installation</kbd></a>
</p>

<div align="center">
  <sub>Quantum entropy | Real-time analysis | HIBP integration | Bilingual UI</sub>
</div>

</div>

---

![CASIMIR Interface](assets/screenshot.jpg)

## About

**CASIMIR** is a professional password generator userscript designed for advanced security and true randomness. It leverages quantum mechanics (ANU QRNG) to generate unpredictable sequences, bypassing the limitations of standard pseudo-random number generators.

### Key Benefits

| Benefit | Description |
|---------|-------------|
| **Quantum entropy** | True random numbers from quantum vacuum fluctuations via ANU QRNG API |
| **Perfect distribution** | Rejection Sampling eliminates modulo bias |
| **Real-time analysis** | Shannon entropy, GPU crack-time estimation, pattern detection |
| **HIBP integration** | k-Anonymity protocol checks passwords without revealing them |
| **Bilingual interface** | Full English and Russian localization |
| **Dual themes** | Light and dark modes with smooth transitions |

### Who is this for

- **Security enthusiasts** - generating cryptographically strong passwords
- **Developers** - testing password strength and breach status
- **Privacy advocates** - local generation without data collection
- **General users** - everyday password creation with professional quality

---

## Quick Start

> [!IMPORTANT]
> A userscript manager is required: [Tampermonkey](https://www.tampermonkey.net/) (recommended) or [Greasemonkey](https://www.greasespot.net/) for Firefox.

### Installation

1. Install a userscript manager extension for your browser - <a href="https://greasyfork.org/en/scripts/566920-casimir-cryptographic-authentication-system-in-micro-interval-randomness"><img src="https://img.shields.io/badge/Greasy%20Fork-Install-blue" alt="Greasy Fork"></a>
2. Click the **Raw** button on `CASIMIR.js` in this repository
3. Your browser will prompt you to install the script
4. Press `Alt + C` on any webpage to open the generator
5. Or look for the CASIMIR icon in the bottom-right corner

---

## Features

### Password Generation

| Feature | Description |
|---------|-------------|
| **Quantum entropy** | Optional true random numbers via ANU QRNG API |
| **Customizable length** | Adjustable password length |
| **Character sets** | Uppercase, lowercase, numbers, symbols |
| **Start with letter** | Ensures first character is A-Z or a-z |
| **Remove similar** | Excludes ambiguous characters (i, l, 1, O, 0, etc.) |
| **Unique characters** | No repeated characters in password |

### Real-time Analysis

- **Shannon entropy** - password strength in bits
- **GPU crack-time** - estimated time to crack on modern hardware
- **Pattern detection** - sequences, leetspeak, dictionary words
- **Complexity score** - percentage rating with visual feedback

### HIBP Integration

- Local SHA-1 hashing with k-Anonymity protocol
- Only first 5 characters of hash sent to API
- Checks against billions of leaked passwords
- No full password ever transmitted

### User Interface

- **Dual themes** - Light and dark modes
- **Responsive layout** - Works on all screen sizes
- **Keyboard shortcuts** - `Alt + C` for quick access
- **Language toggle** - EN/RU switch in header
- **Visual feedback** - Animations for password strength

---

## Security

> [!WARNING]
> CASIMIR operates entirely in your browser. Your passwords are never sent anywhere except for the k-Anonymity check (first 5 chars of hash).

### Security Principles

| Principle | Implementation |
|-----------|-----------------|
| **No data collection** | Passwords never leave your browser |
| **k-Anonymity** | Only first 5 chars of SHA-1 hash sent to HIBP |
| **Local storage** | Settings saved locally in browser |
| **No network calls** | Quantum random numbers are optional |
| **IFrame protection** | Script only runs in main window |

### What CASIMIR Does NOT Protect Against

| Threat | Recommendation |
|--------|----------------|
| **Phishing** | Always verify website URLs |
| **Keyloggers** | Use hardware security keys |
| **Cookie hijacking** | Enable 2FA everywhere |
| **Social engineering** | Stay vigilant |

---

## Installation

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

## Usage

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

## Technologies

- **JavaScript (ES6+)** - Core functionality
- **Web Crypto API** - SHA-1 hashing for HIBP
- **ANU QRNG API** - Quantum random number generation
- **Have I Been Pwned API** - Breach detection
- **CSS3** - Modern styling with animations

---

## FAQ

### How does quantum entropy work?

CASIMIR optionally fetches true random numbers from the Australian National University's Quantum Random Number Generator (QRNG) API. These numbers are derived from measurements of quantum vacuum fluctuations, providing genuine unpredictability.

### Is it safe to use HIBP check?

Yes. CASIMIR uses the k-Anonymity protocol: only the first 5 characters of your password's SHA-1 hash are sent to the API. The full password never leaves your browser.

### Why use Rejection Sampling?

Standard modulo-based random selection introduces bias. Rejection Sampling ensures every character has exactly equal probability of being selected.

### Can I use this offline?

Yes. Quantum entropy is optional. Without it, CASIMIR uses the browser's built-in crypto.getRandomValues() which is still cryptographically secure.

### How do I report a bug?

Open an issue on [GitHub Issues](https://github.com/meshlg/CASIMIR/issues/new/choose).

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## License

MIT License. See [LICENSE](LICENSE) file for details.

---

<div align="center">

**[MIT License](LICENSE)** | 2026 c meshlg  
[Report an issue](https://github.com/meshlg/CASIMIR/issues/new/choose) | [Star the repo](https://github.com/meshlg/CASIMIR/stargazers)

</div>
