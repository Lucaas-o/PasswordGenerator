/* ============================================================
   Password Generator — logic
   Improvements over original:
   - Cryptographically secure RNG (crypto.getRandomValues)
   - Entropy-based strength (length AND character variety)
   - Visual strength bar
   - Toast notifications (replaces alert)
   - Validation guard when no character types selected
   - Clipboard promise error handling
   - Regenerate button + real-time updates
   - data-theme theming with screen-reader announcements
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const passwordField = document.getElementById('password');
  const lengthInput = document.getElementById('password-length');
  const lengthDisplay = document.getElementById('length-display');
  const copyButton = document.getElementById('copy-button');
  const generateButton = document.getElementById('generate-password');
  const regenButton = document.getElementById('regen-button');
  const uppercaseCheck = document.getElementById('uppercase');
  const numbersCheck = document.getElementById('numbers');
  const symbolsCheck = document.getElementById('symbols');
  const strengthValue = document.getElementById('strength-value');
  const strengthBar = document.getElementById('strength-bar');
  const strengthTrack = strengthBar.parentElement;
  const historyList = document.getElementById('password-history');
  const clearHistoryButton = document.getElementById('clear-history');
  const themeSwitch = document.getElementById('theme-switch');
  const toast = document.getElementById('toast');
  const srLive = document.getElementById('sr-live');
  const yearSpan = document.getElementById('year');

  const CHAR_SETS = {
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    numbers: '0123456789',
    symbols: '!@#$%^&*(){}[]'
  };

  /* ---------- Utilities ---------- */

  // Cryptographically secure random integer in [0, max)
  // using rejection sampling to remove modulo bias.
  function secureRandomInt(max) {
    const limit = Math.floor(0xffffffff / max) * max;
    const buf = new Uint32Array(1);
    let value;
    do {
      crypto.getRandomValues(buf);
      value = buf[0];
    } while (value >= limit);
    return value % max;
  }

  let toastTimer;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function announce(message) {
    srLive.textContent = '';
    // Slight delay so screen readers reliably pick up the change
    setTimeout(() => { srLive.textContent = message; }, 50);
  }

  /* ---------- Strength (entropy-based) ---------- */

  function updateStrength(length, poolSize) {
    // Shannon entropy of a random string: length * log2(poolSize)
    const entropy = poolSize > 0 ? length * Math.log2(poolSize) : 0;

    let label, cls, pct;
    if (entropy < 50) {
      label = 'Weak'; cls = 'weak'; pct = 33;
    } else if (entropy < 80) {
      label = 'Medium'; cls = 'medium'; pct = 66;
    } else {
      label = 'Strong'; cls = 'strong'; pct = 100;
    }

    strengthValue.textContent = label;
    strengthValue.className = cls;
    strengthBar.className = 'strength-bar ' + cls;
    strengthBar.style.width = pct + '%';
    strengthTrack.setAttribute('aria-valuenow', String(pct));
  }

  /* ---------- History ---------- */

  function addToHistory(password) {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = password;
    li.appendChild(span);
    li.setAttribute('role', 'button');
    li.setAttribute('tabindex', '0');
    li.setAttribute('aria-label', 'Copy this password');

    const reCopy = () => {
      passwordField.value = password;
      copyToClipboard(password);
    };
    li.addEventListener('click', reCopy);
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); reCopy(); }
    });

    historyList.insertBefore(li, historyList.firstChild);
    if (historyList.children.length > 5) {
      historyList.removeChild(historyList.lastChild);
    }
  }

  /* ---------- Clipboard ---------- */

  function copyToClipboard(text) {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => {
        showToast('Password copied!');
        copyButton.classList.add('copied');
        setTimeout(() => copyButton.classList.remove('copied'), 1000);
      })
      .catch(() => showToast('Copy failed — select and copy manually'));
  }

  /* ---------- Generation ---------- */

  function buildPool() {
    let pool = CHAR_SETS.lowercase; // always included
    if (uppercaseCheck.checked) pool += CHAR_SETS.uppercase;
    if (numbersCheck.checked) pool += CHAR_SETS.numbers;
    if (symbolsCheck.checked) pool += CHAR_SETS.symbols;
    return pool;
  }

  function generatePassword(addHistory = true) {
    const length = parseInt(lengthInput.value, 10);
    const pool = buildPool();

    // Validation guard: lowercase is always on, so pool is never empty here,
    // but we keep the structure defensive in case that changes.
    if (!pool) {
      showToast('Select at least one character type');
      return;
    }

    let password = '';
    for (let i = 0; i < length; i++) {
      password += pool[secureRandomInt(pool.length)];
    }

    passwordField.value = password;
    passwordField.classList.remove('regen');
    // Force reflow so the animation restarts on every generation
    void passwordField.offsetWidth;
    passwordField.classList.add('regen');

    updateStrength(length, pool.length);
    if (addHistory) addToHistory(password);
    announce('New ' + strengthValue.textContent.toLowerCase() + ' password generated, ' + length + ' characters');
  }

  /* ---------- Events ---------- */

  lengthInput.addEventListener('input', () => {
    lengthDisplay.textContent = lengthInput.value;
    // Real-time: update strength immediately; regenerate live without spamming history
    generatePassword(false);
  });
  // Commit one history entry when the user releases the slider
  lengthInput.addEventListener('change', () => addToHistory(passwordField.value));

  [uppercaseCheck, numbersCheck, symbolsCheck].forEach((box) => {
    box.addEventListener('change', () => generatePassword(true));
  });

  generateButton.addEventListener('click', () => generatePassword(true));
  regenButton.addEventListener('click', () => generatePassword(true));
  copyButton.addEventListener('click', () => copyToClipboard(passwordField.value));

  clearHistoryButton.addEventListener('click', () => {
    while (historyList.firstChild) historyList.removeChild(historyList.firstChild);
    showToast('History cleared');
  });

  /* ---------- Theme ---------- */

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const isDark = theme === 'dark';
    themeSwitch.setAttribute('aria-pressed', String(isDark));
    themeSwitch.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  }

  themeSwitch.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(next);
  });

  // Respect the OS preference on first load
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(prefersDark ? 'dark' : 'light');

  /* ---------- Init ---------- */
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
  generatePassword(true);
});
