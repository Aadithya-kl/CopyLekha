import { tokenize } from "@/lib/tokenize";
import type { AttemptError, ErrorKind, LetterState, VocabularyItem, Word } from "@/lib/types";

// Everything that is not a letter or a digit, in any script.
const NOT_LETTER_OR_DIGIT = /[^\p{L}\p{N}]/gu;

const lettersAndDigits = (word: string): string =>
  word.replace(NOT_LETTER_OR_DIGIT, "").toLowerCase();

// Null when the typed word equals the model word exactly
// (case and punctuation included); otherwise the kind, decided in this order.
export const compareWord = (expected: string, typed: string): ErrorKind | null => {
  if (typed === expected) {
    return null;
  }
  if (lettersAndDigits(typed) !== lettersAndDigits(expected)) {
    return "spelling";
  }
  if (typed.toLowerCase() === expected.toLowerCase()) {
    return "case";
  }
  return "punctuation";
};

// The state of each letter of the word being typed, by position. Letters
// typed past the word's length come last, as "extra".
export const getLetterStates = (expected: string, typed: string): LetterState[] => {
  const length = Math.max(expected.length, typed.length);

  return Array.from({ length }, (_, position) => {
    if (position >= expected.length) {
      return "extra";
    }
    if (position >= typed.length) {
      return "pending";
    }
    return typed[position] === expected[position] ? "correct" : "wrong";
  });
};

// Every wrong word of an attempt, in text order. committedWords[i] is what was
// typed for words[i].
export const findMistakes = (words: Word[], committedWords: string[]): AttemptError[] =>
  committedWords.flatMap((typed, index) => {
    const expected = words[index].text;
    const kind = compareWord(expected, typed);
    return kind === null ? [] : [{ index, expected, typed, kind }];
  });

// The word positions where a phrase appears in the answer, ignoring case and punctuation.
const findPhrasePositions = (answerWords: string[], phraseWords: string[]): number[] =>
  answerWords.flatMap((_, start) =>
    phraseWords.every((phraseWord, offset) => answerWords[start + offset] === phraseWord)
      ? [start]
      : [],
  );

// For each vocabulary item, whether a word inside it (where it appears in the
// answer) was typed wrong. Matching by position means a mistake on a common word such
// as "the" elsewhere never highlights a phrase.
export const findVocabularyWithMistakes = (
  words: Word[],
  vocabulary: VocabularyItem[],
  mistakes: AttemptError[],
): boolean[] => {
  const answerWords = words.map((word) => lettersAndDigits(word.text));
  const wrongPositions = new Set(mistakes.map((mistake) => mistake.index));

  return vocabulary.map(({ phrase }) => {
    const phraseWords = tokenize(phrase)
      .map((word) => lettersAndDigits(word.text))
      .filter((word) => word !== "");
    if (phraseWords.length === 0) {
      return false;
    }
    return findPhrasePositions(answerWords, phraseWords).some((start) =>
      phraseWords.some((_, offset) => wrongPositions.has(start + offset)),
    );
  });
};
