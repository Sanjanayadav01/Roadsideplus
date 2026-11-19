import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { api } from '../api';
import { connectSocket } from '../socket';
import { payForRequest } from '../payment';
import { DEFAULT_POS, getPos, youIcon, mechIcon, dotIcon } from '../geo';
import ChatBox from '../components/ChatBox';
import StatusSteps from '../components/StatusSteps';

const SERVICES = [
  ['TYRE', 'Tyre change', 300], ['BATTERY', 'Battery jump-start', 350],
  ['FUEL', 'Fuel delivery', 250], ['LOCKOUT', 'Lockout', 400],
  ['TOW', 'Towing', 800], ['REPAIR', 'Minor repair', 500],
];
const NAME = Object.fromEntries(SERVICES.map((s) => [s[0], s[1]]));

function Picker({ onPick, disabled }) {
  useMapEvents({ click: (e) => { if (!disabled) onPick([e.latlng.lat, e.latlng.lng]); } });
  return null;
}
function Recenter({ pos }) {
  const map = useMap();
  useEffect(() => { map.setView(pos); }, [pos]); // eslint-disable-line
  return null;
}

export default function UserDashboard() {
  const [pos, setPos] = useState(DEFAULT_POS);
  const [type, setType] = useState('TYRE');
  const [quote, setQuote] = useState(null);
  const [job, setJob] = useState(null);
  const [mech, setMech] = useState(null);
  const [nearby, setNearby] = useState([]);
  const [msg, setMsg] = useState('');
  const [rating, setRating] = useState(5);
  const [rated, setRated] = useState(false);

  const loadNearby = () => api('/mechanics/nearby').then(setNearby).catch(() => {});
  const loadActive = () => api('/user/active').then(setJob).catch(() => {});

  useEffect(() => {
    getPos().then(({ pos: p }) => setPos(p));
    loadActive();
    loadNearby();
    const poll = setInterval(loadNearby, 8000);
    const s = connectSocket();
    s.on('connect', loadActive);
    s.on('request:update', (r) => setJob((j) => ({ ...(j || {}), ...r })));
    s.on('mechanic:location', (l) => setMech([l.lat, l.lng]));
    return () => { clearInterval(poll); s.disconnect(); };
  }, []);

  const body = () => ({ lat: pos[0], lng: pos[1], service_type: type });
  const run = async (fn) => { try { setMsg(''); await fn(); } catch (e) { setMsg(e.message); } };
  const getQuote = () => run(async () => { setQuote(null); setQuote(await api('/user/estimate', 'POST', body())); });
  const confirm = () => run(async () => { setMech(null); setJob(await api('/user/request', 'POST', body())); });
  const cancel = () => run(async () => setJob(await api(`/user/request/${job.id}/cancel`, 'POST')));
  const pay = () => run(async () => {
    if (await payForRequest(job.id)) setJob({ ...job, payment_status: 'PAID' });
  });
  const review = () => run(async () => {
    await api(`/user/request/${job.id}/review`, 'POST', { rating: Number(rating) });
    setRated(true);
  });
  const reset = () => { setJob(null); setQuote(null); setMech(null); setRated(false); loadNearby(); };

  const active = job && !['COMPLETED', 'CANCELLED'].includes(job.status);
  const paid = job?.payment_status === 'PAID';

  return (
    <div className="layout">
      <aside className="panel">
        {!job ? (<>
          <h3>Request roadside help</h3>
          <div className="svc-grid">
            {SERVICES.map(([code, label, base]) => (
              <button key={code} className={'svc' + (type === code ? ' on' : '')}
                onClick={() => { setType(code); setQuote(null); }}>
                <b>{label}</b><span>from Rs {base}</span>
              </button>))}
          </div>
          <button className="btn" onClick={getQuote}>Get price</button>
          {quote && (
            <div className="quote">
              <div><small>Price</small><strong>Rs {quote.price}</strong></div>
              <div><small>Arrives in</small><strong>{quote.eta_minutes} min</strong></div>
              <div><small>Mechanics nearby</small><strong>{quote.mechanics_nearby}</strong></div>
            </div>)}
          {quote && <button className="btn btn-go" onClick={confirm}>Confirm request</button>}
          <small className="muted">Your location is the yellow pin. Click the map to move it.</small>
        </>) : (<>
          <h3>Job #{job.id}: {NAME[job.service_type]}</h3>
          <StatusSteps status={job.status} />
          <p className="meta">Rs {job.price}{job.mechanic_name ? ` | Mechanic: ${job.mechanic_name}` : ' | Waiting for a mechanic to accept'}</p>
          {['REQUESTED', 'ACCEPTED'].includes(job.status) &&
            <button className="btn btn-danger" onClick={cancel}>Cancel request</button>}
          {job.status === 'COMPLETED' && !paid && <button className="btn btn-go" onClick={pay}>Pay Rs {job.price}</button>}
          {job.status === 'COMPLETED' && paid && !rated && (<>
            <p>Payment received. Rate the service:</p>
            <select value={rating} onChange={(e) => setRating(e.target.value)}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
            </select>
            <button className="btn" onClick={review}>Submit rating</button></>)}
          {((job.status === 'COMPLETED' && paid && rated) || job.status === 'CANCELLED') &&
            <button className="btn" onClick={reset}>New request</button>}
        </>)}
        <p className="error">{msg}</p>
        <hr /><ChatBox />
      </aside>
      <MapContainer center={pos} zoom={13} className="map">
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors" />
        <Recenter pos={pos} />
        <Picker onPick={setPos} disabled={!!job} />
        {!job && nearby.map((m, i) => <Marker key={i} position={[m.lat, m.lng]} icon={dotIcon} />)}
        <Marker position={job ? [job.lat, job.lng] : pos} icon={youIcon} />
        {active && mech && <Marker position={mech} icon={mechIcon} />}
      </MapContainer>
    </div>
  );
}
