import { LyricLine, WordTiming } from '../types';

/**
 * Parses raw LRC or enhanced LRC text into structured LyricLine array
 */
export function parseLRC(rawLrc: string, totalDuration: number = 0): LyricLine[] {
  if (!rawLrc || typeof rawLrc !== 'string') return [];

  const lines = rawLrc.split(/\r?\n/);
  const parsedLines: { time: number; text: string; words?: WordTiming[] }[] = [];

  const timeRegex = /\[(\d{2,}):(\d{2}(?:\.\d{1,3})?)\]/g;
  const wordTagRegex = /<(\d{2,}):(\d{2}(?:\.\d{1,3})?)>\s*([^<]+)/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^\[(ti|ar|al|au|length|by|offset|re|ve):/i.test(trimmed)) {
      continue;
    }

    const matches = Array.from(trimmed.matchAll(timeRegex));
    if (matches.length > 0) {
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
          let nextStart = start + 0.35;
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

  // Filter out duplicates
  const uniqueLines = parsedLines.filter((l, idx) => {
    if (idx === 0) return true;
    return !(l.time === parsedLines[idx - 1].time && l.text === parsedLines[idx - 1].text);
  });

  // Calculate endTime for each line and generate musical word-level timings
  const result: LyricLine[] = uniqueLines.map((line, idx) => {
    const nextLine = uniqueLines[idx + 1];
    let endTime: number;

    if (nextLine) {
      const gap = nextLine.time - line.time;
      endTime = gap > 6.5 ? line.time + 4.2 : nextLine.time;
    } else {
      endTime = totalDuration > line.time ? Math.min(line.time + 5.5, totalDuration) : line.time + 4.5;
    }

    const words = line.words || interpolateMusicalWords(line.text, line.time, endTime);

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
 * High-accuracy musical syllable & word interpolation for fluid Verci / Apple Music single-word timings
 */
function interpolateMusicalWords(text: string, startTime: number, endTime: number): WordTiming[] {
  if (!text) return [];
  const rawWords = text.split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return [];

  const lineDuration = Math.max(0.4, endTime - startTime);

  // Calculate weights based on syllables, vowels, and punctuation
  const weights = rawWords.map((word, idx) => {
    let weight = Math.max(2, word.length);
    // Vowels take longer to sing than consonants
    const vowelCount = (word.match(/[aeiouy]/gi) || []).length;
    weight += vowelCount * 1.5;

    // Last word often sustains longer (held note)
    if (idx === rawWords.length - 1) {
      weight *= 1.35;
    }

    // Punctuation pause
    if (/[,.?!:;]$/.test(word)) {
      weight *= 1.2;
    }

    return weight;
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let currentStart = startTime;
  const wordTimings: WordTiming[] = [];

  for (let i = 0; i < rawWords.length; i++) {
    const word = rawWords[i];
    const duration = (weights[i] / totalWeight) * lineDuration;
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
 * Converts plain text lyrics into estimated timed lines
 */
export function convertPlainToEstimatedLines(plainText: string, trackDuration: number = 180): LyricLine[] {
  if (!plainText) return [];
  const rawLines = plainText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !/^\[.+\]$/.test(l));

  if (rawLines.length === 0) return [];

  const startOffset = Math.min(10, trackDuration * 0.08);
  const endOffset = trackDuration * 0.94;
  const usableDuration = Math.max(25, endOffset - startOffset);
  const lineInterval = usableDuration / rawLines.length;

  return rawLines.map((text, idx) => {
    const time = startOffset + idx * lineInterval;
    const endTime = time + lineInterval;
    return {
      id: idx + 1,
      time,
      endTime,
      text,
      words: interpolateMusicalWords(text, time, endTime)
    };
  });
}
