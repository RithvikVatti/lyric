import React, { useEffect, useRef, useState, useMemo } from 'react';
import { LyricConfig, LyricsData, LyricLine, ColorPalette } from '../types';
import { Sparkles, Music2, Clock } from 'lucide-react';

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
        return isActive
          ? 'text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight'
          : 'text-xl sm:text-2xl md:text-3xl font-bold tracking-tight';
      case 'large':
        return isActive
          ? 'text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight'
          : 'text-lg sm:text-xl md:text-2xl font-bold tracking-tight';
      case 'normal':
      default:
        return isActive
          ? 'text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight'
          : 'text-base sm:text-lg md:text-xl font-bold tracking-tight';
    }
  };

  // If no lyrics found or empty
  if (!lyrics || lyrics.lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center z-10">
        <div className="w-16 h-16 rounded-2xl glass-panel flex items-center justify-center mb-4 text-white/60 shadow-lg">
          <Music2 className="w-8 h-8 animate-pulse" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">No Synced Lyrics Available</h3>
        <p className="text-sm text-white/50 max-w-sm mb-6 leading-relaxed">
          Lyrics haven't been indexed for this track on LRCLIB yet, or the song is instrumental.
        </p>
        {onSearchOpen && (
          <button
            onClick={onSearchOpen}
            className="px-4 py-2 glass-button rounded-xl text-sm font-semibold text-white flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Search Alternative Releases
          </button>
        )}
      </div>
    );
  }

  // Focus-Line style (single massive line with upcoming preview)
  if (config.style === 'focus-line') {
    const nextLine = lyrics.lines[activeIndex + 1];
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center z-10 max-w-4xl mx-auto">
        {activeLine ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono bg-white/10 text-white/80 backdrop-blur-md border border-white/10">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              {formatTime(effectiveTime)} / {formatTime(duration)}
            </div>
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight text-white select-none">
              {renderLineContent(activeLine, effectiveTime, config.wordSync, palette, true)}
            </h2>
            {nextLine && !isInstrumentalLine(nextLine.text) && (
              <p
                onClick={() => onSeek(nextLine.time)}
                className="text-xl md:text-2xl text-white/30 font-bold cursor-pointer hover:text-white/60 transition-colors duration-200"
              >
                {nextLine.text}
              </p>
            )}
          </div>
        ) : (
          <div className="text-white/40 font-bold text-2xl flex items-center gap-3">
            <Music2 className="w-6 h-6 animate-spin" />
            <span>Intro Instrumental...</span>
          </div>
        )}
      </div>
    );
  }

  // Cinematic Flow or 3D Perspective Wall
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
            className="px-4 py-1.5 rounded-full glass-pill text-xs font-semibold text-white/90 shadow-2xl hover:text-white flex items-center gap-2 transition"
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            Resume Auto-Scroll
          </button>
        </div>
      )}

      {/* Top & Bottom gradient mask for smooth fading */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/90 via-black/40 to-transparent z-20" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-20" />

      {/* Lyrics Scrollable Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`w-full h-full overflow-y-auto px-6 sm:px-10 md:px-14 py-40 space-y-7 scroll-smooth ${
          config.style === 'perspective-3d' ? 'perspective-container' : ''
        }`}
      >
        <div className={config.style === 'perspective-3d' ? 'perspective-lyrics' : ''}>
          {lyrics.lines.map((line, idx) => {
            const isActive = idx === activeIndex;
            const isPast = idx < activeIndex;
            const isFuture = idx > activeIndex;

            const distance = Math.abs(idx - activeIndex);
            let opacity = 0.25;

            if (isActive) {
              opacity = 1.0;
            } else if (isPast) {
              opacity = Math.max(0.2, 0.45 - distance * 0.08);
            } else if (isFuture) {
              opacity = Math.max(0.15, 0.35 - distance * 0.07);
            }

            const isInst = isInstrumentalLine(line.text);

            return (
              <div
                key={line.id}
                ref={isActive ? activeLineRef : null}
                onClick={() => onSeek(line.time)}
                className={`group cursor-pointer transition-all duration-300 rounded-2xl py-1 px-3 ${
                  isActive ? 'scale-[1.02] origin-left' : 'hover:opacity-80 hover:scale-[1.005]'
                }`}
                style={{
                  opacity,
                  transformOrigin: 'left center'
                }}
              >
                {isInst ? (
                  /* Elegant Apple Music style 3-dot instrumental rhythm indicator */
                  <div className="flex items-center gap-2 py-3 select-none">
                    <span
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                        isActive ? 'bg-white shadow-[0_0_10px_white] scale-125' : 'bg-white/30'
                      }`}
                      style={{ animation: isActive ? 'pulse 1.2s infinite' : 'none' }}
                    />
                    <span
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                        isActive ? 'bg-white shadow-[0_0_10px_white] scale-125' : 'bg-white/30'
                      }`}
                      style={{
                        animation: isActive ? 'pulse 1.2s infinite' : 'none',
                        animationDelay: '200ms'
                      }}
                    />
                    <span
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                        isActive ? 'bg-white shadow-[0_0_10px_white] scale-125' : 'bg-white/30'
                      }`}
                      style={{
                        animation: isActive ? 'pulse 1.2s infinite' : 'none',
                        animationDelay: '400ms'
                      }}
                    />
                  </div>
                ) : (
                  <div className={`leading-relaxed transition-all duration-200 ${getFontSizeClass(isActive)}`}>
                    {isActive ? (
                      renderLineContent(line, effectiveTime, config.wordSync, palette, true)
                    ) : (
                      <span className="text-white/40 font-bold select-none group-hover:text-white/70 transition-colors">
                        {line.text}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * Checks if line is an instrumental indicator (♪, solo, instrumental)
 */
function isInstrumentalLine(text: string): boolean {
  const clean = text.trim();
  return clean === '♪' || clean === '♫' || /^\[(instrumental|solo)\]$/i.test(clean) || clean === '...';
}

/**
 * Bulletproof Dual-Layer Text Reveal
 * Completely avoids WebKit background-clip text bugs and rectangular solid boxes!
 */
function renderLineContent(
  line: LyricLine,
  currentTime: number,
  wordSync: boolean,
  palette: ColorPalette,
  isActive: boolean
) {
  // If word timings exist and wordSync is enabled
  if (wordSync && line.words && line.words.length > 0) {
    return (
      <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {line.words.map((w, wIdx) => {
          const isWordPast = currentTime >= w.end;
          const isWordActive = currentTime >= w.start && currentTime < w.end;

          let wordProgress = 0;
          if (isWordPast) {
            wordProgress = 100;
          } else if (isWordActive) {
            const wDur = Math.max(0.08, w.end - w.start);
            wordProgress = Math.min(100, Math.max(0, ((currentTime - w.start) / wDur) * 100));
          }

          return (
            <span
              key={wIdx}
              className={`relative inline-block leading-tight select-none transition-transform duration-100 ${
                isWordActive ? 'scale-[1.04] origin-bottom' : ''
              }`}
            >
              {/* Layer 1: Dimmed Base Text (30% opacity) */}
              <span className="text-white/30 font-bold select-none">
                {w.word}
              </span>

              {/* Layer 2: Precision Clipped Glowing Text (Reveals from left to right) */}
              <span
                className="absolute top-0 left-0 bottom-0 overflow-hidden pointer-events-none select-none transition-[width] duration-75 ease-linear"
                style={{
                  width: `${wordProgress}%`
                }}
              >
                <span
                  className="text-white font-extrabold whitespace-nowrap inline-block"
                  style={{
                    textShadow: `0 0 16px ${palette.glow}, 0 2px 12px rgba(255, 255, 255, 0.9)`
                  }}
                >
                  {w.word}
                </span>
              </span>
            </span>
          );
        })}
      </span>
    );
  }

  // Smooth line-level progressive reveal
  const lineDur = Math.max(0.2, line.endTime - line.time);
  const lineProgress = Math.min(100, Math.max(0, ((currentTime - line.time) / lineDur) * 100));

  return (
    <span className="relative inline-block select-none leading-tight">
      {/* Base Layer */}
      <span className="text-white/30 font-bold select-none">{line.text}</span>

      {/* Foreground Layer */}
      <span
        className="absolute top-0 left-0 bottom-0 overflow-hidden pointer-events-none select-none transition-[width] duration-75 ease-linear"
        style={{ width: `${lineProgress}%` }}
      >
        <span
          className="text-white font-extrabold whitespace-nowrap inline-block"
          style={{
            textShadow: `0 0 16px ${palette.glow}, 0 2px 12px rgba(255, 255, 255, 0.9)`
          }}
        >
          {line.text}
        </span>
      </span>
    </span>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
