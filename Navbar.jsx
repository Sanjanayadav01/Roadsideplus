import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className="nav">
      <Link to="/" className="brand">RoadSide<span>+</span></Link>
      <div className="nav-right">
        {user && <span className="who">{user.name}<em>{user.role}</em></span>}
        {user
          ? <button className="btn-ghost" onClick={() => { logout(); nav('/login'); }}>Log out</button>
          : <Link className="btn-ghost" to="/login">Log in</Link>}
      </div>
    </header>
  );
}
