const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');

const router = express.Router();

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
      last_name: last_name.trim(), display_name: displayName, role: 'student', points: 5,
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
      last_name: user.last_name, display_name: user.display_name, role: user.role, points: user.points,
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
    'SELECT id, email, phone, first_name, last_name, display_name, role, points FROM users WHERE id = ?',
    [req.session.userId]
  );
  res.json(rows[0] || null);
});

module.exports = router;
