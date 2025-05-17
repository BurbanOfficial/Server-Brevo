// -----------------------------
// INITIALISATION FIREBASE
// -----------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDb4AOtRT7jGENnLZ2KNwpczaG2Z77G2rc",
  authDomain: "burban-fidelity.firebaseapp.com",
  projectId: "burban-fidelity",
  storageBucket: "burban-fidelity.firebasestorage.app",
  messagingSenderId: "830299174800",
  appId: "1:830299174800:web:f50a4ec419e108f7f16515",
  measurementId: "G-E4QD4PYLM5"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// -----------------------------
// TOGGLE MOT DE PASSE
// -----------------------------
function togglePassword(el, inputId) {
  const input = document.getElementById(inputId);
  const isPwd = input.type === 'password';
  input.type = isPwd ? 'text' : 'password';
  el.innerHTML = isPwd
    ? '<i class="fa-solid fa-eye"></i>'
    : '<i class="fa-solid fa-eye-low-vision"></i>';
}

// -----------------------------
// SWITCH LOGIN / REGISTER
// -----------------------------
function switchForm(form) {
  document.querySelectorAll('.form').forEach(f => f.classList.remove('active'));
  document.getElementById(`${form}-form`).classList.add('active');
}

// -----------------------------
// MODALES GÉNÉRIQUES
// -----------------------------
function openModal(idSuffix) {
  document.getElementById(`modal-${idSuffix}`).classList.add('show');
}
function closeModal(idSuffix) {
  document.getElementById(`modal-${idSuffix}`).classList.remove('show');
}

// Compatibilité anciennes fonctions
function openResetModal()  { openModal('reset-email'); }
function closeResetModal() { closeModal('reset-email'); }

// -----------------------------
// LOGIN / REGISTER FIREBASE
// -----------------------------
function login(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  auth.signInWithEmailAndPassword(email, password)
    .then(uc => {
      if (!uc.user.emailVerified) throw new Error('Veuillez vérifier votre email.');
      window.location.href = 'client.html';
    })
    .catch(err => alert(err.message));
}

function register(event) {
  event.preventDefault();
  const prenom = document.getElementById('prenom').value.trim();
  const nom    = document.getElementById('nom').value.trim();
  const email  = document.getElementById('register-email').value;
  const pwd    = document.getElementById('register-password').value;
  const phone  = document.getElementById('phone').value;
  const dob    = document.getElementById('dob').value;
  const news   = document.getElementById('newsletter').checked;

  auth.createUserWithEmailAndPassword(email, pwd)
    .then(uc => uc.user.updateProfile({ displayName: `${prenom} ${nom}` })
      .then(() => uc.user.sendEmailVerification({ url: window.location.href }))
    )
    .then(() => {
      alert('Email de confirmation envoyé. (Lien valide 15 min.)');
      switchForm('login');
    })
    .catch(err => alert(err.message));
}

// -----------------------------
// RÉINITIALISATION MOT DE PASSE EN 2 ÉTAPES (OTP)
// -----------------------------
let resetEmail = '';
let resetTimer = null;

// Étape 1 : envoi du code OTP
async function startPasswordReset(e) {
  e.preventDefault();
  resetEmail = document.getElementById('reset-email-input').value.trim();
  if (!resetEmail) return alert('Veuillez saisir une adresse email.');

  try {
    const res = await fetch('https://VOTRE-SERVICE.onrender.com/api/send-reset-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resetEmail })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Échec de l’envoi.');

    openModal('reset-code');
    generateCodeInputs();
    startResendCountdown();
  } catch (err) {
    alert("Impossible d'envoyer le code : " + err.message);
  }
}

// Création des 6 cases
function generateCodeInputs() {
  const ctn = document.getElementById('code-inputs');
  ctn.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.inputMode = 'numeric';
    inp.maxLength = 1;
    inp.classList.add('code-input');
    inp.addEventListener('input', onCodeInput);
    inp.addEventListener('keydown', onCodeKeyDown);
    ctn.appendChild(inp);
  }
  ctn.querySelector('input').focus();
}

// Auto‐focus et backspace global
function onCodeInput(e) {
  const inp = e.target;
  if (/^\d$/.test(inp.value) && inp.nextElementSibling) {
    inp.nextElementSibling.focus();
  }
  checkAndSubmitCode();
}
function onCodeKeyDown(e) {
  if (e.key === 'Backspace' && !e.target.value && e.target.previousElementSibling) {
    e.preventDefault();
    e.target.previousElementSibling.value = '';
    e.target.previousElementSibling.focus();
  }
}

// Récupérer la saisie complète
function getCodeValue() {
  return [...document.querySelectorAll('.code-input')]
    .map(i => i.value).join('');
}

// Étape 2 : vérification OTP
async function checkAndSubmitCode() {
  const code = getCodeValue();
  if (code.length === 6) {
    document.getElementById('spinner').style.display = 'block';
    try {
      const res = await fetch('https://server-brevo.onrender.com/api/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code })
      });
      const data = await res.json();
      onCodeVerified(data.valid);
    } catch {
      onCodeVerified(false);
    }
  }
}

// Gestion du résultat
function onCodeVerified(valid) {
  document.getElementById('spinner').style.display = 'none';
  const msg = document.getElementById('reset-message');
  if (valid) {
    msg.style.color = 'green';
    msg.textContent = 'Code validé ! Redirection…';
    setTimeout(() => window.location.href = 'nouveau-mot-de-passe.html', 2000);
  } else {
    msg.style.color = 'red';
    msg.textContent = 'Code incorrect. Réessayez.';
    generateCodeInputs();
  }
}

// Timer et renvoi du code
function startResendCountdown() {
  let t = 30;
  const timerEl = document.getElementById('timer');
  const btn     = document.getElementById('resend-btn');
  btn.disabled = true;
  timerEl.textContent = t;
  btn.innerHTML = `Renvoyer le code (<span id="timer">${t}</span>s)`;

  resetTimer = setInterval(() => {
    t--;
    timerEl.textContent = t;
    if (t <= 0) {
      clearInterval(resetTimer);
      btn.disabled = false;
      btn.textContent = 'Renvoyer le code';
    }
  }, 1000);
}
function resendCode() {
  startResendCountdown();
  document.getElementById('reset-message').textContent = '';
  generateCodeInputs();
}
