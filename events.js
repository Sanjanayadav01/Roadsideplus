const jwt = require('jsonwebtoken');

module.exports = (io, pool) => {
  // every socket must present a valid JWT in the handshake
  io.use((socket, next) => {
    try {
      socket.user = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET);
      next();
    } catch (e) { next(new Error('unauthorized')); }
  });

  io.on('connection', (socket) => {
    const { id, role } = socket.user;
    socket.join(`${role}:${id}`); // private room, e.g. "mechanic:7"

    // mechanic streams live position during a job; only the assigned mechanic is accepted
    socket.on('mechanic:location', async ({ request_id, lat, lng }) => {
      if (role !== 'mechanic') return;
      try {
        const { rows } = await pool.query(
          `SELECT user_id FROM service_requests
           WHERE id=$1 AND mechanic_id=$2 AND status IN ('ACCEPTED','EN_ROUTE','ARRIVED')`,
          [request_id, id]);
        if (!rows.length) return;
        await pool.query('UPDATE mechanics SET lat=$1, lng=$2 WHERE user_id=$3', [lat, lng, id]);
        io.to('user:' + rows[0].user_id).emit('mechanic:location', { lat, lng });
      } catch (e) { console.error('socket location error', e.message); }
    });
  });
};
