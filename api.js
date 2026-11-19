// mounted at /api : nearby mechanics + payments
const router = require('express').Router();
const crypto = require('crypto');
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/mechanics/nearby', auth(), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT m.lat, m.lng, u.name FROM mechanics m JOIN users u ON u.id = m.user_id
     WHERE m.is_online = TRUE AND m.lat IS NOT NULL`);
  res.json(rows);
});

async function ownPayment(req) {
  const { rows } = await pool.query(
    `SELECT p.* FROM payments p JOIN service_requests r ON r.id = p.request_id
     WHERE r.id=$1 AND r.user_id=$2`, [req.params.id, req.user.id]);
  return rows[0];
}

router.post('/pay/:id', auth(['user']), async (req, res) => {
  const p = await ownPayment(req);
  if (!p) return res.status(404).json({ error: 'Payment not found' });
  if (p.status === 'PAID') return res.json({ mode: 'demo', paid: true });
  if (!process.env.RAZORPAY_KEY_ID) { // demo mode, no real money
    await pool.query("UPDATE payments SET status='PAID', method='DEMO' WHERE id=$1", [p.id]);
    return res.json({ mode: 'demo', paid: true });
  }
  const Razorpay = require('razorpay');
  const rz = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET });
  const order = await rz.orders.create({ amount: p.amount * 100, currency: 'INR',
    receipt: 'req_' + req.params.id });
  await pool.query('UPDATE payments SET razorpay_order_id=$1 WHERE id=$2', [order.id, p.id]);
  res.json({ mode: 'razorpay', order_id: order.id, amount: order.amount,
    key: process.env.RAZORPAY_KEY_ID });
});

router.post('/pay/:id/verify', auth(['user']), async (req, res) => {
  const p = await ownPayment(req);
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!p || p.razorpay_order_id !== razorpay_order_id)
    return res.status(400).json({ error: 'Order mismatch' });
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + '|' + razorpay_payment_id).digest('hex');
  if (expected !== razorpay_signature)
    return res.status(400).json({ error: 'Signature mismatch' });
  await pool.query("UPDATE payments SET status='PAID', method='RAZORPAY' WHERE id=$1", [p.id]);
  res.json({ paid: true });
});

module.exports = router;
