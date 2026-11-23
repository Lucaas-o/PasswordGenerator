# VaultPass — Password Generator & Local Vault

A modern, fast, and privacy-first password generator and local browser vault built with vanilla HTML, CSS, and JavaScript. It generates cryptographically secure passwords, evaluates entropy in real time, and lets you organize credentials locally with optional AES-GCM session encryption.

## Features

- **Cryptographically secure generation** – powered by `crypto.getRandomValues()` with unbiased rejection sampling and Fisher–Yates shuffling.
- **Customizable rules** – adjustable length (`8–64` characters) and toggles for lowercase, uppercase, numbers, and symbols, guaranteeing at least one character from each selected category.
- **Real-time strength & entropy analysis** – visual progress indicator with exact bit-entropy calculation (`Weak` / `Medium` / `Strong`).
- **One-click copy & visibility toggle** – copy generated or saved passwords with toast confirmation, or mask/unmask secrets at any time.
- **Local password vault** – save, search, reveal, copy, edit, and delete credentials directly in your browser (`localStorage`).
- **Optional AES-GCM session encryption** – protect stored passwords using Web Crypto (`PBKDF2` + `AES-GCM-256`) with a session passphrase.
- **Session history** – keeps your last 5 generated passwords during the active session for quick re-copying.
- **Dark & light themes** – automatically adapts to your OS preference and remembers your manual toggle.
- **Zero dependencies & 100% client-side** – no frameworks, no build steps, and no external servers.

## Security & Privacy Notice

- **100% local execution:** No passwords or metadata are ever transmitted over the network.
- **Browser storage limitations:** Saving credentials in `localStorage` is convenient for personal or low-risk workflows, even with optional AES-GCM encryption. However, browser storage remains vulnerable if an attacker gains XSS access to the page or physical access to an unlocked device. For critical accounts, always use a dedicated, audited password manager.

## Project Structure

```text
PasswordGenerator/
├── index.html
├── LICENSE
├── README.md
└── static/
    ├── styles.css
    └── script.js
```

## Local Usage

Clone and open `index.html` — no build step required:

```bash
git clone https://github.com/Lucaas-o/PasswordGenerator.git
cd PasswordGenerator
open index.html
```

## Live Demo

[https://lucaas-o.github.io/PasswordGenerator/](https://lucaas-o.github.io/PasswordGenerator/)

## License

This project is licensed under the [MIT License](LICENSE).
