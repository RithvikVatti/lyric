import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import os from 'os';

const app = express();
const PORT = process.env.PORT || 4892;

app.use(cors());
app.use(express.json());

const isMac = os.platform() === 'darwin';

// Execute AppleScript safely with timeout
function runAppleScript(script, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    if (!isMac) {
      return reject(new Error('AppleScript is only available on macOS'));
    }

    const command = `osascript -e '${script.replace(/'/g, "'\\''")}'`;
    exec(command, { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        if (error.killed) {
          return reject(new Error('AppleScript timed out'));
        }
        return reject(new Error(stderr || error.message));
      }
      resolve(stdout.trim());
    });
  });
}

// Check which music players are running in System Events
async function getRunningMusicApps() {
  if (!isMac) return { spotify: false, music: false };
  const script = `
    tell application "System Events"
      set isSpotify to (exists (processes where name is "Spotify"))
      set isMusic to (exists (processes where name is "Music"))
    end tell
    return (isSpotify as string) & "<|>" & (isMusic as string)
  `;
  try {
    const res = await runAppleScript(script, 1500);
    const [spotify, music] = res.split('<|>').map(s => s.trim() === 'true');
    return { spotify, music };
  } catch (e) {
    return { spotify: false, music: false };
  }
}

// Query Spotify
async function getSpotifyState() {
  const script = `
    tell application "Spotify"
      set pState to player state as string
      if pState is "stopped" then
        return "stopped<|>none<|>none<|>none<|>0<|>0<|>"
      end if
      set tName to name of current track
      set tArtist to artist of current track
      set tAlbum to album of current track
      set tPos to player position
      set tDur to (duration of current track) / 1000
      set tArt to artwork url of current track
      return pState & "<|>" & tName & "<|>" & tArtist & "<|>" & tAlbum & "<|>" & (tPos as string) & "<|>" & (tDur as string) & "<|>" & tArt
    end tell
  `;
  const t0 = Date.now();
  const res = await runAppleScript(script, 2000);
  const latencyMs = Date.now() - t0;
  const [state, track, artist, album, position, duration, artworkUrl] = res.split('<|>');
  return {
    state,
    track,
    artist,
    album,
    position: parseFloat(position) || 0,
    duration: parseFloat(duration) || 0,
    artworkUrl: artworkUrl || undefined,
    latencyMs,
    sampledAt: Date.now()
  };
}

// Query Apple Music
async function getAppleMusicState() {
  const script = `
    tell application "Music"
      set pState to player state as string
      if pState is "stopped" then
        return "stopped<|>none<|>none<|>none<|>0<|>0"
      end if
      set tName to name of current track
      set tArtist to artist of current track
      set tAlbum to album of current track
      set tPos to player position
      set tDur to duration of current track
      return pState & "<|>" & tName & "<|>" & tArtist & "<|>" & tAlbum & "<|>" & (tPos as string) & "<|>" & (tDur as string)
    end tell
  `;
  const t0 = Date.now();
  const res = await runAppleScript(script, 2000);
  const latencyMs = Date.now() - t0;
  const [state, track, artist, album, position, duration] = res.split('<|>');
  return {
    state,
    track,
    artist,
    album,
    position: parseFloat(position) || 0,
    duration: parseFloat(duration) || 0,
    latencyMs,
    sampledAt: Date.now()
  };
}

// Now-playing endpoint with high-precision timestamping
app.get('/api/now-playing', async (req, res) => {
  if (!isMac) {
    return res.json({
      activeApp: 'none',
      state: 'not_running',
      error: 'Companion is running on a non-macOS environment'
    });
  }

  try {
    const running = await getRunningMusicApps();

    // Check Spotify first if running
    if (running.spotify) {
      try {
        const spotState = await getSpotifyState();
        if (spotState.state === 'playing') {
          return res.json({
            activeApp: 'Spotify',
            ...spotState
          });
        }
      } catch (e) {
        // Continue to check Apple Music
      }
    }

    // Check Apple Music if running
    if (running.music) {
      try {
        const musicState = await getAppleMusicState();
        if (musicState.state === 'playing') {
          return res.json({
            activeApp: 'Music',
            ...musicState
          });
        }
      } catch (e) {
        // Fallback
      }
    }

    // Check paused state
    if (running.spotify) {
      try {
        const spotState = await getSpotifyState();
        return res.json({ activeApp: 'Spotify', ...spotState });
      } catch (e) {
        return res.json({
          activeApp: 'Spotify',
          state: 'permission_needed',
          error: e.message
        });
      }
    }

    if (running.music) {
      try {
        const musicState = await getAppleMusicState();
        return res.json({ activeApp: 'Music', ...musicState });
      } catch (e) {
        return res.json({
          activeApp: 'Music',
          state: 'permission_needed',
          error: e.message
        });
      }
    }

    return res.json({
      activeApp: 'none',
      state: 'stopped'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Controls
app.post('/api/player/play-pause', async (req, res) => {
  const { targetApp } = req.body;
  const appName = targetApp === 'Spotify' ? 'Spotify' : 'Music';
  try {
    await runAppleScript(`tell application "${appName}" to playpause`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/player/next', async (req, res) => {
  const { targetApp } = req.body;
  const appName = targetApp === 'Spotify' ? 'Spotify' : 'Music';
  try {
    await runAppleScript(`tell application "${appName}" to next track`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/player/previous', async (req, res) => {
  const { targetApp } = req.body;
  const appName = targetApp === 'Spotify' ? 'Spotify' : 'Music';
  try {
    await runAppleScript(`tell application "${appName}" to previous track`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/player/seek', async (req, res) => {
  const { targetApp, position } = req.body;
  const appName = targetApp === 'Spotify' ? 'Spotify' : 'Music';
  try {
    await runAppleScript(`tell application "${appName}" to set player position to ${position}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: os.platform(),
    isMac,
    service: 'Lumen macOS Companion Server'
  });
});

app.listen(PORT, () => {
  console.log(`✨ Lumen Companion Server running on http://localhost:${PORT}`);
});
