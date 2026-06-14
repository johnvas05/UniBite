// Client-side view router — swaps views in <main> without page reloads (E1)
// Each view carries an icon + short label for the mobile bottom tab bar.
const VIEWS = {
  home: { render: renderHomeView, public: true, hidden: true },
  feed: { label: 'Αγγελίες', short: 'Αγγελίες', icon: 'utensils', render: renderFeedView, public: true },
  mine: { label: 'Οι αγγελίες μου', short: 'Δικές μου', icon: 'clipboard-list', render: renderMyListingsView },
  inbox: { label: 'Αιτήματα', short: 'Αιτήματα', icon: 'inbox', render: renderInboxView },
  requests: { label: 'Οι κρατήσεις μου', short: 'Κρατήσεις', icon: 'ticket', render: renderMyRequestsView },
  admin: { label: 'Στατιστικά', short: 'Στατιστικά', icon: 'chart-column', render: renderAdminView, adminOnly: true },
  profile: { label: 'Προφίλ', short: 'Προφίλ', icon: 'user', render: renderProfileView, hidden: true },
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
      ? [el('span', { class: 'nav-icon' }, icon(view.icon, { size: 22 })), el('span', { class: 'nav-short' }, view.short)]
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
  // Logged in → profile & logout live in the top-right dropdown (all sizes).
  // Logged out → a Σύνδεση tab in the bottom bar (topbar login button is hidden on mobile).
  if (!currentUser) {
    const login = el('a', { href: '#', class: 'nav-link' },
      el('span', { class: 'nav-icon' }, icon('user', { size: 22 })), el('span', { class: 'nav-short' }, 'Σύνδεση'));
    login.addEventListener('click', (e) => { e.preventDefault(); navigate('auth'); });
    bottom.append(login);
  }
  // the footer "Σύνδεση" link is irrelevant once logged in
  const footerAuth = document.querySelector('.footer-links a[data-view="auth"]');
  if (footerAuth) footerAuth.classList.toggle('hidden', !!currentUser);
  renderUserBox();
}

const brandEl = document.querySelector('.brand');
brandEl.append(...brandContent());
brandEl.addEventListener('click', (e) => {
  e.preventDefault();
  navigate(currentUser ? 'feed' : 'home');
});

// Close the top-right user dropdown on any outside click (installed once).
document.addEventListener('click', () => {
  document.querySelectorAll('.user-dropdown:not(.hidden)').forEach((m) => m.classList.add('hidden'));
  document.querySelectorAll('.user-trigger.open').forEach((t) => t.classList.remove('open'));
});

// Footer: route its links through the SPA and stamp the current year.
document.querySelector('.site-footer').addEventListener('click', (e) => {
  const link = e.target.closest('a[data-view]');
  if (link) { e.preventDefault(); navigate(link.dataset.view); }
});
document.querySelector('.footer-year').textContent = new Date().getFullYear();

// Re-fit the visible Leaflet map after viewport changes (rotation, resize)
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => window.activeMap && window.activeMap.invalidateSize(), 150);
});

(async function init() {
  await refreshMe();
  navigate(currentUser ? 'feed' : 'home');
})();
