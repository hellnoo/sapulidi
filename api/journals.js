export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { q } = req.query;
  if (!q || !q.trim()) return res.status(400).json({ error: 'Missing query' });

  try {
    const url = new URL('https://api.semanticscholar.org/graph/v1/paper/search');
    url.searchParams.set('query', q.trim());
    url.searchParams.set('fields', 'title,authors,year,abstract,url,openAccessPdf,externalIds,venue');
    url.searchParams.set('limit', '10');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'SapuLidi/1.0 (waste-research-app)',
        'x-api-key': process.env.SEMANTIC_SCHOLAR_KEY || ''
      }
    });
    const data = await response.json();

    if (data.error) return res.status(400).json({ error: data.error, raw: data });
    if (!response.ok) return res.status(response.status).json({ error: `API error ${response.status}`, raw: data });

    const papers = data.data || data.papers || [];
    const results = papers.map(p => ({
      id: p.paperId,
      title: p.title || 'Untitled',
      authors: (p.authors || []).map(a => a.name).join(', ') || 'Unknown',
      year: p.year || '',
      abstract: p.abstract ? p.abstract.slice(0, 200) + (p.abstract.length > 200 ? '...' : '') : '',
      venue: p.venue || '',
      url: p.openAccessPdf?.url || p.url || '',
      doi: p.externalIds?.DOI || '',
      openAccess: !!p.openAccessPdf?.url
    }));

    res.status(200).json({ results, total: data.total || 0, debug: results.length === 0 ? data : undefined });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
