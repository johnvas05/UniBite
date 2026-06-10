// Consumer views: feed with list + map (C1), reservations (C2), ratings (C3)
const feedState = { refPoint: null, maxKm: '', limit: '' };

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

  const maxKmSelect = el('select', {},
    el('option', { value: '' }, 'Χωρίς όριο απόστασης'),
    ...[1, 2, 5, 10].map((km) => el('option', { value: km }, `Έως ${km} km`))
  );
  maxKmSelect.value = feedState.maxKm;
  const limitInput = el('input', { type: 'number', min: 1, max: 50, placeholder: 'Μέγ. πλήθος', value: feedState.limit });
  const locBtn = el('button', { class: 'btn' }, '📍 Η θέση μου');
  const hint = el('span', { class: 'muted small' },
    feedState.refPoint ? 'Σημείο αναφοράς ορισμένο — ταξινόμηση κατά απόσταση' : 'Κάντε κλικ στον χάρτη για σημείο αναφοράς');

  const controls = el('div', { class: 'feed-controls card' }, locBtn, maxKmSelect, limitInput, hint);
  container.append(
    el('h2', {}, 'Διαθέσιμα γεύματα'),
    controls,
    el('div', { class: 'feed-layout' }, mapDiv, cards)
  );

  const map = L.map(mapDiv).setView([37.9779, 23.7850], 14);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
  }).addTo(map);
  let markers = [];
  let refMarker = null;

  function setRefPoint(lat, lng) {
    feedState.refPoint = { lat, lng };
    if (refMarker) refMarker.remove();
    refMarker = L.marker([lat, lng], { opacity: 0.7 }).addTo(map).bindPopup('Σημείο αναφοράς');
    hint.textContent = 'Σημείο αναφοράς ορισμένο — ταξινόμηση κατά απόσταση';
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
    try {
      const listings = await api('/listings?' + params);
      markers.forEach((m) => m.remove());
      markers = listings.map((l) => {
        const marker = L.circleMarker([l.pickup_lat, l.pickup_lng], {
          radius: 10,
          color: l.status === 'active' ? '#2e7d32' : '#9e9e9e',
          fillOpacity: 0.7,
        }).addTo(map);
        marker.bindPopup(`<b>${l.title}</b><br>${l.pickup_location}<br>${l.status === 'active' ? l.portions_available + ' μερίδες' : 'Εξαντλήθηκε'}`);
        return marker;
      });
      cards.innerHTML = '';
      if (!listings.length) cards.append(el('p', { class: 'muted' }, 'Δεν βρέθηκαν αγγελίες με αυτά τα κριτήρια.'));
      listings.forEach((l) => cards.append(listingCard(l, load)));
    } catch (err) {
      toast(err.message, true);
    }
  }

  load();
}

function listingCard(l, reload) {
  const isMine = currentUser && currentUser.id === l.cook_id;
  const card = el('article', { class: 'card listing-card' + (l.status === 'inactive' ? ' inactive' : '') },
    l.photo_url
      ? el('img', { src: l.photo_url, alt: l.title, class: 'card-photo' })
      : el('div', { class: 'card-photo placeholder' }, '🍽️'),
    el('div', { class: 'card-body' },
      el('div', { class: 'card-top' },
        el('h3', {}, l.title),
        el('span', { class: 'badge ' + l.status }, STATUS_LABELS[l.status] || l.status)
      ),
      el('p', { class: 'muted small' }, `από ${l.cook_name}` + (l.avg_rating ? ` · ★ ${l.avg_rating}` : '')),
      l.notes ? el('p', { class: 'notes' }, l.notes) : null,
      l.allergens ? el('p', { class: 'allergens' }, '⚠️ Αλλεργιογόνα: ' + l.allergens) : null,
      el('p', { class: 'small' }, `📍 ${l.pickup_location}`),
      el('p', { class: 'small' }, `🕒 ${l.pickup_time}`),
      l.distance_km != null ? el('p', { class: 'small' }, `📏 ${Number(l.distance_km).toFixed(1)} km`) : null,
      el('p', { class: 'portions' }, l.status === 'active' ? `${l.portions_available} διαθέσιμες μερίδες` : 'Καμία διαθέσιμη μερίδα')
    )
  );
  if (l.status === 'active' && currentUser && !isMine) {
    const btn = el('button', { class: 'btn primary full' }, 'Δέσμευση μερίδας');
    btn.addEventListener('click', async () => {
      try {
        await api('/requests', { method: 'POST', body: { listing_id: l.id } });
        toast('Το αίτημα στάλθηκε στον μάγειρα! 🎉');
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
          el('p', { class: 'muted small' }, `Μάγειρας: ${r.cook_name} · 📍 ${r.pickup_location} · 🕒 ${r.pickup_time}`)
        ),
        el('span', { class: 'badge ' + r.status }, STATUS_LABELS[r.status] || r.status)
      );
      if (r.status === 'picked_up') {
        row.append(r.my_rating
          ? el('span', { class: 'stars' }, '★'.repeat(r.my_rating) + '☆'.repeat(5 - r.my_rating))
          : ratingWidget(r.id, load));
      }
      list.append(row);
    }
  }

  function ratingWidget(requestId, reload) {
    const wrap = el('div', { class: 'stars rate' });
    for (let s = 1; s <= 5; s++) {
      wrap.append(el('button', {
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
      }, '☆'));
    }
    wrap.prepend(el('span', { class: 'small muted' }, 'Βαθμολογήστε: '));
    return wrap;
  }

  load();
}
