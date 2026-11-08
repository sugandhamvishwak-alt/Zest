// Zest Frontend Application Logic

const CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID'; // Replace with your Spotify Developer Client ID
const REDIRECT_URI = window.location.origin + window.location.pathname;
const WORKER_URL = 'https://zest-backend.sugandhamvishwak.workers.dev'; // Replace with your actual Cloudflare Worker URL

let accessToken = localStorage.getItem('spotify_access_token');
const audioElement = new Audio();

// 1. Spotify Authentication (Implicit Grant Flow)
function loginWithSpotify() {
    const scopes = ['user-read-private', 'playlist-read-private', 'user-library-read'];
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scopes.join(' '))}&response_type=token&show_dialog=true`;
    window.location.href = authUrl;
}

function handleAuthRedirect() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get('access_token');
    
    if (token) {
        accessToken = token;
        localStorage.setItem('spotify_access_token', token);
        window.location.hash = ''; // Clear token from URL bar
        loadUserLibrary();
    }
}

// 2. Search Tracks via Spotify API
async function searchTracks(query) {
    if (!accessToken) {
        loginWithSpotify();
        return;
    }

    try {
        const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=12`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await res.json();
        displaySearchResults(data.tracks.items);
    } catch (err) {
        console.error('Search error:', err);
    }
}

// 3. Request Audio Stream from our Cloudflare Worker Backend
async function playTrack(trackName, artistName, albumArtUrl) {
    const searchQuery = `${artistName} - ${trackName}`;
    console.log(`Fetching stream for: ${searchQuery}`);

    try {
        // Update UI to show loading state
        document.getElementById('player-title').innerText = "Loading stream...";
        document.getElementById('player-artist').innerText = artistName;
        if(albumArtUrl) document.getElementById('player-cover').src = albumArtUrl;

        const res = await fetch(`${WORKER_URL}/stream?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();

        if (data.streamUrl) {
            audioElement.src = data.streamUrl;
            audioElement.play();
            
            // Update active player UI
            document.getElementById('player-title').innerText = data.title;
            document.getElementById('play-btn').innerText = '⏸';
        } else {
            alert('Could not find a playable stream for this track.');
        }
    } catch (err) {
        console.error('Playback proxy error:', err);
        alert('Failed to connect to Zest streaming backend.');
    }
}

// 4. Player Controls Event Listeners
document.getElementById('play-btn')?.addEventListener('click', () => {
    if (audioElement.paused) {
        audioElement.play();
        document.getElementById('play-btn').innerText = '⏸';
    } else {
        audioElement.pause();
        document.getElementById('play-btn').innerText = '▶';
    }
});

// 5. Theme Unlock Logic (Monetization / Perks)
function verifyLicenseKey(key) {
    if (key.trim() === 'ZEST-PREMIUM-2026' || key.length > 10) { // Replace with your validation logic or Gumroad API check
        localStorage.setItem('zest_unlocked', 'true');
        alert('Custom Themes Unlocked Successfully!');
        applyUnlockedThemes();
    } else {
        alert('Invalid License Key.');
    }
}

function applyUnlockedThemes() {
    if (localStorage.getItem('zest_unlocked') === 'true') {
        document.body.classList.add('theme-unlocked');
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    handleAuthRedirect();
    applyUnlockedThemes();
    if (!accessToken && document.getElementById('login-btn')) {
        document.getElementById('login-btn').addEventListener('click', loginWithSpotify);
    }
});
