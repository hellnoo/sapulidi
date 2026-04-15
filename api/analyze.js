const VISION_MODELS = [
  'google/gemma-3-27b-it:free',
  'meta-llama/llama-3.2-90b-vision-instruct:free',
  'qwen/qwen2.5-vl-7b-instruct:free',
  'microsoft/phi-3.5-vision-instruct:free',
];

const PROMPT = `Kamu adalah sistem deteksi sampah cerdas untuk penelitian pengelolaan limbah S3. Analisis gambar ini dan identifikasi semua jenis sampah yang terlihat.\n\nBerikan respons HANYA dalam format JSON berikut tanpa teks tambahan apapun:\n{"items":[{"nama":"nama spesifik sampah","kategori":"organik|anorganik|b3|residu","confidence":85,"penanganan":"cara penanganan singkat","masa_urai":"estimasi masa urai contoh: 2-4 minggu atau 450 tahun"}],"ringkasan":"deskripsi 1-2 kalimat","rekomendasi":"rekomendasi utama 1 kalimat"}`;

async function callModel(model, key, imageData, mimeType) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://sapulidi-two.vercel.app',
      'X-Title': 'SapuLidi'
    },
    body: JSON.stringify({
      model,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageData}` } },
          { type: 'text', text: PROMPT }
        ]
      }]
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.OPENROUTER_KEY;
  if (!key) return res.status(500).json({ error: 'OpenRouter API key not configured' });

  const { imageData, mimeType } = req.body;
  if (!imageData || !mimeType) return res.status(400).json({ error: 'Missing data' });

  let lastError = 'No vision model available';
  for (const model of VISION_MODELS) {
    try {
      const data = await callModel(model, key, imageData, mimeType);
      const text = data.choices[0].message.content;
      const clean = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean);
      return res.status(200).json(result);
    } catch (err) {
      lastError = `${model}: ${err.message}`;
      continue;
    }
  }

  res.status(500).json({ error: lastError });
}
