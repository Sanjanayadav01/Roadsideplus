const router = require('express').Router();
const jwt = require('jsonwebtoken');
const pool = require('../db');
const auth = require('../middleware/auth');
const { hash, compare } = require('../utils/hash');

const sign = (u) => jwt.sign({ id: u.id, role: u.role, name: u.name },
  process.env.JWT_SECRET, { expiresIn: '8h' });
const pub = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

router.post('/register', async (req, res) => {
  const { name, email, password, phone, role } = req.body;
  if (!name || !email || !password || password.length < 6)
    return res.status(400).json({ error: 'Name, email and 6+ character password required' });
  const r = role === 'mechanic' ? 'mechanic' : 'user'; // admin cannot self-register
  const mail = email.toLowerCase();
  const exists = await pool.query('SELECT 1 FROM users WHERE email=$1', [mail]);
  if (exists.rowCount) return res.status(409).json({ error: 'Email already registered' });
  const passwordHash = await hash(password);
  const { rows } = await pool.query(
    `INSERT INTO users(name,email,password_hash,phone,role)
     VALUES($1,$2,$3,$4,$5) RETURNING *`, [name, mail, passwordHash, phone || null, r]);
  if (r === 'mechanic')
    await pool.query('INSERT INTO mechanics(user_id) VALUES($1)', [rows[0].id]);
  res.status(201).json({ token: sign(rows[0]), user: pub(rows[0]) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query('SELECT * FROM users WHERE email=$1',
    [(email || '').toLowerCase()]);
  const u = rows[0];
  if (!u || !u.password_hash || !(await compare(password || '', u.password_hash)))
    return res.status(401).json({ error: 'Wrong email or password' });
  res.json({ token: sign(u), user: pub(u) });
});

router.post('/google', async (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID)
    return res.status(501).json({ error: 'Google sign-in not configured. Use a demo account.' });
  try {
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: req.body.credential, audience: process.env.GOOGLE_CLIENT_ID });
    const { email, name } = ticket.getPayload();
    let { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
    if (!rows.length)
      ({ rows } = await pool.query(
        `INSERT INTO users(name,email,role) VALUES($1,$2,'user') RETURNING *`,
        [name || 'Google User', email.toLowerCase()]));
    res.json({ token: sign(rows[0]), user: pub(rows[0]) });
  } catch (e) {
    res.status(401).json({ error: 'Google verification failed' });
  }
});

router.get('/demo/:role', async (req, res) => { // one-click demo buttons
  if (process.env.ENABLE_DEMO === 'false')
    return res.status(404).json({ error: 'Demo login disabled' });
  const { rows } = await pool.query('SELECT * FROM users WHERE email=$1',
    [`demo_${req.params.role}@roadside.test`]);
  if (!rows.length) return res.status(404).json({ error: 'Unknown demo role' });
  res.json({ token: sign(rows[0]), user: pub(rows[0]) });
});

router.get('/me', auth(), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
  if (!rows.length) return res.status(401).json({ error: 'User no longer exists' });
  res.json(pub(rows[0]));
});

module.exports = router;
