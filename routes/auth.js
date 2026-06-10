const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');

const router = express.Router();

// POST /api/auth/register — new students start with 5 points (C2)
router.post('/register', async (req, res) => {
  const { username, password, display_name } = req.body;
  if (!username || !password || !display_name) {
    return res.status(400).json({ error: 'Συμπληρώστε όλα τα πεδία' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, display_name, points) VALUES (?, ?, ?, 5)',
      [username.trim(), hash, display_name.trim()]
    );
    req.session.userId = result.insertId;
    req.session.role = 'student';
    res.status(201).json({ id: result.insertId, username, display_name, role: 'student', points: 5 });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Το όνομα χρήστη χρησιμοποιείται ήδη' });
    }
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα διακομιστή' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Συμπληρώστε όλα τα πεδία' });
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username.trim()]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Λάθος όνομα χρήστη ή κωδικός' });
    }
    req.session.userId = user.id;
    req.session.role = user.role;
    res.json({ id: user.id, username: user.username, display_name: user.display_name, role: user.role, points: user.points });
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
    'SELECT id, username, display_name, role, points FROM users WHERE id = ?',
    [req.session.userId]
  );
  res.json(rows[0] || null);
});

module.exports = router;
