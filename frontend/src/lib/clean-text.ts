// Every answer is cleaned before it is saved. The cleaned text is what is
// stored, shown and compared.

const LINE_BREAKS = /\r\n?/g;
const CURLY_SINGLE_QUOTES = /[‘’]/g; // ‘ ’
const CURLY_DOUBLE_QUOTES = /[“”]/g; // “ ”
const EN_AND_EM_DASHES = /[–—]/g; // – —
const ELLIPSIS = /…/g; // …
const NON_BREAKING_SPACES_AND_TABS = /[  \t]/g;
const REPEATED_SPACES = / {2,}/g;
const TWO_OR_MORE_BLANK_LINES = /\n{3,}/g;
// Every line is already trimmed by then, so only line breaks can be left at the start and end.
const LINE_BREAKS_AT_START_AND_END = /^\n+|\n+$/g;

const trimEachLine = (text: string): string =>
  text
    .split("\n")
    .map((line) => line.trim())
    .join("\n");

// Windows (\r\n) and old Mac (\r) line breaks become \n.
export const normalizeLineBreaks = (text: string): string => text.replace(LINE_BREAKS, "\n");

export const cleanText = (text: string): string => {
  let cleaned = normalizeLineBreaks(text);
  cleaned = cleaned.replace(CURLY_SINGLE_QUOTES, "'").replace(CURLY_DOUBLE_QUOTES, '"');
  cleaned = cleaned.replace(EN_AND_EM_DASHES, "-");
  cleaned = cleaned.replace(ELLIPSIS, "...");
  cleaned = cleaned.replace(NON_BREAKING_SPACES_AND_TABS, " ");
  cleaned = cleaned.replace(REPEATED_SPACES, " ");
  cleaned = trimEachLine(cleaned);
  cleaned = cleaned.replace(TWO_OR_MORE_BLANK_LINES, "\n\n");
  return cleaned.replace(LINE_BREAKS_AT_START_AND_END, "");
};

// Text with characters outside a standard English keyboard is still
// saved, with a warning. Allowed: printable ASCII, line breaks and the pound sign.
const HARD_TO_TYPE_CHARACTER = /[^\x20-\x7E\n£]/;

export const hasHardToTypeCharacters = (text: string): boolean => HARD_TO_TYPE_CHARACTER.test(text);
