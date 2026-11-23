import { compareWord, findMistakes } from "@/lib/compare";
import type { Attempt, TimeLimit, Word } from "@/lib/types";

const CHARACTERS_PER_WORD = 5;
export const MS_PER_MINUTE = 60_000;
// A very short attempt still counts as one second, so WPM never divides by zero.
const MIN_ACTIVE_MS = 1_000;

export type AttemptStats = {
  wordsTyped: number;
  correctWords: number;
  // 0 to 100; 0 when no word was typed.
  accuracy: number;
  wpm: number;
  // Every word of the answer was typed.
  isComplete: boolean;
};

// committedWords[i] is what was typed for words[i] (TypingState); the last word is
// already in it when the attempt finished. activeMs leaves out paused time.
export const calculateStats = (
  words: Word[],
  committedWords: string[],
  activeMs: number,
): AttemptStats => {
  const wordsTyped = committedWords.length;
  const correctWords = words.filter(
    (word, index) => index < wordsTyped && compareWord(word.text, committedWords[index]) === null,
  );

  // Each correct word counts with one space after it.
  const correctCharacters = correctWords.reduce((sum, word) => sum + word.text.length + 1, 0);
  const minutes = Math.max(activeMs, MIN_ACTIVE_MS) / MS_PER_MINUTE;

  return {
    wordsTyped,
    correctWords: correctWords.length,
    accuracy: wordsTyped === 0 ? 0 : Math.round((correctWords.length / wordsTyped) * 100),
    wpm: Math.round(correctCharacters / CHARACTERS_PER_WORD / minutes),
    isComplete: words.length > 0 && wordsTyped === words.length,
  };
};

type AttemptInput = {
  id: string;
  answerId: string;
  finishedAt: string; // ISO date
  durationMs: number; // paused time not counted
  timeLimit: TimeLimit;
  words: Word[];
  committedWords: string[];
};

// The attempt as it is saved.
export const createAttempt = ({
  id,
  answerId,
  finishedAt,
  durationMs,
  timeLimit,
  words,
  committedWords,
}: AttemptInput): Attempt => {
  const stats = calculateStats(words, committedWords, durationMs);

  return {
    id,
    answerId,
    finishedAt,
    durationMs,
    timeLimit,
    wordsTyped: stats.wordsTyped,
    wordsTotal: words.length,
    complete: stats.isComplete,
    wpm: stats.wpm,
    accuracy: stats.accuracy,
    errors: findMistakes(words, committedWords),
  };
};

// The newest attempt on the same answer saved before this one, complete or not.
// Attempts are stored newest first.
export const findPreviousAttempt = (attempts: Attempt[], current: Attempt): Attempt | undefined =>
  attempts
    .slice(attempts.findIndex((attempt) => attempt.id === current.id) + 1)
    .find((attempt) => attempt.answerId === current.answerId);

// The Result's personal best: the highest accuracy of the earlier attempts on the same
// answer. Null for a first attempt.
export const findBestEarlierAccuracy = (attempts: Attempt[], current: Attempt): number | null => {
  const earlier = attempts.filter(
    (attempt) => attempt.answerId === current.answerId && attempt.id !== current.id,
  );
  return earlier.length === 0 ? null : Math.max(...earlier.map((attempt) => attempt.accuracy));
};

const MS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;

// The time on the status line and the Result: 125_000 ms is "02:05".
export const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / MS_PER_SECOND);
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};
