import { api } from './api';

const loadScript = (src) => new Promise((resolve, reject) => {
  const s = document.createElement('script');
  s.src = src; s.onload = resolve; s.onerror = reject;
  document.body.appendChild(s);
});

// resolves true when paid, false if the user closed the Razorpay window
export async function payForRequest(id) {
  const d = await api(`/pay/${id}`, 'POST');
  if (d.mode === 'demo') return true;
  await loadScript('https://checkout.razorpay.com/v1/checkout.js');
  return new Promise((resolve, reject) => {
    new window.Razorpay({
      key: d.key, amount: d.amount, currency: 'INR', order_id: d.order_id, name: 'RoadSide+',
      handler: async (resp) => {
        try { await api(`/pay/${id}/verify`, 'POST', resp); resolve(true); }
        catch (e) { reject(e); }
      },
      modal: { ondismiss: () => resolve(false) },
    }).open();
  });
}
