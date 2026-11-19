import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { api } from '../api';
import { connectSocket } from '../socket';
import { getPos, youIcon, mechIcon, DEFAULT_POS } from '../geo';

const NEXT = { ACCEPTED: 'EN_ROUTE', EN_ROUTE: 'ARRIVED', ARRIVED: 'COMPLETED' };
const BTN = { ACCEPTED: 'Start driving to customer', EN_ROUTE: 'I have arrived', ARRIVED: 'Mark job complete' };

function Fit({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
    else if (points.length === 1) map.setView(points[0], 13);
  }, [points.map((p) => p.join()).join('|')]); // eslint-disable-line
  return null;
}

export default function MechanicDashboard() {
  const [online, setOnline] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [active, setActive] = useState(null);
  const [earn, setEarn] = useState({ daily: 0, weekly: 0, jobs: 0, rating: 0 });
  const [me, setMe] = useState(DEFAULT_POS);
  const [socket, setSocket] = useState(null);
  const [msg, setMsg] = useState('');
  const sim = useRef(null); // simulated travel state

  const loadEarn = () => api('/mechanic/earnings').then(setEarn).catch(() => {});
  const loadJobs = () => api('/mechanic/jobs').then(setJobs).catch(() => {});

  useEffect(() => {
    const s = connectSocket();
    setSocket(s);
    s.on('request:new', (r) => setJobs((j) => (j.some((x) => x.id === r.id) ? j : [r, ...j])));
    s.on('request:update', (r) =>
      setActive((a) => (a && a.id === r.id ? (r.status === 'CANCELLED' ? null : { ...a, ...r }) : a)));
    api('/mechanic/me').then((m) => { setOnline(m.is_online); if (m.lat != null) setMe([m.lat, m.lng]); });
    loadJobs();
    api('/mechanic/active').then(setActive);
    loadEarn();
    return () => s.disconnect();
  }, []);

  async function toggle() {
    setMsg('');
    const { pos, fallback } = await getPos();
    const next = !online;
    try {
      await api('/mechanic/online', 'POST', { online: next, lat: pos[0], lng: pos[1] });
      setOnline(next); setMe(pos);
      if (fallback && next) setMsg('Location blocked, so a default point in Ghaziabad is used.');
      if (next) loadJobs(); else setJobs([]);
    } catch (e) { setMsg(e.message); }
  }

  async function accept(id) {
    try {
      const job = await api('/mechanic/accept/' + id, 'POST');
      setActive(job);
      setJobs((j) => j.filter((x) => x.id !== id));
    } catch (e) { setMsg(e.message); setJobs((j) => j.filter((x) => x.id !== id)); }
  }

  async function advance() {
    try {
      const upd = await api('/mechanic/status/' + active.id, 'POST', { status: NEXT[active.status] });
      if (upd.status === 'COMPLETED') { setActive(null); sim.current = null; loadEarn(); }
      else setActive(upd);
    } catch (e) { setMsg(e.message); }
  }

  // Stream location while on a job. The drive is simulated: the mechanic starts about 3 km
  // away from the customer and moves closer every 2 seconds, so the demo works on one laptop.
  useEffect(() => {
    if (!active || !socket) return;
    const dest = [active.lat, active.lng];
    if (!sim.current || sim.current.id !== active.id) {
      const start = [dest[0] + 0.02, dest[1] + 0.02];
      sim.current = { id: active.id, start, t: 0 };
    }
    const s = sim.current;
    const emit = () => {
      const p = [s.start[0] + (dest[0] - s.start[0]) * s.t, s.start[1] + (dest[1] - s.start[1]) * s.t];
      setMe(p);
      socket.emit('mechanic:location', { request_id: active.id, lat: p[0], lng: p[1] });
    };
    if (active.status === 'ARRIVED') { s.t = 1; emit(); return; }
    emit();
    if (active.status !== 'EN_ROUTE') return;
    const timer = setInterval(() => { s.t = Math.min(1, s.t + 0.08); emit(); }, 2000);
    return () => clearInterval(timer);
  }, [active?.id, active?.status, socket]); // eslint-disable-line

  const points = active ? [me, [active.lat, active.lng]] : [me];

  return (
    <div className="wide">
      <div className="mech-head">
        <div>
          <h2>Mechanic dashboard</h2>
          <span className={'badge ' + (online ? 'on' : 'off')}>{online ? 'Online' : 'Offline'}</span>
        </div>
        <button className={'btn ' + (online ? 'btn-danger' : 'btn-go')} onClick={toggle} disabled={!!active}>
          {online ? 'Go offline' : 'Go online'}
        </button>
      </div>
      <div className="tiles">
        <div className="tile"><small>Today</small><strong>Rs {earn.daily}</strong></div>
        <div className="tile"><small>This week</small><strong>Rs {earn.weekly}</strong></div>
        <div className="tile"><small>Jobs done</small><strong>{earn.jobs}</strong></div>
        <div className="tile"><small>Rating</small><strong>{earn.rating || '-'}</strong></div>
      </div>
      <p className="error">{msg}</p>
      <div className="mech-grid">
        <div>
          {active ? (
            <div className="job-card">
              <h3>Active job #{active.id}: {active.service_type}</h3>
              <p className="meta">Customer: {active.user_name} | Rs {active.price}</p>
              <p>Status: <b>{active.status.replace('_', ' ')}</b></p>
              <a target="_blank" rel="noreferrer"
                href={`https://www.openstreetmap.org/?mlat=${active.lat}&mlon=${active.lng}#map=16/${active.lat}/${active.lng}`}>
                Open customer location in OpenStreetMap</a>
              <button className="btn btn-go" onClick={advance}>{BTN[active.status]}</button>
            </div>
          ) : (<>
            <h3>Incoming requests</h3>
            {!online && <p className="muted">Go online to receive requests within 25 km.</p>}
            {online && !jobs.length && <p className="muted">No requests right now. New ones appear here instantly.</p>}
            {jobs.map((j) => (
              <div key={j.id} className="job-row">
                <div><b>{j.service_type}</b> for {j.user_name}
                  <small>Rs {j.price}{j.distance_km != null ? ` | ${j.distance_km} km away` : ''}</small></div>
                <button className="btn" onClick={() => accept(j.id)}>Accept</button>
              </div>))}
          </>)}
        </div>
        <MapContainer center={me} zoom={13} className="map small-map">
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors" />
          <Fit points={points} />
          <Marker position={me} icon={mechIcon} />
          {active && <Marker position={[active.lat, active.lng]} icon={youIcon} />}
        </MapContainer>
      </div>
    </div>
  );
}
