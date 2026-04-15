const PROMPT = `Kamu adalah sistem deteksi sampah cerdas untuk penelitian pengelolaan limbah S3. Analisis gambar ini dan identifikasi semua jenis sampah yang terlihat.\n\nBerikan respons HANYA dalam format JSON berikut tanpa teks tambahan apapun:\n{"items":[{"nama":"nama spesifik sampah","kategori":"organik|anorganik|b3|residu","confidence":85,"penanganan":"cara penanganan singkat","masa_urai":"estimasi masa urai contoh: 2-4 minggu atau 450 tahun"}],"ringkasan":"deskripsi 1-2 kalimat","rekomendasi":"rekomendasi utama 1 kalimat"}`;

const GEMINI_MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-001',
];

async function callGemini(model, key, imageData, mimeType) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: imageData } },
          { text: PROMPT }
        ]
      }],
      generationConfig: { temperature: 0.2 }
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.candidates[0].content.parts[0].text;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.GOOGLE_API_KEY;
  if (!key) return res.status(500).json({ error: 'Google API key not configured' });

  const { imageData, mimeType } = req.body;
  if (!imageData || !mimeType) return res.status(400).json({ error: 'Missing data' });

  let lastError = 'Gagal menghubungi Gemini API';
  for (const model of GEMINI_MODELS) {
    try {
      const text = await callGemini(model, key, imageData, mimeType);
      const clean = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean);
      return res.status(200).json(result);
    } catch (err) {
      lastError = err.message;
      continue;
    }
  }

  res.status(500).json({ error: lastError });
}
