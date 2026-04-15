export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = process.env.GOOGLE_API_KEY;
  if (!key) return res.status(500).json({ error: 'GOOGLE_API_KEY not set' });

  try {
    const [v1beta, v1] = await Promise.all([
      fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`).then(r => r.json()),
      fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`).then(r => r.json()),
    ]);

    const extract = (data) => (data.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map(m => m.name);

    res.status(200).json({
      v1beta: v1beta.error ? v1beta.error.message : extract(v1beta),
      v1: v1.error ? v1.error.message : extract(v1),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
