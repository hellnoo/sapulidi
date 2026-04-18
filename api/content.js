import crypto from 'crypto';

const OWNER = 'hellnoo';
const REPO = 'sapulidi';
const BRANCH = 'main';
const PATH = 'data/materi.json';

function verifyToken(token, adminPass) {
  const expected = crypto.createHmac('sha256', adminPass).update('sapulidi-admin-2026').digest('hex');
  return token === expected;
}

async function readFile(githubToken) {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}?ref=${BRANCH}`, {
    headers: {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  if (!res.ok) {
    if (res.status === 404) return { items: [], sha: null };
    throw new Error(`GitHub read error: ${res.status}`);
  }
  const data = await res.json();
  const content = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
  return { items: content, sha: data.sha };
}

async function writeFile(githubToken, items, sha, message) {
  const body = {
    message,
    content: Buffer.from(JSON.stringify(items, null, 2)).toString('base64'),
    branch: BRANCH
  };
  if (sha) body.sha = sha;

  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || `GitHub write error: ${res.status}`);
  }
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const githubToken = process.env.GITHUB_TOKEN;
  const adminPass = process.env.ADMIN_PASSWORD;

  // GET — public read
  if (req.method === 'GET') {
    try {
      const { items } = await readFile(githubToken);
      return res.status(200).json({ items });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST — add item (requires admin token)
  if (req.method === 'POST') {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!adminPass || !verifyToken(token, adminPass)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { item } = req.body;
    if (!item || !item.judul || !item.tipe || !item.kat) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const { items, sha } = await readFile(githubToken);
      const newItem = {
        ...item,
        id: Date.now(),
        tanggal: new Date().toISOString().split('T')[0]
      };
      items.push(newItem);
      await writeFile(githubToken, items, sha, `Add content: ${item.judul}`);
      return res.status(200).json({ ok: true, item: newItem });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // PUT — update item by id
  if (req.method === 'PUT') {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!adminPass || !verifyToken(token, adminPass)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id, item } = req.body;
    if (!id || !item || !item.judul || !item.tipe || !item.kat) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const { items, sha } = await readFile(githubToken);
      const idx = items.findIndex(i => i.id == id);
      if (idx === -1) return res.status(404).json({ error: 'Item not found' });
      const updated = { ...items[idx], ...item, id: items[idx].id, tanggal: items[idx].tanggal };
      items[idx] = updated;
      await writeFile(githubToken, items, sha, `Update content id:${id}`);
      return res.status(200).json({ ok: true, item: updated });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE — remove item by id
  if (req.method === 'DELETE') {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!adminPass || !verifyToken(token, adminPass)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    try {
      const { items, sha } = await readFile(githubToken);
      const filtered = items.filter(i => i.id != id);
      await writeFile(githubToken, filtered, sha, `Remove content id:${id}`);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
