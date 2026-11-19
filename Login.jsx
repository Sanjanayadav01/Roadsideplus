import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const { login } = useAuth();
  const nav = useNavigate();

  async function done(promise) {
    try { const { token, user } = await promise; login(token, user); nav('/'); }
    catch (e) { setErr(e.message); }
  }

  return (
    <div className="card">
      <h2>Log in</h2>
      <form onSubmit={(e) => { e.preventDefault(); done(api('/auth/login', 'POST', f)); }}>
        <input type="email" placeholder="Email" required
          onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input type="password" placeholder="Password" required
          onChange={(e) => setF({ ...f, password: e.target.value })} />
        <button className="btn">Log in</button>
      </form>
      {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
        <div className="google">
          <GoogleLogin onSuccess={(r) => done(api('/auth/google', 'POST', { credential: r.credential }))}
            onError={() => setErr('Google sign-in failed')} />
        </div>)}
      <p className="muted">Or use a demo account:</p>
      <div className="demo-mini">
        {['user', 'mechanic', 'admin'].map((r) => (
          <button key={r} type="button" className="btn-ghost dark" onClick={() => done(api('/auth/demo/' + r))}>{r}</button>))}
      </div>
      <p className="error">{err}</p>
      <p className="muted">New here? <Link to="/register">Create an account</Link></p>
    </div>
  );
}
