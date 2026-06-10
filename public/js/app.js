// Client-side view router — swaps views in <main> without page reloads (E1)
// Each view carries an icon + short label for the mobile bottom tab bar.
const VIEWS = {
  feed: { label: 'Αγγελίες', short: 'Αγγελίες', icon: '🍽️', render: renderFeedView, public: true },
  mine: { label: 'Οι αγγελίες μου', short: 'Δικές μου', icon: '📋', render: renderMyListingsView },
  inbox: { label: 'Αιτήματα', short: 'Αιτήματα', icon: '📥', render: renderInboxView },
  requests: { label: 'Οι κρατήσεις μου', short: 'Κρατήσεις', icon: '🎟️', render: renderMyRequestsView },
  admin: { label: 'Στατιστικά', short: 'Στατιστικά', icon: '📊', render: renderAdminView, adminOnly: true },
  auth: { render: renderAuthView, public: true, hidden: true },
  listingForm: { render: renderListingFormView, hidden: true },
};

let currentView = null;

function navigate(name, params) {
  const view = VIEWS[name];
  if (!view) return;
  if (!view.public && !currentUser) return navigate('auth');
  currentView = name;
  document.querySelectorAll('.nav-link').forEach((a) =>
    a.classList.toggle('active', a.dataset.view === name)
  );
  const main = document.getElementById('view');
  main.innerHTML = '';
  window.scrollTo(0, 0);
  view.render(main, params);
}

// Build one nav link; the "bottom" variant stacks an icon over a short label.
function navLink(name, view, variant) {
  const link = el('a', { href: '#', class: 'nav-link', 'data-view': name },
    ...(variant === 'bottom'
      ? [el('span', { class: 'nav-icon' }, view.icon), el('span', { class: 'nav-short' }, view.short)]
      : [view.label]));
  link.addEventListener('click', (e) => { e.preventDefault(); navigate(name); });
  return link;
}

function renderNav() {
  const top = document.getElementById('main-nav');
  const bottom = document.getElementById('bottom-nav');
  top.innerHTML = '';
  bottom.innerHTML = '';
  for (const [name, view] of Object.entries(VIEWS)) {
    if (view.hidden) continue;
    if (!view.public && !currentUser) continue;
    if (view.adminOnly && (!currentUser || currentUser.role !== 'admin')) continue;
    top.append(navLink(name, view, 'top'));
    bottom.append(navLink(name, view, 'bottom'));
  }
  // login / logout lives in the bottom bar on mobile (topbar buttons are hidden there)
  if (currentUser) {
    const out = el('a', { href: '#', class: 'nav-link' },
      el('span', { class: 'nav-icon' }, '🚪'), el('span', { class: 'nav-short' }, 'Έξοδος'));
    out.addEventListener('click', async (e) => {
      e.preventDefault();
      await api('/auth/logout', { method: 'POST' });
      currentUser = null;
      renderNav();
      navigate('feed');
    });
    bottom.append(out);
  } else {
    const login = el('a', { href: '#', class: 'nav-link' },
      el('span', { class: 'nav-icon' }, '👤'), el('span', { class: 'nav-short' }, 'Σύνδεση'));
    login.addEventListener('click', (e) => { e.preventDefault(); navigate('auth'); });
    bottom.append(login);
  }
  renderUserBox();
}

document.querySelector('.brand').addEventListener('click', (e) => {
  e.preventDefault();
  navigate('feed');
});

// Re-fit the visible Leaflet map after viewport changes (rotation, resize)
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => window.activeMap && window.activeMap.invalidateSize(), 150);
});

(async function init() {
  await refreshMe();
  navigate('feed');
})();
