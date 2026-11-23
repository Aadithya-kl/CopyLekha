import type { Word } from "@/lib/types";

// One or more line breaks end a paragraph; a word is a run of characters
// between spaces or line breaks, so punctuation belongs to the word it touches.
const PARAGRAPH_BREAK = /\n+/;
const WORD_BREAK = /\s+/;

const splitIntoParagraphs = (text: string): string[][] =>
  text
    .split(PARAGRAPH_BREAK)
    .map((paragraph) => paragraph.split(WORD_BREAK).filter((word) => word !== ""))
    .filter((words) => words.length > 0);

export const tokenize = (text: string): Word[] => {
  const paragraphs = splitIntoParagraphs(text);
  const lastParagraphIndex = paragraphs.length - 1;
  const words: Word[] = [];

  paragraphs.forEach((paragraphWords, paragraphIndex) => {
    const lastWordIndex = paragraphWords.length - 1;

    paragraphWords.forEach((wordText, wordIndex) => {
      words.push({
        index: words.length,
        text: wordText,
        paragraphIndex,
        // The last word of the text finishes the attempt, so it never needs Enter.
        isParagraphEnd: wordIndex === lastWordIndex && paragraphIndex !== lastParagraphIndex,
      });
    });
  });

  return words;
};

// With no title, the answer's first words become its title.
const TITLE_WORD_COUNT = 6;

export const createTitleFromText = (text: string): string =>
  tokenize(text)
    .slice(0, TITLE_WORD_COUNT)
    .map((word) => word.text)
    .join(" ");

// A word that ends a sentence: a full stop, question or exclamation mark, maybe followed
// by a closing quote or bracket ("rose.", "why?", "(2020).", "said.").
const SENTENCE_END = /[.!?]["')\]]*$/;

// The sentence each word belongs to, by position, so the upper box can softly mark the
// sentence being typed. A paragraph end always ends a sentence too.
export const getSentenceIndexes = (words: Word[]): number[] => {
  let sentence = 0;
  return words.map((word) => {
    const index = sentence;
    if (word.isParagraphEnd || SENTENCE_END.test(word.text)) {
      sentence += 1;
    }
    return index;
  });
};
