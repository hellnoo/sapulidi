export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { q } = req.query;
  if (!q || !q.trim()) return res.status(400).json({ error: 'Missing query' });

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return res.status(500).json({ error: 'YouTube API key not configured' });

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('q', q.trim());
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', '12');
    url.searchParams.set('relevanceLanguage', 'id');
    url.searchParams.set('safeSearch', 'moderate');
    url.searchParams.set('key', key);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.error) return res.status(400).json({ error: data.error.message });

    const results = (data.items || []).map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumb: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
      desc: item.snippet.description,
      published: item.snippet.publishedAt
    }));

    res.status(200).json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
