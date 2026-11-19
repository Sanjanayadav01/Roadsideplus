const pool = require('../db');
const auth = require('../middleware/auth');
const { getRequest, MAX_RADIUS_KM } = require('../utils/matching');
const { distanceKm } = require('../utils/geo');

const NEXT = { ACCEPTED: 'EN_ROUTE', EN_ROUTE: 'ARRIVED', ARRIVED: 'COMPLETED' };

module.exports = (io) => {
  const router = require('express').Router();
  router.use(auth(['mechanic']));

  router.get('/me', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM mechanics WHERE user_id=$1', [req.user.id]);
    res.json(rows[0]);
  });

  router.post('/online', async (req, res) => {
    const { online, lat, lng } = req.body;
    await pool.query('UPDATE mechanics SET is_online=$1, lat=$2, lng=$3 WHERE user_id=$4',
      [!!online, lat, lng, req.user.id]);
    res.json({ online: !!online });
  });

  router.get('/jobs', async (req, res) => {
    const me = (await pool.query('SELECT * FROM mechanics WHERE user_id=$1', [req.user.id])).rows[0];
    if (!me || !me.is_online || me.lat == null) return res.json([]);
    const { rows } = await pool.query(
      `SELECT r.*, u.name AS user_name FROM service_requests r
       JOIN users u ON u.id = r.user_id
       WHERE r.status='REQUESTED' AND r.service_type = ANY($1) ORDER BY r.created_at`,
      [me.services]);
    res.json(rows
      .map((r) => ({ ...r, distance_km: Math.round(distanceKm(me.lat, me.lng, r.lat, r.lng) * 10) / 10 }))
      .filter((r) => r.distance_km <= MAX_RADIUS_KM));
  });

  router.post('/accept/:id', async (req, res) => {
    const busy = await pool.query(
      `SELECT 1 FROM service_requests WHERE mechanic_id=$1
       AND status IN ('ACCEPTED','EN_ROUTE','ARRIVED')`, [req.user.id]);
    if (busy.rowCount) return res.status(400).json({ error: 'Finish your current job first' });
    // WHERE status='REQUESTED' makes this atomic: only one mechanic can win
    const { rows } = await pool.query(
      `UPDATE service_requests SET status='ACCEPTED', mechanic_id=$1
       WHERE id=$2 AND status='REQUESTED' RETURNING id`, [req.user.id, req.params.id]);
    if (!rows.length) return res.status(409).json({ error: 'Job already taken' });
    const job = await getRequest(rows[0].id);
    io.to('user:' + job.user_id).emit('request:update', job);
    res.json(job);
  });

  router.post('/status/:id', async (req, res) => {
    const cur = await pool.query(
      'SELECT * FROM service_requests WHERE id=$1 AND mechanic_id=$2',
      [req.params.id, req.user.id]);
    if (!cur.rowCount) return res.status(404).json({ error: 'Not found' });
    const next = NEXT[cur.rows[0].status];
    if (!next || next !== req.body.status)
      return res.status(400).json({ error: 'Invalid status change' });
    await pool.query('UPDATE service_requests SET status=$1, completed_at=$2 WHERE id=$3',
      [next, next === 'COMPLETED' ? new Date() : null, req.params.id]);
    if (next === 'COMPLETED')
      await pool.query('INSERT INTO payments(request_id, amount) VALUES($1,$2)',
        [req.params.id, cur.rows[0].price]);
    const job = await getRequest(req.params.id);
    io.to('user:' + job.user_id).emit('request:update', job);
    res.json(job);
  });

  router.get('/active', async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id FROM service_requests WHERE mechanic_id=$1
       AND status IN ('ACCEPTED','EN_ROUTE','ARRIVED') LIMIT 1`, [req.user.id]);
    res.json(rows[0] ? await getRequest(rows[0].id) : null);
  });

  router.get('/earnings', async (req, res) => {
    const { rows } = await pool.query(
      `SELECT
         COALESCE(SUM(price) FILTER (WHERE completed_at > NOW() - INTERVAL '1 day'), 0) AS daily,
         COALESCE(SUM(price) FILTER (WHERE completed_at > NOW() - INTERVAL '7 days'), 0) AS weekly,
         COUNT(*)::int AS jobs
       FROM service_requests WHERE mechanic_id=$1 AND status='COMPLETED'`, [req.user.id]);
    const m = await pool.query('SELECT rating_avg FROM mechanics WHERE user_id=$1', [req.user.id]);
    res.json({ daily: Number(rows[0].daily), weekly: Number(rows[0].weekly),
      jobs: rows[0].jobs, rating: Number(m.rows[0]?.rating_avg || 0) });
  });

  return router;
};
