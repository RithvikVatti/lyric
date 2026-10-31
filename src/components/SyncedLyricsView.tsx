import React, { useEffect, useRef, useState, useMemo } from 'react';
import { LyricsData, LyricLine, ColorPalette } from '../types';
import { Music2 } from 'lucide-react';

interface SyncedLyricsViewProps {
  lyrics: LyricsData | null;
  currentTime: number;
  duration: number;
  palette: ColorPalette;
  onSeek: (seconds: number) => void;
  onSearchOpen?: () => void;
}

export const SyncedLyricsView: React.FC<SyncedLyricsViewProps> = ({
  lyrics,
  currentTime,
  palette,
  onSeek,
  onSearchOpen
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const [userIsScrolling, setUserIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<any>(null);

  // Find active line index
  const activeIndex = useMemo(() => {
    if (!lyrics || !lyrics.lines || lyrics.lines.length === 0) return -1;
    const lines = lyrics.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];

      if (currentTime >= line.time) {
        if (!nextLine || currentTime < nextLine.time) {
          return i;
        }
      }
    }

    if (currentTime < lines[0].time) return -1;
    return lines.length - 1;
  }, [lyrics, currentTime]);

  const activeLine: LyricLine | null = useMemo(() => {
    if (!lyrics || activeIndex === -1 || !lyrics.lines[activeIndex]) return null;
    return lyrics.lines[activeIndex];
  }, [lyrics, activeIndex]);

  // Smooth auto-scroll to center the active line
  useEffect(() => {
    if (userIsScrolling) return;
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeIndex, userIsScrolling]);

  const handleScroll = () => {
    setUserIsScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setUserIsScrolling(false);
    }, 3000);
  };

  // If no lyrics found
  if (!lyrics || lyrics.lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center select-none">
        <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 flex items-center justify-center mb-4 text-white/70 shadow-lg">
          <Music2 className="w-7 h-7 animate-pulse text-white/80" />
        </div>
        <h3 className="text-xl font-bold text-white mb-1.5">No Synced Lyrics Available</h3>
        <p className="text-sm text-white/50 max-w-sm mb-5 leading-relaxed">
          Lyrics haven't been indexed for this track on LRCLIB yet, or the song is instrumental.
        </p>
        {onSearchOpen && (
          <button
            onClick={onSearchOpen}
            className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/15 text-xs font-semibold text-white transition shadow-sm"
          >
            Search Alternative Releases
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col justify-center overflow-hidden select-none">
      {/* Top & Bottom gradient mask for smooth fading */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/85 via-black/30 to-transparent z-20" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/85 via-black/30 to-transparent z-20" />

      {/* Lyrics Scrollable Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-full overflow-y-auto px-4 sm:px-8 md:px-12 py-40 space-y-7 scroll-smooth"
      >
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
            opacity = Math.max(0.12, 0.35 - distance * 0.07);
          }

          const isInst = isInstrumentalLine(line.text);

          return (
            <div
              key={line.id}
              ref={isActive ? activeLineRef : null}
              onClick={() => onSeek(line.time)}
              className={`group cursor-pointer transition-all duration-300 py-1 px-3 rounded-2xl ${
                isActive ? 'scale-[1.01] origin-left' : 'hover:opacity-80'
              }`}
              style={{
                opacity,
                transformOrigin: 'left center'
              }}
            >
              {isInst ? (
                /* Apple Music 3-dot rhythm indicator */
                <div className="flex items-center gap-2 py-3 select-none">
                  <span
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      isActive ? 'bg-white shadow-[0_0_12px_white] scale-125' : 'bg-white/30'
                    }`}
                    style={{ animation: isActive ? 'pulse 1.2s infinite' : 'none' }}
                  />
                  <span
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      isActive ? 'bg-white shadow-[0_0_12px_white] scale-125' : 'bg-white/30'
                    }`}
                    style={{
                      animation: isActive ? 'pulse 1.2s infinite' : 'none',
                      animationDelay: '200ms'
                    }}
                  />
                  <span
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      isActive ? 'bg-white shadow-[0_0_12px_white] scale-125' : 'bg-white/30'
                    }`}
                    style={{
                      animation: isActive ? 'pulse 1.2s infinite' : 'none',
                      animationDelay: '400ms'
                    }}
                  />
                </div>
              ) : (
                <div
                  className={`leading-snug transition-all duration-200 ${
                    isActive
                      ? 'text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white'
                      : 'text-xl sm:text-2xl md:text-3xl font-bold tracking-tight'
                  }`}
                >
                  {isActive ? (
                    renderActiveLineContent(line, currentTime)
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
  );
};

function isInstrumentalLine(text: string): boolean {
  const clean = text.trim();
  return clean === '♪' || clean === '♫' || /^\[(instrumental|solo)\]$/i.test(clean) || clean === '...';
}

/**
 * Clean, non-AI, reliable word reveal
 */
function renderActiveLineContent(line: LyricLine, currentTime: number) {
  if (line.words && line.words.length > 0) {
    return (
      <span className="inline-flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
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
                isWordActive ? 'scale-[1.03] origin-bottom' : ''
              }`}
            >
              {/* Dimmed Base Layer */}
              <span className="text-white/25 font-bold select-none">
                {w.word}
              </span>

              {/* Glowing Active Layer */}
              <span
                className="absolute top-0 left-0 bottom-0 overflow-hidden pointer-events-none select-none transition-[width] duration-75 ease-linear"
                style={{
                  width: `${wordProgress}%`
                }}
              >
                <span className="text-white font-black whitespace-nowrap inline-block drop-shadow-[0_2px_12px_rgba(255,255,255,0.7)]">
                  {w.word}
                </span>
              </span>
            </span>
          );
        })}
      </span>
    );
  }

  // Smooth line reveal fallback
  const lineDur = Math.max(0.2, line.endTime - line.time);
  const lineProgress = Math.min(100, Math.max(0, ((currentTime - line.time) / lineDur) * 100));

  return (
    <span className="relative inline-block select-none leading-tight">
      <span className="text-white/25 font-bold select-none">{line.text}</span>
      <span
        className="absolute top-0 left-0 bottom-0 overflow-hidden pointer-events-none select-none transition-[width] duration-75 ease-linear"
        style={{ width: `${lineProgress}%` }}
      >
        <span className="text-white font-black whitespace-nowrap inline-block drop-shadow-[0_2px_12px_rgba(255,255,255,0.7)]">
          {line.text}
        </span>
      </span>
    </span>
  );
}
