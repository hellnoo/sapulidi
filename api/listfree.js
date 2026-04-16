export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const key = process.env.OPENROUTER_KEY;
  if (!key) return res.status(500).json({ error: 'No key' });

  const r = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { 'Authorization': `Bearer ${key}` }
  });
  const data = await r.json();
  const free = (data.data || [])
    .filter(m => m.id.endsWith(':free'))
    .map(m => ({ id: m.id, modality: m.architecture?.modality || '?', ctx: m.context_length }));
  res.status(200).json({ count: free.length, models: free });
}
