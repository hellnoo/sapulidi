import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Missing password' });

  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminPass) return res.status(500).json({ error: 'Admin not configured' });

  if (password !== adminPass) return res.status(401).json({ error: 'Password salah' });

  const token = crypto.createHmac('sha256', adminPass).update('sapulidi-admin-2026').digest('hex');
  res.status(200).json({ ok: true, token });
}
