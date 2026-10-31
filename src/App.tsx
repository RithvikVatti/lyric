import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Track,
  LyricsData,
  ColorPalette,
  RimLightConfig,
  LyricStyle
} from './types';
import { DEMO_TRACKS, visualizerEngine, createTrackFromFile } from './services/audioManager';
import { fetchLyricsFromLRCLIB } from './services/lrclib';
import { extractPaletteFromImage, PRESET_PALETTES } from './services/colorExtractor';
import {
  checkBridgeHealth,
  fetchMacOSNowPlaying,
  sendMacOSCommand,
  fetchArtworkForTrack
} from './services/macosBridge';
import { globalClock } from './services/playbackClock';

import { BlurredCoverBackground } from './components/BlurredCoverBackground';
import { AmbientRimLights } from './components/AmbientRimLights';
import { LiquidGlassPlayer } from './components/LiquidGlassPlayer';
import { SyncedLyricsView } from './components/SyncedLyricsView';
import { ControlsModal } from './components/ControlsModal';
import { TrackSearchModal } from './components/TrackSearchModal';

import {
  Sun,
  Sliders,
  Sparkles,
  Maximize2,
  Minimize2,
  Clock
} from 'lucide-react';

export const App: React.FC = () => {
  // Playback & Track State
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [currentTrack, setCurrentTrack] = useState<Track>(DEMO_TRACKS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(DEMO_TRACKS[0].duration);
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Audio Visualizer Energy for Ambient Rim Lights
  const [audioEnergy, setAudioEnergy] = useState({ bass: 0.1, mid: 0.1, treble: 0.1, overall: 0.1 });

  // Palette State
  const [extractedPalette, setExtractedPalette] = useState<ColorPalette>(PRESET_PALETTES['album-art']);

  // Configuration States
  const [rimConfig, setRimConfig] = useState<RimLightConfig>({
    enabled: true,
    mode: 'aurora',
    thickness: 16,
    blur: 40,
    intensity: 0.9,
    beatReactivity: 0.5,
    palettePreset: 'album-art'
  });

  const [syncOffset, setSyncOffset] = useState<number>(0);
  const [lyricStyle, setLyricStyle] = useState<LyricStyle>('verci-single-word');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isMacBridgeOnline, setIsMacBridgeOnline] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync manual offset with globalClock
  useEffect(() => {
    globalClock.setManualOffset(syncOffset);
  }, [syncOffset]);

  // Derived effective palette based on preset
  const activePalette = rimConfig.palettePreset === 'album-art'
    ? extractedPalette
    : PRESET_PALETTES[rimConfig.palettePreset] || extractedPalette;

  // 1. Initialize HTML5 Audio Element & Visualizer Engine
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      if (!currentTrack.source.startsWith('macos-')) {
        globalClock.sync(audio.currentTime, !audio.paused, 0);
      }
    };

    const handleEnded = () => {
      handleNext();
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    visualizerEngine.init(audio);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, [currentTrack]);

  // 2. High-Precision 120Hz / 60Hz RequestAnimationFrame Tick Loop
  useEffect(() => {
    let loopId: number;

    const tick = () => {
      const nowPos = globalClock.now();
      setCurrentTime(nowPos);

      if (isPlaying) {
        const energy = visualizerEngine.getAudioEnergy();
        setAudioEnergy(energy);
      } else {
        setAudioEnergy({ bass: 0.05, mid: 0.05, treble: 0.05, overall: 0.05 });
      }

      loopId = requestAnimationFrame(tick);
    };

    loopId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(loopId);
  }, [isPlaying]);

  // 3. Extract palette and load lyrics when track changes
  useEffect(() => {
    let isCancelled = false;

    extractPaletteFromImage(currentTrack.albumArt).then((palette) => {
      if (!isCancelled) setExtractedPalette(palette);
    });

    setLyricsLoading(true);
    fetchLyricsFromLRCLIB(
      currentTrack.title,
      currentTrack.artist,
      currentTrack.album,
      currentTrack.duration
    ).then((res) => {
      if (!isCancelled) {
        setLyrics(res);
        setLyricsLoading(false);
      }
    });

    if (audioRef.current && currentTrack.audioUrl) {
      if (audioRef.current.src !== currentTrack.audioUrl) {
        audioRef.current.src = currentTrack.audioUrl;
        audioRef.current.load();
        if (isPlaying) {
          audioRef.current.play().catch(e => console.warn('Autoplay prevented:', e));
        }
      }
    }

    return () => {
      isCancelled = true;
    };
  }, [currentTrack]);

  // 4. macOS Bridge Polling (every 350ms)
  useEffect(() => {
    let timer: any;
    let isMounted = true;

    const pollBridge = async () => {
      const isOnline = await checkBridgeHealth();
      if (!isMounted) return;
      setIsMacBridgeOnline(isOnline);

      if (isOnline) {
        const macState = await fetchMacOSNowPlaying();
        if (macState && (macState.state === 'playing' || macState.state === 'paused')) {
          const macSource = macState.activeApp === 'Spotify' ? 'macos-spotify' : 'macos-music';
          const isPlayingState = macState.state === 'playing';

          if (
            currentTrack.title !== macState.track ||
            currentTrack.artist !== macState.artist ||
            currentTrack.source !== macSource
          ) {
            let artwork = macState.artworkUrl;
            if (!artwork && macState.track && macState.artist) {
              artwork = (await fetchArtworkForTrack(macState.track, macState.artist)) || undefined;
            }

            setCurrentTrack({
              id: `mac-${Date.now()}`,
              title: macState.track,
              artist: macState.artist,
              album: macState.album || 'Now Playing',
              albumArt: artwork || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
              duration: macState.duration || 200,
              position: macState.position || 0,
              isPlaying: isPlayingState,
              source: macSource,
              badge: `${macState.activeApp}`
            });

            setDuration(macState.duration);
            setIsPlaying(isPlayingState);
            globalClock.sync(macState.position, isPlayingState, macState.latencyMs || 180);
          } else {
            setIsPlaying(isPlayingState);
            globalClock.sync(macState.position, isPlayingState, macState.latencyMs || 180);

            if (macState.artworkUrl && currentTrack.albumArt !== macState.artworkUrl) {
              setCurrentTrack(t => ({ ...t, albumArt: macState.artworkUrl! }));
            }
          }
        }
      }

      if (isMounted) {
        timer = setTimeout(pollBridge, 350);
      }
    };

    pollBridge();
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [currentTrack]);

  // Controls
  const handlePlayPause = useCallback(() => {
    visualizerEngine.resume();
    if (currentTrack.source.startsWith('macos-')) {
      const targetApp = currentTrack.source === 'macos-spotify' ? 'Spotify' : 'Music';
      sendMacOSCommand('play-pause', targetApp);
      setIsPlaying(!isPlaying);
      globalClock.sync(currentTime, !isPlaying, 0);
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        globalClock.sync(audioRef.current.currentTime, false, 0);
      } else {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          globalClock.sync(audioRef.current!.currentTime, true, 0);
        }).catch(err => {
          console.warn('Audio play error:', err);
          setIsPlaying(true);
          globalClock.sync(currentTime, true, 0);
        });
      }
    }
  }, [isPlaying, currentTrack, currentTime]);

  const handleNext = useCallback(() => {
    if (currentTrack.source.startsWith('macos-')) {
      const targetApp = currentTrack.source === 'macos-spotify' ? 'Spotify' : 'Music';
      sendMacOSCommand('next', targetApp);
      return;
    }
    const nextIdx = (currentTrackIndex + 1) % DEMO_TRACKS.length;
    setCurrentTrackIndex(nextIdx);
    setCurrentTrack(DEMO_TRACKS[nextIdx]);
    globalClock.reset(0, true);
  }, [currentTrackIndex, currentTrack]);

  const handlePrev = useCallback(() => {
    if (currentTrack.source.startsWith('macos-')) {
      const targetApp = currentTrack.source === 'macos-spotify' ? 'Spotify' : 'Music';
      sendMacOSCommand('previous', targetApp);
      return;
    }
    const prevIdx = (currentTrackIndex - 1 + DEMO_TRACKS.length) % DEMO_TRACKS.length;
    setCurrentTrackIndex(prevIdx);
    setCurrentTrack(DEMO_TRACKS[prevIdx]);
    globalClock.reset(0, true);
  }, [currentTrackIndex, currentTrack]);

  const handleSeek = useCallback((seconds: number) => {
    if (currentTrack.source.startsWith('macos-')) {
      const targetApp = currentTrack.source === 'macos-spotify' ? 'Spotify' : 'Music';
      sendMacOSCommand('seek', targetApp, { position: seconds });
    }
    if (audioRef.current && isFinite(seconds)) {
      audioRef.current.currentTime = seconds;
    }
    globalClock.reset(seconds, isPlaying);
    setCurrentTime(seconds);
  }, [currentTrack, isPlaying]);

  const handleSelectTrack = useCallback((index: number) => {
    if (index >= 0 && index < DEMO_TRACKS.length) {
      setCurrentTrackIndex(index);
      setCurrentTrack(DEMO_TRACKS[index]);
      globalClock.reset(0, true);
      setIsPlaying(true);
    }
  }, []);

  const handleSelectSearchedTrack = useCallback((track: Track) => {
    setCurrentTrack(track);
    globalClock.reset(0, true);
    setIsPlaying(true);
  }, []);

  const handleFileUpload = useCallback((file: File) => {
    const localTrack = createTrackFromFile(file);
    setCurrentTrack(localTrack);
    globalClock.reset(0, true);
    setIsPlaying(true);
    setIsSettingsOpen(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  const adjustSyncOffset = useCallback((deltaMs: number) => {
    setSyncOffset(curr => {
      const next = curr + deltaMs;
      const label = next > 0 ? `+${next}ms` : `${next}ms`;
      setSyncFeedback(`Sync: ${label}`);
      setTimeout(() => setSyncFeedback(null), 1500);
      return next;
    });
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSeek(Math.min(duration, currentTime + 5));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(Math.max(0, currentTime - 5));
      } else if (e.key === 'r' || e.key === 'R') {
        setRimConfig(c => ({ ...c, enabled: !c.enabled }));
      } else if (e.key === 'l' || e.key === 'L') {
        setLyricStyle(curr => {
          const styles: LyricStyle[] = ['verci-single-word', 'smooth-captions', 'cinematic', 'perspective-3d'];
          const next = styles[(styles.indexOf(curr) + 1) % styles.length];
          const labels: Record<LyricStyle, string> = {
            'verci-single-word': 'Single Word (Verci)',
            'smooth-captions': 'Smooth Captions',
            'cinematic': 'Cinematic Flow',
            'perspective-3d': '3D Wall'
          };
          setSyncFeedback(`Style: ${labels[next]}`);
          setTimeout(() => setSyncFeedback(null), 1500);
          return next;
        });
      } else if (e.key === '[') {
        adjustSyncOffset(-50);
      } else if (e.key === ']') {
        adjustSyncOffset(50);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, toggleFullscreen, handleSeek, currentTime, duration, adjustSyncOffset]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-slate-100 flex flex-col justify-between font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Natural Blurred Version of the Cover Art as Screen Background */}
      <BlurredCoverBackground coverUrl={currentTrack.albumArt} />

      {/* 2. Ambient Screen-Edge Rim Lighting (trylumn.xyz) */}
      <AmbientRimLights
        config={rimConfig}
        palette={activePalette}
        audioEnergy={audioEnergy}
        isPlaying={isPlaying}
      />

      {/* Floating Sync Calibration Feedback Pill */}
      {syncFeedback && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="glass-pill px-4 py-2 rounded-full text-xs font-mono font-bold text-cyan-300 shadow-2xl flex items-center gap-2 border border-cyan-400/40">
            <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            <span>{syncFeedback}</span>
          </div>
        </div>
      )}

      {/* 3. Top Floating Header Bar */}
      <header className="relative z-30 w-full px-6 py-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div
            className="w-9 h-9 rounded-2xl glass-panel flex items-center justify-center text-cyan-400 shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition"
            onClick={() => setIsSettingsOpen(true)}
            style={{ borderColor: activePalette.accent }}
          >
            <Sun className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold tracking-tight text-white drop-shadow">
                Lumen
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
                OSS
              </span>
            </div>
            <p className="text-[10px] text-white/50 tracking-wide font-medium">
              Ambient Rim & Synced Lyrics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setRimConfig(c => ({ ...c, enabled: !c.enabled }))}
            className={`p-2.5 rounded-2xl glass-button text-xs font-semibold flex items-center gap-1.5 transition ${
              rimConfig.enabled ? 'text-amber-300 border-amber-400/40' : 'text-white/50'
            }`}
            title="Toggle Rim Lighting (R)"
          >
            <Sun className="w-4 h-4" />
            <span className="hidden sm:inline">Rim Glow</span>
          </button>

          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-2.5 rounded-2xl glass-button text-xs font-semibold flex items-center gap-1.5 text-white/80 hover:text-white transition"
            title="Search songs on iTunes & LRCLIB"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Search Songs</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 rounded-2xl glass-button text-white/80 hover:text-white transition"
            title="Settings & Controls"
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-2xl glass-button text-white/80 hover:text-white transition"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* 4. Main Stage View: Reference Player Card (Left) & Synced Lyrics (Right) */}
      <main className="relative z-20 flex-1 w-full h-[calc(100vh-120px)] overflow-hidden px-6 sm:px-10 md:px-16 flex items-center justify-center">
        <div className="w-full h-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center py-4">
          {/* LEFT: Cover art player card matching the reference image */}
          <div className="lg:col-span-5 flex justify-center items-center h-full">
            <LiquidGlassPlayer
              track={currentTrack}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              onNext={handleNext}
              onPrev={handlePrev}
              onSeek={handleSeek}
            />
          </div>

          {/* RIGHT: High-end Synced Lyrics */}
          <div className="lg:col-span-7 h-full flex flex-col justify-center overflow-hidden">
            <SyncedLyricsView
              lyrics={lyrics}
              currentTime={currentTime}
              duration={duration}
              palette={activePalette}
              style={lyricStyle}
              onChangeStyle={setLyricStyle}
              onSeek={handleSeek}
              onSearchOpen={() => setIsSearchOpen(true)}
            />
          </div>
        </div>
      </main>

      {/* 5. Bottom Status Dock */}
      <footer className="relative z-30 w-full px-6 py-3 flex items-center justify-between text-xs text-white/50 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Quick Demo Switcher if not connected to macOS app */}
          {!currentTrack.source.startsWith('macos-') && (
            <select
              value={currentTrackIndex}
              onChange={(e) => handleSelectTrack(parseInt(e.target.value, 10))}
              className="bg-black/40 text-white/80 text-xs rounded-xl px-2.5 py-1 border border-white/10 outline-none cursor-pointer hover:bg-black/60 transition"
            >
              {DEMO_TRACKS.map((t, idx) => (
                <option key={t.id} value={idx} className="bg-zinc-900 text-white">
                  {t.title} — {t.artist}
                </option>
              ))}
            </select>
          )}

          {/* Quick Caption Style Pills */}
          <div className="hidden sm:flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 backdrop-blur-md">
            <button
              onClick={() => setLyricStyle('verci-single-word')}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                lyricStyle === 'verci-single-word'
                  ? 'bg-white text-black'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              ✦ Single Word
            </button>
            <button
              onClick={() => setLyricStyle('smooth-captions')}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                lyricStyle === 'smooth-captions'
                  ? 'bg-white text-black'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Smooth Captions
            </button>
            <button
              onClick={() => setLyricStyle('cinematic')}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                lyricStyle === 'cinematic'
                  ? 'bg-white text-black'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Cinematic
            </button>
            <button
              onClick={() => setLyricStyle('perspective-3d')}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                lyricStyle === 'perspective-3d'
                  ? 'bg-white text-black'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              3D Wall
            </button>
          </div>
        </div>

        {/* Sync Calibration Controls & Hotkeys */}
        <div className="flex items-center gap-3 pointer-events-auto text-[11px]">
          <div className="flex items-center gap-1 font-mono">
            <span className="text-white/40">Sync:</span>
            <button
              onClick={() => adjustSyncOffset(-50)}
              className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-bold"
              title="Shift earlier (-50ms) [ key"
            >
              -50ms
            </button>
            <span className="text-cyan-300 font-bold px-1">
              {syncOffset > 0 ? `+${syncOffset}` : syncOffset}ms
            </span>
            <button
              onClick={() => adjustSyncOffset(50)}
              className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-bold"
              title="Shift later (+50ms) ] key"
            >
              +50ms
            </button>
          </div>

          <span className="hidden md:inline text-white/30">•</span>
          <span className="hidden md:inline text-white/40 font-medium">
            Keys: Space (Play/Pause) • L (Style) • [ ] (Sync $\pm$50ms) • F (Fullscreen)
          </span>
        </div>
      </footer>

      {/* 6. Settings Modal */}
      <ControlsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        rimConfig={rimConfig}
        setRimConfig={setRimConfig}
        lyricConfig={{
          style: 'cinematic',
          fontSize: 'large',
          wordSync: true,
          syncOffset,
          autoScroll: true
        }}
        setLyricConfig={() => {}}
        layoutMode="split"
        setLayoutMode={() => {}}
        palette={activePalette}
        isMacBridgeOnline={isMacBridgeOnline}
        onFileUpload={handleFileUpload}
      />

      {/* 7. Track Search Modal */}
      <TrackSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectTrack={handleSelectSearchedTrack}
      />
    </div>
  );
};

export default App;
