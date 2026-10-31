import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Track,
  LyricsData,
  ColorPalette,
  RimLightConfig,
  LyricConfig,
  LayoutMode,
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

import { AmbientRimLights } from './components/AmbientRimLights';
import { VisualizerCanvas } from './components/VisualizerCanvas';
import { LiquidGlassPlayer } from './components/LiquidGlassPlayer';
import { SyncedLyricsView } from './components/SyncedLyricsView';
import { DynamicIsland } from './components/DynamicIsland';
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

  // Audio Visualizer Energy State
  const [audioEnergy, setAudioEnergy] = useState({ bass: 0.1, mid: 0.1, treble: 0.1, overall: 0.1 });

  // Palette State
  const [extractedPalette, setExtractedPalette] = useState<ColorPalette>(PRESET_PALETTES['album-art']);

  // Configuration States
  const [rimConfig, setRimConfig] = useState<RimLightConfig>({
    enabled: true,
    mode: 'aurora',
    thickness: 16,
    blur: 40,
    intensity: 1.0,
    beatReactivity: 0.6,
    palettePreset: 'album-art'
  });

  const [lyricConfig, setLyricConfig] = useState<LyricConfig>({
    style: 'verci-single-word', // Default to signature 1-word-at-a-time kinetic stage!
    fontSize: 'large',
    wordSync: true,
    syncOffset: 0,
    autoScroll: true
  });

  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isMacBridgeOnline, setIsMacBridgeOnline] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Sync manual offset with globalClock
  useEffect(() => {
    globalClock.setManualOffset(lyricConfig.syncOffset);
  }, [lyricConfig.syncOffset]);

  // Derived effective palette based on preset
  const activePalette = rimConfig.palettePreset === 'album-art'
    ? extractedPalette
    : PRESET_PALETTES[rimConfig.palettePreset] || extractedPalette;

  // 1. Initialize HTML5 Audio & Visualizer Engine
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
  // Updates currentTime every single frame without stutter
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

  // 3. Extract album palette and load lyrics when currentTrack changes
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

  // 4. Ultra-Fast macOS Bridge Polling (every 350ms) with Latency Compensation
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

            // Sync high-precision clock with latency compensation
            globalClock.sync(macState.position, isPlayingState, macState.latencyMs || 180);
          } else {
            setIsPlaying(isPlayingState);

            // High-precision clock sync
            globalClock.sync(macState.position, isPlayingState, macState.latencyMs || 180);

            if (macState.artworkUrl && currentTrack.albumArt !== macState.artworkUrl) {
              setCurrentTrack(t => ({ ...t, albumArt: macState.artworkUrl! }));
            }
          }
        }
      }

      if (isMounted) {
        timer = setTimeout(pollBridge, 350); // fast 350ms sample rate
      }
    };

    pollBridge();
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [currentTrack]);

  // Playback control handlers
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

  // Sync calibration adjustment helper
  const adjustSyncOffset = useCallback((deltaMs: number) => {
    setLyricConfig(c => {
      const newOffset = c.syncOffset + deltaMs;
      const label = newOffset > 0 ? `+${newOffset}ms` : `${newOffset}ms`;
      setSyncFeedback(`Sync: ${label}`);
      setTimeout(() => setSyncFeedback(null), 1500);
      return { ...c, syncOffset: newOffset };
    });
  }, []);

  // Global Keyboard Shortcuts
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
      } else if (e.key === 'l' || e.key === 'L') {
        // Cycle styles
        setLyricConfig(c => ({
          ...c,
          style:
            c.style === 'verci-single-word'
              ? 'smooth-captions'
              : c.style === 'smooth-captions'
              ? 'cinematic'
              : 'verci-single-word'
        }));
      } else if (e.key === 'r' || e.key === 'R') {
        setRimConfig(c => ({ ...c, enabled: !c.enabled }));
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
      {/* 1. Dynamic Ambient Background Mesh */}
      <VisualizerCanvas
        palette={activePalette}
        audioEnergy={audioEnergy}
        isPlaying={isPlaying}
      />

      {/* 2. Ambient Screen-Edge Rim Lighting */}
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

      {/* 3. Top Floating Glass Header Bar */}
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
              Kinetic Single-Word & Ambient Rim
            </p>
          </div>
        </div>

        {layoutMode === 'mini-island' ? (
          <div className="pointer-events-auto">
            <DynamicIsland
              track={currentTrack}
              palette={activePalette}
              lyrics={lyrics}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              onExpand={() => setLayoutMode('split')}
            />
          </div>
        ) : null}

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

      {/* 4. Main Stage View Layouts */}
      <main className="relative z-20 flex-1 w-full h-[calc(100vh-120px)] overflow-hidden px-4 sm:px-8 md:px-12 flex items-center justify-center">
        {layoutMode === 'split' && (
          <div className="w-full h-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center py-2">
            <div className="lg:col-span-5 flex justify-center items-center h-full">
              <LiquidGlassPlayer
                track={currentTrack}
                palette={activePalette}
                lyrics={lyrics}
                currentTime={currentTime}
                duration={duration}
                isPlaying={isPlaying}
                onPlayPause={handlePlayPause}
                onNext={handleNext}
                onPrev={handlePrev}
                onSeek={handleSeek}
                onSelectTrack={handleSelectTrack}
                demoTracks={DEMO_TRACKS}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onToggleFullscreen={toggleFullscreen}
                onSearchOpen={() => setIsSearchOpen(true)}
              />
            </div>

            <div className="lg:col-span-7 h-full flex flex-col justify-center overflow-hidden">
              <SyncedLyricsView
                lyrics={lyrics}
                currentTime={currentTime}
                duration={duration}
                config={lyricConfig}
                palette={activePalette}
                onSeek={handleSeek}
                onSearchOpen={() => setIsSearchOpen(true)}
              />
            </div>
          </div>
        )}

        {layoutMode === 'lockscreen' && (
          <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in duration-300">
            <LiquidGlassPlayer
              track={currentTrack}
              palette={activePalette}
              lyrics={lyrics}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              onNext={handleNext}
              onPrev={handlePrev}
              onSeek={handleSeek}
              onSelectTrack={handleSelectTrack}
              demoTracks={DEMO_TRACKS}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onToggleFullscreen={toggleFullscreen}
              onSearchOpen={() => setIsSearchOpen(true)}
            />
          </div>
        )}

        {layoutMode === 'fullscreen-lyrics' && (
          <div className="w-full h-full max-w-4xl mx-auto flex flex-col justify-center animate-in fade-in duration-300">
            <SyncedLyricsView
              lyrics={lyrics}
              currentTime={currentTime}
              duration={duration}
              config={lyricConfig}
              palette={activePalette}
              onSeek={handleSeek}
              onSearchOpen={() => setIsSearchOpen(true)}
            />
          </div>
        )}

        {layoutMode === 'mini-island' && (
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-24 h-24 rounded-full p-1 border-2 border-white/20 shadow-2xl relative">
              <img
                src={currentTrack.albumArt}
                alt={currentTrack.title}
                className={`w-full h-full object-cover rounded-full ${isPlaying ? 'animate-spin' : ''}`}
                style={{ animationDuration: '8s' }}
              />
            </div>
            <h2 className="text-2xl font-bold text-white drop-shadow">{currentTrack.title}</h2>
            <p className="text-white/60 text-sm font-medium">{currentTrack.artist}</p>
            <button
              onClick={() => setLayoutMode('split')}
              className="px-5 py-2 glass-button rounded-xl text-xs font-semibold text-white/90"
            >
              Open Full Player
            </button>
          </div>
        )}

        {layoutMode === 'rim-only' && (
          <div
            onClick={() => setLayoutMode('split')}
            className="cursor-pointer text-center p-8 glass-pill rounded-3xl opacity-40 hover:opacity-100 transition duration-300"
          >
            <Sun className="w-8 h-8 text-amber-400 mx-auto mb-2 animate-pulse" />
            <p className="text-xs text-white/80 font-medium">
              Pure Rim Lighting Mode Active. Click anywhere to reveal player.
            </p>
          </div>
        )}
      </main>

      {/* 5. Bottom Status Dock with Quick Caption Mode Switcher */}
      <footer className="relative z-30 w-full px-6 py-3 flex items-center justify-between text-xs text-white/50 pointer-events-none">
        {/* Caption Style Switcher */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-black/40 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
          <button
            onClick={() => setLyricConfig(c => ({ ...c, style: 'verci-single-word' }))}
            className={`px-3 py-1 rounded-xl transition text-[11px] font-bold ${
              lyricConfig.style === 'verci-single-word'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/40 shadow-sm'
                : 'text-white/50 hover:text-white'
            }`}
          >
            ✦ Single Word (Verci)
          </button>
          <button
            onClick={() => setLyricConfig(c => ({ ...c, style: 'smooth-captions' }))}
            className={`px-3 py-1 rounded-xl transition text-[11px] font-bold ${
              lyricConfig.style === 'smooth-captions'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/40 shadow-sm'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Smooth Captions
          </button>
          <button
            onClick={() => setLyricConfig(c => ({ ...c, style: 'cinematic' }))}
            className={`px-3 py-1 rounded-xl transition text-[11px] font-bold ${
              lyricConfig.style === 'cinematic'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/40 shadow-sm'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Cinematic Flow
          </button>
        </div>

        {/* Sync Calibration Controls & Hotkeys */}
        <div className="flex items-center gap-3 pointer-events-auto text-[11px]">
          <div className="hidden sm:flex items-center gap-1 font-mono">
            <span className="text-white/40">Sync:</span>
            <button
              onClick={() => adjustSyncOffset(-50)}
              className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-bold"
              title="Shift earlier (-50ms) [ key"
            >
              -50ms
            </button>
            <span className="text-cyan-300 font-bold px-1">
              {lyricConfig.syncOffset > 0 ? `+${lyricConfig.syncOffset}` : lyricConfig.syncOffset}ms
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
            Keys: Space (Play) • L (Style) • [ ] (Sync $\pm$50ms)
          </span>
        </div>
      </footer>

      {/* 6. Settings Modal */}
      <ControlsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        rimConfig={rimConfig}
        setRimConfig={setRimConfig}
        lyricConfig={lyricConfig}
        setLyricConfig={setLyricConfig}
        layoutMode={layoutMode}
        setLayoutMode={setLayoutMode}
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
