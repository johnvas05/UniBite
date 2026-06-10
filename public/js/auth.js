// Session state + login/register view (A1-A3)
let currentUser = null;

async function refreshMe() {
  currentUser = await api('/auth/me');
  renderNav();
}

function renderAuthView(container) {
  let mode = 'login';

  const title = el('h2', {}, 'Σύνδεση');
  const username = el('input', { type: 'text', placeholder: 'Όνομα χρήστη', required: '', autocomplete: 'username' });
  const displayName = el('input', { type: 'text', placeholder: 'Ονοματεπώνυμο', autocomplete: 'name' });
  const password = el('input', { type: 'password', placeholder: 'Κωδικός', required: '', autocomplete: 'current-password' });
  const submit = el('button', { type: 'submit', class: 'btn primary' }, 'Σύνδεση');
  const toggle = el('a', { href: '#' }, 'Δεν έχετε λογαριασμό; Εγγραφείτε');

  const nameRow = el('div', { class: 'form-row hidden' }, displayName);

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    mode = mode === 'login' ? 'register' : 'login';
    const isLogin = mode === 'login';
    title.textContent = isLogin ? 'Σύνδεση' : 'Εγγραφή';
    submit.textContent = isLogin ? 'Σύνδεση' : 'Εγγραφή';
    toggle.textContent = isLogin ? 'Δεν έχετε λογαριασμό; Εγγραφείτε' : 'Έχετε ήδη λογαριασμό; Συνδεθείτε';
    nameRow.classList.toggle('hidden', isLogin);
  });

  const form = el('form', { class: 'auth-form card' },
    title,
    el('div', { class: 'form-row' }, username),
    nameRow,
    el('div', { class: 'form-row' }, password),
    submit,
    el('p', { class: 'muted' }, toggle),
    el('p', { class: 'muted small' }, 'Νέοι χρήστες ξεκινούν με 5 πόντους 🎁')
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const body = { username: username.value, password: password.value };
      if (mode === 'register') body.display_name = displayName.value;
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
