require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const pool = require('./db');

const app = express();

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'unibite-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
}));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/admin', require('./routes/admin'));

// GET /api/allergens — the 14 EU food allergens (B1)
app.get('/api/allergens', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM allergens ORDER BY id');
  res.json(rows);
});

// Periodic housekeeping:
//  - consumers who picked up >48h ago and never rated lose 1 point (C3)
//  - pending requests on expired (>48h) listings are auto-rejected
async function sweep() {
  try {
    const [unrated] = await pool.query(
      `SELECT r.id, r.consumer_id FROM requests r
       LEFT JOIN ratings rt ON rt.request_id = r.id
       WHERE r.status = 'picked_up' AND r.picked_up_at < NOW() - INTERVAL 48 HOUR
         AND rt.id IS NULL AND r.rating_penalty_applied = 0`
    );
    for (const r of unrated) {
      await pool.query('UPDATE users SET points = points - 1 WHERE id = ?', [r.consumer_id]);
      await pool.query('UPDATE requests SET rating_penalty_applied = 1 WHERE id = ?', [r.id]);
    }
    await pool.query(
      `UPDATE requests r JOIN listings l ON l.id = r.listing_id
          SET r.status = 'rejected'
        WHERE r.status = 'pending' AND l.created_at < NOW() - INTERVAL 48 HOUR`
    );
  } catch (err) {
    console.error('Sweep error:', err.message);
  }
}
setInterval(sweep, 15 * 60 * 1000);
sweep();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`UniBite running at http://localhost:${PORT}`));
