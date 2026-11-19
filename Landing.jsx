import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const HOME = { user: '/user', mechanic: '/mechanic', admin: '/admin' };

export default function Landing() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [err, setErr] = useState('');
  if (user) return <Navigate to={HOME[user.role]} replace />;

  async function demo(role) {
    try { const { token, user: u } = await api('/auth/demo/' + role); login(token, u); nav(HOME[u.role]); }
    catch (e) { setErr(e.message); }
  }

  return (
    <main>
      <section className="hero">
        <div className="hero-inner">
          <h1>Stuck on the road?<br />A mechanic is minutes away.</h1>
          <p>Share your location, see the price before you book, and watch your mechanic arrive on a live map.</p>
          <div className="hero-actions">
            <Link className="btn btn-lg" to="/register">Get help now</Link>
            <Link className="btn-ghost btn-lg" to="/login">Log in</Link>
          </div>
        </div>
        <div className="lane" aria-hidden="true" />
      </section>

      <section className="wrap">
        <h2>Try the live demo</h2>
        <p className="muted">One click, no sign-up. Open the mechanic and the driver in two browser windows to see requests arrive instantly.</p>
        <div className="demo-row">
          <button className="demo-card" onClick={() => demo('user')}><b>Driver</b><span>Request a tow, tyre change or fuel</span></button>
          <button className="demo-card" onClick={() => demo('mechanic')}><b>Mechanic</b><span>Go online and accept jobs</span></button>
          <button className="demo-card" onClick={() => demo('admin')}><b>Admin</b><span>Analytics, users and requests</span></button>
        </div>
        <p className="error">{err}</p>
      </section>

      <section className="wrap">
        <h2>What you get</h2>
        <div className="feat">
          <div><h4>Nearest mechanic, matched instantly</h4><p>Online mechanics within 25 km who offer your service are notified, nearest first.</p></div>
          <div><h4>Upfront price and ETA</h4><p>Base price plus Rs 12 per km, shown before you confirm.</p></div>
          <div><h4>Live tracking</h4><p>Watch the mechanic move on the map as status changes in real time.</p></div>
          <div><h4>AI assistant and online payment</h4><p>Get safe tips while you wait, then pay in the app.</p></div>
        </div>
      </section>
    </main>
  );
}
