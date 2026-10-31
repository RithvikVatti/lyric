const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');
const os = require('os');

let mainWindow = null;
let companionServer = null;

const PORT = 4892;
const isMac = os.platform() === 'darwin';

// AppleScript helper
function runAppleScript(script, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    if (!isMac) {
      return reject(new Error('AppleScript is only available on macOS'));
    }
    const command = `osascript -e '${script.replace(/'/g, "'\\''")}'`;
    exec(command, { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(stderr || error.message));
      }
      resolve(stdout.trim());
    });
  });
}

// Running music apps check
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

// Spotify state
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

// Apple Music state
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

// Embedded native HTTP companion server (zero-dependency, robust)
function startEmbeddedCompanionServer() {
  companionServer = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = parsedUrl.pathname;

    // Helper to send JSON
    const sendJson = (statusCode, data) => {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    try {
      if (pathname === '/api/health') {
        return sendJson(200, {
          status: 'ok',
          platform: os.platform(),
          isMac,
          service: 'Lyric macOS Companion Server'
        });
      }

      if (pathname === '/api/now-playing') {
        if (!isMac) {
          return sendJson(200, { activeApp: 'none', state: 'not_running' });
        }

        const running = await getRunningMusicApps();

        if (running.spotify) {
          try {
            const spot = await getSpotifyState();
            if (spot.state === 'playing') {
              return sendJson(200, { activeApp: 'Spotify', ...spot });
            }
          } catch (e) {}
        }

        if (running.music) {
          try {
            const mus = await getAppleMusicState();
            if (mus.state === 'playing') {
              return sendJson(200, { activeApp: 'Music', ...mus });
            }
          } catch (e) {}
        }

        if (running.spotify) {
          try {
            const spot = await getSpotifyState();
            return sendJson(200, { activeApp: 'Spotify', ...spot });
          } catch (e) {}
        }

        if (running.music) {
          try {
            const mus = await getAppleMusicState();
            return sendJson(200, { activeApp: 'Music', ...mus });
          } catch (e) {}
        }

        return sendJson(200, { activeApp: 'none', state: 'stopped' });
      }

      if (pathname.startsWith('/api/player/')) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          let payload = {};
          try { payload = JSON.parse(body); } catch (e) {}
          const target = payload.targetApp === 'Spotify' ? 'Spotify' : 'Music';

          try {
            if (pathname === '/api/player/play-pause') {
              await runAppleScript(`tell application "${target}" to playpause`);
            } else if (pathname === '/api/player/next') {
              await runAppleScript(`tell application "${target}" to next track`);
            } else if (pathname === '/api/player/previous') {
              await runAppleScript(`tell application "${target}" to previous track`);
            } else if (pathname === '/api/player/seek' && payload.position !== undefined) {
              await runAppleScript(`tell application "${target}" to set player position to ${payload.position}`);
            }
            sendJson(200, { success: true });
          } catch (err) {
            sendJson(500, { error: err.message });
          }
        });
        return;
      }

      sendJson(404, { error: 'Not Found' });
    } catch (err) {
      sendJson(500, { error: err.message });
    }
  });

  companionServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${PORT} is already in use by another instance. Using existing companion service.`);
    } else {
      console.error('Embedded companion server error:', err);
    }
  });

  companionServer.listen(PORT, '127.0.0.1', () => {
    console.log(`✨ Lyric embedded companion listening on http://127.0.0.1:${PORT}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    title: 'Lyric',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#000000',
    trafficLightPosition: { x: 18, y: 18 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });

  const indexPath = path.join(__dirname, '../dist/index.html');
  const devUrl = process.env.VITE_DEV_SERVER_URL;

  if (devUrl) {
    mainWindow.loadURL(devUrl).catch(() => {
      mainWindow.loadFile(indexPath);
    });
  } else {
    mainWindow.loadFile(indexPath);
  }

  // Open external links in user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startEmbeddedCompanionServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (companionServer) {
    try { companionServer.close(); } catch (e) {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (companionServer) {
    try { companionServer.close(); } catch (e) {}
  }
});
