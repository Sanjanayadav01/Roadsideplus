require('dotenv').config();
require('express-async-errors');
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const pool = require('./db');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET missing. Copy .env.example to .env first.');
  process.exit(1);
}

// allow the configured client URL plus any localhost port (Vite may pick 5174 etc.)
const allowed = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim());
const origin = (o, cb) =>
  cb(null, !o || allowed.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(o));

const app = express();
app.use(cors({ origin }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin } });
require('./sockets/events')(io, pool);

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user')(io));
app.use('/api/mechanic', require('./routes/mechanic')(io));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api', require('./routes/api'));

app.use((err, req, res, next) => { // catches errors from async routes
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

const PORT = process.env.PORT || 4000;
require('./seed')()
  .then(() => server.listen(PORT, () => console.log('API running on http://localhost:' + PORT)))
  .catch((e) => {
    console.error('Startup failed:', e.message);
    console.error('Did you run "npm run setup" and set DATABASE_URL in .env?');
    process.exit(1);
  });
