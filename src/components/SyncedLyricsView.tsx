import React, { useEffect, useRef, useState, useMemo } from 'react';
import { LyricsData, LyricLine, ColorPalette, LyricStyle } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Music2 } from 'lucide-react';

interface SyncedLyricsViewProps {
  lyrics: LyricsData | null;
  currentTime: number;
  duration: number;
  palette: ColorPalette;
  style: LyricStyle;
  onChangeStyle: (style: LyricStyle) => void;
  onSeek: (seconds: number) => void;
  onSearchOpen?: () => void;
}

export const SyncedLyricsView: React.FC<SyncedLyricsViewProps> = ({
  lyrics,
  currentTime,
  duration,
  palette,
  style,
  onChangeStyle,
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

  // Find active word for Single-Word and Smooth-Captions modes
  const { activeWord, activeWordIndex, upcomingWords } = useMemo(() => {
    if (!activeLine || !activeLine.words || activeLine.words.length === 0) {
      return { activeWord: null, activeWordIndex: -1, upcomingWords: [] };
    }

    const words = activeLine.words;
    let idx = -1;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (currentTime >= w.start && currentTime < w.end) {
        idx = i;
        break;
      }
    }

    if (idx === -1) {
      for (let i = words.length - 1; i >= 0; i--) {
        if (currentTime >= words[i].start) {
          idx = i;
          break;
        }
      }
    }

    if (idx === -1 && words.length > 0) idx = 0;

    const w = idx >= 0 ? words[idx] : null;
    const upcoming = idx >= 0 ? words.slice(idx + 1, idx + 4).map(uw => uw.word) : [];

    return { activeWord: w, activeWordIndex: idx, upcomingWords: upcoming };
  }, [activeLine, currentTime]);

  // Smooth auto-scroll to center the active line (in multi-line modes)
  useEffect(() => {
    if (userIsScrolling || style === 'verci-single-word' || style === 'smooth-captions') return;
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeIndex, userIsScrolling, style]);

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
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden select-none">
      {/* ========================================================= */}
      {/* TOP: Sleek Lyrics Style Segmented Pill Selector */}
      {/* ========================================================= */}
      <div className="relative z-30 pt-1 pb-3 flex items-center justify-center sm:justify-start">
        <div className="flex items-center gap-1 bg-black/40 backdrop-blur-2xl border border-white/15 p-1 rounded-2xl shadow-xl">
          <button
            onClick={() => onChangeStyle('verci-single-word')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              style === 'verci-single-word'
                ? 'bg-white text-black shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            ✦ Single Word
          </button>

          <button
            onClick={() => onChangeStyle('smooth-captions')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              style === 'smooth-captions'
                ? 'bg-white text-black shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            Smooth Captions
          </button>

          <button
            onClick={() => onChangeStyle('cinematic')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              style === 'cinematic'
                ? 'bg-white text-black shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            Cinematic Flow
          </button>

          <button
            onClick={() => onChangeStyle('perspective-3d')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              style === 'perspective-3d'
                ? 'bg-white text-black shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            3D Wall
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MAIN LYRICS CONTENT AREA */}
      {/* ========================================================= */}
      <div className="relative flex-1 w-full h-full overflow-hidden flex flex-col justify-center">
        {/* ========================================================= */}
        {/* STYLE 1: VERCI SINGLE WORD AT A TIME */}
        {/* ========================================================= */}
        {style === 'verci-single-word' && (
          <div className="w-full h-full flex flex-col items-center justify-center px-4 text-center">
            {activeLine && !isInstrumentalLine(activeLine.text) && activeWord ? (
              <div className="flex flex-col items-center justify-center space-y-6 max-w-xl">
                {/* Giant Spring Kinetic Single Word */}
                <div className="min-h-[140px] flex items-center justify-center">
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={`${activeLine.id}-${activeWordIndex}`}
                      initial={{ opacity: 0, y: 35, scale: 0.85, filter: 'blur(8px)' }}
                      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: -25, scale: 1.05, filter: 'blur(6px)' }}
                      transition={{
                        type: 'spring',
                        stiffness: 450,
                        damping: 26,
                        mass: 0.7
                      }}
                      className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-white text-center tracking-tight leading-none drop-shadow-[0_4px_30px_rgba(255,255,255,0.7)]"
                    >
                      {activeWord.word}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Upcoming Words Ghost Preview */}
                {upcomingWords.length > 0 && (
                  <div className="text-xl sm:text-2xl font-bold text-white/35 tracking-wide">
                    {upcomingWords.join(' ')}
                  </div>
                )}

                {/* Full Line Breadcrumb Subtitle */}
                <div className="pt-2">
                  <p className="text-xs sm:text-sm font-semibold text-white/50 truncate max-w-md">
                    {activeLine.text}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-white animate-pulse shadow-[0_0_12px_white]" />
                  <span
                    className="w-3.5 h-3.5 rounded-full bg-white animate-pulse shadow-[0_0_12px_white]"
                    style={{ animationDelay: '200ms' }}
                  />
                  <span
                    className="w-3.5 h-3.5 rounded-full bg-white animate-pulse shadow-[0_0_12px_white]"
                    style={{ animationDelay: '400ms' }}
                  />
                </div>
                <p className="text-xs font-mono uppercase tracking-widest text-white/40">
                  Instrumental
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* STYLE 2: SMOOTH CAPTIONS (Dynamic Karaoke Pop) */}
        {/* ========================================================= */}
        {style === 'smooth-captions' && (
          <div className="w-full h-full flex flex-col items-center justify-center px-4 text-center">
            {activeLine && !isInstrumentalLine(activeLine.text) ? (
              <div className="space-y-6 max-w-2xl">
                {/* Active Phrase with Bouncy Spring Word Highlights */}
                <div className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-snug flex flex-wrap justify-center gap-x-3 gap-y-2">
                  {activeLine.words && activeLine.words.length > 0 ? (
                    activeLine.words.map((w, wIdx) => {
                      const isCurrent = currentTime >= w.start && currentTime < w.end;
                      const isPast = currentTime >= w.end;

                      return (
                        <motion.span
                          key={wIdx}
                          animate={{
                            scale: isCurrent ? 1.15 : 1.0,
                            color: isCurrent ? '#ffffff' : isPast ? '#ffffff' : 'rgba(255, 255, 255, 0.25)'
                          }}
                          transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                          className={`inline-block font-black transition-all duration-75 ${
                            isCurrent
                              ? 'drop-shadow-[0_0_25px_rgba(255,255,255,0.9)] text-white'
                              : isPast
                              ? 'text-white'
                              : 'text-white/25'
                          }`}
                        >
                          {w.word}
                        </motion.span>
                      );
                    })
                  ) : (
                    <span className="text-white font-black">{activeLine.text}</span>
                  )}
                </div>

                {/* Next line preview */}
                {lyrics.lines[activeIndex + 1] && !isInstrumentalLine(lyrics.lines[activeIndex + 1].text) && (
                  <p
                    onClick={() => onSeek(lyrics.lines[activeIndex + 1].time)}
                    className="text-lg sm:text-xl text-white/30 font-bold cursor-pointer hover:text-white/60 transition-colors pt-2"
                  >
                    {lyrics.lines[activeIndex + 1].text}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 text-white/40 font-bold text-2xl">
                <Music2 className="w-6 h-6 animate-spin text-white/60" />
                <span>Instrumental...</span>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* STYLE 3: CINEMATIC FLOW & 3D WALL (Multi-line Scrolling) */}
        {/* ========================================================= */}
        {(style === 'cinematic' || style === 'perspective-3d') && (
          <div className="relative w-full h-full overflow-hidden">
            {/* Top & Bottom gradient masks */}
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/85 via-black/30 to-transparent z-20" />
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black/85 via-black/30 to-transparent z-20" />

            {/* Scrollable Container */}
            <div
              ref={containerRef}
              onScroll={handleScroll}
              className={`w-full h-full overflow-y-auto px-4 sm:px-8 py-36 space-y-7 scroll-smooth ${
                style === 'perspective-3d' ? 'perspective-container' : ''
              }`}
            >
              <div className={style === 'perspective-3d' ? 'perspective-lyrics' : ''}>
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
          </div>
        )}
      </div>
    </div>
  );
};

function isInstrumentalLine(text: string): boolean {
  const clean = text.trim();
  return clean === '♪' || clean === '♫' || /^\[(instrumental|solo)\]$/i.test(clean) || clean === '...';
}

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
              <span className="text-white/25 font-bold select-none">
                {w.word}
              </span>

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
