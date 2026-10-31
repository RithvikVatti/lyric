import { LyricLine, WordTiming } from '../types';

/**
 * Parses raw LRC or enhanced LRC text into structured LyricLine array
 */
export function parseLRC(rawLrc: string, totalDuration: number = 0): LyricLine[] {
  if (!rawLrc || typeof rawLrc !== 'string') return [];

  const lines = rawLrc.split(/\r?\n/);
  const parsedLines: { time: number; text: string; words?: WordTiming[] }[] = [];

  // Match: [00:12.34] or [01:23.456]
  const timeRegex = /\[(\d{2,}):(\d{2}(?:\.\d{1,3})?)\]/g;
  // Match word tags: <00:12.34> word or <1234> word
  const wordTagRegex = /<(\d{2,}):(\d{2}(?:\.\d{1,3})?)>\s*([^<]+)/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip metadata tags like [ar:artist], [ti:title], [length:03:45], etc.
    if (/^\[(ti|ar|al|au|length|by|offset|re|ve):/i.test(trimmed)) {
      continue;
    }

    const matches = Array.from(trimmed.matchAll(timeRegex));
    if (matches.length > 0) {
      // The text is whatever is after all time tags
      const pureText = trimmed.replace(timeRegex, '').trim();

      // Check if pureText has word timestamps <mm:ss.xx>
      let wordTimings: WordTiming[] | undefined;
      const wordMatches = Array.from(pureText.matchAll(wordTagRegex));

      if (wordMatches.length > 0) {
        wordTimings = wordMatches.map((wm, idx) => {
          const min = parseFloat(wm[1]);
          const sec = parseFloat(wm[2]);
          const start = min * 60 + sec;
          const wordText = wm[3].trim();
          // next word start or estimate
          let nextStart = start + 0.4;
          if (idx < wordMatches.length - 1) {
            const nextMin = parseFloat(wordMatches[idx + 1][1]);
            const nextSec = parseFloat(wordMatches[idx + 1][2]);
            nextStart = nextMin * 60 + nextSec;
          }
          return {
            word: wordText,
            start,
            end: nextStart
          };
        });
      }

      for (const match of matches) {
        const min = parseFloat(match[1]);
        const sec = parseFloat(match[2]);
        const timeInSeconds = min * 60 + sec;

        parsedLines.push({
          time: timeInSeconds,
          text: pureText.replace(/<\d{2,}:\d{2}(?:\.\d{1,3})?>/g, '').trim(),
          words: wordTimings
        });
      }
    }
  }

  // Sort by time ascending
  parsedLines.sort((a, b) => a.time - b.time);

  // Filter out duplicate identical consecutive lines
  const uniqueLines = parsedLines.filter((l, idx) => {
    if (idx === 0) return true;
    return !(l.time === parsedLines[idx - 1].time && l.text === parsedLines[idx - 1].text);
  });

  // Calculate endTime for each line and generate word-level timings if missing
  const result: LyricLine[] = uniqueLines.map((line, idx) => {
    const nextLine = uniqueLines[idx + 1];
    let endTime: number;

    if (nextLine) {
      // If gap is longer than 7 seconds, end line after ~4.5 seconds so it feels natural
      const gap = nextLine.time - line.time;
      endTime = gap > 7 ? line.time + 4.5 : nextLine.time;
    } else {
      endTime = totalDuration > line.time ? Math.min(line.time + 6, totalDuration) : line.time + 5;
    }

    // If no explicit word timings exist, generate realistic word interpolation
    const words = line.words || interpolateWords(line.text, line.time, endTime);

    return {
      id: idx + 1,
      time: line.time,
      endTime,
      text: line.text,
      words
    };
  });

  return result;
}

/**
 * Intelligent syllable & word interpolation for fluid Apple Music / Verci style kinetic animations
 */
function interpolateWords(text: string, startTime: number, endTime: number): WordTiming[] {
  if (!text) return [];
  const rawWords = text.split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return [];

  const lineDuration = Math.max(0.5, endTime - startTime);
  // Weight words slightly by character length (longer words take longer to sing)
  const totalWeight = rawWords.reduce((sum, w) => sum + Math.max(2, w.length), 0);

  let currentStart = startTime;
  const wordTimings: WordTiming[] = [];

  for (let i = 0; i < rawWords.length; i++) {
    const word = rawWords[i];
    const weight = Math.max(2, word.length);
    const duration = (weight / totalWeight) * lineDuration;
    const end = Math.min(endTime, currentStart + duration);

    wordTimings.push({
      word,
      start: currentStart,
      end
    });

    currentStart = end;
  }

  return wordTimings;
}

/**
 * Converts plain text lyrics into estimated timed lines when no LRC is available
 */
export function convertPlainToEstimatedLines(plainText: string, trackDuration: number = 180): LyricLine[] {
  if (!plainText) return [];
  const rawLines = plainText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !/^\[.+\]$/.test(l));

  if (rawLines.length === 0) return [];

  // Spread lines evenly across 15% to 90% of track duration
  const startOffset = Math.min(12, trackDuration * 0.1);
  const endOffset = trackDuration * 0.92;
  const usableDuration = Math.max(30, endOffset - startOffset);
  const lineInterval = usableDuration / rawLines.length;

  return rawLines.map((text, idx) => {
    const time = startOffset + idx * lineInterval;
    const endTime = time + lineInterval;
    return {
      id: idx + 1,
      time,
      endTime,
      text,
      words: interpolateWords(text, time, endTime)
    };
  });
}
