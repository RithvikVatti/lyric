import React from 'react';
import { Track, ColorPalette, LyricsData } from '../types';
import { Play, Pause, Music, Sparkles } from 'lucide-react';

interface DynamicIslandProps {
  track: Track;
  palette: ColorPalette;
  lyrics: LyricsData | null;
  currentTime: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onExpand: () => void;
}

export const DynamicIsland: React.FC<DynamicIslandProps> = ({
  track,
  palette,
  lyrics,
  currentTime,
  isPlaying,
  onPlayPause,
  onExpand
}) => {
  // Find current line
  const currentLine = React.useMemo(() => {
    if (!lyrics || !lyrics.lines) return null;
    return lyrics.lines.find((l, idx) => {
      const next = lyrics.lines[idx + 1];
      return currentTime >= l.time && (!next || currentTime < next.time);
    });
  }, [lyrics, currentTime]);

  return (
    <div
      onClick={onExpand}
      className="glass-pill cursor-pointer px-4 py-2.5 rounded-full flex items-center gap-3.5 shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 group max-w-lg"
      style={{
        boxShadow: `0 12px 30px -8px rgba(0,0,0,0.7), 0 0 20px -5px ${palette.glow}`
      }}
    >
      {/* Tiny Album Art with glow */}
      <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 shadow-md">
        <img
          src={track.albumArt}
          alt={track.title}
          className={`w-full h-full object-cover ${isPlaying ? 'animate-spin' : ''}`}
          style={{ animationDuration: '10s' }}
        />
      </div>

      {/* Track & Lyric Info */}
      <div className="flex flex-col min-w-[140px] max-w-[260px] overflow-hidden text-left">
        <span className="text-xs font-bold text-white truncate">
          {track.title}
        </span>
        <span className="text-[11px] text-white/60 truncate flex items-center gap-1">
          {currentLine ? (
            <>
              <Sparkles className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
              <span className="text-cyan-300 font-medium truncate">{currentLine.text}</span>
            </>
          ) : (
            <span>{track.artist}</span>
          )}
        </span>
      </div>

      {/* Quick Play/Pause button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPlayPause();
        }}
        className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center shrink-0 transition"
      >
        {isPlaying ? (
          <Pause className="w-3.5 h-3.5 fill-current" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
        )}
      </button>
    </div>
  );
};
