const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth(['admin']));

router.get('/stats', async (req, res) => {
  const t = await pool.query(
    'SELECT service_type, COUNT(*)::int AS count FROM service_requests GROUP BY service_type');
  const s = await pool.query(
    'SELECT status, COUNT(*)::int AS count FROM service_requests GROUP BY status');
  const rev = await pool.query(
    "SELECT COALESCE(SUM(amount),0)::int AS total FROM payments WHERE status='PAID'");
  const u = await pool.query('SELECT COUNT(*)::int AS n FROM users');
  const m = await pool.query('SELECT COUNT(*)::int AS n FROM mechanics');
  res.json({
    by_type: Object.fromEntries(t.rows.map((r) => [r.service_type, r.count])),
    by_status: Object.fromEntries(s.rows.map((r) => [r.status, r.count])),
    revenue: rev.rows[0].total, users: u.rows[0].n, mechanics: m.rows[0].n });
});

router.get('/requests', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM service_requests ORDER BY id DESC LIMIT 100');
  res.json(rows);
});

router.get('/users', async (req, res) => {
  const { rows } = await pool.query('SELECT id,name,email,role,created_at FROM users ORDER BY id');
  res.json(rows);
});

module.exports = router;
