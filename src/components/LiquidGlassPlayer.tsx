import React, { useState } from 'react';
import { Track, ColorPalette, LyricsData } from '../types';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Sparkles,
  Sliders,
  Maximize2,
  Apple
} from 'lucide-react';

interface LiquidGlassPlayerProps {
  track: Track;
  palette: ColorPalette;
  lyrics: LyricsData | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (seconds: number) => void;
  onSelectTrack: (trackIndex: number) => void;
  demoTracks: Track[];
  onOpenSettings: () => void;
  onToggleFullscreen: () => void;
  onSearchOpen: () => void;
}

export const LiquidGlassPlayer: React.FC<LiquidGlassPlayerProps> = ({
  track,
  palette,
  lyrics,
  currentTime,
  duration,
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onSelectTrack,
  demoTracks,
  onOpenSettings,
  onToggleFullscreen,
  onSearchOpen
}) => {
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isHoveringBar, setIsHoveringBar] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  // Mini lyric subtitle for the card
  const currentMiniLyric = React.useMemo(() => {
    if (!lyrics || !lyrics.lines || lyrics.lines.length === 0) return null;
    const current = lyrics.lines.find((l, idx) => {
      const next = lyrics.lines[idx + 1];
      return currentTime >= l.time && (!next || currentTime < next.time);
    });
    if (current && (current.text === '♪' || current.text === '♫')) return null;
    return current ? current.text : null;
  }, [lyrics, currentTime]);

  const handleBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(pos * duration);
  };

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(pos * duration);
  };

  const isExternalMac = track.source === 'macos-music' || track.source === 'macos-spotify';

  return (
    <div
      className="glass-panel w-full max-w-[370px] rounded-3xl p-5 sm:p-6 text-white shadow-2xl relative overflow-hidden transition-all duration-300"
      style={{
        boxShadow: `0 20px 50px -12px rgba(0, 0, 0, 0.8), 0 0 35px -8px ${palette.glow}`
      }}
    >
      {/* Dynamic ambient highlight glow inside card */}
      <div
        className="absolute -top-20 -right-20 w-48 h-48 rounded-full pointer-events-none opacity-30 mix-blend-screen filter blur-3xl transition-colors duration-700"
        style={{ background: palette.accent }}
      />
      <div
        className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full pointer-events-none opacity-20 mix-blend-screen filter blur-3xl transition-colors duration-700"
        style={{ background: palette.secondary }}
      />

      {/* Top Header & Source Badge */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          {track.source === 'macos-music' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-300">
              <Apple className="w-3.5 h-3.5 fill-current" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Apple Music</span>
            </div>
          ) : track.source === 'macos-spotify' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Spotify</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 text-white/70">
              <span
                className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}
              />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {track.source === 'local-file' ? 'Local Audio' : 'Lumen Player'}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onSearchOpen}
            title="Search songs on iTunes & LRCLIB"
            className="p-1.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </button>
          <button
            onClick={onOpenSettings}
            title="Settings & Controls"
            className="p-1.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            <Sliders className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleFullscreen}
            title="Toggle True Fullscreen (F)"
            className="p-1.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Album Artwork - Adaptive height so it never gets clipped */}
      <div className="relative mb-4 flex justify-center z-10">
        <div
          className="relative w-44 h-44 sm:w-52 sm:h-52 md:w-56 md:h-56 aspect-square rounded-2xl overflow-hidden shadow-2xl transition-transform duration-500 hover:scale-[1.02]"
          style={{
            boxShadow: `0 14px 30px -8px rgba(0, 0, 0, 0.8), 0 0 25px -5px ${palette.glow}`
          }}
        >
          <img
            src={track.albumArt}
            alt={track.title}
            className={`w-full h-full object-cover transition-all duration-700 ${
              isPlaying ? 'scale-100' : 'scale-95 filter brightness-90'
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-black/30 pointer-events-none" />
        </div>
      </div>

      {/* Track Title and Artist */}
      <div className="mb-3 relative z-10">
        <div className="flex items-start justify-between gap-2">
          <div className="overflow-hidden">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white truncate drop-shadow-sm">
              {track.title}
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-white/70 truncate mt-0.5">
              {track.artist}
            </p>
          </div>
          {track.badge && (
            <span className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-white/80 uppercase tracking-wider backdrop-blur-md">
              {track.badge}
            </span>
          )}
        </div>

        {/* Live Mini Lyric Subtitle */}
        <div className="mt-2 h-5 overflow-hidden flex items-center">
          {currentMiniLyric ? (
            <p className="text-xs font-semibold text-cyan-300 truncate flex items-center gap-1.5 animate-in fade-in duration-150">
              <Sparkles className="w-3 h-3 shrink-0 text-cyan-400" />
              <span className="truncate">{currentMiniLyric}</span>
            </p>
          ) : (
            <p className="text-[11px] text-white/40 truncate font-medium">
              {track.album}
            </p>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4 relative z-10">
        <div
          onClick={handleBarClick}
          onMouseMove={handleBarMouseMove}
          onMouseEnter={() => setIsHoveringBar(true)}
          onMouseLeave={() => setIsHoveringBar(false)}
          className="relative w-full h-1.5 bg-white/15 rounded-full cursor-pointer overflow-hidden group py-1"
        >
          <div
            className="absolute top-0 bottom-0 left-0 rounded-full transition-all duration-100"
            style={{
              width: `${progressPercent}%`,
              background: `linear-gradient(90deg, ${palette.secondary}, ${palette.accent})`
            }}
          />
          {isHoveringBar && hoverTime !== null && (
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-lg pointer-events-none"
              style={{
                left: `${duration > 0 ? (hoverTime / duration) * 100 : 0}%`
              }}
            />
          )}
        </div>

        <div className="flex justify-between items-center text-[10px] font-mono text-white/60 mt-1 select-none">
          <span>{formatTime(currentTime)}</span>
          {isHoveringBar && hoverTime !== null && (
            <span className="text-cyan-300 font-bold">{formatTime(hoverTime)}</span>
          )}
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-between relative z-10">
        <button
          onClick={() => setIsShuffle(!isShuffle)}
          className={`p-2 rounded-xl transition ${
            isShuffle ? 'text-cyan-400 bg-white/10' : 'text-white/40 hover:text-white'
          }`}
          title="Shuffle"
        >
          <Shuffle className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={onPrev}
            className="p-2 rounded-full glass-button text-white/80 hover:text-white active:scale-95 transition"
            title="Previous Track"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={onPlayPause}
            className="p-3.5 rounded-full text-black font-bold active:scale-90 hover:scale-105 shadow-xl transition-all duration-200"
            style={{
              background: `linear-gradient(135deg, #ffffff 0%, ${palette.light} 100%)`,
              boxShadow: `0 8px 24px -4px ${palette.glow}`
            }}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-black" />
            ) : (
              <Play className="w-5 h-5 fill-black translate-x-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            className="p-2 rounded-full glass-button text-white/80 hover:text-white active:scale-95 transition"
            title="Next Track"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>
        </div>

        <button
          onClick={() => setIsRepeat(!isRepeat)}
          className={`p-2 rounded-xl transition ${
            isRepeat ? 'text-cyan-400 bg-white/10' : 'text-white/40 hover:text-white'
          }`}
          title="Repeat"
        >
          <Repeat className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Demo Tracks dropdown only shown when NOT connected to active external player */}
      {!isExternalMac && (
        <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between gap-2 relative z-10">
          <span className="text-[10px] text-white/50 font-semibold">Demo Track:</span>
          <select
            value={demoTracks.findIndex(t => t.title === track.title)}
            onChange={(e) => onSelectTrack(parseInt(e.target.value, 10))}
            className="bg-white/10 text-white/90 text-xs rounded-xl px-2.5 py-1 border border-white/15 outline-none cursor-pointer hover:bg-white/15 transition max-w-[200px] truncate"
          >
            {demoTracks.map((t, idx) => (
              <option key={t.id} value={idx} className="bg-slate-900 text-white">
                {t.title} — {t.artist}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
