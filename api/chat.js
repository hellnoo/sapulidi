const SYSTEM = `Kamu adalah asisten riset cerdas untuk aplikasi SapuLidi, mendukung penelitian disertasi S3 tentang pengelolaan sampah terpadu di Indonesia. Kamu ahli dalam:
- Jenis dan kategorisasi sampah (organik, anorganik, B3, residu)
- Teknologi pengelolaan sampah (kompos, daur ulang, biogas, insinerasi)
- Regulasi sampah Indonesia (UU 18/2008, PP 81/2012, dll)
- Metodologi penelitian lingkungan
- Ekonomi sirkular dan zero waste
- Bank sampah dan pengelolaan berbasis masyarakat

Jawab dalam Bahasa Indonesia, ringkas, akurat, dan akademis. Gunakan bullet points jika perlu.`;

const MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-3-27b-it:free',
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.OPENROUTER_KEY;
  if (!key) return res.status(500).json({ error: 'OpenRouter API key not configured' });

  const { messages } = req.body;
  if (!messages || !messages.length) return res.status(400).json({ error: 'Missing messages' });

  const payload = [{ role: 'system', content: SYSTEM }, ...messages.slice(-10)];

  let lastError = 'Semua model gagal';
  for (const model of MODELS) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://sapulidi-two.vercel.app',
          'X-Title': 'SapuLidi'
        },
        body: JSON.stringify({ model, messages: payload })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      return res.status(200).json({ reply: data.choices[0].message.content });
    } catch (err) {
      lastError = err.message;
    }
  }
  res.status(500).json({ error: lastError });
}
