import { MacOSNowPlayingResponse, Track } from '../types';

const BRIDGE_URL = 'http://localhost:4892';

let isBridgeOnline = false;
const artworkCache = new Map<string, string>();

/**
 * Fetch high-res official artwork from iTunes Search API for any track
 */
export async function fetchArtworkForTrack(title: string, artist: string): Promise<string | null> {
  const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
  const cleanArtist = artist.split(/[,&]/)[0].trim();
  const key = `${cleanTitle.toLowerCase()}|${cleanArtist.toLowerCase()}`;

  if (artworkCache.has(key)) {
    return artworkCache.get(key)!;
  }

  try {
    const q = `${cleanArtist} ${cleanTitle}`;
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const rawArt = data.results[0].artworkUrl100 || '';
      const highResArt = rawArt.replace('100x100bb', '600x600bb');
      artworkCache.set(key, highResArt);
      return highResArt;
    }
  } catch (e) {
    console.warn('Artwork search failed:', e);
  }

  return null;
}

export async function checkBridgeHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`${BRIDGE_URL}/api/health`, { signal: controller.signal });
    clearTimeout(id);
    isBridgeOnline = res.ok;
    return isBridgeOnline;
  } catch (e) {
    isBridgeOnline = false;
    return false;
  }
}

export function getIsBridgeOnline(): boolean {
  return isBridgeOnline;
}

export async function fetchMacOSNowPlaying(): Promise<MacOSNowPlayingResponse | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${BRIDGE_URL}/api/now-playing`, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) return null;
    isBridgeOnline = true;
    const data: MacOSNowPlayingResponse = await res.json();

    // If artworkUrl is missing (common with Apple Music desktop), auto-fetch high-res cover
    if (data.state === 'playing' || data.state === 'paused') {
      if (!data.artworkUrl && data.track && data.artist) {
        const art = await fetchArtworkForTrack(data.track, data.artist);
        if (art) {
          data.artworkUrl = art;
        }
      }
    }

    return data;
  } catch (e) {
    isBridgeOnline = false;
    return null;
  }
}

export async function sendMacOSCommand(
  action: 'play-pause' | 'next' | 'previous' | 'seek',
  targetApp: 'Music' | 'Spotify',
  payload: Record<string, any> = {}
): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/player/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetApp, ...payload })
    });
    return res.ok;
  } catch (e) {
    console.warn(`Failed to send macOS command ${action}:`, e);
    return false;
  }
}
