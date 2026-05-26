# Password Generator

A secure, modern password generator that runs entirely in your browser. Uses cryptographically strong random values, provides entropy‑based strength feedback, and includes a clean dark mode.

## Features

- **Secure generation** – powered by `crypto.getRandomValues()`
- **Customizable** – length (8–32), uppercase, numbers, symbols
- **Entropy strength meter** – visual bar + text (Weak / Medium / Strong)
- **Copy to clipboard** – one click, with toast confirmation
- **Password history** – last 5 passwords, click any to re‑copy
- **Regenerate button** – quick new password without changing settings
- **Dark / Light theme** – persists your preference
- **Responsive** – works on desktop, tablet, and mobile
- **No dependencies** – vanilla HTML/CSS/JS

## How to Use

1. **Adjust length** – drag the slider (8–32 characters)
2. **Choose character types** – check/uncheck uppercase, numbers, symbols  
   *(at least one must be selected)*
3. **Generate** – click “Generate new password” or the refresh icon  
   – the password appears instantly, and the strength meter updates
4. **Copy** – click the “Copy” button (a toast confirms it)
5. **Reuse old passwords** – click any password in the history list to copy it again  
6. **Clear history** – use the “Clear” button
7. **Toggle dark mode** – click the sun/moon icon in the header

## Local Usage

Clone and open `index.html` – no build step required.

```bash
git clone https://github.com/Lucaas-o/PasswordGenerator.git
cd PasswordGenerator
open index.html
```

## Live Demo

[https://lucaas-o.github.io/PasswordGenerator/](https://lucaas-o.github.io/PasswordGenerator/)

## License

MIT – feel free to use and modify.