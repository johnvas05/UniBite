const express = require('express');
const pool = require('../db');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

// POST /api/ratings — rate a picked-up portion; cook gets +1 bonus if stars > 3 (B4, C3)
router.post('/', requireLogin, async (req, res) => {
  const requestId = Number(req.body.request_id);
  const stars = Number(req.body.stars);
  if (!requestId || !Number.isInteger(stars) || stars < 1 || stars > 5) {
    return res.status(400).json({ error: 'Μη έγκυρη βαθμολογία (1-5 αστέρια)' });
  }
  try {
    const [[request]] = await pool.query(
      `SELECT r.*, l.cook_id FROM requests r JOIN listings l ON l.id = r.listing_id
        WHERE r.id = ? AND r.consumer_id = ?`,
      [requestId, req.session.userId]
    );
    if (!request) return res.status(404).json({ error: 'Το αίτημα δεν βρέθηκε' });
    if (request.status !== 'picked_up') {
      return res.status(400).json({ error: 'Μπορείτε να βαθμολογήσετε μόνο μετά την παραλαβή' });
    }
    await pool.query(
      'INSERT INTO ratings (request_id, listing_id, consumer_id, cook_id, stars) VALUES (?, ?, ?, ?, ?)',
      [request.id, request.listing_id, req.session.userId, request.cook_id, stars]
    );
    if (stars > 3) {
      await pool.query('UPDATE users SET points = points + 1 WHERE id = ?', [request.cook_id]);
    }
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Έχετε ήδη βαθμολογήσει αυτή τη μερίδα' });
    }
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα διακομιστή' });
  }
});

module.exports = router;
