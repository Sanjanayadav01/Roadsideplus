// Creates the "roadside" database (if missing) and applies schema.sql.
// Run once with:  npm run setup      (npm run reset wipes all data first)
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

(async () => {
  const url = new URL(process.env.DATABASE_URL);
  const dbName = url.pathname.slice(1);

  // 1) connect to the default "postgres" database and create ours if needed
  const adminUrl = new URL(process.env.DATABASE_URL);
  adminUrl.pathname = '/postgres';
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  if (process.argv.includes('--reset')) { // wipe everything and start fresh
    await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid <> pg_backend_pid()', [dbName]);
    await admin.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    console.log(`Dropped database "${dbName}"`);
  }
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [dbName]);
  if (!exists.rowCount) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Created database "${dbName}"`);
  } else {
    console.log(`Database "${dbName}" already exists`);
  }
  await admin.end();

  // 2) apply the schema
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  await db.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  await db.end();
  console.log('Tables created. Setup complete - now run: npm run dev');
})().catch((e) => {
  console.error('\nSetup failed:', e.message);
  if (/password authentication/i.test(e.message))
    console.error('-> Fix the username/password inside DATABASE_URL in server/.env');
  if (/ECONNREFUSED/i.test(e.message))
    console.error('-> PostgreSQL is not running. Start the "postgresql" service (services.msc).');
  process.exit(1);
});
