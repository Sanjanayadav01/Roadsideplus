const pool = require('./db');
const { hash } = require('./utils/hash');

const TYPES = ['TYRE', 'BATTERY', 'FUEL', 'LOCKOUT', 'TOW', 'REPAIR'];

// Runs on every start but only inserts data when the users table is empty.
module.exports = async function seed() {
  const n = await pool.query('SELECT COUNT(*)::int AS n FROM users');
  if (n.rows[0].n > 0) return;
  const pw = await hash('demo123');
  const ids = {};
  for (const [role, name] of [['user', 'Demo User'], ['mechanic', 'Demo Mechanic'],
    ['admin', 'Demo Admin']]) {
    const { rows } = await pool.query(
      'INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id',
      [name, `demo_${role}@roadside.test`, pw, role]);
    ids[role] = rows[0].id;
  }
  await pool.query('INSERT INTO mechanics(user_id, rating_avg) VALUES($1, 4.6)', [ids.mechanic]);
  for (let i = 0; i < 30; i++) {
    const type = TYPES[i % TYPES.length];
    const price = 300 + Math.floor(Math.random() * 600);
    const when = new Date(Date.now() - Math.random() * 6 * 86400000);
    const r = await pool.query(
      `INSERT INTO service_requests(user_id,mechanic_id,service_type,lat,lng,status,price,
         created_at,completed_at)
       VALUES($1,$2,$3,28.67,77.45,'COMPLETED',$4,$5,$5) RETURNING id`,
      [ids.user, ids.mechanic, type, price, when]);
    await pool.query(
      "INSERT INTO payments(request_id,amount,status,method) VALUES($1,$2,'PAID','DEMO')",
      [r.rows[0].id, price]);
  }
  console.log('Seeded demo accounts (password: demo123) and 30 sample jobs');
};
