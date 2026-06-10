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
        statCard('🍽️', stats.monthly_portions, 'Μερίδες τον τελευταίο μήνα'),
        statCard('📦', stats.all_time_portions, 'Μερίδες συνολικά'),
        statCard('👥', stats.total_students, 'Εγγεγραμμένοι φοιτητές'),
        statCard('📢', stats.active_listings, 'Ενεργές αγγελίες')
      );

      const donorRows = leaderboard.top_donors.map((d, i) =>
        el('tr', {},
          el('td', {}, medal(i)),
          el('td', {}, d.display_name + (i === 0 ? ' — Top Donor 🏆' : '')),
          el('td', {}, `${d.portions_given} μερίδες`))
      );
      const mealRows = leaderboard.top_meals.map((m, i) =>
        el('tr', {},
          el('td', {}, medal(i)),
          el('td', {}, `${m.title} (${m.cook_name})`),
          el('td', {}, `★ ${m.avg_stars} (${m.num_ratings} αξιολ.)`))
      );

      boards.append(
        boardCard('Κατάταξη προσφορών', ['#', 'Φοιτητής', 'Μερίδες'], donorRows),
        boardCard('Κορυφαία γεύματα', ['#', 'Γεύμα', 'Βαθμολογία'], mealRows)
      );
    } catch (err) {
      toast(err.message, true);
    }
  })();

  function statCard(icon, value, label) {
    return el('div', { class: 'card stat-card' },
      el('div', { class: 'stat-icon' }, icon),
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
    return ['🥇', '🥈', '🥉'][i] || String(i + 1);
  }
}
