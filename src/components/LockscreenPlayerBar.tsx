import React, { useState } from 'react';
import { Track, LyricStyle } from '../types';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  MoreHorizontal,
  MessageSquare,
  ListMusic,
  Radio,
  Volume2,
  VolumeX
} from 'lucide-react';

interface LockscreenPlayerBarProps {
  track: Track;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  lyricStyle: LyricStyle;
  onToggleLyricStyle: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (seconds: number) => void;
  onOpenSettings: () => void;
  onOpenSearch: () => void;
}

export const LockscreenPlayerBar = React.forwardRef<HTMLDivElement, LockscreenPlayerBarProps>(({
  track,
  currentTime,
  duration,
  isPlaying,
  lyricStyle,
  onToggleLyricStyle,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onOpenSettings,
  onOpenSearch
}, ref) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isHoveringBar, setIsHoveringBar] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

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
    <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-40 select-none animate-in fade-in slide-in-from-bottom-5 duration-300">
      {/* Floating Pill Bar with Dark Translucent Liquid Glass Effect & Purely White Icons */}
      <div
        ref={ref}
        data-liquidglass="true"
        className="flex items-center gap-3.5 sm:gap-5 px-5 py-2.5 rounded-full bg-black/45 backdrop-blur-2xl border border-white/[0.14] shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.22)] text-white relative overflow-hidden"
      >
        {/* ======================================= */}
        {/* 1. LEFT CONTROLS: Pure White Icons (Prev, Play/Pause, Next) */}
        {/* ======================================= */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Previous Track */}
          <button
            onClick={onPrev}
            className="text-white/80 hover:text-white active:scale-90 transition p-1.5 focus:outline-none"
            title="Previous Track"
          >
            <SkipBack className="w-4 h-4 fill-white text-white" />
          </button>

          {/* Play / Pause - Pure White Icon without circular button pod */}
          <button
            onClick={onPlayPause}
            className="text-white hover:text-white/80 active:scale-90 transition p-1.5 focus:outline-none"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-white text-white" />
            ) : (
              <Play className="w-5 h-5 fill-white text-white translate-x-0.5" />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={onNext}
            className="text-white/80 hover:text-white active:scale-90 transition p-1.5 focus:outline-none"
            title="Next Track"
          >
            <SkipForward className="w-4 h-4 fill-white text-white" />
          </button>
        </div>

        {/* Vertical divider */}
        <div className="w-[1px] h-6 bg-white/15 hidden sm:block" />

        {/* ======================================= */}
        {/* 2. MIDDLE TRACK INFO & INTEGRATED PROGRESS BAR */}
        {/* ======================================= */}
        <div className="flex items-center gap-3">
          {/* Rounded Album Art Thumbnail */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden shrink-0 border border-white/15 bg-zinc-900 shadow-md">
            <img
              src={track.albumArt}
              alt={track.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Track Name, Artist & Scrubber underneath */}
          <div className="flex flex-col text-left justify-center min-w-[140px] max-w-[200px] sm:max-w-[280px]">
            <span className="text-xs sm:text-[13px] font-bold text-white truncate leading-tight">
              {track.title}
            </span>
            <span className="text-[10px] text-white/65 truncate font-medium leading-tight mt-0.5">
              {track.artist} {track.album ? `— ${track.album}` : ''}
            </span>

            {/* Integrated Scrubber Bar directly under track name */}
            <div
              onClick={handleBarClick}
              onMouseMove={handleBarMouseMove}
              onMouseEnter={() => setIsHoveringBar(true)}
              onMouseLeave={() => setIsHoveringBar(false)}
              className="relative w-full h-1 bg-white/20 rounded-full cursor-pointer mt-1.5 py-1 -my-1 group"
            >
              <div
                className="absolute top-1 bottom-1 left-0 bg-white rounded-full transition-all duration-75 shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                style={{ width: `${progressPercent}%` }}
              />
              {isHoveringBar && hoverTime !== null && (
                <div
                  className="absolute top-0 bottom-0 w-2 h-2 -mt-0.5 bg-white rounded-full shadow-md pointer-events-none -translate-x-1"
                  style={{
                    left: `${duration > 0 ? (hoverTime / duration) * 100 : 0}%`
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Vertical divider */}
        <div className="w-[1px] h-6 bg-white/15 hidden sm:block" />

        {/* ======================================= */}
        {/* 3. RIGHT ICONS: Pure White Icons (More, Lyrics, Search, AirPlay, Volume) */}
        {/* ======================================= */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Settings / More */}
          <button
            onClick={onOpenSettings}
            className="text-white/80 hover:text-white active:scale-90 transition p-1.5 focus:outline-none"
            title="Settings & Customization"
          >
            <MoreHorizontal className="w-4 h-4 text-white" />
          </button>

          {/* Lyrics Style Toggle (Single Word <-> Smooth Captions) */}
          <button
            onClick={onToggleLyricStyle}
            className="text-white/80 hover:text-white active:scale-90 transition p-1.5 focus:outline-none"
            title={`Current: ${lyricStyle === 'verci-single-word' ? 'Single Word' : 'Smooth Captions'} (Click to switch)`}
          >
            <MessageSquare className="w-4 h-4 text-white" />
          </button>

          {/* Search / Global catalog */}
          <button
            onClick={onOpenSearch}
            className="text-white/80 hover:text-white active:scale-90 transition p-1.5 focus:outline-none"
            title="Search Tracks & Lyrics"
          >
            <ListMusic className="w-4 h-4 text-white" />
          </button>

          {/* Audio Source / AirPlay icon */}
          <div
            className="text-white/80 transition p-1.5 cursor-default"
            title={track.source.startsWith('macos-') ? 'macOS Desktop Sync' : 'Local Audio'}
          >
            <Radio className="w-4 h-4 text-white" />
          </div>

          {/* Volume toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-white/80 hover:text-white active:scale-90 transition p-1.5 focus:outline-none"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
});

LockscreenPlayerBar.displayName = 'LockscreenPlayerBar';
