const express = require('express');
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/stats — platform totals, incl. portions shared last 30 days (D1)
router.get('/stats', requireAdmin, async (req, res) => {
  const [[{ monthly }]] = await pool.query(
    `SELECT COUNT(*) AS monthly FROM requests
      WHERE status = 'picked_up' AND picked_up_at >= NOW() - INTERVAL 30 DAY`
  );
  const [[{ users }]] = await pool.query(`SELECT COUNT(*) AS users FROM users WHERE role = 'student'`);
  const [[{ active }]] = await pool.query(
    `SELECT COUNT(*) AS active FROM listings
      WHERE created_at >= NOW() - INTERVAL 48 HOUR AND portions_available > 0`
  );
  const [[{ allTime }]] = await pool.query(
    `SELECT COUNT(*) AS allTime FROM requests WHERE status = 'picked_up'`
  );
  res.json({ monthly_portions: monthly, total_students: users, active_listings: active, all_time_portions: allTime });
});

// GET /api/admin/leaderboard — Top Donor + highest-rated meals (D2)
router.get('/leaderboard', requireAdmin, async (req, res) => {
  const [donors] = await pool.query(
    `SELECT u.display_name, COUNT(*) AS portions_given
       FROM requests r
       JOIN listings l ON l.id = r.listing_id
       JOIN users u ON u.id = l.cook_id
      WHERE r.status = 'picked_up'
      GROUP BY l.cook_id
      ORDER BY portions_given DESC
      LIMIT 5`
  );
  const [topMeals] = await pool.query(
    `SELECT l.title, u.display_name AS cook_name,
            ROUND(AVG(rt.stars), 1) AS avg_stars, COUNT(rt.id) AS num_ratings
       FROM ratings rt
       JOIN listings l ON l.id = rt.listing_id
       JOIN users u ON u.id = l.cook_id
      GROUP BY rt.listing_id
      ORDER BY avg_stars DESC, num_ratings DESC
      LIMIT 5`
  );
  res.json({ top_donors: donors, top_meals: topMeals });
});

module.exports = router;
