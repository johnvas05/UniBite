// Client-side view router — swaps views in <main> without page reloads (E1)
const VIEWS = {
  feed: { label: 'Αγγελίες', render: renderFeedView, public: true },
  mine: { label: 'Οι αγγελίες μου', render: renderMyListingsView },
  inbox: { label: 'Αιτήματα', render: renderInboxView },
  requests: { label: 'Οι κρατήσεις μου', render: renderMyRequestsView },
  admin: { label: 'Στατιστικά', render: renderAdminView, adminOnly: true },
  auth: { render: renderAuthView, public: true, hidden: true },
  listingForm: { render: renderListingFormView, hidden: true },
};

let currentView = null;

function navigate(name, params) {
  const view = VIEWS[name];
  if (!view) return;
  if (!view.public && !currentUser) return navigate('auth');
  currentView = name;
  document.querySelectorAll('.main-nav a').forEach((a) =>
    a.classList.toggle('active', a.dataset.view === name)
  );
  const main = document.getElementById('view');
  main.innerHTML = '';
  view.render(main, params);
}

function renderNav() {
  const nav = document.getElementById('main-nav');
  nav.innerHTML = '';
  for (const [name, view] of Object.entries(VIEWS)) {
    if (view.hidden) continue;
    if (!view.public && !currentUser) continue;
    if (view.adminOnly && (!currentUser || currentUser.role !== 'admin')) continue;
    const link = el('a', { href: '#', 'data-view': name }, view.label);
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(name);
    });
    nav.append(link);
  }
  renderUserBox();
}

document.querySelector('.brand').addEventListener('click', (e) => {
  e.preventDefault();
  navigate('feed');
});

(async function init() {
  await refreshMe();
  navigate('feed');
})();
