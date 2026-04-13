export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageData, mimeType } = req.body;
    if (!imageData || !mimeType) return res.status(400).json({ error: 'Missing imageData or mimeType' });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${process.env.GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type: mimeType, data: imageData } },
            { text: `Kamu adalah sistem deteksi sampah cerdas untuk penelitian pengelolaan limbah S3. Analisis gambar ini dan identifikasi semua jenis sampah yang terlihat.\n\nBerikan respons HANYA dalam format JSON berikut tanpa teks tambahan:\n{"items":[{"nama":"nama spesifik sampah","kategori":"organik|anorganik|b3|residu","confidence":0-100,"penanganan":"cara penanganan singkat"}],"ringkasan":"deskripsi 1-2 kalimat","rekomendasi":"rekomendasi utama 1 kalimat"}` }
          ]}]
        })
      }
    );

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
