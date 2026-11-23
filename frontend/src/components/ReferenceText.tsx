import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";

import { getLetterStates } from "@/lib/compare";
import { getSentenceIndexes } from "@/lib/tokenize";
import type { ErrorKind, LetterState, Word } from "@/lib/types";
import { cn } from "@/lib/utils";

// The upper box: the model answer, with the word to type next underlined. Each word is a
// memoized component with primitive props, so a key press re-renders only the current word,
// and the previous one when it moves on.

type WordStatus = "pending" | "current" | "correct" | "wrong";

const WORD_CLASS: Record<Exclude<WordStatus, "current">, string> = {
  pending: "text-word-pending",
  correct: "text-word-done",
  // Never color alone: a wrong word also gets a dotted underline.
  wrong: "text-error underline decoration-error decoration-dotted decoration-2 underline-offset-4",
};

// Extra letters are counted after the word, not shown as letters.
const LETTER_CLASS: Record<Exclude<LetterState, "extra">, string> = {
  correct: "text-letter-correct",
  wrong: "text-error",
  pending: "text-word-pending",
};

type WordTextProps = {
  index: number;
  text: string;
  status: WordStatus;
  // The letters typed so far; only set for the current word.
  typed: string;
};

const WordText = ({ index, text, status, typed }: WordTextProps) => {
  if (status !== "current") {
    return (
      <span data-index={index} className={WORD_CLASS[status]}>
        {text}
      </span>
    );
  }

  const letterStates = getLetterStates(text, typed);
  const extraCount = letterStates.filter((state) => state === "extra").length;

  return (
    <span
      data-index={index}
      aria-current="true"
      className="underline decoration-primary decoration-solid decoration-2 underline-offset-4"
    >
      {letterStates.map((state, position) =>
        // Letters typed past the word's length never enter the model answer, so its text
        // and lines stay where they are; the count after the word says how many there are.
        state === "extra" ? null : (
          // A letter's position is its identity: the word never reorders.
          <span key={position} className={LETTER_CLASS[state]}>
            {text[position]}
          </span>
        ),
      )}
      {extraCount > 0 && (
        // inline-block: the word's underline doesn't run under the count.
        <span className="ml-0.5 inline-block text-[0.75em] font-semibold text-error">
          <span aria-hidden="true">+{extraCount}</span>
          <span className="sr-only">
            {extraCount === 1 ? "1 extra letter" : `${extraCount} extra letters`}
          </span>
        </span>
      )}
    </span>
  );
};

type ReferenceWordProps = WordTextProps & {
  isParagraphEnd: boolean;
  isInCurrentSentence: boolean;
};

// Everything one word draws, so a key press re-renders only the words whose props changed.
const ReferenceWord = memo(
  ({ isParagraphEnd, isInCurrentSentence, ...wordText }: ReferenceWordProps) => (
    <span
      // The padding stretches the background over the gap between lines (a line is 1.6em,
      // Inter's letters about 1.21em), so the sentence reads as one block. The background
      // fades from one sentence to the next.
      className={cn(
        "motion-safe:transition-colors motion-safe:duration-150",
        isInCurrentSentence && "bg-sentence box-decoration-clone py-[0.19em]",
      )}
    >
      <WordText {...wordText} />
      {/* A paragraph end needs Enter, not Space. */}
      {isParagraphEnd && (
        <span aria-hidden="true" className="ml-1 text-muted-foreground select-none">
          ↵
        </span>
      )}{" "}
    </span>
  ),
);
ReferenceWord.displayName = "ReferenceWord";

const getWordStatus = (
  index: number,
  currentWordIndex: number,
  committedKinds: (ErrorKind | null)[],
): WordStatus => {
  if (index === currentWordIndex) {
    return "current";
  }
  if (index < committedKinds.length) {
    return committedKinds[index] === null ? "correct" : "wrong";
  }
  return "pending";
};

// Puts the current word's line in the middle of the box. After the last word there is
// no current word, so nothing moves.
const scrollToCurrentWord = (box: HTMLElement) => {
  const currentWordElement = box.querySelector<HTMLElement>('[aria-current="true"]');
  if (currentWordElement === null) {
    return;
  }
  box.scrollTop =
    currentWordElement.offsetTop - box.clientHeight / 2 + currentWordElement.offsetHeight / 2;
};

const groupByParagraph = (words: Word[]): Word[][] =>
  words.reduce<Word[][]>((paragraphs, word) => {
    (paragraphs[word.paragraphIndex] ??= []).push(word);
    return paragraphs;
  }, []);

type ReferenceTextProps = {
  words: Word[];
  committedKinds: (ErrorKind | null)[];
  currentWordIndex: number;
  currentWord: string;
  fontSize: number;
  // The typing box's id: the whole box is its label, so a click puts the cursor there.
  inputId: string;
};

export const ReferenceText = ({
  words,
  committedKinds,
  currentWordIndex,
  currentWord,
  fontSize,
  inputId,
}: ReferenceTextProps) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const paragraphs = useMemo(() => groupByParagraph(words), [words]);
  const sentenceIndexes = useMemo(() => getSentenceIndexes(words), [words]);
  // The sentence being typed has a soft background, so reading ahead and finding the
  // place again are easier.
  const currentSentence = sentenceIndexes[currentWordIndex];

  // Keep the current word's line in the middle of the box. This runs on every
  // key (currentWord changes too), so a box the learner scrolled away comes back.
  useLayoutEffect(() => {
    if (boxRef.current !== null) {
      scrollToCurrentWord(boxRef.current);
    }
  }, [currentWordIndex, currentWord]);

  // A click in the typing box, or the cursor moving there, also brings the box back, so
  // the learner who read ahead finds the place before the next key.
  useEffect(() => {
    const input = document.getElementById(inputId);
    if (input === null) {
      return;
    }
    const handleReturn = () => {
      if (boxRef.current !== null) {
        scrollToCurrentWord(boxRef.current);
      }
    };
    input.addEventListener("focus", handleReturn);
    input.addEventListener("click", handleReturn);
    return () => {
      input.removeEventListener("focus", handleReturn);
      input.removeEventListener("click", handleReturn);
    };
  }, [inputId]);

  return (
    // A focusable region, so the box can also be scrolled with the keyboard.
    <div
      ref={boxRef}
      role="region"
      aria-label="Model answer"
      data-tour="model-answer"
      tabIndex={0}
      // The font size is a setting from 16 to 28 px, so it can't be a fixed class.
      style={{ fontSize }}
      // Seven lines at a line height of 1.6, plus the label's padding: the current line in
      // the middle, three lines before and three ahead. In em, so it grows with the text size.
      // scroll-smooth: the box glides to the next line instead of jumping, unless the
      // learner's system asks for less motion.
      className="relative h-[calc(11.2em+1.5rem)] overflow-y-auto rounded-lg border bg-card leading-[1.6] motion-safe:scroll-smooth"
    >
      {/* The text is the typing box's label: a click on it puts the cursor there. */}
      <label htmlFor={inputId} className="block min-h-full px-5 py-3">
        {paragraphs.map((paragraph) => (
          <span key={paragraph[0].paragraphIndex} className="mb-[1.6em] block last:mb-0">
            {paragraph.map((word) => {
              const status = getWordStatus(word.index, currentWordIndex, committedKinds);
              return (
                <ReferenceWord
                  key={word.index}
                  index={word.index}
                  text={word.text}
                  status={status}
                  typed={status === "current" ? currentWord : ""}
                  isParagraphEnd={word.isParagraphEnd}
                  isInCurrentSentence={sentenceIndexes[word.index] === currentSentence}
                />
              );
            })}
          </span>
        ))}
      </label>
    </div>
  );
};
