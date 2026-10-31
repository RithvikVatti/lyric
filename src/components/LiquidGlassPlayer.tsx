import React, { useState } from 'react';
import { Track } from '../types';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Share2,
  Heart
} from 'lucide-react';

interface LiquidGlassPlayerProps {
  track: Track;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (seconds: number) => void;
}

export const LiquidGlassPlayer = React.forwardRef<HTMLDivElement, LiquidGlassPlayerProps>(({
  track,
  currentTime,
  duration,
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  onSeek
}, ref) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isHoveringBar, setIsHoveringBar] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const remainingSeconds = Math.max(0, duration - currentTime);

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
    <div className="relative select-none transition-all duration-300">
      {/* Outer Card Bezel with Dark Translucent Liquid Glass Effect */}
      <div
        ref={ref}
        data-liquidglass="true"
        className="w-[360px] sm:w-[390px] md:w-[420px] aspect-square rounded-[36px] sm:rounded-[42px] p-2.5 sm:p-3 bg-black/45 backdrop-blur-2xl border border-white/[0.14] relative overflow-hidden shadow-[0_30px_70px_-15px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.2)]"
      >
        {/* Inner Artwork Container */}
        <div className="relative w-full h-full rounded-[28px] sm:rounded-[34px] overflow-hidden bg-zinc-900 group">
          {/* Album Cover Art filling the card */}
          <img
            src={track.albumArt}
            alt={track.title}
            className={`w-full h-full object-cover transition-transform duration-700 ease-out select-none ${
              isPlaying ? 'scale-100' : 'scale-[0.98] brightness-95'
            }`}
          />

          {/* Top Scrim Gradient */}
          <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/65 via-black/25 to-transparent pointer-events-none" />

          {/* Bottom Scrim Gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/85 via-black/45 to-transparent pointer-events-none" />

          {/* ==================================================== */}
          {/* TOP HEADER: Artist Pill (Left) & Action Buttons (Right) */}
          {/* ==================================================== */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            {/* Top-Left Frosted Glass Artist Pill */}
            <div className="flex items-center gap-2.5 bg-black/40 backdrop-blur-xl border border-white/15 px-3 py-1.5 rounded-full shadow-lg max-w-[210px] sm:max-w-[240px]">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden shrink-0 border border-white/20 bg-zinc-800">
                <img
                  src={track.albumArt}
                  alt={track.artist}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col overflow-hidden text-left">
                <span className="text-xs sm:text-[13px] font-bold text-white truncate leading-tight">
                  {track.artist}
                </span>
                <span className="text-[10px] text-white/60 truncate font-medium leading-tight">
                  {track.title}
                </span>
              </div>
            </div>

            {/* Top-Right Action Buttons: Share & Like */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: track.title, text: `${track.title} by ${track.artist}` }).catch(() => {});
                  }
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/40 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/55 active:scale-95 transition shadow-md"
                title="Share"
              >
                <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <button
                onClick={() => setIsLiked(!isLiked)}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/40 backdrop-blur-xl border border-white/15 flex items-center justify-center active:scale-90 transition shadow-md ${
                  isLiked ? 'text-red-500' : 'text-white/80 hover:text-white hover:bg-black/55'
                }`}
                title="Favorite"
              >
                <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLiked ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* ==================================================== */}
          {/* BOTTOM CONTROLS: Scrubber Bar & Playback Controls */}
          {/* ==================================================== */}
          <div className="absolute bottom-4 left-5 right-5 z-10 space-y-3">
            {/* Scrubber Progress Bar */}
            <div>
              <div className="flex justify-between items-center text-[11px] font-mono font-medium text-white/80 mb-1.5 select-none">
                <span>{formatTime(currentTime)}</span>
                <span>-{formatTime(remainingSeconds)}</span>
              </div>

              <div
                onClick={handleBarClick}
                onMouseMove={handleBarMouseMove}
                onMouseEnter={() => setIsHoveringBar(true)}
                onMouseLeave={() => setIsHoveringBar(false)}
                className="relative w-full h-1 bg-white/25 rounded-full cursor-pointer py-1 -my-1 group"
              >
                {/* Active Progress Line */}
                <div
                  className="absolute top-1 bottom-1 left-0 bg-white rounded-full transition-all duration-75 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                  style={{ width: `${progressPercent}%` }}
                />

                {/* Scrubber Hover Pin */}
                {isHoveringBar && hoverTime !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-2 h-2 -mt-0.5 bg-white rounded-full shadow-lg pointer-events-none -translate-x-1"
                    style={{
                      left: `${duration > 0 ? (hoverTime / duration) * 100 : 0}%`
                    }}
                  />
                )}
              </div>
            </div>

            {/* Centered Playback Controls */}
            <div className="flex items-center justify-center gap-4 pt-1">
              <button
                onClick={onPrev}
                className="w-10 h-10 rounded-full bg-black/35 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/90 hover:text-white hover:bg-black/50 hover:scale-105 active:scale-95 transition shadow-md"
                title="Previous Track"
              >
                <SkipBack className="w-4 h-4 fill-current" />
              </button>

              <button
                onClick={onPlayPause}
                className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 shadow-[0_8px_20px_rgba(0,0,0,0.6)] transition"
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
                className="w-10 h-10 rounded-full bg-black/35 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/90 hover:text-white hover:bg-black/50 hover:scale-105 active:scale-95 transition shadow-md"
                title="Next Track"
              >
                <SkipForward className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

LiquidGlassPlayer.displayName = 'LiquidGlassPlayer';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
