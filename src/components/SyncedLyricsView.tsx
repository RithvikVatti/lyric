import React, { useEffect, useRef, useState, useMemo } from 'react';
import { LyricConfig, LyricsData, LyricLine, WordTiming, ColorPalette } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
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

  // Find current active word for Single-Word & Smooth-Captions modes
  const { activeWord, activeWordIndex, upcomingWords } = useMemo(() => {
    if (!activeLine || !activeLine.words || activeLine.words.length === 0) {
      return { activeWord: null, activeWordIndex: -1, upcomingWords: [] };
    }

    const words = activeLine.words;
    let idx = -1;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (effectiveTime >= w.start && effectiveTime < w.end) {
        idx = i;
        break;
      }
    }

    // If between words or near end, snap to closest past word
    if (idx === -1) {
      for (let i = words.length - 1; i >= 0; i--) {
        if (effectiveTime >= words[i].start) {
          idx = i;
          break;
        }
      }
    }

    if (idx === -1 && words.length > 0) idx = 0;

    const w = idx >= 0 ? words[idx] : null;
    const upcoming = idx >= 0 ? words.slice(idx + 1, idx + 4).map(uw => uw.word) : [];

    return { activeWord: w, activeWordIndex: idx, upcomingWords: upcoming };
  }, [activeLine, effectiveTime]);

  // Smooth auto-scroll to center the active line (for multi-line view)
  useEffect(() => {
    if (userIsScrolling || !config.autoScroll) return;
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeIndex, userIsScrolling, config.autoScroll]);

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

  // If no lyrics found
  if (!lyrics || lyrics.lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center z-10">
        <div className="w-16 h-16 rounded-2xl glass-panel flex items-center justify-center mb-4 text-white/60 shadow-lg">
          <Music2 className="w-8 h-8 animate-pulse text-cyan-400" />
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

  // ==========================================
  // MODE 1: VERCI SINGLE WORD AT A TIME
  // ==========================================
  if (config.style === 'verci-single-word') {
    const isInst = activeLine ? isInstrumentalLine(activeLine.text) : false;

    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center z-10 max-w-4xl mx-auto select-none">
        {activeLine && !isInst && activeWord ? (
          <div className="flex flex-col items-center justify-center space-y-6">
            {/* Timestamp Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono bg-white/10 text-white/70 backdrop-blur-md border border-white/10 shadow-sm">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{formatTime(effectiveTime)}</span>
              <span className="text-white/40">/</span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* Massive Spring Kinetic Single Word */}
            <div className="min-h-[140px] flex items-center justify-center overflow-visible">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={`${activeLine.id}-${activeWordIndex}`}
                  initial={{ opacity: 0, y: 35, scale: 0.8, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -30, scale: 1.08, filter: 'blur(8px)' }}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 30,
                    mass: 0.7
                  }}
                  className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-white text-center tracking-tight leading-none"
                  style={{
                    textShadow: `0 0 45px ${palette.glow}, 0 2px 20px rgba(255,255,255,0.8)`
                  }}
                >
                  {activeWord.word}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Ghost Preview of Upcoming Words */}
            {upcomingWords.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.35 }}
                className="text-lg sm:text-2xl font-bold text-white tracking-wide"
              >
                {upcomingWords.join(' ')}
              </motion.div>
            )}

            {/* Full Line Subtitle Breadcrumb */}
            <div className="pt-4 max-w-xl text-center">
              <p className="text-xs sm:text-sm font-semibold text-white/40 truncate">
                {activeLine.text}
              </p>
            </div>
          </div>
        ) : (
          /* Instrumental Break in Single Word mode */
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_15px_#22d3ee]" />
              <span
                className="w-3.5 h-3.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_15px_#22d3ee]"
                style={{ animationDelay: '200ms' }}
              />
              <span
                className="w-3.5 h-3.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_15px_#22d3ee]"
                style={{ animationDelay: '400ms' }}
              />
            </div>
            <p className="text-sm font-mono tracking-widest uppercase text-white/50">
              Instrumental Interlude
            </p>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // MODE 2: SMOOTH CAPTIONS (Viral / Karaoke Pop)
  // ==========================================
  if (config.style === 'smooth-captions') {
    const isInst = activeLine ? isInstrumentalLine(activeLine.text) : false;
    const nextLine = lyrics.lines[activeIndex + 1];

    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center z-10 max-w-4xl mx-auto select-none">
        {activeLine && !isInst ? (
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono bg-white/10 text-white/70 backdrop-blur-md border border-white/10">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{formatTime(effectiveTime)}</span>
            </div>

            {/* Active Caption Phrase with Spring Word Pop */}
            <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-snug flex flex-wrap justify-center gap-x-3 gap-y-2">
              {activeLine.words && activeLine.words.length > 0 ? (
                activeLine.words.map((w, wIdx) => {
                  const isCurrent = effectiveTime >= w.start && effectiveTime < w.end;
                  const isPast = effectiveTime >= w.end;

                  return (
                    <motion.span
                      key={wIdx}
                      animate={{
                        scale: isCurrent ? 1.14 : 1.0,
                        color: isCurrent ? '#ffffff' : isPast ? '#ffffff' : 'rgba(255, 255, 255, 0.3)'
                      }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      className={`inline-block font-extrabold transition-all duration-75 ${
                        isCurrent
                          ? 'drop-shadow-[0_0_20px_rgba(255,255,255,0.9)] text-cyan-300'
                          : isPast
                          ? 'text-white'
                          : 'text-white/30'
                      }`}
                      style={{
                        textShadow: isCurrent ? `0 0 25px ${palette.accent}` : 'none'
                      }}
                    >
                      {w.word}
                    </motion.span>
                  );
                })
              ) : (
                <span className="text-white font-extrabold">{activeLine.text}</span>
              )}
            </div>

            {/* Upcoming Next Line Preview */}
            {nextLine && !isInstrumentalLine(nextLine.text) && (
              <p
                onClick={() => onSeek(nextLine.time)}
                className="text-lg sm:text-xl text-white/30 font-bold cursor-pointer hover:text-white/60 transition-colors pt-2"
              >
                {nextLine.text}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 text-white/40 font-bold text-2xl">
            <Music2 className="w-6 h-6 animate-spin text-cyan-400" />
            <span>Instrumental...</span>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // MODE 3: CINEMATIC FLOW / 3D WALL (Apple Music Style)
  // ==========================================
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
              <motion.div
                key={line.id}
                ref={isActive ? activeLineRef : null}
                onClick={() => onSeek(line.time)}
                layout="position"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={`group cursor-pointer rounded-2xl py-1 px-3 ${
                  isActive ? 'scale-[1.02] origin-left' : 'hover:opacity-80 hover:scale-[1.005]'
                }`}
                style={{
                  opacity,
                  transformOrigin: 'left center'
                }}
              >
                {isInst ? (
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
                  <div className={`leading-relaxed ${getFontSizeClass(isActive)}`}>
                    {isActive ? (
                      renderLineContent(line, effectiveTime, config.wordSync, palette)
                    ) : (
                      <span className="text-white/40 font-bold select-none group-hover:text-white/70 transition-colors">
                        {line.text}
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

function isInstrumentalLine(text: string): boolean {
  const clean = text.trim();
  return clean === '♪' || clean === '♫' || /^\[(instrumental|solo)\]$/i.test(clean) || clean === '...';
}

/**
 * Bulletproof Dual-Layer Text Reveal for Multi-Line View
 */
function renderLineContent(
  line: LyricLine,
  currentTime: number,
  wordSync: boolean,
  palette: ColorPalette
) {
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
              <span className="text-white/30 font-bold select-none">
                {w.word}
              </span>

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

  const lineDur = Math.max(0.2, line.endTime - line.time);
  const lineProgress = Math.min(100, Math.max(0, ((currentTime - line.time) / lineDur) * 100));

  return (
    <span className="relative inline-block select-none leading-tight">
      <span className="text-white/30 font-bold select-none">{line.text}</span>
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
