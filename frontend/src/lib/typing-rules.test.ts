import { describe, expect, it } from "vitest";

import { tokenize } from "@/lib/tokenize";
import type { TypingState } from "@/lib/types";
import {
  createTypingState,
  finishTyping,
  type KeyResult,
  pressBackspace,
  pressEnter,
  pressSpace,
  REFUSED,
  toKeyAction,
  typeText,
} from "@/lib/typing-rules";

// Two paragraphs: "rose." needs Enter; "fell." is the last word of the text.
const WORDS = tokenize("It rose.\n\nThen it fell.");

const accepted = (result: KeyResult): TypingState => {
  if (result === REFUSED) {
    throw new Error("The key was refused.");
  }
  return result;
};

// Types the letters one key at a time, as a learner would.
const typeLetters = (state: TypingState, letters: string): TypingState =>
  [...letters].reduce((current, letter) => accepted(typeText(current, WORDS, letter)), state);

const typedFirstParagraph = (): TypingState => {
  const afterIt = accepted(pressSpace(typeLetters(createTypingState(), "It"), WORDS));
  return accepted(pressEnter(typeLetters(afterIt, "rose."), WORDS));
};

// "Then it " typed after the first paragraph, so "fell." is the current word.
const onLastWord = (): TypingState => {
  const afterThen = accepted(pressSpace(typeLetters(typedFirstParagraph(), "Then"), WORDS));
  return accepted(pressSpace(typeLetters(afterThen, "it"), WORDS));
};

describe("typeText", () => {
  it("adds letters to the current word", () => {
    expect(typeLetters(createTypingState(), "It")).toEqual({
      committedWords: [],
      currentWord: "It",
      isFinished: false,
    });
  });

  it("keeps letters typed past the word's length", () => {
    expect(typeLetters(createTypingState(), "Itss").currentWord).toBe("Itss");
  });

  it("accepts several letters at once, as an input method sends them", () => {
    expect(accepted(typeText(createTypingState(), WORDS, "It")).currentWord).toBe("It");
  });

  it("refuses empty text and whitespace", () => {
    expect(typeText(createTypingState(), WORDS, "")).toBe(REFUSED);
    expect(typeText(createTypingState(), WORDS, " ")).toBe(REFUSED);
    expect(typeText(createTypingState(), WORDS, "\n")).toBe(REFUSED);
  });

  it("refuses everything when the answer has no words", () => {
    expect(typeText(createTypingState(), [], "a")).toBe(REFUSED);
  });
});

describe("pressSpace", () => {
  it("commits the word and starts the next one", () => {
    const state = accepted(pressSpace(typeLetters(createTypingState(), "It"), WORDS));

    expect(state).toEqual({ committedWords: ["It"], currentWord: "", isFinished: false });
  });

  it("moves on even when the word is wrong", () => {
    const state = accepted(pressSpace(typeLetters(createTypingState(), "Iy"), WORDS));

    expect(state.committedWords).toEqual(["Iy"]);
  });

  it("does nothing on an empty word, so no word is skipped", () => {
    expect(pressSpace(createTypingState(), WORDS)).toBe(REFUSED);
  });

  it("does nothing on a second Space", () => {
    const afterSpace = accepted(pressSpace(typeLetters(createTypingState(), "It"), WORDS));

    expect(pressSpace(afterSpace, WORDS)).toBe(REFUSED);
  });

  it("does nothing at a paragraph end", () => {
    const afterIt = accepted(pressSpace(typeLetters(createTypingState(), "It"), WORDS));

    expect(pressSpace(typeLetters(afterIt, "rose."), WORDS)).toBe(REFUSED);
  });
});

describe("pressEnter", () => {
  it("commits a paragraph's last word and starts the next paragraph", () => {
    expect(typedFirstParagraph()).toEqual({
      committedWords: ["It", "rose."],
      currentWord: "",
      isFinished: false,
    });
  });

  it("does nothing inside a paragraph", () => {
    expect(pressEnter(typeLetters(createTypingState(), "It"), WORDS)).toBe(REFUSED);
  });

  it("does nothing on an empty word at a paragraph end", () => {
    const afterIt = accepted(pressSpace(typeLetters(createTypingState(), "It"), WORDS));

    expect(pressEnter(afterIt, WORDS)).toBe(REFUSED);
  });

  it("does nothing on the last word of the text", () => {
    expect(pressEnter(typeLetters(onLastWord(), "fe"), WORDS)).toBe(REFUSED);
  });
});

describe("pressBackspace", () => {
  it("removes the last letter of the current word", () => {
    expect(accepted(pressBackspace(typeLetters(createTypingState(), "Its"))).currentWord).toBe(
      "It",
    );
  });

  it("removes letters typed past the word's length", () => {
    const state = accepted(pressBackspace(typeLetters(createTypingState(), "Itx")));

    expect(state.currentWord).toBe("It");
  });

  it("never goes back into a committed word", () => {
    const afterIt = accepted(pressSpace(typeLetters(createTypingState(), "It"), WORDS));

    expect(pressBackspace(afterIt)).toBe(REFUSED);
    expect(afterIt.committedWords).toEqual(["It"]);
  });
});

describe("finishing", () => {
  it("finishes when the last word has all its letters, without Space", () => {
    expect(typeLetters(onLastWord(), "fell.")).toEqual({
      committedWords: ["It", "rose.", "Then", "it", "fell."],
      currentWord: "",
      isFinished: true,
    });
  });

  it("finishes on the last word's length even when its letters are wrong", () => {
    const state = typeLetters(onLastWord(), "fall!");

    expect(state.isFinished).toBe(true);
    expect(state.committedWords.at(-1)).toBe("fall!");
  });

  it("does not finish before the last word has all its letters", () => {
    expect(typeLetters(onLastWord(), "fell").isFinished).toBe(false);
  });

  it("finishes when Space commits the last word", () => {
    const state = accepted(pressSpace(typeLetters(onLastWord(), "fel"), WORDS));

    expect(state.isFinished).toBe(true);
    expect(state.committedWords.at(-1)).toBe("fel");
  });

  it("refuses every key after the attempt has finished", () => {
    const finished = typeLetters(onLastWord(), "fell.");

    expect(typeText(finished, WORDS, "a")).toBe(REFUSED);
    expect(pressSpace(finished, WORDS)).toBe(REFUSED);
    expect(pressEnter(finished, WORDS)).toBe(REFUSED);
    expect(pressBackspace(finished)).toBe(REFUSED);
  });

  it("finishes a one-word answer when the word is typed", () => {
    const oneWord = tokenize("Overall");
    const state = [..."Overall"].reduce(
      (current, letter) => accepted(typeText(current, oneWord, letter)),
      createTypingState(),
    );

    expect(state).toEqual({ committedWords: ["Overall"], currentWord: "", isFinished: true });
  });
});

describe("finishTyping (Finish button, time limit)", () => {
  it("leaves out a half-typed word, so it is not counted as a mistake", () => {
    const afterIt = accepted(pressSpace(typeLetters(createTypingState(), "It"), WORDS));
    const state = finishTyping(typeLetters(afterIt, "ro"), WORDS);

    expect(state).toEqual({ committedWords: ["It"], currentWord: "", isFinished: true });
  });

  it("commits the word being typed when it has all its letters, right or wrong", () => {
    const afterIt = accepted(pressSpace(typeLetters(createTypingState(), "It"), WORDS));

    expect(finishTyping(typeLetters(afterIt, "rose."), WORDS)).toEqual({
      committedWords: ["It", "rose."],
      currentWord: "",
      isFinished: true,
    });
    expect(finishTyping(typeLetters(afterIt, "rise."), WORDS).committedWords).toEqual([
      "It",
      "rise.",
    ]);
  });

  it("leaves out a half-typed first word, so there is nothing to show", () => {
    const state = finishTyping(typeLetters(createTypingState(), "I"), WORDS);

    expect(state).toEqual({ committedWords: [], currentWord: "", isFinished: true });
  });

  it("finishes without adding a word when the current word is empty", () => {
    const afterIt = accepted(pressSpace(typeLetters(createTypingState(), "It"), WORDS));

    expect(finishTyping(afterIt, WORDS)).toEqual({
      committedWords: ["It"],
      currentWord: "",
      isFinished: true,
    });
  });

  it("finishes before the first key, with no words typed", () => {
    expect(finishTyping(createTypingState(), WORDS)).toEqual({
      committedWords: [],
      currentWord: "",
      isFinished: true,
    });
  });

  it("leaves a finished attempt as it is", () => {
    const finished = finishTyping(typeLetters(createTypingState(), "It"), WORDS);

    expect(finishTyping(finished, WORDS)).toBe(finished);
  });
});

describe("toKeyAction (keyboard shortcuts)", () => {
  const press = (
    key: string,
    modifiers: { ctrl?: boolean; meta?: boolean; alt?: boolean } = {},
    code = "",
  ) =>
    toKeyAction({
      key,
      code,
      ctrlKey: modifiers.ctrl ?? false,
      metaKey: modifiers.meta ?? false,
      altKey: modifiers.alt ?? false,
      isComposing: false,
    });

  it.each([
    ["a", { type: "text", text: "a" }],
    ["A", { type: "text", text: "A" }],
    ["7", { type: "text", text: "7" }],
    [",", { type: "text", text: "," }],
    ["%", { type: "text", text: "%" }],
    ["£", { type: "text", text: "£" }],
    [" ", { type: "space" }],
    ["Enter", { type: "enter" }],
    ["Backspace", { type: "backspace" }],
    ["Escape", { type: "pause" }],
  ] as const)("turns %j into %j", (key, action) => {
    expect(press(key)).toEqual(action);
  });

  it("turns Ctrl + Enter and Cmd + Enter into restart", () => {
    expect(press("Enter", { ctrl: true })).toEqual({ type: "restart" });
    expect(press("Enter", { meta: true })).toEqual({ type: "restart" });
  });

  it("turns Ctrl + Space and Cmd + Space into speak", () => {
    expect(press(" ", { ctrl: true })).toEqual({ type: "speak" });
    expect(press(" ", { meta: true })).toEqual({ type: "speak" });
  });

  it("leaves other shortcuts to the browser", () => {
    expect(press("c", { ctrl: true })).toEqual({ type: "ignore" });
    expect(press("v", { meta: true })).toEqual({ type: "ignore" });
  });

  it("treats AltGr (Ctrl + Alt on Windows) as a typed character", () => {
    expect(press("€", { ctrl: true, alt: true })).toEqual({ type: "text", text: "€" });
  });

  it("ignores the digits of a Windows Alt code (Alt + 0163 for £)", () => {
    for (const digit of ["0", "1", "6", "3"]) {
      expect(press(digit, { alt: true }, `Numpad${digit}`)).toEqual({ type: "ignore" });
    }
  });

  it("still types a digit from the number pad without Alt", () => {
    expect(press("3", {}, "Numpad3")).toEqual({ type: "text", text: "3" });
  });

  it("still types a character made with Option (Alt) on a Mac", () => {
    expect(press("©", { alt: true }, "KeyG")).toEqual({ type: "text", text: "©" });
  });

  it("leaves named keys to the browser", () => {
    for (const key of ["Tab", "ArrowLeft", "Shift", "CapsLock", "F5", "Dead", "Unidentified"]) {
      expect(press(key)).toEqual({ type: "ignore" });
    }
  });

  it("ignores keys while an input method is composing", () => {
    expect(
      toKeyAction({
        key: "k",
        code: "KeyK",
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        isComposing: true,
      }),
    ).toEqual({ type: "ignore" });
    expect(press("Process")).toEqual({ type: "ignore" });
  });
});
