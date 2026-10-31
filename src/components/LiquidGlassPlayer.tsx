import React, { useState } from 'react';
import { Track, ColorPalette, LyricsData } from '../types';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Radio,
  Sparkles,
  Music,
  Sliders,
  Maximize2
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
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isHoveringBar, setIsHoveringBar] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  // Find current 2-line mini lyric preview
  const currentMiniLyric = React.useMemo(() => {
    if (!lyrics || !lyrics.lines || lyrics.lines.length === 0) return null;
    const current = lyrics.lines.find((l, idx) => {
      const next = lyrics.lines[idx + 1];
      return currentTime >= l.time && (!next || currentTime < next.time);
    });
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

  return (
    <div
      className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-7 text-white shadow-2xl relative overflow-hidden transition-all duration-300"
      style={{
        boxShadow: `0 24px 60px -15px rgba(0, 0, 0, 0.7), 0 0 45px -10px ${palette.glow}`
      }}
    >
      {/* Dynamic ambient highlight glow inside the card */}
      <div
        className="absolute -top-24 -right-24 w-56 h-56 rounded-full pointer-events-none opacity-40 mix-blend-screen filter blur-3xl transition-colors duration-700"
        style={{ background: palette.accent }}
      />
      <div
        className="absolute -bottom-24 -left-24 w-56 h-56 rounded-full pointer-events-none opacity-25 mix-blend-screen filter blur-3xl transition-colors duration-700"
        style={{ background: palette.secondary }}
      />

      {/* Top Header info & Source Badge */}
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isPlaying ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isPlaying ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
            {track.source === 'macos-music'
              ? 'Apple Music (macOS)'
              : track.source === 'macos-spotify'
              ? 'Spotify (macOS)'
              : track.source === 'local-file'
              ? 'Local Audio File'
              : track.source === 'search'
              ? 'Online Search Preview'
              : 'Interactive Player'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onSearchOpen}
            title="Search songs on LRCLIB / iTunes"
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </button>
          <button
            onClick={onOpenSettings}
            title="Settings & Customization"
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            <Sliders className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleFullscreen}
            title="Toggle True Fullscreen (F)"
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Album Artwork & Visual presentation */}
      <div className="relative mb-6 group flex justify-center z-10">
        <div
          className="relative w-full aspect-square max-w-[280px] rounded-2xl overflow-hidden shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]"
          style={{
            boxShadow: `0 16px 36px -10px rgba(0, 0, 0, 0.8), 0 0 30px -5px ${palette.glow}`
          }}
        >
          <img
            src={track.albumArt}
            alt={track.title}
            className={`w-full h-full object-cover transition-all duration-700 ${
              isPlaying ? 'scale-100' : 'scale-95 filter brightness-90'
            }`}
          />
          {/* Subtle reflection overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-black/30 pointer-events-none" />
        </div>
      </div>

      {/* Track Title and Artist */}
      <div className="mb-4 relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="overflow-hidden">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white truncate drop-shadow-sm">
              {track.title}
            </h1>
            <p className="text-sm font-medium text-white/70 truncate mt-0.5">
              {track.artist}
            </p>
          </div>
          {track.badge && (
            <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-white/80 uppercase tracking-wider backdrop-blur-md">
              {track.badge}
            </span>
          )}
        </div>

        {/* Live Mini Lyric Subtitle preview on the card */}
        <div className="mt-2.5 h-6 overflow-hidden flex items-center">
          {currentMiniLyric ? (
            <p className="text-xs font-medium text-cyan-300 truncate flex items-center gap-1.5 animate-in fade-in duration-200">
              <Sparkles className="w-3 h-3 shrink-0 text-cyan-400" />
              <span>{currentMiniLyric}</span>
            </p>
          ) : (
            <p className="text-[11px] text-white/40 truncate">
              {track.album}
            </p>
          )}
        </div>
      </div>

      {/* Interactive Progress Bar */}
      <div className="mb-5 relative z-10">
        <div
          onClick={handleBarClick}
          onMouseMove={handleBarMouseMove}
          onMouseEnter={() => setIsHoveringBar(true)}
          onMouseLeave={() => setIsHoveringBar(false)}
          className="relative w-full h-2 bg-white/15 rounded-full cursor-pointer overflow-hidden group py-1"
        >
          {/* Progress fill */}
          <div
            className="absolute top-0 bottom-0 left-0 rounded-full transition-all duration-100"
            style={{
              width: `${progressPercent}%`,
              background: `linear-gradient(90deg, ${palette.secondary}, ${palette.accent})`
            }}
          />
          {/* Hover scrubber glow pin */}
          {isHoveringBar && (
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-lg pointer-events-none"
              style={{
                left: `${duration > 0 && hoverTime !== null ? (hoverTime / duration) * 100 : 0}%`
              }}
            />
          )}
        </div>

        {/* Time Labels */}
        <div className="flex justify-between items-center text-[11px] font-mono text-white/60 mt-1.5 select-none">
          <span>{formatTime(currentTime)}</span>
          {isHoveringBar && hoverTime !== null && (
            <span className="text-cyan-300 font-bold">{formatTime(hoverTime)}</span>
          )}
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <button
          onClick={() => setIsShuffle(!isShuffle)}
          className={`p-2 rounded-xl transition ${
            isShuffle ? 'text-cyan-400 bg-white/10' : 'text-white/50 hover:text-white'
          }`}
          title="Shuffle"
        >
          <Shuffle className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={onPrev}
            className="p-2.5 rounded-full glass-button text-white/80 hover:text-white active:scale-95 transition"
            title="Previous Track"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={onPlayPause}
            className="p-4 rounded-full text-black font-bold active:scale-90 hover:scale-105 shadow-xl transition-all duration-200"
            style={{
              background: `linear-gradient(135deg, #ffffff 0%, ${palette.light} 100%)`,
              boxShadow: `0 8px 24px -4px ${palette.glow}`
            }}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-black" />
            ) : (
              <Play className="w-6 h-6 fill-black translate-x-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            className="p-2.5 rounded-full glass-button text-white/80 hover:text-white active:scale-95 transition"
            title="Next Track"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
        </div>

        <button
          onClick={() => setIsRepeat(!isRepeat)}
          className={`p-2 rounded-xl transition ${
            isRepeat ? 'text-cyan-400 bg-white/10' : 'text-white/50 hover:text-white'
          }`}
          title="Repeat"
        >
          <Repeat className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Demo Tracks Switcher Dropdown */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 relative z-10">
        <span className="text-[11px] text-white/50 font-medium">Quick Track:</span>
        <select
          value={demoTracks.findIndex(t => t.title === track.title)}
          onChange={(e) => onSelectTrack(parseInt(e.target.value, 10))}
          className="bg-white/10 text-white/90 text-xs rounded-xl px-2.5 py-1.5 border border-white/15 outline-none cursor-pointer hover:bg-white/15 transition max-w-[220px] truncate"
        >
          {demoTracks.map((t, idx) => (
            <option key={t.id} value={idx} className="bg-slate-900 text-white">
              {t.title} — {t.artist}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
