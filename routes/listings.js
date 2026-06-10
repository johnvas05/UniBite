const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('../db');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '..', 'public', 'uploads'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});

// Computed status per the assignment's ΣΗΜΕΙΩΣΗ (active / inactive / deleted)
const STATUS_SQL = `CASE
  WHEN l.created_at < NOW() - INTERVAL 48 HOUR THEN 'deleted'
  WHEN l.portions_available = 0 THEN 'inactive'
  ELSE 'active' END`;

const BASE_SELECT = `
  SELECT l.*, ${STATUS_SQL} AS status,
         u.display_name AS cook_name,
         (SELECT GROUP_CONCAT(a.name SEPARATOR ', ')
            FROM listing_allergens la JOIN allergens a ON a.id = la.allergen_id
           WHERE la.listing_id = l.id) AS allergens,
         (SELECT GROUP_CONCAT(la.allergen_id)
            FROM listing_allergens la WHERE la.listing_id = l.id) AS allergen_ids,
         (SELECT ROUND(AVG(r.stars), 1) FROM ratings r WHERE r.listing_id = l.id) AS avg_rating
    FROM listings l JOIN users u ON u.id = l.cook_id`;

// GET /api/listings — feed of active+inactive listings (C1)
// Optional: ?lat=&lng=&maxKm=&limit= for distance filter/sort
router.get('/', async (req, res) => {
  const { lat, lng, maxKm, limit } = req.query;
  let sql = BASE_SELECT;
  const params = [];

  if (lat && lng) {
    // Haversine distance (km) from the given point to each pickup location
    sql = sql.replace('AS avg_rating', `AS avg_rating,
      6371 * 2 * ASIN(SQRT(
        POW(SIN(RADIANS(l.pickup_lat - ?) / 2), 2) +
        COS(RADIANS(?)) * COS(RADIANS(l.pickup_lat)) *
        POW(SIN(RADIANS(l.pickup_lng - ?) / 2), 2))) AS distance_km`);
    params.push(Number(lat), Number(lat), Number(lng));
  }

  sql += ` WHERE l.created_at >= NOW() - INTERVAL 48 HOUR`;
  if (lat && lng && maxKm) {
    sql += ` HAVING distance_km <= ?`;
    params.push(Number(maxKm));
  }
  sql += lat && lng ? ' ORDER BY distance_km ASC' : ' ORDER BY l.created_at DESC';
  if (limit) {
    sql += ' LIMIT ?';
    params.push(Math.max(1, Math.min(100, Number(limit))));
  }

  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα διακομιστή' });
  }
});

// GET /api/listings/mine — cook's own listings, all statuses (B1)
router.get('/mine', requireLogin, async (req, res) => {
  const [rows] = await pool.query(
    `${BASE_SELECT} WHERE l.cook_id = ? ORDER BY l.created_at DESC`,
    [req.session.userId]
  );
  res.json(rows);
});

// POST /api/listings — create (B1, B2)
router.post('/', requireLogin, upload.single('photo'), async (req, res) => {
  const { title, notes, portions, pickup_location, pickup_lat, pickup_lng, pickup_time } = req.body;
  if (!title || !portions || !pickup_location || !pickup_lat || !pickup_lng || !pickup_time) {
    return res.status(400).json({ error: 'Συμπληρώστε όλα τα υποχρεωτικά πεδία (τίτλος, μερίδες, σημείο και ώρα παραλαβής)' });
  }
  const n = Number(portions);
  if (!Number.isInteger(n) || n < 1) return res.status(400).json({ error: 'Μη έγκυρος αριθμός μερίδων' });
  try {
    const [result] = await pool.query(
      `INSERT INTO listings (cook_id, title, photo_url, notes, portions_total, portions_available,
                             pickup_location, pickup_lat, pickup_lng, pickup_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.session.userId, title.trim(), req.file ? '/uploads/' + req.file.filename : null,
       notes || '', n, n, pickup_location.trim(), Number(pickup_lat), Number(pickup_lng), pickup_time.trim()]
    );
    await setAllergens(result.insertId, req.body.allergens);
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα διακομιστή' });
  }
});

// PUT /api/listings/:id — edit own listing (B1)
router.put('/:id', requireLogin, upload.single('photo'), async (req, res) => {
  const listing = await ownListing(req, res);
  if (!listing) return;
  const { title, notes, portions, pickup_location, pickup_lat, pickup_lng, pickup_time } = req.body;
  const n = Number(portions);
  if (!Number.isInteger(n) || n < 1) return res.status(400).json({ error: 'Μη έγκυρος αριθμός μερίδων' });
  // Keep portions_available consistent when total changes
  const given = listing.portions_total - listing.portions_available;
  const available = Math.max(0, n - given);
  try {
    await pool.query(
      `UPDATE listings SET title=?, notes=?, portions_total=?, portions_available=?,
              pickup_location=?, pickup_lat=?, pickup_lng=?, pickup_time=?, photo_url=COALESCE(?, photo_url)
       WHERE id=?`,
      [title.trim(), notes || '', n, available, pickup_location.trim(),
       Number(pickup_lat), Number(pickup_lng), pickup_time.trim(),
       req.file ? '/uploads/' + req.file.filename : null, listing.id]
    );
    await setAllergens(listing.id, req.body.allergens);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα διακομιστή' });
  }
});

// DELETE /api/listings/:id — delete own listing (B1)
router.delete('/:id', requireLogin, async (req, res) => {
  const listing = await ownListing(req, res);
  if (!listing) return;
  await pool.query('DELETE FROM listings WHERE id = ?', [listing.id]);
  res.json({ ok: true });
});

async function ownListing(req, res) {
  const [rows] = await pool.query('SELECT * FROM listings WHERE id = ?', [req.params.id]);
  const listing = rows[0];
  if (!listing) { res.status(404).json({ error: 'Η αγγελία δεν βρέθηκε' }); return null; }
  if (listing.cook_id !== req.session.userId) {
    res.status(403).json({ error: 'Δεν είναι δική σας αγγελία' });
    return null;
  }
  return listing;
}

async function setAllergens(listingId, allergens) {
  await pool.query('DELETE FROM listing_allergens WHERE listing_id = ?', [listingId]);
  let ids = [];
  try { ids = JSON.parse(allergens || '[]'); } catch { /* ignore malformed input */ }
  if (Array.isArray(ids) && ids.length) {
    await pool.query(
      'INSERT INTO listing_allergens (listing_id, allergen_id) VALUES ?',
      [ids.map((a) => [listingId, Number(a)])]
    );
  }
}

module.exports = router;
