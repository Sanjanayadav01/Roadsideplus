const pool = require('../db');
const { distanceKm } = require('./geo');

const MAX_RADIUS_KM = 25;

async function nearestMechanics(lat, lng, type, limit = 5) {
  const { rows } = await pool.query(
    `SELECT user_id, lat, lng FROM mechanics
     WHERE is_online = TRUE AND lat IS NOT NULL AND $1 = ANY(services)`, [type]);
  return rows
    .map((m) => ({ ...m, dist: distanceKm(lat, lng, m.lat, m.lng) }))
    .filter((m) => m.dist <= MAX_RADIUS_KM)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit);
}

async function getRequest(id) {
  const { rows } = await pool.query(
    `SELECT r.*, u.name AS user_name, mu.name AS mechanic_name
     FROM service_requests r
     JOIN users u ON u.id = r.user_id
     LEFT JOIN users mu ON mu.id = r.mechanic_id
     WHERE r.id = $1`, [id]);
  return rows[0];
}

module.exports = { nearestMechanics, getRequest, MAX_RADIUS_KM };
