const pool = require('../db');
const auth = require('../middleware/auth');
const { nearestMechanics, getRequest } = require('../utils/matching');
const { calculatePrice, etaMinutes } = require('../utils/pricing');

const SERVICES = ['TYRE', 'BATTERY', 'FUEL', 'LOCKOUT', 'TOW', 'REPAIR'];

module.exports = (io) => {
  const router = require('express').Router();
  router.use(auth(['user']));

  function validate(body) {
    const { lat, lng, service_type } = body;
    return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) &&
      SERVICES.includes(service_type);
  }

  router.post('/estimate', async (req, res) => {
    if (!validate(req.body)) return res.status(400).json({ error: 'Invalid location or service' });
    const { lat, lng, service_type } = req.body;
    const near = await nearestMechanics(Number(lat), Number(lng), service_type);
    if (!near.length) return res.status(404).json({ error: 'No mechanics online nearby' });
    res.json({ price: calculatePrice(service_type, near[0].dist),
      eta_minutes: etaMinutes(near[0].dist), mechanics_nearby: near.length,
      nearest_km: Math.round(near[0].dist * 10) / 10 });
  });

  router.post('/request', async (req, res) => {
    if (!validate(req.body)) return res.status(400).json({ error: 'Invalid location or service' });
    const { lat, lng, address, service_type } = req.body;
    const busy = await pool.query(
      `SELECT 1 FROM service_requests WHERE user_id=$1
       AND status NOT IN ('COMPLETED','CANCELLED')`, [req.user.id]);
    if (busy.rowCount) return res.status(400).json({ error: 'You already have an active request' });
    const near = await nearestMechanics(Number(lat), Number(lng), service_type);
    if (!near.length) return res.status(404).json({ error: 'No mechanics online nearby' });
    const { rows } = await pool.query(
      `INSERT INTO service_requests(user_id,service_type,lat,lng,address,price)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
      [req.user.id, service_type, Number(lat), Number(lng), address || null,
       calculatePrice(service_type, near[0].dist)]);
    const job = await getRequest(rows[0].id);
    near.forEach((m) => io.to('mechanic:' + m.user_id).emit('request:new', job));
    res.status(201).json(job);
  });

  router.get('/active', async (req, res) => {
    const { rows } = await pool.query(
      `SELECT r.id, p.status AS payment_status FROM service_requests r
       LEFT JOIN payments p ON p.request_id = r.id
       WHERE r.user_id=$1 AND (r.status NOT IN ('COMPLETED','CANCELLED')
         OR (r.status='COMPLETED' AND p.status='PENDING'))
       ORDER BY r.id DESC LIMIT 1`, [req.user.id]);
    if (!rows[0]) return res.json(null);
    const job = await getRequest(rows[0].id);
    res.json({ ...job, payment_status: rows[0].payment_status });
  });

  router.get('/history', async (req, res) => {
    const { rows } = await pool.query(
      'SELECT * FROM service_requests WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
    res.json(rows);
  });

  router.post('/request/:id/cancel', async (req, res) => {
    const { rows } = await pool.query(
      `UPDATE service_requests SET status='CANCELLED'
       WHERE id=$1 AND user_id=$2 AND status IN ('REQUESTED','ACCEPTED') RETURNING *`,
      [req.params.id, req.user.id]);
    if (!rows.length) return res.status(400).json({ error: 'Cannot cancel now' });
    if (rows[0].mechanic_id)
      io.to('mechanic:' + rows[0].mechanic_id).emit('request:update', rows[0]);
    res.json(rows[0]);
  });

  router.post('/request/:id/review', async (req, res) => {
    const { rating, comment } = req.body;
    const stars = Number(rating);
    if (!(stars >= 1 && stars <= 5)) return res.status(400).json({ error: 'Rating must be 1-5' });
    const r = await pool.query(
      `SELECT mechanic_id FROM service_requests
       WHERE id=$1 AND user_id=$2 AND status='COMPLETED'`, [req.params.id, req.user.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Not found' });
    await pool.query(
      `INSERT INTO reviews(request_id,rating,comment) VALUES($1,$2,$3)
       ON CONFLICT (request_id) DO NOTHING`, [req.params.id, Math.round(stars), comment || null]);
    await pool.query(
      `UPDATE mechanics SET rating_avg = (
         SELECT ROUND(AVG(rv.rating)::numeric, 1) FROM reviews rv
         JOIN service_requests q ON q.id = rv.request_id WHERE q.mechanic_id = $1)
       WHERE user_id = $1`, [r.rows[0].mechanic_id]);
    res.json({ ok: true });
  });

  return router;
};
