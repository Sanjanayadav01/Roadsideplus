const router = require('express').Router();
const auth = require('../middleware/auth');

const SYSTEM = 'You are RoadSide+, a calm roadside assistant. Give short, safe tips for ' +
  'breakdowns (flat tyre, dead battery, overheating, out of fuel). Always advise moving to a ' +
  'safe place and turning on hazard lights first. For ETA questions say the live ETA is on the map.';

function mockReply(msg) {
  const m = msg.toLowerCase();
  if (/battery|start|dead/.test(m))
    return 'Turn off lights and AC, check the battery terminals are tight and clean. A mechanic can jump-start you: request Battery jump-start.';
  if (/tyre|tire|flat|puncture/.test(m))
    return 'Park safely, switch on hazard lights and do not drive on a flat tyre. Request a Tyre change.';
  if (/fuel|petrol|diesel|gas/.test(m))
    return 'Stay in a safe spot with hazard lights on and request Fuel delivery.';
  if (/overheat|smoke|steam|hot/.test(m))
    return 'Pull over, switch off the engine and wait 30 minutes before opening the bonnet. Never open the radiator cap when hot.';
  if (/key|lock/.test(m))
    return 'Stay near the car in a safe area and request Lockout assistance.';
  if (/eta|how long|when/.test(m))
    return "Your mechanic's live ETA and position are shown on the map.";
  return 'Move to a safe place, switch on hazard lights and request the service you need.';
}

router.post('/chat', auth(), async (req, res) => {
  const msg = String(req.body.message || '').slice(0, 500);
  if (!process.env.OPENAI_API_KEY) return res.json({ reply: mockReply(msg), source: 'mock' });
  try {
    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const out = await client.chat.completions.create({
      model: 'gpt-4o-mini', max_tokens: 250,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: msg }] });
    res.json({ reply: out.choices[0].message.content, source: 'openai' });
  } catch (e) {
    res.json({ reply: mockReply(msg), source: 'mock' });
  }
});

module.exports = router;
