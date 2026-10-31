import { MacOSNowPlayingResponse, Track } from '../types';

const BRIDGE_URL = 'http://localhost:4892';

let isBridgeOnline = false;

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
    return await res.json();
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
