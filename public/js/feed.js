// Consumer views: feed with list + map (C1), reservations (C2), ratings (C3)
const feedState = { refPoint: null, maxKm: '', limit: '', q: '', sort: 'newest', available: false, exclude: new Set() };

// A labeled control: a small caption that stays visible above the input,
// so the field's description doesn't vanish once you start typing.
function filterField(labelText, controlEl) {
  return el('label', { class: 'filter-field' },
    el('span', { class: 'filter-label' }, labelText), controlEl);
}

const STATUS_LABELS = {
  active: 'Διαθέσιμο',
  inactive: 'Εξαντλήθηκε',
  pending: 'Σε αναμονή',
  approved: 'Εγκρίθηκε',
  rejected: 'Απορρίφθηκε',
  picked_up: 'Παρελήφθη',
  no_show: 'Μη παραλαβή',
};

function renderFeedView(container) {
  const cards = el('div', { class: 'cards-grid' });
  const mapDiv = el('div', { id: 'feed-map', class: 'map' });

  // --- search ---
  const searchInput = el('input', { type: 'search', placeholder: 'Τίτλος, σημειώσεις ή μάγειρας…', value: feedState.q });

  // --- sort ---
  const sortSelect = el('select', {},
    el('option', { value: 'newest' }, 'Νεότερα πρώτα'),
    el('option', { value: 'distance' }, 'Κοντινότερα'),
    el('option', { value: 'rating' }, 'Καλύτερη βαθμολογία'),
    el('option', { value: 'portions' }, 'Περισσότερες μερίδες')
  );
  sortSelect.value = feedState.sort;

  // --- distance ---
  const maxKmSelect = el('select', {},
    el('option', { value: '' }, 'Παντού'),
    ...[1, 2, 5, 10].map((km) => el('option', { value: km }, `Έως ${km} km`))
  );
  maxKmSelect.value = feedState.maxKm;

  // --- max results ---
  const limitInput = el('input', { type: 'number', min: 1, max: 50, placeholder: 'Όλα', value: feedState.limit });

  // --- only available toggle ---
  const availableInput = el('input', { type: 'checkbox' });
  availableInput.checked = feedState.available;
  const availableField = el('label', { class: 'filter-check' },
    availableInput, el('span', {}, 'Μόνο διαθέσιμα'));

  const locBtn = el('button', { class: 'btn with-icon' }, icon('locate-fixed'), 'Η θέση μου');

  // --- exclude allergens (chips, filled async) ---
  const allergenChips = el('div', { class: 'allergen-filter' });
  const hint = el('span', { class: 'muted small feed-hint' },
    feedState.refPoint ? 'Σημείο αναφοράς ορισμένο — μπορείς να ταξινομήσεις κατά απόσταση.' : 'Κάνε κλικ στον χάρτη ή πάτα «Η θέση μου» για ταξινόμηση κατά απόσταση.');

  const controls = el('div', { class: 'feed-controls card' },
    el('div', { class: 'filter-row' },
      filterField('Αναζήτηση', searchInput),
      filterField('Ταξινόμηση', sortSelect),
      filterField('Απόσταση', maxKmSelect),
      filterField('Μέγ. αποτελέσματα', limitInput),
      el('div', { class: 'filter-field' },
        el('span', { class: 'filter-label' }, 'Σημείο αναφοράς'), locBtn),
      el('div', { class: 'filter-field' },
        el('span', { class: 'filter-label' }, 'Διαθεσιμότητα'), availableField)
    ),
    el('div', { class: 'filter-row allergen-row' },
      el('span', { class: 'filter-label' }, 'Χωρίς αλλεργιογόνα'), allergenChips),
    hint
  );

  const pager = el('div', { class: 'pager' });
  container.append(
    el('h2', {}, 'Διαθέσιμα γεύματα'),
    controls,
    el('div', { class: 'feed-layout' }, mapDiv, el('div', { class: 'cards-col' }, cards, pager))
  );

  // build allergen exclusion chips
  api('/allergens').then((allergens) => {
    allergens.forEach((a) => {
      const chip = el('button', { type: 'button', class: 'chip' + (feedState.exclude.has(a.id) ? ' on' : '') }, a.name);
      chip.addEventListener('click', () => {
        if (feedState.exclude.has(a.id)) feedState.exclude.delete(a.id);
        else feedState.exclude.add(a.id);
        chip.classList.toggle('on');
        load();
      });
      allergenChips.append(chip);
    });
  }).catch(() => { allergenChips.remove(); });

  // debounce search typing so we don't hit the API on every keystroke
  let searchTimer;
  searchInput.addEventListener('input', () => {
    feedState.q = searchInput.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(load, 300);
  });
  sortSelect.addEventListener('change', () => { feedState.sort = sortSelect.value; load(); });
  availableInput.addEventListener('change', () => { feedState.available = availableInput.checked; load(); });

  const map = L.map(mapDiv).setView([37.9779, 23.7850], 14);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
  }).addTo(map);
  refreshMap(map);
  let markers = [];
  let refMarker = null;
  let allListings = [];
  let page = 1;
  const PAGE_SIZE = 6;

  function setRefPoint(lat, lng) {
    feedState.refPoint = { lat, lng };
    if (refMarker) refMarker.remove();
    refMarker = L.marker([lat, lng], { opacity: 0.7 }).addTo(map).bindPopup('Σημείο αναφοράς');
    hint.textContent = 'Σημείο αναφοράς ορισμένο — ταξινόμηση κατά απόσταση.';
    if (feedState.sort === 'newest') { feedState.sort = 'distance'; sortSelect.value = 'distance'; }
    load();
  }

  map.on('click', (e) => setRefPoint(e.latlng.lat, e.latlng.lng));
  locBtn.addEventListener('click', () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 14);
        setRefPoint(pos.coords.latitude, pos.coords.longitude);
      },
      () => toast('Δεν ήταν δυνατός ο εντοπισμός θέσης', true)
    );
  });
  maxKmSelect.addEventListener('change', () => { feedState.maxKm = maxKmSelect.value; load(); });
  limitInput.addEventListener('change', () => { feedState.limit = limitInput.value; load(); });

  async function load() {
    const params = new URLSearchParams();
    if (feedState.refPoint) {
      params.set('lat', feedState.refPoint.lat);
      params.set('lng', feedState.refPoint.lng);
      if (feedState.maxKm) params.set('maxKm', feedState.maxKm);
    }
    if (feedState.limit) params.set('limit', feedState.limit);
    if (feedState.q.trim()) params.set('q', feedState.q.trim());
    if (feedState.sort) params.set('sort', feedState.sort);
    if (feedState.available) params.set('available', '1');
    if (feedState.exclude.size) params.set('excludeAllergens', [...feedState.exclude].join(','));
    try {
      const listings = await api('/listings?' + params);
      markers.forEach((m) => m.remove());
      markers = listings.map((l) => {
        const marker = L.circleMarker([l.pickup_lat, l.pickup_lng], {
          radius: 10,
          color: l.status === 'active' ? '#006600' : '#9e9e9e',
          fillOpacity: 0.7,
        }).addTo(map);
        marker.bindPopup(`<b>${l.title}</b><br>${l.pickup_location}<br>${l.status === 'active' ? l.portions_available + ' μερίδες' : 'Εξαντλήθηκε'}`);
        return marker;
      });
      allListings = listings;
      page = 1;
      renderPage();
    } catch (err) {
      toast(err.message, true);
    }
  }

  // Render the current page of cards + the pager. The map shows ALL pins;
  // only the card list is paginated.
  function renderPage() {
    cards.innerHTML = '';
    pager.innerHTML = '';
    const total = allListings.length;
    if (!total) {
      cards.append(el('p', { class: 'muted' }, 'Δεν βρέθηκαν αγγελίες με αυτά τα κριτήρια.'));
      return;
    }
    const pageCount = Math.ceil(total / PAGE_SIZE);
    if (page > pageCount) page = pageCount;
    const start = (page - 1) * PAGE_SIZE;
    allListings.slice(start, start + PAGE_SIZE).forEach((l) => cards.append(listingCard(l, load)));
    renderPager(pageCount, total, start);
  }

  function goToPage(p) {
    page = p;
    renderPage();
    cards.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderPager(pageCount, total, start) {
    const summary = el('span', { class: 'pager-summary muted small' },
      `${start + 1}–${Math.min(start + PAGE_SIZE, total)} από ${total} γεύματα`);
    if (pageCount <= 1) { pager.append(summary); return; }

    const prev = el('button', { class: 'pager-btn', disabled: page === 1 ? '' : null }, icon('chevron-down', { size: 16, cls: 'rot-90' }), 'Προηγ.');
    prev.addEventListener('click', () => page > 1 && goToPage(page - 1));
    const next = el('button', { class: 'pager-btn', disabled: page === pageCount ? '' : null }, 'Επόμ.', icon('chevron-down', { size: 16, cls: 'rot-270' }));
    next.addEventListener('click', () => page < pageCount && goToPage(page + 1));

    const numbers = el('div', { class: 'pager-nums' });
    for (let p = 1; p <= pageCount; p++) {
      const b = el('button', { class: 'pager-num' + (p === page ? ' active' : '') }, String(p));
      b.addEventListener('click', () => p !== page && goToPage(p));
      numbers.append(b);
    }
    pager.append(el('div', { class: 'pager-controls' }, prev, numbers, next), summary);
  }

  load();
}

function listingCard(l, reload) {
  const isMine = currentUser && currentUser.id === l.cook_id;
  const card = el('article', { class: 'card listing-card' + (l.status === 'inactive' ? ' inactive' : '') },
    l.photo_url
      ? el('img', { src: l.photo_url, alt: l.title, class: 'card-photo' })
      : el('div', { class: 'card-photo placeholder' }, icon('utensils-crossed', { size: 42 })),
    el('div', { class: 'card-body' },
      el('div', { class: 'card-top' },
        el('h3', {}, l.title),
        el('span', { class: 'badge ' + l.status }, STATUS_LABELS[l.status] || l.status)
      ),
      el('p', { class: 'muted small cook-line' },
        `από ${l.cook_name}`,
        l.avg_rating ? el('span', { class: 'inline-rating' }, icon('star', { size: 14, fill: true }), ` ${l.avg_rating}`) : null),
      l.notes ? el('p', { class: 'notes' }, l.notes) : null,
      l.allergens ? el('p', { class: 'allergens info-line' }, icon('triangle-alert', { size: 15 }), ' Αλλεργιογόνα: ' + l.allergens) : null,
      el('p', { class: 'small info-line' }, icon('map-pin', { size: 15 }), ' ' + l.pickup_location),
      el('p', { class: 'small info-line' }, icon('clock', { size: 15 }), ' ' + l.pickup_time),
      l.distance_km != null ? el('p', { class: 'small info-line' }, icon('ruler', { size: 15 }), ` ${Number(l.distance_km).toFixed(1)} km`) : null,
      el('p', { class: 'portions' }, l.status === 'active' ? `${l.portions_available} διαθέσιμες μερίδες` : 'Καμία διαθέσιμη μερίδα')
    )
  );
  if (l.status === 'active' && currentUser && !isMine) {
    const btn = el('button', { class: 'btn primary full' }, 'Δέσμευση μερίδας');
    btn.addEventListener('click', async () => {
      try {
        await api('/requests', { method: 'POST', body: { listing_id: l.id } });
        toast('Το αίτημα στάλθηκε στον μάγειρα!');
        if (reload) reload();
      } catch (err) {
        toast(err.message, true);
      }
    });
    card.append(btn);
  } else if (l.status === 'active' && !currentUser) {
    card.append(el('button', { class: 'btn full', onclick: () => navigate('auth') }, 'Συνδεθείτε για δέσμευση'));
  }
  return card;
}

// "Οι κρατήσεις μου" — consumer's requests with rating after pickup (C3)
function renderMyRequestsView(container) {
  container.append(el('h2', {}, 'Οι κρατήσεις μου'));
  const list = el('div', { class: 'stack' });
  container.append(list);

  async function load() {
    const requests = await api('/requests/mine');
    list.innerHTML = '';
    if (!requests.length) list.append(el('p', { class: 'muted' }, 'Δεν έχετε κάνει ακόμα κρατήσεις.'));
    for (const r of requests) {
      const row = el('div', { class: 'card request-row' },
        el('div', {},
          el('strong', {}, r.listing_title),
          el('p', { class: 'muted small info-line wrap' },
            `Μάγειρας: ${r.cook_name}`,
            el('span', { class: 'info-sep' }, icon('map-pin', { size: 14 }), ' ' + r.pickup_location),
            el('span', { class: 'info-sep' }, icon('clock', { size: 14 }), ' ' + r.pickup_time))
        ),
        el('span', { class: 'badge ' + r.status }, STATUS_LABELS[r.status] || r.status)
      );
      if (r.status === 'picked_up') {
        row.append(r.my_rating ? starRating(r.my_rating) : ratingWidget(r.id, load));
      }
      list.append(row);
    }
  }

  function ratingWidget(requestId, reload) {
    const starsWrap = el('div', { class: 'rate-stars' });
    // descending DOM order (5→1); row-reverse renders them 1→5 left-to-right
    for (let s = 5; s >= 1; s--) {
      starsWrap.append(el('button', {
        class: 'star-btn',
        title: `${s}/5`,
        onclick: async () => {
          try {
            await api('/ratings', { method: 'POST', body: { request_id: requestId, stars: s } });
            toast('Ευχαριστούμε για τη βαθμολογία!');
            reload();
          } catch (err) {
            toast(err.message, true);
          }
        },
      }, icon('star', { size: 22 })));
    }
    return el('div', { class: 'rate' }, el('span', { class: 'small muted' }, 'Βαθμολογήστε:'), starsWrap);
  }

  load();
}

// Guest landing dashboard — shown to logged-out visitors instead of the feed.
function renderHomeView(container) {
  const heroStats = el('div', { class: 'hero-stats' });

  container.append(
    el('section', { class: 'hero' },
      el('div', { class: 'hero-badge' }, icon('soup', { size: 38 })),
      el('h1', { class: 'hero-title' }, 'Σπιτικό φαγητό, ', el('span', { class: 'accent' }, 'μοιρασμένο')),
      el('p', { class: 'hero-sub' },
        'Το UniBite φέρνει κοντά φοιτητές που μαγειρεύουν παραπάνω με φοιτητές που πεινάνε. ' +
        'Βρες ή πρόσφερε μερίδες δίπλα σου — δωρεάν, με ένα δίκαιο σύστημα πόντων.'),
      el('div', { class: 'hero-actions' },
        el('button', { class: 'btn big bright', onclick: () => navigate('auth') }, 'Ξεκίνα δωρεάν'),
        el('button', { class: 'btn big outline with-icon', onclick: () => navigate('feed') },
          icon('utensils'), 'Περιήγηση στα γεύματα')),
      heroStats
    ),
    el('section', { class: 'home-section' },
      el('h2', {}, 'Πώς λειτουργεί'),
      el('div', { class: 'steps-grid' },
        homeStep('utensils-crossed', 'Δημοσίευσε ή βρες',
          'Ανέβασε ένα γεύμα που περίσσεψε ή ψάξε διαθέσιμες μερίδες στον χάρτη.'),
        homeStep('map-pin', 'Δέσμευσε κοντά σου',
          'Φιλτράρισε κατά απόσταση, αλλεργιογόνα ή βαθμολογία και δέσμευσε με ένα κλικ.'),
        homeStep('star', 'Παράλαβε & βαθμολόγησε',
          'Πάρε το φαγητό σου από το σημείο παραλαβής και βαθμολόγησε τον μάγειρα.'))
    ),
    el('section', { class: 'home-section' },
      el('h2', {}, 'Σύστημα πόντων'),
      el('div', { class: 'card rules-card' },
        el('ul', { class: 'rules' },
          el('li', {}, 'Ξεκινάς με 5 πόντους με την εγγραφή.'),
          el('li', {}, 'Κάθε δέσμευση μερίδας κοστίζει 1 πόντο.'),
          el('li', {}, '+1 πόντος για κάθε μερίδα που προσφέρεις· +1 επιπλέον αν βαθμολογηθείς πάνω από 3/5.'),
          el('li', {}, 'Αν δεν παραλάβεις ή δεν βαθμολογήσεις εγκαίρως, χάνεις 1 πόντο.')))
    )
  );

  api('/listings/summary').then((s) => {
    heroStats.append(
      heroStat(s.active_listings, 'διαθέσιμα γεύματα'),
      heroStat(s.students, 'φοιτητές'),
      heroStat(s.portions_shared, 'μερίδες μοιράστηκαν')
    );
  }).catch(() => {});

  function homeStep(iconName, title, text) {
    return el('div', { class: 'card step-card' },
      el('div', { class: 'step-icon' }, icon(iconName, { size: 26 })),
      el('h3', {}, title),
      el('p', { class: 'muted' }, text));
  }
  function heroStat(value, label) {
    return el('div', { class: 'hero-stat' },
      el('div', { class: 'hero-stat-value' }, String(value ?? 0)),
      el('div', { class: 'hero-stat-label' }, label));
  }
}
