import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

export default function ChatBox() {
  const [log, setLog] = useState([{ who: 'Assistant',
    t: 'Hi, I can help while you wait. Tell me what happened to your vehicle.' }]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [log]);

  async function send() {
    const t = text.trim();
    if (!t || busy) return;
    setLog((l) => [...l, { who: 'You', t }]);
    setText('');
    setBusy(true);
    try {
      const d = await api('/ai/chat', 'POST', { message: t });
      setLog((l) => [...l, { who: 'Assistant', t: d.reply }]);
    } catch (e) {
      setLog((l) => [...l, { who: 'Assistant', t: 'Could not get a reply. Please try again.' }]);
    }
    setBusy(false);
  }

  return (
    <div className="chat">
      <h4>AI roadside assistant</h4>
      <div className="chatlog">
        {log.map((m, i) => (
          <p key={i} className={m.who === 'You' ? 'me' : 'bot'}>{m.t}</p>
        ))}
        <div ref={end} />
      </div>
      <div className="chat-input">
        <input value={text} placeholder="e.g. my car will not start"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()} />
        <button className="btn" onClick={send} disabled={busy}>Send</button>
      </div>
    </div>
  );
}
