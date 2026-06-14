const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const pool = require('../db');

const router = express.Router();

// Avatar uploads — same disk storage convention as listing photos
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '..', 'public', 'uploads'),
    filename: (req, file, cb) => cb(null, 'avatar-' + Date.now() + path.extname(file.originalname)),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?\d{8,15}$/; // digits only after stripping spaces/dashes

// GET /api/auth/check-email?email=... — live duplicate check during registration
router.get('/check-email', async (req, res) => {
  const email = (req.query.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return res.json({ available: false, invalid: true });
  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    res.json({ available: rows.length === 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα διακομιστή' });
  }
});

// POST /api/auth/register — new students start with 5 points (C2)
router.post('/register', async (req, res) => {
  const { email, phone, first_name, last_name, password, password_repeat } = req.body;
  if (!email || !phone || !first_name || !last_name || !password || !password_repeat) {
    return res.status(400).json({ error: 'Συμπληρώστε όλα τα πεδία' });
  }
  const cleanEmail = email.trim().toLowerCase();
  if (!EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ error: 'Μη έγκυρη διεύθυνση email' });
  }
  const cleanPhone = phone.replace(/[\s-]/g, '');
  if (!PHONE_RE.test(cleanPhone)) {
    return res.status(400).json({ error: 'Μη έγκυρος αριθμός τηλεφώνου' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες' });
  }
  if (password !== password_repeat) {
    return res.status(400).json({ error: 'Οι κωδικοί δεν ταιριάζουν' });
  }
  try {
    const [dups] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (dups.length) {
      return res.status(409).json({ error: 'Το email χρησιμοποιείται ήδη' });
    }
    const hash = await bcrypt.hash(password, 10);
    const displayName = `${first_name.trim()} ${last_name.trim()}`;
    const [result] = await pool.query(
      'INSERT INTO users (username, email, phone, password_hash, first_name, last_name, display_name, points) VALUES (?, ?, ?, ?, ?, ?, ?, 5)',
      [cleanEmail, cleanEmail, cleanPhone, hash, first_name.trim(), last_name.trim(), displayName]
    );
    req.session.userId = result.insertId;
    req.session.role = 'student';
    res.status(201).json({
      id: result.insertId, email: cleanEmail, phone: cleanPhone, first_name: first_name.trim(),
      last_name: last_name.trim(), display_name: displayName, avatar_url: null, role: 'student', points: 5,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Το email χρησιμοποιείται ήδη' });
    }
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα διακομιστή' });
  }
});

// POST /api/auth/login — accepts email or username
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Συμπληρώστε όλα τα πεδία' });
  try {
    const identifier = username.trim();
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [identifier, identifier.toLowerCase()]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Λάθος email ή κωδικός' });
    }
    req.session.userId = user.id;
    req.session.role = user.role;
    res.json({
      id: user.id, email: user.email, phone: user.phone, first_name: user.first_name,
      last_name: user.last_name, display_name: user.display_name, avatar_url: user.avatar_url,
      role: user.role, points: user.points,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα διακομιστή' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// GET /api/auth/me — current user + points (B4)
router.get('/me', async (req, res) => {
  if (!req.session.userId) return res.json(null);
  const [rows] = await pool.query(
    'SELECT id, email, phone, first_name, last_name, display_name, avatar_url, role, points FROM users WHERE id = ?',
    [req.session.userId]
  );
  res.json(rows[0] || null);
});

// PUT /api/auth/profile — update own name and/or avatar (multipart)
router.put('/profile', upload.single('avatar'), async (req, res) => {
  const uid = req.session.userId;
  if (!uid) return res.status(401).json({ error: 'Απαιτείται σύνδεση' });
  const first = (req.body.first_name || '').trim();
  const last = (req.body.last_name || '').trim();
  if (!first || !last) return res.status(400).json({ error: 'Συμπληρώστε όνομα και επώνυμο' });
  const displayName = `${first} ${last}`;
  const avatarUrl = req.file ? '/uploads/' + req.file.filename : null;
  try {
    await pool.query(
      `UPDATE users SET first_name = ?, last_name = ?, display_name = ?,
              avatar_url = COALESCE(?, avatar_url) WHERE id = ?`,
      [first, last, displayName, avatarUrl, uid]
    );
    const [rows] = await pool.query(
      'SELECT id, email, phone, first_name, last_name, display_name, avatar_url, role, points FROM users WHERE id = ?',
      [uid]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα διακομιστή' });
  }
});

// GET /api/auth/profile — account details + activity summary
router.get('/profile', async (req, res) => {
  const uid = req.session.userId;
  if (!uid) return res.status(401).json({ error: 'Απαιτείται σύνδεση' });
  try {
    const [[user]] = await pool.query(
      `SELECT id, email, phone, first_name, last_name, display_name, avatar_url, role, points, created_at
         FROM users WHERE id = ?`,
      [uid]
    );
    if (!user) return res.json(null);
    const [[stats]] = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM listings WHERE cook_id = ?) AS listings_count,
         (SELECT COUNT(*) FROM requests r JOIN listings l ON l.id = r.listing_id
            WHERE l.cook_id = ? AND r.status = 'picked_up') AS portions_given,
         (SELECT ROUND(AVG(stars), 1) FROM ratings WHERE cook_id = ?) AS avg_rating,
         (SELECT COUNT(*) FROM requests WHERE consumer_id = ?) AS reservations_made`,
      [uid, uid, uid, uid]
    );
    res.json({ ...user, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα διακομιστή' });
  }
});

module.exports = router;
