export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Endpoint 1: Search tracks via Spotify Public Search (or iTunes fallback if no token)
    if (url.pathname === '/search') {
      const q = url.searchParams.get('q');
      if (!q) return new Response(JSON.stringify([]), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      try {
        // Using iTunes Search API as a fast, reliable, keyless fallback for metadata & album art
        const searchRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=15`);
        const data = await searchRes.json();
        
        const tracks = data.results.map((item, index) => ({
          id: 'sp' + index,
          title: item.trackName,
          artist: item.artistName,
          cover: item.artworkUrl100.replace('100x100', '300x300'),
          src: '' // Will fetch stream on play
        }));

        return new Response(JSON.stringify(tracks), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Search failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Endpoint 2: Extract audio stream
    if (url.pathname === '/stream') {
      const q = url.searchParams.get('q');
      if (!q) {
        return new Response(JSON.stringify({ error: 'Query required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      try {
        const pipedBase = 'https://pipedapi.kavin.rocks';
        const searchRes = await fetch(`${pipedBase}/search?q=${encodeURIComponent(q)}&filter=music_songs`);
        const searchData = await searchRes.json();

        if (!searchData.items || searchData.items.length === 0) {
          return new Response(JSON.stringify({ error: 'No stream found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const videoId = searchData.items[0].url.split('v=')[1];
        const videoRes = await fetch(`${pipedBase}/streams/${videoId}`);
        const videoData = await videoRes.json();

        const audioStreams = videoData.audioStreams.sort((a, b) => b.bitrate - a.bitrate);
        return new Response(JSON.stringify({ streamUrl: audioStreams[0].url }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Stream extraction failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Zest Worker Online', { headers: corsHeaders });
  }
};
