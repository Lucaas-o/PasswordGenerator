document.addEventListener('DOMContentLoaded', () => {
  const passwordField = document.getElementById('password');
  const lengthInput = document.getElementById('password-length');
  const lengthDisplay = document.getElementById('length-display');
  const copyButton = document.getElementById('copy-button');
  const generateButton = document.getElementById('generate-password');
  const uppercaseCheck = document.getElementById('uppercase');
  const numbersCheck = document.getElementById('numbers');
  const symbolsCheck = document.getElementById('symbols');
  const strengthValue = document.getElementById('strength-value');
  const historyList = document.getElementById('password-history');
  const clearHistoryButton = document.getElementById('clear-history');
  const themeSwitch = document.getElementById('theme-switch');
  const moonIcon = document.querySelector('.moon');
  const sunIcon = document.querySelector('.sun');

  function updateStrength(length) {
      if (length < 12) {
          strengthValue.textContent = 'Weak';
          strengthValue.className = 'weak';
      } else if (length < 20) {
          strengthValue.textContent = 'Medium';
          strengthValue.className = 'medium';
      } else {
          strengthValue.textContent = 'Strong';
          strengthValue.className = 'strong';
      }
  }

  function addToHistory(password) {
      const li = document.createElement('li');
      li.textContent = password;
      li.addEventListener('click', () => {
          passwordField.value = password;
          navigator.clipboard.writeText(password);
          alert('Password copied to clipboard!');
      });
      historyList.insertBefore(li, historyList.firstChild);
      if (historyList.children.length > 5) {
          historyList.removeChild(historyList.lastChild);
      }
  }

  function generatePassword() {
      const length = parseInt(lengthInput.value);
      let characters = 'abcdefghijklmnopqrstuvwxyz';
      if (uppercaseCheck.checked) characters += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (numbersCheck.checked) characters += '0123456789';
      if (symbolsCheck.checked) characters += '!@#$%^&*(){}[]';

      let password = '';
      for (let i = 0; i < length; i++) {
          password += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      passwordField.value = password;
      passwordField.classList.add('regen');
      setTimeout(() => passwordField.classList.remove('regen'), 500);
      updateStrength(length);
      addToHistory(password);
  }

  lengthInput.addEventListener('input', () => {
      lengthDisplay.textContent = lengthInput.value;
  });

  generateButton.addEventListener('click', generatePassword);
  copyButton.addEventListener('click', () => {
      navigator.clipboard.writeText(passwordField.value);
      alert('Password has been copied to clipboard!');
  });

  clearHistoryButton.addEventListener('click', () => {
      while (historyList.firstChild) {
          historyList.removeChild(historyList.firstChild);
      }
  });

  themeSwitch.addEventListener('change', () => {
      document.body.classList.toggle('dark');
      if (document.body.classList.contains('dark')) {
          moonIcon.style.display = 'none';
          sunIcon.style.display = 'block';
      } else {
          moonIcon.style.display = 'block';
          sunIcon.style.display = 'none';
      }
  });

  // Generate a random password on page load
  generatePassword();
});