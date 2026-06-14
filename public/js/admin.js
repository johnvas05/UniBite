// Admin dashboard: monthly stats (D1) + leaderboard (D2)
function renderAdminView(container) {
  container.append(el('h2', {}, 'Πίνακας Διαχειριστή'));
  const statsRow = el('div', { class: 'stats-row' });
  const boards = el('div', { class: 'boards' });
  container.append(statsRow, boards);

  (async () => {
    try {
      const [stats, leaderboard] = await Promise.all([
        api('/admin/stats'),
        api('/admin/leaderboard'),
      ]);

      statsRow.append(
        statCard('utensils', stats.monthly_portions, 'Μερίδες τον τελευταίο μήνα'),
        statCard('soup', stats.all_time_portions, 'Μερίδες συνολικά'),
        statCard('users', stats.total_students, 'Εγγεγραμμένοι φοιτητές'),
        statCard('megaphone', stats.active_listings, 'Ενεργές αγγελίες')
      );

      const donorRows = leaderboard.top_donors.map((d, i) =>
        el('tr', {},
          el('td', {}, medal(i)),
          el('td', {}, i === 0
            ? el('span', { class: 'top-donor' }, d.display_name, el('span', { class: 'tag-top' }, 'Top Donor'))
            : d.display_name),
          el('td', {}, `${d.portions_given} μερίδες`))
      );
      const mealRows = leaderboard.top_meals.map((m, i) =>
        el('tr', {},
          el('td', {}, medal(i)),
          el('td', {}, `${m.title} (${m.cook_name})`),
          el('td', {}, el('span', { class: 'inline-rating' },
            icon('star', { size: 14, fill: true }), ` ${m.avg_stars} (${m.num_ratings} αξιολ.)`)))
      );

      boards.append(
        boardCard('Κατάταξη προσφορών', ['#', 'Φοιτητής', 'Μερίδες'], donorRows),
        boardCard('Κορυφαία γεύματα', ['#', 'Γεύμα', 'Βαθμολογία'], mealRows)
      );
    } catch (err) {
      toast(err.message, true);
    }
  })();

  function statCard(iconName, value, label) {
    return el('div', { class: 'card stat-card' },
      el('div', { class: 'stat-icon' }, icon(iconName, { size: 30 })),
      el('div', { class: 'stat-value' }, String(value)),
      el('div', { class: 'muted small' }, label)
    );
  }

  function boardCard(title, headers, rows) {
    return el('div', { class: 'card board' },
      el('h3', {}, title),
      rows.length
        ? el('table', {},
            el('thead', {}, el('tr', {}, ...headers.map((h) => el('th', {}, h)))),
            el('tbody', {}, ...rows))
        : el('p', { class: 'muted' }, 'Δεν υπάρχουν δεδομένα ακόμα.')
    );
  }

  function medal(i) {
    if (i === 0) return icon('trophy', { size: 20, cls: 'medal-gold' });
    if (i === 1) return icon('medal', { size: 20, cls: 'medal-silver' });
    if (i === 2) return icon('medal', { size: 20, cls: 'medal-bronze' });
    return el('span', { class: 'muted' }, String(i + 1));
  }
}
