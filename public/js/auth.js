// Session state + login/register view (A1-A3)
let currentUser = null;

async function refreshMe() {
  currentUser = await api('/auth/me');
  renderNav();
}

function renderAuthView(container) {
  let mode = 'login';
  let emailTaken = false;

  const title = el('h2', { class: 'auth-title' }, 'Καλώς ήρθες ξανά! 👋');
  const subtitle = el('p', { class: 'auth-sub' }, 'Συνδέσου για να μοιραστείς ή να βρεις σπιτικό φαγητό.');

  // --- fields ---
  const identifier = el('input', { type: 'text', placeholder: 'π.χ. maria@mail.ntua.gr', required: '', autocomplete: 'username' });
  const firstName = el('input', { type: 'text', placeholder: 'π.χ. Μαρία', autocomplete: 'given-name' });
  const lastName = el('input', { type: 'text', placeholder: 'π.χ. Παπαδοπούλου', autocomplete: 'family-name' });
  const email = el('input', { type: 'email', placeholder: 'π.χ. maria@mail.ntua.gr', autocomplete: 'email' });
  const emailHint = el('p', { class: 'field-hint hidden' });
  const password = el('input', { type: 'password', placeholder: 'Τουλάχιστον 6 χαρακτήρες', required: '', minlength: '6', autocomplete: 'current-password' });
  const passwordRepeat = el('input', { type: 'password', placeholder: 'Ξαναγράψε τον κωδικό', autocomplete: 'new-password' });
  const repeatHint = el('p', { class: 'field-hint hidden' });

  const submit = el('button', { type: 'submit', class: 'btn primary big' }, 'Σύνδεση');
  const toggle = el('a', { href: '#' }, 'Δεν έχεις λογαριασμό; Φτιάξε έναν εδώ ✨');

  const identifierRow = el('div', { class: 'form-row' }, el('label', {}, 'Email ή όνομα χρήστη'), identifier);
  const nameRow = el('div', { class: 'form-row hidden' }, el('label', {}, 'Όνομα'), firstName);
  const surnameRow = el('div', { class: 'form-row hidden' }, el('label', {}, 'Επώνυμο'), lastName);
  const emailRow = el('div', { class: 'form-row hidden' }, el('label', {}, 'Email'), email, emailHint);
  const passwordRow = el('div', { class: 'form-row' }, el('label', {}, 'Κωδικός'), password);
  const repeatRow = el('div', { class: 'form-row hidden' }, el('label', {}, 'Επανάληψη κωδικού'), passwordRepeat, repeatHint);

  // --- live email duplicate check (debounced) ---
  let emailTimer;
  email.addEventListener('input', () => {
    clearTimeout(emailTimer);
    emailTaken = false;
    email.classList.remove('invalid');
    emailHint.classList.add('hidden');
    const value = email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return;
    emailTimer = setTimeout(async () => {
      try {
        const { available } = await api('/auth/check-email?email=' + encodeURIComponent(value));
        emailTaken = !available;
        email.classList.toggle('invalid', emailTaken);
        emailHint.textContent = emailTaken
          ? 'Αυτό το email χρησιμοποιείται ήδη 😕'
          : '✓ Το email είναι διαθέσιμο';
        emailHint.classList.remove('hidden');
        emailHint.classList.toggle('error', emailTaken);
        emailHint.classList.toggle('ok', !emailTaken);
      } catch { /* η φόρμα θα ελεγχθεί ξανά στο submit */ }
    }, 400);
  });

  // --- live password match check ---
  function checkMatch() {
    if (mode !== 'register' || !passwordRepeat.value) {
      repeatHint.classList.add('hidden');
      passwordRepeat.classList.remove('invalid');
      return;
    }
    const match = password.value === passwordRepeat.value;
    repeatHint.textContent = match ? '✓ Οι κωδικοί ταιριάζουν' : 'Οι κωδικοί δεν ταιριάζουν';
    repeatHint.classList.remove('hidden');
    repeatHint.classList.toggle('error', !match);
    repeatHint.classList.toggle('ok', match);
    passwordRepeat.classList.toggle('invalid', !match);
  }
  password.addEventListener('input', checkMatch);
  passwordRepeat.addEventListener('input', checkMatch);

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    mode = mode === 'login' ? 'register' : 'login';
    const isLogin = mode === 'login';
    title.textContent = isLogin ? 'Καλώς ήρθες ξανά! 👋' : 'Χαίρομαι που σε γνωρίζω! 🌱';
    subtitle.textContent = isLogin
      ? 'Συνδέσου για να μοιραστείς ή να βρεις σπιτικό φαγητό.'
      : 'Λίγα στοιχεία και είσαι έτοιμος/η — ξεκινάς με 5 πόντους δώρο 🎁';
    submit.textContent = isLogin ? 'Σύνδεση' : 'Δημιουργία λογαριασμού';
    toggle.textContent = isLogin
      ? 'Δεν έχεις λογαριασμό; Φτιάξε έναν εδώ ✨'
      : 'Έχεις ήδη λογαριασμό; Συνδέσου';
    identifierRow.classList.toggle('hidden', !isLogin);
    nameRow.classList.toggle('hidden', isLogin);
    surnameRow.classList.toggle('hidden', isLogin);
    emailRow.classList.toggle('hidden', isLogin);
    repeatRow.classList.toggle('hidden', isLogin);
    // a hidden required field blocks submit — required must follow the visible mode
    for (const [field, neededIn] of [
      [identifier, 'login'], [firstName, 'register'], [lastName, 'register'],
      [email, 'register'], [passwordRepeat, 'register'],
    ]) {
      if (mode === neededIn) field.setAttribute('required', '');
      else field.removeAttribute('required');
    }
    password.setAttribute('autocomplete', isLogin ? 'current-password' : 'new-password');
    checkMatch();
  });

  const form = el('form', { class: 'auth-form card' },
    el('div', { class: 'auth-emoji' }, '🍲'),
    title,
    subtitle,
    identifierRow,
    nameRow,
    surnameRow,
    emailRow,
    passwordRow,
    repeatRow,
    submit,
    el('p', { class: 'muted center' }, toggle)
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      let body;
      if (mode === 'register') {
        if (emailTaken) return toast('Αυτό το email χρησιμοποιείται ήδη', true);
        if (password.value !== passwordRepeat.value) return toast('Οι κωδικοί δεν ταιριάζουν', true);
        body = {
          email: email.value,
          first_name: firstName.value,
          last_name: lastName.value,
          password: password.value,
          password_repeat: passwordRepeat.value,
        };
      } else {
        body = { username: identifier.value, password: password.value };
      }
      currentUser = await api(`/auth/${mode}`, { method: 'POST', body });
      renderNav();
      toast(`Καλώς ήρθες, ${currentUser.display_name}! 🧡`);
      navigate('feed');
    } catch (err) {
      toast(err.message, true);
    }
  });

  container.append(el('div', { class: 'auth-wrap' }, form));
}

function renderUserBox() {
  const box = document.getElementById('user-box');
  box.innerHTML = '';
  if (!currentUser) {
    box.append(el('button', { class: 'btn primary', onclick: () => navigate('auth') }, 'Σύνδεση'));
    return;
  }
  box.append(
    el('span', { class: 'points-badge', title: 'Οι πόντοι σας' }, `⭐ ${currentUser.points}`),
    el('span', { class: 'user-name' }, currentUser.display_name),
    el('button', {
      class: 'btn ghost',
      onclick: async () => {
        await api('/auth/logout', { method: 'POST' });
        currentUser = null;
        renderNav();
        navigate('feed');
      },
    }, 'Αποσύνδεση')
  );
}
