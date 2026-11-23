import { describe, expect, it } from "vitest";

import {
  calculateStats,
  createAttempt,
  findBestEarlierAccuracy,
  findPreviousAttempt,
  formatDuration,
} from "@/lib/stats";
import { tokenize } from "@/lib/tokenize";
import type { Attempt } from "@/lib/types";

// "It" is 2 letters and "rose." is 5, so with a space after each they are 3 + 6 = 9.
const WORDS = tokenize("It rose.\n\nThen it fell.");
const HALF_A_MINUTE = 30_000;

describe("calculateStats: accuracy", () => {
  it("is 100 when every typed word is correct", () => {
    expect(calculateStats(WORDS, ["It", "rose."], HALF_A_MINUTE).accuracy).toBe(100);
  });

  it("is correct words divided by typed words, as a whole number", () => {
    // 2 of 3 correct: 66.67 rounds to 67.
    const stats = calculateStats(WORDS, ["It", "rose.", "then"], HALF_A_MINUTE);

    expect(stats.correctWords).toBe(2);
    expect(stats.wordsTyped).toBe(3);
    expect(stats.accuracy).toBe(67);
  });

  it("rounds down below a half", () => {
    // 1 of 3 correct: 33.33 rounds to 33.
    expect(calculateStats(WORDS, ["It", "rise.", "then"], HALF_A_MINUTE).accuracy).toBe(33);
  });

  it("counts a word wrong only in case or punctuation as wrong", () => {
    expect(calculateStats(WORDS, ["it", "rose"], HALF_A_MINUTE).accuracy).toBe(0);
  });
});

describe("calculateStats: WPM", () => {
  it("is the letters of correct words plus one space each, over 5, per minute", () => {
    // 9 characters / 5 = 1.8 words in half a minute = 3.6, rounds to 4.
    expect(calculateStats(WORDS, ["It", "rose."], HALF_A_MINUTE).wpm).toBe(4);
  });

  it("leaves wrong words out", () => {
    // Only "It" is correct: 3 characters / 5 = 0.6 words in one minute, rounds to 1.
    expect(calculateStats(WORDS, ["It", "rise."], 60_000).wpm).toBe(1);
  });

  it("uses only the active time it is given, so paused time is left out", () => {
    // The same words in a quarter of the time give four times the speed: 14.4 rounds to 14.
    expect(calculateStats(WORDS, ["It", "rose."], HALF_A_MINUTE / 4).wpm).toBe(14);
  });

  it("counts a very short attempt as one second", () => {
    // 1.8 words in one second is 108 WPM, the same for 0 ms and 1 second.
    expect(calculateStats(WORDS, ["It", "rose."], 0).wpm).toBe(108);
    expect(calculateStats(WORDS, ["It", "rose."], 1_000).wpm).toBe(108);
  });
});

describe("calculateStats: no words typed", () => {
  it("gives 0 for accuracy and WPM, without dividing by zero", () => {
    expect(calculateStats(WORDS, [], 0)).toEqual({
      wordsTyped: 0,
      correctWords: 0,
      accuracy: 0,
      wpm: 0,
      isComplete: false,
    });
  });
});

describe("calculateStats: complete or not", () => {
  it("is complete when every word of the answer was typed", () => {
    const typed = ["It", "rose.", "Then", "it", "fell."];

    expect(calculateStats(WORDS, typed, HALF_A_MINUTE).isComplete).toBe(true);
  });

  it("is complete even when some typed words are wrong", () => {
    const typed = ["It", "rise.", "then", "it", "fel"];

    expect(calculateStats(WORDS, typed, HALF_A_MINUTE).isComplete).toBe(true);
  });

  it("is incomplete when the attempt ended early", () => {
    expect(calculateStats(WORDS, ["It", "rose."], HALF_A_MINUTE).isComplete).toBe(false);
  });
});

describe("createAttempt", () => {
  it("builds the attempt to save, with its numbers and mistakes", () => {
    const attempt = createAttempt({
      id: "t1",
      answerId: "a1",
      finishedAt: "2026-11-21T10:05:00.000Z",
      durationMs: HALF_A_MINUTE,
      timeLimit: 20,
      words: WORDS,
      committedWords: ["It", "rose", "Then"],
    });

    expect(attempt).toEqual({
      id: "t1",
      answerId: "a1",
      finishedAt: "2026-11-21T10:05:00.000Z",
      durationMs: HALF_A_MINUTE,
      timeLimit: 20,
      wordsTyped: 3,
      wordsTotal: 5,
      complete: false,
      // "It" and "Then" are correct: (3 + 5) / 5 = 1.6 words in half a minute = 3.2, rounds to 3.
      wpm: 3,
      accuracy: 67,
      errors: [{ index: 1, expected: "rose.", typed: "rose", kind: "punctuation" }],
    });
  });
});

describe("findPreviousAttempt", () => {
  const attempt = (id: string, answerId: string, accuracy: number): Attempt => ({
    id,
    answerId,
    finishedAt: "2026-11-21T10:05:00.000Z",
    durationMs: HALF_A_MINUTE,
    timeLimit: 0,
    wordsTyped: 5,
    wordsTotal: 5,
    complete: true,
    wpm: 30,
    accuracy,
    errors: [],
  });

  // Newest first, as stored.
  const attempts = [
    attempt("new", "a1", 89),
    attempt("other", "a2", 50),
    attempt("older", "a1", 82),
    attempt("oldest", "a1", 70),
  ];

  it("finds the newest earlier attempt on the same answer", () => {
    expect(findPreviousAttempt(attempts, attempts[0])?.id).toBe("older");
  });

  it("finds nothing for the first attempt on an answer", () => {
    expect(findPreviousAttempt(attempts, attempts[1])).toBeUndefined();
    expect(findPreviousAttempt(attempts, attempts[3])).toBeUndefined();
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "00:00"],
    [999, "00:00"],
    [125_000, "02:05"],
    [40 * 60_000, "40:00"],
  ])("shows %i ms as %s", (ms, text) => {
    expect(formatDuration(ms)).toBe(text);
  });
});

describe("findBestEarlierAccuracy (Result, personal best)", () => {
  const withAccuracy = (id: string, answerId: string, accuracy: number): Attempt => ({
    id,
    answerId,
    finishedAt: "2026-11-21T10:05:00.000Z",
    durationMs: HALF_A_MINUTE,
    timeLimit: 0,
    wordsTyped: 5,
    wordsTotal: 5,
    complete: true,
    wpm: 30,
    accuracy,
    errors: [],
  });
  const current = withAccuracy("new", "a1", 89);

  it("is the highest accuracy of the earlier attempts on the same answer", () => {
    const attempts = [
      current,
      withAccuracy("other", "a2", 99),
      withAccuracy("older", "a1", 92),
      withAccuracy("oldest", "a1", 70),
    ];

    expect(findBestEarlierAccuracy(attempts, current)).toBe(92);
  });

  it("is null for a first attempt", () => {
    expect(findBestEarlierAccuracy([current, withAccuracy("other", "a2", 99)], current)).toBeNull();
  });
});
