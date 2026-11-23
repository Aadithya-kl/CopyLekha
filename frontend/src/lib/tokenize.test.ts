import { describe, expect, it } from "vitest";

import { createTitleFromText, getSentenceIndexes, tokenize } from "@/lib/tokenize";

const texts = (text: string): string[] => tokenize(text).map((word) => word.text);

describe("tokenize", () => {
  it("splits a sentence at spaces and keeps punctuation with its word", () => {
    expect(texts("Over the years, it rose.")).toEqual(["Over", "the", "years,", "it", "rose."]);
  });

  it("keeps a hyphenated word as one word", () => {
    expect(texts("a well-known fact")).toEqual(["a", "well-known", "fact"]);
  });

  it("treats numbers and symbols as words", () => {
    expect(texts("40% from 2000-2020 cost £500")).toEqual([
      "40%",
      "from",
      "2000-2020",
      "cost",
      "£500",
    ]);
  });

  it("never makes an empty word from repeated spaces", () => {
    expect(texts("  the   chart  ")).toEqual(["the", "chart"]);
  });

  it("numbers the words from 0 across paragraphs", () => {
    expect(tokenize("one two\n\nthree").map((word) => word.index)).toEqual([0, 1, 2]);
  });

  it("keeps paragraphs apart", () => {
    const words = tokenize("First one.\n\nSecond one.\n\nThird.");

    expect(words.map((word) => [word.text, word.paragraphIndex])).toEqual([
      ["First", 0],
      ["one.", 0],
      ["Second", 1],
      ["one.", 1],
      ["Third.", 2],
    ]);
  });

  it("ends a paragraph at a single line break too", () => {
    expect(tokenize("first\nsecond").map((word) => word.paragraphIndex)).toEqual([0, 1]);
  });

  it("marks the last word of every paragraph but the last as a paragraph end", () => {
    const words = tokenize("It rose.\n\nIt fell.\n\nOverall, it changed.");

    expect(words.filter((word) => word.isParagraphEnd).map((word) => word.text)).toEqual([
      "rose.",
      "fell.",
    ]);
  });

  it("never marks the last word of the text as a paragraph end", () => {
    const words = tokenize("A one-paragraph answer.");

    expect(words.some((word) => word.isParagraphEnd)).toBe(false);
  });

  it("works for a one-word answer", () => {
    expect(tokenize("Overall")).toEqual([
      { index: 0, text: "Overall", paragraphIndex: 0, isParagraphEnd: false },
    ]);
  });

  it("returns no words for empty text", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize(" \n\n ")).toEqual([]);
  });
});

describe("createTitleFromText", () => {
  it("uses the first six words", () => {
    expect(createTitleFromText("The graph shows how the number of\n\nvisitors rose.")).toBe(
      "The graph shows how the number",
    );
  });

  it("uses all the words of a shorter text", () => {
    expect(createTitleFromText("Prices\n\nrose.")).toBe("Prices rose.");
  });
});

describe("getSentenceIndexes (the current sentence)", () => {
  it("starts a new sentence after a full stop, question or exclamation mark", () => {
    expect(getSentenceIndexes(tokenize("Prices rose. Why? It grew! Then it fell."))).toEqual([
      0, 0, 1, 2, 2, 3, 3, 3,
    ]);
  });

  it("keeps a closing quote or bracket with the sentence it ends", () => {
    expect(getSentenceIndexes(tokenize('He said "no." Sales rose (in 2020). Then'))).toEqual([
      0, 0, 0, 1, 1, 1, 1, 2,
    ]);
  });

  it("ends a sentence at a paragraph end even without a full stop", () => {
    expect(getSentenceIndexes(tokenize("Overview\n\nPrices rose"))).toEqual([0, 1, 1]);
  });

  it("does not end a sentence at a comma or a number with a point", () => {
    expect(getSentenceIndexes(tokenize("By 2.5%, prices rose."))).toEqual([0, 0, 0, 0]);
  });
});
