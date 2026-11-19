import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [f, setF] = useState({ name: '', email: '', password: '', phone: '', role: 'user' });
  const [err, setErr] = useState('');
  const { login } = useAuth();
  const nav = useNavigate();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    try { const { token, user } = await api('/auth/register', 'POST', f); login(token, user); nav('/'); }
    catch (e2) { setErr(e2.message); }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>Create account</h2>
      <input placeholder="Name" required onChange={set('name')} />
      <input type="email" placeholder="Email" required onChange={set('email')} />
      <input type="password" placeholder="Password (6+ characters)" required onChange={set('password')} />
      <input placeholder="Phone (optional)" onChange={set('phone')} />
      <select value={f.role} onChange={set('role')}>
        <option value="user">I need roadside help</option>
        <option value="mechanic">I am a mechanic</option>
      </select>
      <button className="btn">Create account</button>
      <p className="error">{err}</p>
      <p className="muted">Already registered? <Link to="/login">Log in</Link></p>
    </form>
  );
}
