/* ============================================================
   VaultPass — Generator & Local Vault Logic
   - Cryptographically secure generation via crypto.getRandomValues
   - Guaranteed inclusion of selected character types
   - Entropy-based strength calculation
   - Local vault CRUD + search + optional AES-GCM session encryption
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'vaultpass.entries.v1';
  const THEME_KEY = 'vaultpass.theme.v1';

  const CHAR_SETS = {
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    numbers: '0123456789',
    symbols: '!@#$%^&*()-_=+[]{};:,.?'
  };

  // Generator elements
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
  const quickSaveBtn = document.getElementById('quick-save-btn');
  const strengthValue = document.getElementById('strength-value');
  const entropyLabel = document.getElementById('entropy-label');
  const strengthBar = document.getElementById('strength-bar');
  const strengthTrack = strengthBar.parentElement;
  const historyList = document.getElementById('password-history');
  const clearHistoryButton = document.getElementById('clear-history');

  // Vault elements
  const vaultCount = document.getElementById('vault-count');
  const masterKeyInput = document.getElementById('master-key-input');
  const applyKeyBtn = document.getElementById('apply-key-btn');
  const lockKeyBtn = document.getElementById('lock-key-btn');
  const encryptionStatus = document.getElementById('encryption-status');
  const vaultForm = document.getElementById('vault-form');
  const editingIdInput = document.getElementById('editing-id');
  const entryLabelInput = document.getElementById('entry-label');
  const entryUsernameInput = document.getElementById('entry-username');
  const entryPasswordInput = document.getElementById('entry-password');
  const useGeneratedBtn = document.getElementById('use-generated-btn');
  const saveEntryBtn = document.getElementById('save-entry-btn');
  const saveEntryText = document.getElementById('save-entry-text');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  const vaultSearchInput = document.getElementById('vault-search');
  const clearVaultBtn = document.getElementById('clear-vault-btn');
  const vaultList = document.getElementById('vault-list');

  // Shared UI elements
  const themeSwitch = document.getElementById('theme-switch');
  const toast = document.getElementById('toast');
  const srLive = document.getElementById('sr-live');
  const yearSpan = document.getElementById('year');

  // State
  let currentPassword = '';
  let isPasswordMasked = false;
  let sessionPassphrase = '';
  const revealedEntryIds = new Set();

  /* ---------- Utilities ---------- */

  function secureRandomInt(max) {
    if (max <= 0) return 0;
    const limit = Math.floor(0x100000000 / max) * max;
    const buf = new Uint32Array(1);
    let value;
    do {
      crypto.getRandomValues(buf);
      value = buf[0];
    } while (value >= limit);
    return value % max;
  }

  function secureShuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = secureRandomInt(i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
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

  function createId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now() + '-' + secureRandomInt(100000);
  }

  /* ---------- Strength & Generation ---------- */

  function getSelectedSets() {
    const sets = [];
    if (lowercaseCheck.checked) sets.push(CHAR_SETS.lowercase);
    if (uppercaseCheck.checked) sets.push(CHAR_SETS.uppercase);
    if (numbersCheck.checked) sets.push(CHAR_SETS.numbers);
    if (symbolsCheck.checked) sets.push(CHAR_SETS.symbols);
    return sets;
  }

  function updateStrength(length, poolSize) {
    const entropy = poolSize > 0 ? Math.round(length * Math.log2(poolSize)) : 0;

    let label;
    let cls;
    let pct;

    if (entropy < 55) {
      label = 'Weak';
      cls = 'weak';
      pct = 33;
    } else if (entropy < 85) {
      label = 'Medium';
      cls = 'medium';
      pct = 66;
    } else {
      label = 'Strong';
      cls = 'strong';
      pct = 100;
    }

    strengthValue.textContent = label;
    strengthValue.className = cls;
    entropyLabel.textContent = `(${entropy} bits)`;
    strengthBar.className = 'strength-bar ' + cls;
    strengthBar.style.width = pct + '%';
    strengthTrack.setAttribute('aria-valuenow', String(pct));
  }

  function renderGeneratedPasswordDisplay() {
    passwordField.value = isPasswordMasked
      ? '•'.repeat(Math.min(currentPassword.length, 24))
      : currentPassword;
  }

  function generatePassword(options = { recordHistory: true }) {
    const length = parseInt(lengthInput.value, 10);
    const sets = getSelectedSets();

    if (sets.length === 0) {
      currentPassword = '';
      renderGeneratedPasswordDisplay();
      updateStrength(0, 0);
      showToast('Select at least one character set');
      return;
    }

    const pool = sets.join('');
    const chars = [];

    // Ensure at least one character from each selected set
    const guaranteedCount = Math.min(sets.length, length);
    for (let i = 0; i < guaranteedCount; i++) {
      const set = sets[i];
      chars.push(set[secureRandomInt(set.length)]);
    }

    for (let i = guaranteedCount; i < length; i++) {
      chars.push(pool[secureRandomInt(pool.length)]);
    }

    currentPassword = secureShuffle(chars).join('');
    renderGeneratedPasswordDisplay();

    passwordField.classList.remove('regen');
    void passwordField.offsetWidth;
    passwordField.classList.add('regen');

    updateStrength(length, pool.length);

    if (options.recordHistory && currentPassword) {
      addToHistory(currentPassword);
    }

    announce(`Generated ${strengthValue.textContent.toLowerCase()} password of ${length} characters`);
  }

  function addToHistory(password) {
    const latest = historyList.firstElementChild?.dataset.value;
    if (latest === password) return;

    const li = document.createElement('li');
    li.dataset.value = password;
    li.setAttribute('role', 'button');
    li.setAttribute('tabindex', '0');
    li.setAttribute('aria-label', 'Copy password from session history');

    const span = document.createElement('span');
    span.textContent = isPasswordMasked ? '•'.repeat(Math.min(password.length, 18)) : password;

    const tag = document.createElement('span');
    tag.className = 'history-copy-tag';
    tag.textContent = 'Copy';

    li.append(span, tag);

    const handleCopy = () => copyToClipboard(password);
    li.addEventListener('click', handleCopy);
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCopy();
      }
    });

    historyList.insertBefore(li, historyList.firstChild);
    while (historyList.children.length > 5) {
      historyList.removeChild(historyList.lastChild);
    }
  }

  /* ---------- Clipboard ---------- */

  function copyToClipboard(text) {
    if (!text) {
      showToast('Nothing to copy');
      return;
    }

    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      showToast('Clipboard unavailable in this context');
      return;
    }

    navigator.clipboard.writeText(text)
      .then(() => {
        showToast('Copied to clipboard');
        copyButton.classList.add('copied');
        setTimeout(() => copyButton.classList.remove('copied'), 900);
      })
      .catch(() => {
        showToast('Could not copy automatically');
      });
  }

  /* ---------- Local Encryption (Web Crypto AES-GCM) ---------- */

  function toBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function fromBase64(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  async function deriveAesKey(passphrase, saltBytes) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: 120000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptSecret(plainText, passphrase) {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveAesKey(passphrase, salt);
    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plainText)
    );

    return {
      encrypted: true,
      salt: toBase64(salt),
      iv: toBase64(iv),
      data: toBase64(new Uint8Array(cipherBuffer))
    };
  }

  async function decryptSecret(payload, passphrase) {
    const decoder = new TextDecoder();
    const salt = fromBase64(payload.salt);
    const iv = fromBase64(payload.iv);
    const cipherBytes = fromBase64(payload.data);
    const key = await deriveAesKey(passphrase, salt);
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherBytes
    );
    return decoder.decode(plainBuffer);
  }

  function updateEncryptionBadge() {
    if (sessionPassphrase) {
      encryptionStatus.textContent = 'Session AES-GCM active';
      encryptionStatus.classList.add('encrypted');
    } else {
      encryptionStatus.textContent = 'Unencrypted local storage';
      encryptionStatus.classList.remove('encrypted');
    }
  }

  /* ---------- Vault Storage & CRUD ---------- */

  function readRawEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeRawEntries(entries) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      return true;
    } catch {
      showToast('Storage full or unavailable');
      return false;
    }
  }

  async function resolveEntryPassword(entry) {
    if (!entry.secret || typeof entry.secret === 'string') {
      return { value: entry.secret || '', locked: false };
    }
    if (!sessionPassphrase) {
      return { value: '', locked: true };
    }
    try {
      const plain = await decryptSecret(entry.secret, sessionPassphrase);
      return { value: plain, locked: false };
    } catch {
      return { value: '', locked: true, wrongKey: true };
    }
  }

  async function formatSecretForStorage(plainPassword) {
    if (!sessionPassphrase) return plainPassword;
    return encryptSecret(plainPassword, sessionPassphrase);
  }

  function resetVaultForm() {
    editingIdInput.value = '';
    entryLabelInput.value = '';
    entryUsernameInput.value = '';
    entryPasswordInput.value = '';
    saveEntryText.textContent = 'Save to Vault';
    cancelEditBtn.classList.add('hidden');
  }

  async function renderVault() {
    const allEntries = readRawEntries();
    const query = vaultSearchInput.value.trim().toLowerCase();

    const filtered = allEntries.filter((item) => {
      if (!query) return true;
      const labelMatch = (item.label || '').toLowerCase().includes(query);
      const userMatch = (item.username || '').toLowerCase().includes(query);
      return labelMatch || userMatch;
    });

    vaultCount.textContent = `${allEntries.length} ${allEntries.length === 1 ? 'item' : 'items'}`;
    vaultList.innerHTML = '';

    if (filtered.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'vault-empty';
      empty.textContent = query
        ? 'No saved passwords match your search.'
        : 'Your local vault is empty. Save a password above to get started.';
      vaultList.appendChild(empty);
      return;
    }

    for (const item of filtered) {
      const li = document.createElement('li');
      li.className = 'vault-item';

      const info = document.createElement('div');
      info.className = 'vault-item-info';

      const title = document.createElement('div');
      title.className = 'vault-item-title';
      title.textContent = item.label;

      const sub = document.createElement('div');
      sub.className = 'vault-item-sub';
      sub.textContent = item.username || 'No username specified';

      const secretLine = document.createElement('div');
      secretLine.className = 'vault-item-secret';

      const resolved = await resolveEntryPassword(item);
      const isRevealed = revealedEntryIds.has(item.id);

      if (resolved.locked) {
        secretLine.textContent = resolved.wrongKey
          ? 'Locked — wrong session key'
          : 'Encrypted — enter session key to unlock';
      } else if (isRevealed) {
        secretLine.textContent = resolved.value;
      } else {
        secretLine.textContent = '•'.repeat(Math.min(Math.max(resolved.value.length, 8), 18));
      }

      info.append(title, sub, secretLine);

      const actions = document.createElement('div');
      actions.className = 'vault-item-actions';

      const revealBtn = document.createElement('button');
      revealBtn.type = 'button';
      revealBtn.className = 'item-btn';
      revealBtn.textContent = isRevealed ? 'Hide' : 'Show';
      revealBtn.addEventListener('click', () => {
        if (resolved.locked) {
          showToast('Enter the session encryption key first');
          return;
        }
        if (revealedEntryIds.has(item.id)) {
          revealedEntryIds.delete(item.id);
        } else {
          revealedEntryIds.add(item.id);
        }
        renderVault();
      });

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'item-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.addEventListener('click', () => {
        if (resolved.locked) {
          showToast('Enter the session encryption key first');
          return;
        }
        copyToClipboard(resolved.value);
      });

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'item-btn';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => {
        if (resolved.locked) {
          showToast('Unlock with session key before editing');
          return;
        }
        editingIdInput.value = item.id;
        entryLabelInput.value = item.label;
        entryUsernameInput.value = item.username || '';
        entryPasswordInput.value = resolved.value;
        saveEntryText.textContent = 'Update Entry';
        cancelEditBtn.classList.remove('hidden');
        entryLabelInput.focus();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'item-btn delete';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => {
        const updated = readRawEntries().filter((entry) => entry.id !== item.id);
        revealedEntryIds.delete(item.id);
        if (editingIdInput.value === item.id) resetVaultForm();
        if (writeRawEntries(updated)) {
          renderVault();
          showToast('Entry deleted');
        }
      });

      actions.append(revealBtn, copyBtn, editBtn, deleteBtn);
      li.append(info, actions);
      vaultList.appendChild(li);
    }
  }

  /* ---------- Event Listeners ---------- */

  toggleVisibilityBtn.addEventListener('click', () => {
    isPasswordMasked = !isPasswordMasked;
    toggleVisibilityBtn.setAttribute('aria-pressed', String(isPasswordMasked));
    toggleVisibilityBtn.setAttribute('aria-label', isPasswordMasked ? 'Show password' : 'Hide password');
    renderGeneratedPasswordDisplay();
  });

  lengthInput.addEventListener('input', () => {
    lengthDisplay.textContent = lengthInput.value;
    generatePassword({ recordHistory: false });
  });

  lengthInput.addEventListener('change', () => {
    if (currentPassword) addToHistory(currentPassword);
  });

  [lowercaseCheck, uppercaseCheck, numbersCheck, symbolsCheck].forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      generatePassword({ recordHistory: true });
    });
  });

  generateButton.addEventListener('click', () => generatePassword({ recordHistory: true }));
  regenButton.addEventListener('click', () => generatePassword({ recordHistory: true }));
  copyButton.addEventListener('click', () => copyToClipboard(currentPassword));

  quickSaveBtn.addEventListener('click', () => {
    if (!currentPassword) {
      showToast('Generate a password first');
      return;
    }
    entryPasswordInput.value = currentPassword;
    if (!entryLabelInput.value.trim()) {
      entryLabelInput.value = 'Generated Credential';
    }
    vaultForm.requestSubmit();
  });

  clearHistoryButton.addEventListener('click', () => {
    historyList.innerHTML = '';
    showToast('Session history cleared');
  });

  applyKeyBtn.addEventListener('click', async () => {
    const candidate = masterKeyInput.value;
    if (!candidate.trim()) {
      showToast('Enter a session passphrase');
      return;
    }

    const entries = readRawEntries();
    sessionPassphrase = candidate;
    updateEncryptionBadge();

    // Migrate any plain entries to encrypted format when enabling a session key
    let migrated = false;
    for (const item of entries) {
      if (typeof item.secret === 'string') {
        item.secret = await encryptSecret(item.secret, sessionPassphrase);
        migrated = true;
      }
    }
    if (migrated) writeRawEntries(entries);

    await renderVault();
    showToast(migrated ? 'Vault encrypted with session key' : 'Session key applied');
  });

  lockKeyBtn.addEventListener('click', async () => {
    sessionPassphrase = '';
    masterKeyInput.value = '';
    revealedEntryIds.clear();
    updateEncryptionBadge();
    await renderVault();
    showToast('Session key cleared');
  });

  useGeneratedBtn.addEventListener('click', () => {
    if (!currentPassword) {
      showToast('No generated password available');
      return;
    }
    entryPasswordInput.value = currentPassword;
    showToast('Generated password inserted');
  });

  cancelEditBtn.addEventListener('click', () => {
    resetVaultForm();
    showToast('Edit cancelled');
  });

  vaultForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const label = entryLabelInput.value.trim();
    const username = entryUsernameInput.value.trim();
    const plainSecret = entryPasswordInput.value;

    if (!label) {
      showToast('Please enter a service or label');
      entryLabelInput.focus();
      return;
    }

    if (!plainSecret) {
      showToast('Please enter or generate a password');
      entryPasswordInput.focus();
      return;
    }

    const entries = readRawEntries();
    const editingId = editingIdInput.value;

    try {
      const storedSecret = await formatSecretForStorage(plainSecret);

      if (editingId) {
        const idx = entries.findIndex((item) => item.id === editingId);
        if (idx !== -1) {
          entries[idx] = {
            ...entries[idx],
            label,
            username,
            secret: storedSecret,
            updatedAt: new Date().toISOString()
          };
        }
        if (writeRawEntries(entries)) {
          resetVaultForm();
          await renderVault();
          showToast('Credential updated');
        }
      } else {
        entries.unshift({
          id: createId(),
          label,
          username,
          secret: storedSecret,
          createdAt: new Date().toISOString()
        });
        if (writeRawEntries(entries)) {
          resetVaultForm();
          await renderVault();
          showToast('Saved to local vault');
        }
      }
    } catch {
      showToast('Error saving credential');
    }
  });

  vaultSearchInput.addEventListener('input', () => {
    renderVault();
  });

  clearVaultBtn.addEventListener('click', async () => {
    const entries = readRawEntries();
    if (entries.length === 0) {
      showToast('Vault is already empty');
      return;
    }
    writeRawEntries([]);
    revealedEntryIds.clear();
    resetVaultForm();
    await renderVault();
    showToast('All saved passwords removed');
  });

  /* ---------- Theme ---------- */

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const isDark = theme === 'dark';
    themeSwitch.setAttribute('aria-pressed', String(isDark));
    themeSwitch.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Ignore storage restrictions
    }
  }

  themeSwitch.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  });

  /* ---------- Init ---------- */

  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem(THEME_KEY);
  } catch {
    savedTheme = null;
  }

  if (savedTheme === 'light' || savedTheme === 'dark') {
    setTheme(savedTheme);
  } else {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
  }

  if (yearSpan) yearSpan.textContent = String(new Date().getFullYear());
  updateEncryptionBadge();
  generatePassword({ recordHistory: true });
  renderVault();
});