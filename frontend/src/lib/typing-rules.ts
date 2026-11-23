import type { TypingState, Word } from "@/lib/types";

// The key rules. Every function
// returns the new state, or REFUSED when the key must do nothing; the typing box
// then calls preventDefault(). Esc, Ctrl/Cmd + Enter, Ctrl/Cmd + Space and paste
// don't change the typed words, so the typing session handles them.

export const REFUSED = "refused";
export type KeyResult = TypingState | typeof REFUSED;

const HAS_WHITESPACE = /\s/;

// ---- What a key means ------------------------------------------------------------

// "ignore" leaves the key to the browser (Tab, arrows, Ctrl/Cmd + C ...); every other
// action is handled by the typing session, and the typing box calls preventDefault().
export type KeyAction =
  | { type: "text"; text: string }
  | { type: "space" }
  | { type: "enter" }
  | { type: "backspace" }
  | { type: "pause" }
  | { type: "restart" }
  | { type: "speak" }
  | { type: "ignore" };

// The parts of a KeyboardEvent the rules need.
export type KeyPress = {
  key: string;
  code: string; // the physical key, such as "Numpad0"
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  isComposing: boolean;
};

// The key value of a key pressed during composition, on some browsers.
const COMPOSITION_KEY = "Process";
// The start of every number pad key's code ("Numpad0", "NumpadDecimal").
const NUMPAD_CODE_PREFIX = "Numpad";

export const toKeyAction = (press: KeyPress): KeyAction => {
  // An input method (Avro and others) is composing: its letters arrive when it ends.
  if (press.isComposing || press.key === COMPOSITION_KEY) {
    return { type: "ignore" };
  }

  // On Windows, Alt plus a code on the number pad (Alt + 0163) types one character when Alt
  // is let go; it arrives on its own, so the digits of the code are not typed.
  if (press.altKey && !press.ctrlKey && press.code.startsWith(NUMPAD_CODE_PREFIX)) {
    return { type: "ignore" };
  }

  // On Windows, AltGr reports Ctrl + Alt; it types a character, not a shortcut.
  const isAltGraph = press.ctrlKey && press.altKey;
  const hasShortcutModifier = (press.ctrlKey || press.metaKey) && !isAltGraph;

  if (hasShortcutModifier) {
    if (press.key === "Enter") {
      return { type: "restart" };
    }
    if (press.key === " ") {
      return { type: "speak" };
    }
    return { type: "ignore" };
  }

  switch (press.key) {
    case "Escape":
      return { type: "pause" };
    case " ":
      return { type: "space" };
    case "Enter":
      return { type: "enter" };
    case "Backspace":
      return { type: "backspace" };
  }

  // A printable key has a one-character value; named keys ("Tab", "ArrowLeft") don't.
  return [...press.key].length === 1 ? { type: "text", text: press.key } : { type: "ignore" };
};

// ---- The typing state -------------------------------------------------------------

export const createTypingState = (): TypingState => ({
  committedWords: [],
  currentWord: "",
  isFinished: false,
});

// The model word being typed now, or undefined when every word is typed.
const getCurrentModelWord = (state: TypingState, words: Word[]): Word | undefined =>
  words[state.committedWords.length];

// The word is kept as typed, right or wrong; the attempt finishes after the last word.
const commitCurrentWord = (state: TypingState, words: Word[]): TypingState => {
  const committedWords = [...state.committedWords, state.currentWord];

  return {
    committedWords,
    currentWord: "",
    isFinished: committedWords.length >= words.length,
  };
};

// A word counts as typed once it has at least as many letters as the model word.
const hasAllLetters = (typedWord: string, modelWord: Word): boolean =>
  typedWord.length >= modelWord.text.length;

// A letter, digit or symbol; with an input method, several letters can arrive at once.
// Letters past the word's length are kept and shown wrong. The attempt finishes as soon
// as the last word has all its letters, without Space.
export const typeText = (state: TypingState, words: Word[], text: string): KeyResult => {
  const modelWord = getCurrentModelWord(state, words);
  if (state.isFinished || modelWord === undefined || text === "" || HAS_WHITESPACE.test(text)) {
    return REFUSED;
  }

  const typed: TypingState = { ...state, currentWord: state.currentWord + text };
  const isLastWord = modelWord.index === words.length - 1;
  if (isLastWord && hasAllLetters(typed.currentWord, modelWord)) {
    return commitCurrentWord(typed, words);
  }
  return typed;
};

// Space moves to the next word, even when the word is wrong. It does
// nothing on an empty word (so no word can be skipped) and at a paragraph end.
export const pressSpace = (state: TypingState, words: Word[]): KeyResult => {
  const modelWord = getCurrentModelWord(state, words);
  if (
    state.isFinished ||
    modelWord === undefined ||
    state.currentWord === "" ||
    modelWord.isParagraphEnd
  ) {
    return REFUSED;
  }
  return commitCurrentWord(state, words);
};

// Enter moves to the next paragraph, only on a paragraph's last word.
export const pressEnter = (state: TypingState, words: Word[]): KeyResult => {
  const modelWord = getCurrentModelWord(state, words);
  if (
    state.isFinished ||
    modelWord === undefined ||
    state.currentWord === "" ||
    !modelWord.isParagraphEnd
  ) {
    return REFUSED;
  }
  return commitCurrentWord(state, words);
};

// Backspace removes a letter of the current word only, never of an earlier word.
export const pressBackspace = (state: TypingState): KeyResult => {
  if (state.isFinished || state.currentWord === "") {
    return REFUSED;
  }
  return { ...state, currentWord: state.currentWord.slice(0, -1) };
};

// The Finish button or the end of the time limit. A word being typed counts only
// when it has all its letters; a half-typed word is left out, so it is not a mistake.
export const finishTyping = (state: TypingState, words: Word[]): TypingState => {
  if (state.isFinished) {
    return state;
  }
  const modelWord = getCurrentModelWord(state, words);
  if (modelWord === undefined || !hasAllLetters(state.currentWord, modelWord)) {
    return { ...state, currentWord: "", isFinished: true };
  }
  return { ...commitCurrentWord(state, words), isFinished: true };
};
