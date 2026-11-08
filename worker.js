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

    if (url.pathname === '/stream') {
      const q = url.searchParams.get('q');
      if (!q) {
        return new Response(JSON.stringify({ error: 'Query parameter q is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      try {
        const pipedInstances = [
          'https://pipedapi.kavin.rocks',
          'https://api.piped.privacydev.net',
          'https://pipedapi.drgns.space'
        ];
        
        const pipedBase = pipedInstances[0];
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
        const bestAudio = audioStreams[0];

        return new Response(JSON.stringify({
          title: searchData.items[0].title,
          videoId: videoId,
          streamUrl: bestAudio.url,
          mimeType: bestAudio.mimeType,
          duration: videoData.duration
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: 'Failed to extract stream', details: err.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Zest Backend Proxy Running', { headers: corsHeaders });
  }
};
