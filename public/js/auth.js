// Session state + login/register view (A1-A3)
let currentUser = null;

async function refreshMe() {
  currentUser = await api('/auth/me');
  renderNav();
}

function renderAuthView(container) {
  let mode = 'login';
  let emailTaken = false;

  const title = el('h2', { class: 'auth-title' }, 'Καλώς ήρθες ξανά!');
  const subtitle = el('p', { class: 'auth-sub' }, 'Συνδέσου για να μοιραστείς ή να βρεις σπιτικό φαγητό.');

  // --- fields ---
  const identifier = el('input', { type: 'text', placeholder: 'π.χ. maria@mail.ntua.gr', required: '', autocomplete: 'username' });
  const firstName = el('input', { type: 'text', placeholder: 'π.χ. Μαρία', autocomplete: 'given-name' });
  const lastName = el('input', { type: 'text', placeholder: 'π.χ. Παπαδοπούλου', autocomplete: 'family-name' });
  const email = el('input', { type: 'email', placeholder: 'π.χ. maria@mail.ntua.gr', autocomplete: 'email' });
  const emailHint = el('p', { class: 'field-hint hidden' });
  const phone = el('input', { type: 'tel', placeholder: 'π.χ. 6941234567', autocomplete: 'tel', pattern: '[+]?[0-9 -]{8,18}', title: '8-15 ψηφία, προαιρετικά με + στην αρχή' });
  const password = el('input', { type: 'password', placeholder: 'Τουλάχιστον 6 χαρακτήρες', required: '', minlength: '6', autocomplete: 'current-password' });
  const passwordRepeat = el('input', { type: 'password', placeholder: 'Ξαναγράψε τον κωδικό', autocomplete: 'new-password' });
  const repeatHint = el('p', { class: 'field-hint hidden' });

  const submit = el('button', { type: 'submit', class: 'btn primary big' }, 'Σύνδεση');
  const toggle = el('a', { href: '#' }, 'Δεν έχεις λογαριασμό; Φτιάξε έναν εδώ');

  const identifierRow = el('div', { class: 'form-row' }, el('label', {}, 'Email ή όνομα χρήστη'), identifier);
  const nameRow = el('div', { class: 'form-pair hidden' },
    el('div', { class: 'form-row' }, el('label', {}, 'Όνομα'), firstName),
    el('div', { class: 'form-row' }, el('label', {}, 'Επώνυμο'), lastName)
  );
  const emailRow = el('div', { class: 'form-row hidden' }, el('label', {}, 'Email'), email, emailHint);
  const phoneRow = el('div', { class: 'form-row hidden' }, el('label', {}, 'Τηλέφωνο'), phone);
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
          ? 'Αυτό το email χρησιμοποιείται ήδη'
          : 'Το email είναι διαθέσιμο';
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
    repeatHint.textContent = match ? 'Οι κωδικοί ταιριάζουν' : 'Οι κωδικοί δεν ταιριάζουν';
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
    title.textContent = isLogin ? 'Καλώς ήρθες ξανά!' : 'Χαίρομαι που σε γνωρίζω!';
    subtitle.textContent = isLogin
      ? 'Συνδέσου για να μοιραστείς ή να βρεις σπιτικό φαγητό.'
      : 'Λίγα στοιχεία και είσαι έτοιμος/η — ξεκινάς με 5 πόντους δώρο.';
    submit.textContent = isLogin ? 'Σύνδεση' : 'Δημιουργία λογαριασμού';
    toggle.textContent = isLogin
      ? 'Δεν έχεις λογαριασμό; Φτιάξε έναν εδώ'
      : 'Έχεις ήδη λογαριασμό; Συνδέσου';
    identifierRow.classList.toggle('hidden', !isLogin);
    nameRow.classList.toggle('hidden', isLogin);
    emailRow.classList.toggle('hidden', isLogin);
    phoneRow.classList.toggle('hidden', isLogin);
    repeatRow.classList.toggle('hidden', isLogin);
    // a hidden required field blocks submit — required must follow the visible mode
    for (const [field, neededIn] of [
      [identifier, 'login'], [firstName, 'register'], [lastName, 'register'],
      [email, 'register'], [phone, 'register'], [passwordRepeat, 'register'],
    ]) {
      if (mode === neededIn) field.setAttribute('required', '');
      else field.removeAttribute('required');
    }
    password.setAttribute('autocomplete', isLogin ? 'current-password' : 'new-password');
    checkMatch();
  });

  const form = el('form', { class: 'auth-form card' },
    el('div', { class: 'auth-emoji' }, icon('soup', { size: 34 })),
    title,
    subtitle,
    identifierRow,
    nameRow,
    emailRow,
    phoneRow,
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
          phone: phone.value,
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
      toast(`Καλώς ήρθες, ${currentUser.display_name}!`);
      navigate('feed');
    } catch (err) {
      toast(err.message, true);
    }
  });

  container.append(el('div', { class: 'auth-wrap' }, form));
}

async function doLogout() {
  await api('/auth/logout', { method: 'POST' });
  currentUser = null;
  renderNav();
  navigate('home');
}

function dropdownItem(iconName, label, onClick, danger) {
  return el('button', { class: 'dropdown-item' + (danger ? ' danger' : ''), onclick: onClick },
    icon(iconName, { size: 18 }), label);
}

// Top-right: points badge + a user menu (avatar/name → Προφίλ, Αποσύνδεση).
function renderUserBox() {
  const box = document.getElementById('user-box');
  box.innerHTML = '';
  if (!currentUser) {
    box.append(el('button', { class: 'btn primary', onclick: () => navigate('auth') }, 'Σύνδεση'));
    return;
  }
  const points = el('span', { class: 'points-badge', title: 'Οι πόντοι σας' },
    icon('star', { size: 14, fill: true }), ` ${currentUser.points}`);

  const menu = el('div', { class: 'user-dropdown hidden' },
    el('div', { class: 'dropdown-head' },
      avatarNode(currentUser),
      el('div', { class: 'dropdown-head-text' },
        el('div', { class: 'dropdown-name' }, currentUser.display_name),
        el('div', { class: 'muted small' }, currentUser.email))),
    el('div', { class: 'dropdown-sep' }),
    dropdownItem('user', 'Το προφίλ μου', () => navigate('profile')),
    dropdownItem('log-out', 'Αποσύνδεση', doLogout, true)
  );
  const trigger = el('button', { class: 'user-trigger', 'aria-haspopup': 'true' },
    avatarNode(currentUser),
    el('span', { class: 'user-name' }, currentUser.display_name),
    icon('chevron-down', { size: 16, cls: 'chev' })
  );
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const nowHidden = menu.classList.toggle('hidden');
    trigger.classList.toggle('open', !nowHidden);
  });

  box.append(points, el('div', { class: 'user-menu' }, trigger, menu));
}

// Profile view: account details + activity summary, with an inline edit mode.
function renderProfileView(container) {
  container.append(el('h2', {}, 'Το προφίλ μου'));
  const wrap = el('div', { class: 'profile-wrap' });
  container.append(wrap);

  function load() {
    wrap.innerHTML = '';
    api('/auth/profile').then((p) => { if (p) renderView(p); }).catch((err) => toast(err.message, true));
  }

  function renderView(p) {
    wrap.innerHTML = '';
    const since = p.created_at ? new Date(p.created_at).toLocaleDateString('el-GR', { year: 'numeric', month: 'long' }) : '—';
    const s = p.stats || {};
    wrap.append(
      el('div', { class: 'card profile-card' },
        el('div', { class: 'profile-head' },
          avatarNode(p, 'avatar-lg'),
          el('div', { class: 'profile-head-text' },
            el('h3', { class: 'profile-name' }, p.display_name),
            el('span', { class: 'role-badge ' + p.role }, p.role === 'admin' ? 'Διαχειριστής' : 'Φοιτητής/τρια')
          ),
          el('button', { class: 'btn with-icon', onclick: () => renderEdit(p) }, icon('pencil'), 'Επεξεργασία')
        ),
        el('div', { class: 'profile-fields' },
          profileField('mail', 'Email', p.email),
          profileField('phone', 'Τηλέφωνο', p.phone || '—'),
          profileField('star', 'Πόντοι', String(p.points)),
          profileField('calendar', 'Μέλος από', since)
        )
      ),
      el('div', { class: 'stats-row' },
        profileStat('clipboard-list', s.listings_count ?? 0, 'Αγγελίες'),
        profileStat('package-check', s.portions_given ?? 0, 'Μερίδες που πρόσφερα'),
        profileStat('star', s.avg_rating ?? '—', 'Μέση βαθμολογία'),
        profileStat('ticket', s.reservations_made ?? 0, 'Κρατήσεις μου')
      )
    );
  }

  function renderEdit(p) {
    wrap.innerHTML = '';
    const firstName = el('input', { type: 'text', value: p.first_name, required: '', autocomplete: 'given-name' });
    const lastName = el('input', { type: 'text', value: p.last_name, required: '', autocomplete: 'family-name' });
    const fileInput = el('input', { type: 'file', accept: 'image/*' });
    const previewWrap = el('div', { class: 'avatar-edit' }, avatarNode(p, 'avatar-lg'));

    fileInput.addEventListener('change', () => {
      const f = fileInput.files[0];
      if (!f) return;
      previewWrap.innerHTML = '';
      previewWrap.append(el('img', { src: URL.createObjectURL(f), class: 'avatar avatar-lg avatar-img', alt: '' }));
    });

    const form = el('form', { class: 'card profile-card' },
      el('div', { class: 'profile-head' },
        previewWrap,
        el('div', { class: 'profile-head-text' },
          el('label', { class: 'btn with-icon file-btn' }, icon('pencil'), 'Αλλαγή φωτογραφίας', fileInput),
          el('p', { class: 'muted small' }, 'JPG ή PNG, έως 5MB'))
      ),
      el('div', { class: 'form-pair' },
        el('div', { class: 'form-row' }, el('label', {}, 'Όνομα'), firstName),
        el('div', { class: 'form-row' }, el('label', {}, 'Επώνυμο'), lastName)
      ),
      el('div', { class: 'form-actions' },
        el('button', { type: 'submit', class: 'btn primary' }, 'Αποθήκευση'),
        el('button', { type: 'button', class: 'btn', onclick: () => renderView(p) }, 'Ακύρωση')
      )
    );

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!firstName.value.trim() || !lastName.value.trim()) return toast('Συμπληρώστε όνομα και επώνυμο', true);
      const data = new FormData();
      data.append('first_name', firstName.value);
      data.append('last_name', lastName.value);
      if (fileInput.files[0]) data.append('avatar', fileInput.files[0]);
      try {
        currentUser = await api('/auth/profile', { method: 'PUT', body: data });
        renderNav(); // refresh topbar avatar + name
        toast('Το προφίλ ενημερώθηκε');
        load();
      } catch (err) {
        toast(err.message, true);
      }
    });
    wrap.append(form);
  }

  function profileField(iconName, label, value) {
    return el('div', { class: 'profile-field' },
      el('span', { class: 'pf-icon' }, icon(iconName, { size: 18 })),
      el('div', {},
        el('div', { class: 'pf-label muted small' }, label),
        el('div', { class: 'pf-value' }, value))
    );
  }
  function profileStat(iconName, value, label) {
    return el('div', { class: 'card stat-card' },
      el('div', { class: 'stat-icon' }, icon(iconName, { size: 28 })),
      el('div', { class: 'stat-value' }, String(value)),
      el('div', { class: 'muted small' }, label)
    );
  }

  load();
}
