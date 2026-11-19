import { useEffect, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement,
  Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { api } from '../api';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);
const COLORS = ['#f2b705', '#1d2125', '#1e7b4f', '#c8372d', '#4a6fa5', '#8a8f98'];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState('');

  const load = () => {
    api('/admin/stats').then(setStats).catch((e) => setErr(e.message));
    api('/admin/requests').then(setRequests).catch(() => {});
    api('/admin/users').then(setUsers).catch(() => {});
  };
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);

  if (err) return <p className="card error">{err}</p>;
  if (!stats) return <p className="card">Loading...</p>;

  return (
    <div className="wide">
      <h2>Admin analytics</h2>
      <div className="tiles">
        <div className="tile"><small>Users</small><strong>{stats.users}</strong></div>
        <div className="tile"><small>Mechanics</small><strong>{stats.mechanics}</strong></div>
        <div className="tile"><small>Revenue</small><strong>Rs {stats.revenue}</strong></div>
        <div className="tile"><small>Requests</small>
          <strong>{Object.values(stats.by_status).reduce((a, b) => a + b, 0)}</strong></div>
      </div>
      <div className="charts">
        <div className="chart-box"><h4>Requests by service</h4>
          <Bar options={{ plugins: { legend: { display: false } } }}
            data={{ labels: Object.keys(stats.by_type),
              datasets: [{ data: Object.values(stats.by_type), backgroundColor: '#f2b705' }] }} /></div>
        <div className="chart-box"><h4>Requests by status</h4>
          <Doughnut data={{ labels: Object.keys(stats.by_status),
            datasets: [{ data: Object.values(stats.by_status), backgroundColor: COLORS }] }} /></div>
      </div>
      <h3>Latest requests</h3>
      <div className="scroll"><table>
        <thead><tr><th>ID</th><th>Service</th><th>Status</th><th>Price</th><th>Created</th></tr></thead>
        <tbody>{requests.slice(0, 20).map((r) => (
          <tr key={r.id}><td>{r.id}</td><td>{r.service_type}</td><td>{r.status}</td>
            <td>Rs {r.price}</td><td>{new Date(r.created_at).toLocaleString()}</td></tr>))}</tbody>
      </table></div>
      <h3>Users ({users.length})</h3>
      <div className="scroll"><table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
        <tbody>{users.map((u) => (
          <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td></tr>))}</tbody>
      </table></div>
    </div>
  );
}
