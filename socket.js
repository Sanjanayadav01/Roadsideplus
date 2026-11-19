import { io } from 'socket.io-client';
import { ROOT } from './api';

export const connectSocket = () =>
  io(ROOT, { auth: { token: localStorage.getItem('token') } });
