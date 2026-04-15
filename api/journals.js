export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { q } = req.query;
  if (!q || !q.trim()) return res.status(400).json({ error: 'Missing query' });

  try {
    const url = new URL('https://api.openalex.org/works');
    url.searchParams.set('search', q.trim());
    url.searchParams.set('per-page', '10');
    url.searchParams.set('select', 'id,title,authorships,publication_year,abstract_inverted_index,open_access,doi,primary_location,cited_by_count');
    url.searchParams.set('mailto', 'sapulidi@research.app');

    const response = await fetch(url.toString());
    const data = await response.json();

    if (!response.ok) return res.status(response.status).json({ error: data.message || 'API error' });

    function toAbstract(inv) {
      if (!inv) return '';
      const words = [];
      for (const [word, positions] of Object.entries(inv)) {
        for (const pos of positions) words[pos] = word;
      }
      const text = words.join(' ');
      return text.length > 200 ? text.slice(0, 200) + '...' : text;
    }

    const results = (data.results || []).map(p => ({
      id: p.id,
      title: p.title || 'Untitled',
      authors: (p.authorships || []).slice(0, 3).map(a => a.author?.display_name).filter(Boolean).join(', ') || 'Unknown',
      year: p.publication_year || '',
      abstract: toAbstract(p.abstract_inverted_index),
      venue: p.primary_location?.source?.display_name || '',
      url: p.open_access?.oa_url || (p.doi ? `https://doi.org/${p.doi}` : ''),
      doi: p.doi || '',
      openAccess: !!p.open_access?.is_oa,
      citations: p.cited_by_count || 0
    }));

    res.status(200).json({ results, total: data.meta?.count || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
