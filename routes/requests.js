const express = require('express');
const pool = require('../db');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

// POST /api/requests — consumer reserves a portion (C2)
router.post('/', requireLogin, async (req, res) => {
  const listingId = Number(req.body.listing_id);
  if (!listingId) return res.status(400).json({ error: 'Λείπει η αγγελία' });
  try {
    const [[user]] = await pool.query('SELECT points FROM users WHERE id = ?', [req.session.userId]);
    if (user.points < 1) {
      return res.status(400).json({ error: 'Χρειάζεστε τουλάχιστον 1 πόντο για να δεσμεύσετε μερίδα' });
    }
    const [[listing]] = await pool.query(
      `SELECT *, created_at >= NOW() - INTERVAL 48 HOUR AS fresh FROM listings WHERE id = ?`, [listingId]
    );
    if (!listing || !listing.fresh) return res.status(404).json({ error: 'Η αγγελία δεν είναι πλέον διαθέσιμη' });
    if (listing.portions_available < 1) return res.status(400).json({ error: 'Δεν υπάρχουν διαθέσιμες μερίδες' });
    if (listing.cook_id === req.session.userId) {
      return res.status(400).json({ error: 'Δεν μπορείτε να δεσμεύσετε μερίδα από δική σας αγγελία' });
    }
    const [dup] = await pool.query(
      `SELECT id FROM requests WHERE listing_id = ? AND consumer_id = ? AND status IN ('pending','approved')`,
      [listingId, req.session.userId]
    );
    if (dup.length) return res.status(409).json({ error: 'Έχετε ήδη ενεργό αίτημα για αυτή την αγγελία' });

    const [result] = await pool.query(
      'INSERT INTO requests (listing_id, consumer_id) VALUES (?, ?)',
      [listingId, req.session.userId]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα διακομιστή' });
  }
});

// GET /api/requests/incoming — cook's inbox across all their listings (B3)
router.get('/incoming', requireLogin, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT r.*, l.title AS listing_title, l.portions_available, u.display_name AS consumer_name
       FROM requests r
       JOIN listings l ON l.id = r.listing_id
       JOIN users u ON u.id = r.consumer_id
      WHERE l.cook_id = ?
      ORDER BY FIELD(r.status, 'pending', 'approved', 'picked_up', 'no_show', 'rejected'), r.created_at DESC`,
    [req.session.userId]
  );
  res.json(rows);
});

// GET /api/requests/mine — consumer's own requests, with rating info (C3)
router.get('/mine', requireLogin, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT r.*, l.title AS listing_title, l.pickup_location, l.pickup_time,
            u.display_name AS cook_name, rt.stars AS my_rating
       FROM requests r
       JOIN listings l ON l.id = r.listing_id
       JOIN users u ON u.id = l.cook_id
       LEFT JOIN ratings rt ON rt.request_id = r.id
      WHERE r.consumer_id = ?
      ORDER BY r.created_at DESC`,
    [req.session.userId]
  );
  res.json(rows);
});

// POST /api/requests/:id/approve — portions -1, consumer spends 1 point (B3)
router.post('/:id/approve', requireLogin, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const request = await cookRequest(conn, req);
    if (!request) { await conn.rollback(); return res.status(404).json({ error: 'Το αίτημα δεν βρέθηκε' }); }
    if (request.status !== 'pending') { await conn.rollback(); return res.status(400).json({ error: 'Το αίτημα δεν είναι σε εκκρεμότητα' }); }
    if (request.portions_available < 1) { await conn.rollback(); return res.status(400).json({ error: 'Δεν υπάρχουν διαθέσιμες μερίδες' }); }
    const [[consumer]] = await conn.query('SELECT points FROM users WHERE id = ? FOR UPDATE', [request.consumer_id]);
    if (consumer.points < 1) { await conn.rollback(); return res.status(400).json({ error: 'Ο αιτών δεν έχει αρκετούς πόντους' }); }

    await conn.query('UPDATE listings SET portions_available = portions_available - 1 WHERE id = ?', [request.listing_id]);
    await conn.query('UPDATE users SET points = points - 1 WHERE id = ?', [request.consumer_id]);
    await conn.query(`UPDATE requests SET status = 'approved', approved_at = NOW() WHERE id = ?`, [request.id]);
    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα διακομιστή' });
  } finally {
    conn.release();
  }
});

// POST /api/requests/:id/reject (B3)
router.post('/:id/reject', requireLogin, async (req, res) => {
  const request = await cookRequest(pool, req);
  if (!request) return res.status(404).json({ error: 'Το αίτημα δεν βρέθηκε' });
  if (request.status !== 'pending') return res.status(400).json({ error: 'Το αίτημα δεν είναι σε εκκρεμότητα' });
  await pool.query(`UPDATE requests SET status = 'rejected' WHERE id = ?`, [request.id]);
  res.json({ ok: true });
});

// POST /api/requests/:id/pickup — successful handover, cook earns 1 base point (B3, B4)
router.post('/:id/pickup', requireLogin, async (req, res) => {
  const request = await cookRequest(pool, req);
  if (!request) return res.status(404).json({ error: 'Το αίτημα δεν βρέθηκε' });
  if (request.status !== 'approved') return res.status(400).json({ error: 'Το αίτημα δεν είναι εγκεκριμένο' });
  await pool.query(`UPDATE requests SET status = 'picked_up', picked_up_at = NOW() WHERE id = ?`, [request.id]);
  await pool.query('UPDATE users SET points = points + 1 WHERE id = ?', [req.session.userId]);
  res.json({ ok: true });
});

// POST /api/requests/:id/noshow — consumer penalized -1, portion goes back (B3)
router.post('/:id/noshow', requireLogin, async (req, res) => {
  const request = await cookRequest(pool, req);
  if (!request) return res.status(404).json({ error: 'Το αίτημα δεν βρέθηκε' });
  if (request.status !== 'approved') return res.status(400).json({ error: 'Το αίτημα δεν είναι εγκεκριμένο' });
  await pool.query(`UPDATE requests SET status = 'no_show' WHERE id = ?`, [request.id]);
  await pool.query('UPDATE users SET points = points - 1 WHERE id = ?', [request.consumer_id]);
  await pool.query('UPDATE listings SET portions_available = portions_available + 1 WHERE id = ?', [request.listing_id]);
  res.json({ ok: true });
});

// Fetch a request only if the logged-in user is the cook of its listing
async function cookRequest(db, req) {
  const [rows] = await db.query(
    `SELECT r.*, l.cook_id, l.portions_available
       FROM requests r JOIN listings l ON l.id = r.listing_id
      WHERE r.id = ? AND l.cook_id = ?` + (db !== pool ? ' FOR UPDATE' : ''),
    [req.params.id, req.session.userId]
  );
  return rows[0] || null;
}

module.exports = router;
