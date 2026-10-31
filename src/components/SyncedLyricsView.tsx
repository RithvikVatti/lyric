import React, { useEffect, useRef, useState, useMemo } from 'react';
import { LyricConfig, LyricsData, LyricLine, ColorPalette } from '../types';
import { Sparkles, Music2, Clock, AlertCircle } from 'lucide-react';

interface SyncedLyricsViewProps {
  lyrics: LyricsData | null;
  currentTime: number;
  duration: number;
  config: LyricConfig;
  palette: ColorPalette;
  onSeek: (seconds: number) => void;
  onSearchOpen?: () => void;
}

export const SyncedLyricsView: React.FC<SyncedLyricsViewProps> = ({
  lyrics,
  currentTime,
  duration,
  config,
  palette,
  onSeek,
  onSearchOpen
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const [userIsScrolling, setUserIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<any>(null);

  // Apply sync offset in seconds
  const effectiveTime = Math.max(0, currentTime + config.syncOffset / 1000);

  // Find active line index
  const activeIndex = useMemo(() => {
    if (!lyrics || !lyrics.lines || lyrics.lines.length === 0) return -1;
    const lines = lyrics.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];

      if (effectiveTime >= line.time) {
        if (!nextLine || effectiveTime < nextLine.time) {
          return i;
        }
      }
    }

    if (effectiveTime < lines[0].time) return -1;
    return lines.length - 1;
  }, [lyrics, effectiveTime]);

  const activeLine: LyricLine | null = useMemo(() => {
    if (!lyrics || activeIndex === -1 || !lyrics.lines[activeIndex]) return null;
    return lyrics.lines[activeIndex];
  }, [lyrics, activeIndex]);

  // Smooth auto-scroll to center the active line
  useEffect(() => {
    if (userIsScrolling || !config.autoScroll) return;
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeIndex, userIsScrolling, config.autoScroll]);

  // Detect manual user scrolling
  const handleScroll = () => {
    setUserIsScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setUserIsScrolling(false);
    }, 3500);
  };

  // Font size classes
  const getFontSizeClass = (isActive: boolean) => {
    switch (config.fontSize) {
      case 'massive':
        return isActive ? 'text-3xl md:text-5xl font-extrabold tracking-tight' : 'text-xl md:text-3xl font-bold';
      case 'large':
        return isActive ? 'text-2xl md:text-4xl font-bold tracking-tight' : 'text-lg md:text-2xl font-semibold';
      case 'normal':
      default:
        return isActive ? 'text-xl md:text-3xl font-bold tracking-tight' : 'text-base md:text-xl font-medium';
    }
  };

  // If no lyrics found or empty
  if (!lyrics || lyrics.lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center z-10">
        <div className="w-16 h-16 rounded-2xl glass-panel flex items-center justify-center mb-4 text-white/60 shadow-lg">
          <Music2 className="w-8 h-8 animate-pulse" />
        </div>
        <h3 className="text-xl font-semibold text-white/90 mb-2">No Synced Lyrics Available</h3>
        <p className="text-sm text-white/50 max-w-sm mb-6 leading-relaxed">
          Lyrics haven't been indexed for this track on LRCLIB yet, or the song is instrumental.
        </p>
        {onSearchOpen && (
          <button
            onClick={onSearchOpen}
            className="px-4 py-2 glass-button rounded-xl text-sm font-medium text-white/90 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Search Alternative Releases
          </button>
        )}
      </div>
    );
  }

  // Render Focus-Line style (single massive line with upcoming preview)
  if (config.style === 'focus-line') {
    const nextLine = lyrics.lines[activeIndex + 1];
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center z-10 max-w-4xl mx-auto">
        {activeLine ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-white/10 text-white/70 backdrop-blur-md">
              <Clock className="w-3 h-3 text-cyan-400" />
              {formatTime(effectiveTime)} / {formatTime(duration)}
            </div>
            <h2
              className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight text-white drop-shadow-xl select-none"
              style={{
                textShadow: `0 0 40px ${palette.glow}`
              }}
            >
              {renderActiveLineContent(activeLine, effectiveTime, config.wordSync, palette)}
            </h2>
            {nextLine && (
              <p
                onClick={() => onSeek(nextLine.time)}
                className="text-xl md:text-2xl text-white/35 font-medium cursor-pointer hover:text-white/60 transition-colors duration-200"
              >
                {nextLine.text}
              </p>
            )}
          </div>
        ) : (
          <div className="text-white/40 font-medium text-2xl flex items-center gap-3">
            <Music2 className="w-6 h-6 animate-spin" />
            <span>Intro Instrumental...</span>
          </div>
        )}
      </div>
    );
  }

  // Render Cinematic or 3D Perspective Wall
  return (
    <div className="relative w-full h-full flex flex-col justify-center overflow-hidden z-10">
      {/* User manual scroll indicator */}
      {userIsScrolling && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
          <button
            onClick={() => {
              setUserIsScrolling(false);
              if (activeLineRef.current) {
                activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            className="px-3.5 py-1.5 rounded-full glass-pill text-xs font-medium text-white/80 shadow-xl hover:text-white flex items-center gap-2 transition"
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            Resume Auto-Scroll
          </button>
        </div>
      )}

      {/* Top & Bottom gradient mask for smooth fading */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-20" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-20" />

      {/* Lyrics Scrollable Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`w-full h-full overflow-y-auto px-6 md:px-12 py-32 space-y-6 scroll-smooth ${
          config.style === 'perspective-3d' ? 'perspective-container' : ''
        }`}
      >
        <div className={config.style === 'perspective-3d' ? 'perspective-lyrics' : ''}>
          {lyrics.lines.map((line, idx) => {
            const isActive = idx === activeIndex;
            const isPast = idx < activeIndex;
            const isFuture = idx > activeIndex;

            // Opacity & blur based on distance from active line
            const distance = Math.abs(idx - activeIndex);
            let opacity = 0.25;
            let filter = 'blur(0px)';

            if (isActive) {
              opacity = 1.0;
            } else if (isPast) {
              opacity = Math.max(0.15, 0.45 - distance * 0.08);
              filter = distance > 2 ? 'blur(1px)' : 'none';
            } else if (isFuture) {
              opacity = Math.max(0.12, 0.35 - distance * 0.07);
              filter = distance > 2 ? 'blur(1.5px)' : 'none';
            }

            return (
              <div
                key={line.id}
                ref={isActive ? activeLineRef : null}
                onClick={() => onSeek(line.time)}
                className={`group cursor-pointer transition-all duration-300 rounded-xl px-4 py-2 ${
                  isActive ? 'scale-[1.02] origin-left' : 'hover:opacity-75 hover:scale-[1.005]'
                }`}
                style={{
                  opacity,
                  filter,
                  transformOrigin: 'left center'
                }}
              >
                <div
                  className={`leading-relaxed transition-all duration-300 ${getFontSizeClass(isActive)}`}
                  style={{
                    color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
                    textShadow: isActive ? `0 0 24px ${palette.glow}` : 'none'
                  }}
                >
                  {isActive
                    ? renderActiveLineContent(line, effectiveTime, config.wordSync, palette)
                    : line.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * Renders active line with progressive word-by-word highlights or smooth fluid sweep
 */
function renderActiveLineContent(
  line: LyricLine,
  currentTime: number,
  wordSync: boolean,
  palette: ColorPalette
) {
  if (!wordSync || !line.words || line.words.length === 0) {
    // Smooth percentage sweep across the entire line
    const lineDuration = Math.max(0.2, line.endTime - line.time);
    const progress = Math.min(100, Math.max(0, ((currentTime - line.time) / lineDuration) * 100));

    return (
      <span
        className="inline-block transition-all duration-75"
        style={{
          background: `linear-gradient(90deg, #ffffff 0%, #ffffff ${progress}%, rgba(255, 255, 255, 0.3) ${progress}%, rgba(255, 255, 255, 0.3) 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: progress > 10 ? `drop-shadow(0 0 12px ${palette.glow})` : 'none'
        }}
      >
        {line.text}
      </span>
    );
  }

  // Word-by-word kinetic highlight
  return (
    <span className="inline-flex flex-wrap gap-x-2 gap-y-1">
      {line.words.map((w, wIdx) => {
        const isWordPast = currentTime >= w.end;
        const isWordActive = currentTime >= w.start && currentTime < w.end;

        let wordProgress = 0;
        if (isWordPast) {
          wordProgress = 100;
        } else if (isWordActive) {
          const wDur = Math.max(0.1, w.end - w.start);
          wordProgress = Math.min(100, Math.max(0, ((currentTime - w.start) / wDur) * 100));
        }

        return (
          <span
            key={wIdx}
            className={`transition-all duration-75 inline-block ${
              isWordActive ? 'scale-105 font-black text-white' : ''
            }`}
            style={{
              background: `linear-gradient(90deg, #ffffff 0%, #ffffff ${wordProgress}%, rgba(255, 255, 255, 0.35) ${wordProgress}%, rgba(255, 255, 255, 0.35) 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: isWordActive ? `drop-shadow(0 0 10px ${palette.accent})` : 'none'
            }}
          >
            {w.word}
          </span>
        );
      })}
    </span>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
