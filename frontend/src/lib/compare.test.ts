import { describe, expect, it } from "vitest";

import {
  compareWord,
  findMistakes,
  findVocabularyWithMistakes,
  getLetterStates,
} from "@/lib/compare";
import { tokenize } from "@/lib/tokenize";

describe("compareWord", () => {
  it("returns null when the words are exactly the same", () => {
    expect(compareWord("years,", "years,")).toBeNull();
    expect(compareWord("£500", "£500")).toBeNull();
  });

  it.each([
    // [model word, typed word, kind]
    ["risen", "rizen", "spelling"],
    ["rose", "rosee", "spelling"], // an extra letter
    ["rose", "ros", "spelling"], // a missing letter
    ["2020", "2021", "spelling"], // digits count like letters
    ["café", "cafe", "spelling"], // é is a letter of its own
    ["Canada", "canada", "case"],
    ["UK", "Uk", "case"],
    ["years,", "years", "punctuation"],
    ["years", "years.", "punctuation"],
    ["well-known", "wellknown", "punctuation"],
    ["Years,", "years", "punctuation"], // wrong in both case and punctuation
    ["£500", "500", "punctuation"], // £ and % are not letters or digits
    ["40%", "40", "punctuation"],
  ] as const)("model %j, typed %j is %s", (expected, typed, kind) => {
    expect(compareWord(expected, typed)).toBe(kind);
  });

  it("calls a word that is also wrong in its letters a spelling mistake", () => {
    expect(compareWord("Years,", "yeers")).toBe("spelling");
  });
});

describe("getLetterStates", () => {
  it("shows every letter as pending before anything is typed", () => {
    expect(getLetterStates("rose", "")).toEqual(["pending", "pending", "pending", "pending"]);
  });

  it("marks typed letters right or wrong by position", () => {
    expect(getLetterStates("rose", "rase")).toEqual(["correct", "wrong", "correct", "correct"]);
  });

  it("keeps the letters not typed yet as pending", () => {
    expect(getLetterStates("rose", "ro")).toEqual(["correct", "correct", "pending", "pending"]);
  });

  it("treats a different case as a wrong letter", () => {
    expect(getLetterStates("UK", "Uk")).toEqual(["correct", "wrong"]);
  });

  it("adds letters typed past the word's length as extra", () => {
    expect(getLetterStates("it", "itss")).toEqual(["correct", "correct", "extra", "extra"]);
  });
});

describe("findMistakes", () => {
  const words = tokenize("In 2000, Canada had 40% of the total.");

  it("lists every wrong word in text order, with its kind", () => {
    const typed = ["In", "2000", "canada", "hed", "40%"];

    expect(findMistakes(words, typed)).toEqual([
      { index: 1, expected: "2000,", typed: "2000", kind: "punctuation" },
      { index: 2, expected: "Canada", typed: "canada", kind: "case" },
      { index: 3, expected: "had", typed: "hed", kind: "spelling" },
    ]);
  });

  it("lists nothing when every typed word is correct", () => {
    expect(findMistakes(words, ["In", "2000,", "Canada"])).toEqual([]);
  });
});

describe("findVocabularyWithMistakes", () => {
  const words = tokenize("The car was the main means of transport, and buses accounted for 25%.");
  const vocabulary = [
    { phrase: "means of transport", meaning: "a way of travelling" },
    { phrase: "accounted for", meaning: "made up" },
  ];
  const mistakeAt = (index: number) => [
    { index, expected: words[index].text, typed: "x", kind: "spelling" as const },
  ];

  it("highlights a phrase with a wrong word inside it", () => {
    // "transport," is word 7, inside "means of transport".
    expect(findVocabularyWithMistakes(words, vocabulary, mistakeAt(7))).toEqual([true, false]);
  });

  it("ignores case and punctuation when finding the phrase", () => {
    // "Accounted" (with a capital) and "for" are words 1 and 2 here.
    const capitalised = tokenize("Buses Accounted for 25%.");
    const mistakes = [
      { index: 1, expected: "Accounted", typed: "acounted", kind: "spelling" as const },
    ];

    expect(findVocabularyWithMistakes(capitalised, vocabulary, mistakes)).toEqual([false, true]);
  });

  it("does not highlight a phrase for a mistake on the same word elsewhere", () => {
    // Word 3 is "the" in "the main", not inside any phrase.
    expect(findVocabularyWithMistakes(words, vocabulary, mistakeAt(3))).toEqual([false, false]);
  });

  it("highlights nothing without mistakes, or when a phrase is not in the answer", () => {
    const missing = [{ phrase: "rose sharply", meaning: "went up fast" }];

    expect(findVocabularyWithMistakes(words, vocabulary, [])).toEqual([false, false]);
    expect(findVocabularyWithMistakes(words, missing, mistakeAt(7))).toEqual([false]);
  });
});
