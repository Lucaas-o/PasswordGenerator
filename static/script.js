/* ============================================================
   Password Generator — Logic
   - Cryptographically secure RNG (crypto.getRandomValues)
   - Guaranteed inclusion of selected character sets
   - Entropy-based strength meter
   - Show / Hide password toggle
   - Session history + one-click .txt download with optional user
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const passwordField = document.getElementById('password');
  const toggleVisibilityBtn = document.getElementById('toggle-visibility');
  const copyButton = document.getElementById('copy-button');
  const lengthInput = document.getElementById('password-length');
  const lengthDisplay = document.getElementById('length-display');
  const lowercaseCheck = document.getElementById('lowercase');
  const uppercaseCheck = document.getElementById('uppercase');
  const numbersCheck = document.getElementById('numbers');
  const symbolsCheck = document.getElementById('symbols');
  const generateButton = document.getElementById('generate-password');
  const regenButton = document.getElementById('regen-button');
  const strengthValue = document.getElementById('strength-value');
  const entropyLabel = document.getElementById('entropy-label');
  const strengthBar = document.getElementById('strength-bar');
  const strengthTrack = strengthBar.parentElement;
  const historyList = document.getElementById('password-history');
  const clearHistoryButton = document.getElementById('clear-history');
  const exportUserInput = document.getElementById('export-user');
  const downloadHistoryBtn = document.getElementById('download-history');
  const themeSwitch = document.getElementById('theme-switch');
  const toast = document.getElementById('toast');
  const srLive = document.getElementById('sr-live');
  const yearSpan = document.getElementById('year');

  const CHAR_SETS = {
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    numbers: '0123456789',
    symbols: '!@#$%^&*(){}[]-_=+'
  };

  let currentPassword = '';
  let isMasked = false;
  const generatedHistory = []; // newest first

  /* ---------- Utilities ---------- */

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

  function secureShuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = secureRandomInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
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
    setTimeout(() => { srLive.textContent = message; }, 50);
  }

  /* ---------- Strength (entropy-based) ---------- */

  function updateStrength(length, poolSize) {
    const entropy = poolSize > 0 ? Math.round(length * Math.log2(poolSize)) : 0;

    let label, cls, pct;
    if (entropy < 55) {
      label = 'Weak'; cls = 'weak'; pct = 33;
    } else if (entropy < 85) {
      label = 'Medium'; cls = 'medium'; pct = 66;
    } else {
      label = 'Strong'; cls = 'strong'; pct = 100;
    }

    strengthValue.textContent = label;
    strengthValue.className = cls;
    entropyLabel.textContent = `(${entropy} bits)`;
    strengthBar.className = 'strength-bar ' + cls;
    strengthBar.style.width = pct + '%';
    strengthTrack.setAttribute('aria-valuenow', String(pct));
  }

  /* ---------- Display & History ---------- */

  function renderPasswordField() {
    passwordField.value = isMasked
      ? '•'.repeat(Math.min(currentPassword.length, 24))
      : currentPassword;
  }

  function renderHistory() {
    historyList.innerHTML = '';
    generatedHistory.forEach((pwd) => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = isMasked ? '•'.repeat(Math.min(pwd.length, 18)) : pwd;
      li.appendChild(span);
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');
      li.setAttribute('aria-label', 'Copy this password');

      const reCopy = () => {
        currentPassword = pwd;
        renderPasswordField();
        copyToClipboard(pwd);
      };

      li.addEventListener('click', reCopy);
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          reCopy();
        }
      });

      historyList.appendChild(li);
    });
  }

  function addToHistory(password) {
    if (!password || generatedHistory[0] === password) return;
    generatedHistory.unshift(password);
    if (generatedHistory.length > 20) {
      generatedHistory.pop();
    }
    renderHistory();
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

  function getSelectedSets() {
    const sets = [];
    if (lowercaseCheck.checked) sets.push(CHAR_SETS.lowercase);
    if (uppercaseCheck.checked) sets.push(CHAR_SETS.uppercase);
    if (numbersCheck.checked) sets.push(CHAR_SETS.numbers);
    if (symbolsCheck.checked) sets.push(CHAR_SETS.symbols);
    return sets;
  }

  function generatePassword(addHistory = true) {
    const length = parseInt(lengthInput.value, 10);
    const sets = getSelectedSets();

    if (sets.length === 0) {
      currentPassword = '';
      renderPasswordField();
      updateStrength(0, 0);
      showToast('Select at least one character type');
      return;
    }

    const pool = sets.join('');
    const chars = [];

    // Guarantee at least 1 character from each selected set
    const guaranteed = Math.min(sets.length, length);
    for (let i = 0; i < guaranteed; i++) {
      const set = sets[i];
      chars.push(set[secureRandomInt(set.length)]);
    }

    for (let i = guaranteed; i < length; i++) {
      chars.push(pool[secureRandomInt(pool.length)]);
    }

    currentPassword = secureShuffle(chars).join('');
    renderPasswordField();

    passwordField.classList.remove('regen');
    void passwordField.offsetWidth;
    passwordField.classList.add('regen');

    updateStrength(length, pool.length);
    if (addHistory) addToHistory(currentPassword);
    announce('New ' + strengthValue.textContent.toLowerCase() + ' password generated, ' + length + ' characters');
  }

  /* ---------- Export (.txt) ---------- */

  function downloadHistoryTxt() {
    const listToExport = generatedHistory.length > 0
      ? generatedHistory
      : (currentPassword ? [currentPassword] : []);

    if (listToExport.length === 0) {
      showToast('No passwords to download');
      return;
    }

    const userValue = exportUserInput.value.trim();
    const lines = [];

    if (userValue) {
      lines.push(`user: ${userValue}`);
    }
    lines.push('passwords:');
    listToExport.forEach((pwd) => lines.push(pwd));

    const content = lines.join('\n') + '\n';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'passwords.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Downloaded passwords.txt');
  }

  /* ---------- Events ---------- */

  toggleVisibilityBtn.addEventListener('click', () => {
    isMasked = !isMasked;
    toggleVisibilityBtn.setAttribute('aria-pressed', String(isMasked));
    toggleVisibilityBtn.setAttribute('aria-label', isMasked ? 'Show password' : 'Hide password');
    renderPasswordField();
    renderHistory();
  });

  lengthInput.addEventListener('input', () => {
    lengthDisplay.textContent = lengthInput.value;
    generatePassword(false);
  });

  lengthInput.addEventListener('change', () => addToHistory(currentPassword));

  [lowercaseCheck, uppercaseCheck, numbersCheck, symbolsCheck].forEach((box) => {
    box.addEventListener('change', () => generatePassword(true));
  });

  generateButton.addEventListener('click', () => generatePassword(true));
  regenButton.addEventListener('click', () => generatePassword(true));
  copyButton.addEventListener('click', () => copyToClipboard(currentPassword));

  clearHistoryButton.addEventListener('click', () => {
    generatedHistory.length = 0;
    renderHistory();
    showToast('History cleared');
  });

  downloadHistoryBtn.addEventListener('click', downloadHistoryTxt);

  /* ---------- Theme ---------- */

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const isDark = theme === 'dark';
    themeSwitch.setAttribute('aria-pressed', String(isDark));
    themeSwitch.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // Ignore storage errors
    }
  }

  themeSwitch.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(next);
  });

  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem('theme');
  } catch {
    savedTheme = null;
  }

  if (savedTheme === 'light' || savedTheme === 'dark') {
    setTheme(savedTheme);
  } else {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
  }

  /* ---------- Init ---------- */
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
  generatePassword(true);
});