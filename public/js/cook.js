// Cook views: listing CRUD (B1, B2), requests dashboard (B3), points (B4)

function renderMyListingsView(container) {
  container.append(
    el('div', { class: 'view-head' },
      el('h2', {}, 'Οι αγγελίες μου'),
      el('button', { class: 'btn primary with-icon', onclick: () => navigate('listingForm') }, icon('plus'), 'Νέα αγγελία')
    ),
    el('p', { class: 'muted points-line' }, 'Έχετε ', icon('star', { size: 15, fill: true }), ` ${currentUser.points} πόντους από προσφορές γευμάτων.`)
  );
  const grid = el('div', { class: 'cards-grid' });
  container.append(grid);

  async function load() {
    const listings = await api('/listings/mine');
    grid.innerHTML = '';
    if (!listings.length) grid.append(el('p', { class: 'muted' }, 'Δεν έχετε δημοσιεύσει αγγελίες ακόμα.'));
    for (const l of listings) {
      const card = listingCard(l, null);
      const actions = el('div', { class: 'card-actions' });
      if (l.status !== 'deleted') {
        actions.append(
          el('button', { class: 'btn with-icon', onclick: () => navigate('listingForm', l) }, icon('pencil'), 'Επεξεργασία'),
          el('button', {
            class: 'btn danger with-icon',
            onclick: async () => {
              if (!confirm('Σίγουρα θέλετε να διαγράψετε την αγγελία;')) return;
              try {
                await api('/listings/' + l.id, { method: 'DELETE' });
                toast('Η αγγελία διαγράφηκε');
                load();
              } catch (err) { toast(err.message, true); }
            },
          }, icon('trash-2'), 'Διαγραφή')
        );
      } else {
        card.classList.add('inactive');
        actions.append(el('span', { class: 'muted small' }, 'Έληξε (48ωρο) — ορατή μόνο σε εσάς'));
      }
      card.append(actions);
      grid.append(card);
    }
  }
  load();
}

function renderListingFormView(container, listing) {
  const isEdit = !!listing;
  const f = {
    title: el('input', { type: 'text', value: listing?.title || '', required: '' }),
    notes: el('textarea', { rows: 3 }, listing?.notes || ''),
    portions: el('input', { type: 'number', min: 1, max: 50, value: listing?.portions_total || 4, required: '' }),
    location: el('input', { type: 'text', value: listing?.pickup_location || '', required: '', placeholder: 'π.χ. Εστία ΕΜΠ, Δωμάτιο 214' }),
    time: el('input', { type: 'text', value: listing?.pickup_time || '', required: '', placeholder: 'π.χ. Σήμερα 18:00 - 20:00' }),
    photo: el('input', { type: 'file', accept: 'image/*' }),
    lat: el('input', { type: 'hidden', value: listing?.pickup_lat || '' }),
    lng: el('input', { type: 'hidden', value: listing?.pickup_lng || '' }),
  };

  const allergenBoxes = el('div', { class: 'allergen-grid' }, el('span', { class: 'muted' }, 'Φόρτωση...'));
  const mapDiv = el('div', { class: 'map small-map' });
  const mapHint = el('p', { class: 'muted small' }, f.lat.value ? 'Σημείο παραλαβής ορισμένο ✓' : 'Κάντε κλικ στον χάρτη για να ορίσετε το σημείο παραλαβής *');

  const form = el('form', { class: 'card listing-form' },
    el('h2', {}, isEdit ? 'Επεξεργασία αγγελίας' : 'Νέα αγγελία'),
    field('Τίτλος *', f.title),
    field('Σημειώσεις', f.notes),
    field('Μερίδες *', f.portions),
    field('Φωτογραφία (προαιρετικά)', f.photo),
    el('div', { class: 'form-row' }, el('label', {}, 'Γνωστά αλλεργιογόνα'), allergenBoxes),
    field('Σημείο παραλαβής (περιγραφή) *', f.location),
    field('Ώρες παραλαβής *', f.time),
    el('div', { class: 'form-row' }, el('label', {}, 'Τοποθεσία στον χάρτη *'), mapHint, mapDiv),
    f.lat, f.lng,
    el('div', { class: 'form-actions' },
      el('button', { type: 'submit', class: 'btn primary' }, isEdit ? 'Αποθήκευση' : 'Δημοσίευση'),
      el('button', { type: 'button', class: 'btn', onclick: () => navigate('mine') }, 'Ακύρωση')
    )
  );
  container.append(form);

  function field(label, input) {
    return el('div', { class: 'form-row' }, el('label', {}, label), input);
  }

  // Pickup point picker (B2)
  const start = f.lat.value ? [Number(f.lat.value), Number(f.lng.value)] : [37.9779, 23.7850];
  const map = L.map(mapDiv).setView(start, 15);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
  refreshMap(map);
  let marker = f.lat.value ? L.marker(start).addTo(map) : null;
  map.on('click', (e) => {
    f.lat.value = e.latlng.lat.toFixed(6);
    f.lng.value = e.latlng.lng.toFixed(6);
    if (marker) marker.remove();
    marker = L.marker(e.latlng).addTo(map);
    mapHint.textContent = 'Σημείο παραλαβής ορισμένο ✓';
  });

  const selected = new Set((listing?.allergen_ids || '').split(',').filter(Boolean).map(Number));
  api('/allergens').then((allergens) => {
    allergenBoxes.innerHTML = '';
    for (const a of allergens) {
      const cb = el('input', { type: 'checkbox', value: a.id });
      if (selected.has(a.id)) cb.checked = true;
      allergenBoxes.append(el('label', { class: 'allergen-item' }, cb, ' ' + a.name));
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!f.lat.value || !f.lng.value) return toast('Ορίστε το σημείο παραλαβής στον χάρτη', true);
    const data = new FormData();
    data.append('title', f.title.value);
    data.append('notes', f.notes.value);
    data.append('portions', f.portions.value);
    data.append('pickup_location', f.location.value);
    data.append('pickup_time', f.time.value);
    data.append('pickup_lat', f.lat.value);
    data.append('pickup_lng', f.lng.value);
    if (f.photo.files[0]) data.append('photo', f.photo.files[0]);
    const checked = [...allergenBoxes.querySelectorAll('input:checked')].map((cb) => Number(cb.value));
    data.append('allergens', JSON.stringify(checked));
    try {
      await api(isEdit ? '/listings/' + listing.id : '/listings', {
        method: isEdit ? 'PUT' : 'POST',
        body: data,
      });
      toast(isEdit ? 'Η αγγελία ενημερώθηκε' : 'Η αγγελία δημοσιεύτηκε!');
      navigate('mine');
    } catch (err) {
      toast(err.message, true);
    }
  });
}

// Requests dashboard — approve / reject / pickup / no-show (B3)
function renderInboxView(container) {
  container.append(
    el('h2', {}, 'Αιτήματα για τις αγγελίες μου'),
    el('p', { class: 'muted points-line' }, 'Έχετε ', icon('star', { size: 15, fill: true }), ` ${currentUser.points} πόντους.`)
  );
  const list = el('div', { class: 'stack' });
  container.append(list);

  async function load() {
    const requests = await api('/requests/incoming');
    await refreshMe();
    list.innerHTML = '';
    if (!requests.length) list.append(el('p', { class: 'muted' }, 'Δεν υπάρχουν αιτήματα ακόμα.'));
    for (const r of requests) {
      const actions = el('div', { class: 'card-actions' });
      if (r.status === 'pending') {
        actions.append(
          actionBtn('check', 'Αποδοχή', 'primary', `/requests/${r.id}/approve`, load),
          actionBtn('x', 'Απόρριψη', 'danger', `/requests/${r.id}/reject`, load)
        );
      } else if (r.status === 'approved') {
        actions.append(
          actionBtn('package-check', 'Παρελήφθη', 'primary', `/requests/${r.id}/pickup`, load),
          actionBtn('ban', 'Δεν παρελήφθη', 'danger', `/requests/${r.id}/noshow`, load)
        );
      }
      list.append(el('div', { class: 'card request-row' },
        el('div', {},
          el('strong', {}, r.listing_title),
          el('p', { class: 'muted small' },
            `Αίτημα από: ${r.consumer_name} · ${new Date(r.created_at).toLocaleString('el-GR')}`)
        ),
        el('span', { class: 'badge ' + r.status }, STATUS_LABELS[r.status] || r.status),
        actions
      ));
    }
  }

  function actionBtn(iconName, label, kind, path, reload) {
    return el('button', {
      class: 'btn with-icon ' + kind,
      onclick: async () => {
        try {
          await api(path, { method: 'POST' });
          reload();
        } catch (err) { toast(err.message, true); }
      },
    }, icon(iconName), label);
  }

  load();
}
