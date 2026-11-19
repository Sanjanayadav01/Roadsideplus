import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import 'leaflet/dist/leaflet.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

const gid = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const app = <AuthProvider><App /></AuthProvider>;
ReactDOM.createRoot(document.getElementById('root')).render(
  gid ? <GoogleOAuthProvider clientId={gid}>{app}</GoogleOAuthProvider> : app);
