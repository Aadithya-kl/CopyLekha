import {
  type ClipboardEvent,
  type CompositionEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  memo,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { useCapsLock } from "@/hooks/use-caps-lock";
import type { SessionStatus } from "@/hooks/use-typing-session";
import type { ErrorKind, Word } from "@/lib/types";
import { type KeyAction, toKeyAction } from "@/lib/typing-rules";
import { cn } from "@/lib/utils";

// The lower box. A real textarea takes the keys, so the keyboard and
// screen readers work as usual, but it is invisible and never holds text: every key is
// decided by lib/typing-rules.ts and then prevented. What was typed is drawn on top.

const PLACEHOLDER =
  "Type this model answer word by word to learn its grammar and vocabulary. The timer starts with your first key.";

const preventDefault = (event: ClipboardEvent | DragEvent) => event.preventDefault();

type TypedWordProps = {
  text: string;
  isWrong: boolean;
  isParagraphEnd: boolean;
};

const TypedWord = memo(({ text, isWrong, isParagraphEnd }: TypedWordProps) => (
  <>
    <span
      data-state={isWrong ? "wrong" : "correct"}
      className={cn(
        // Never color alone: a wrong word also gets a dotted underline.
        isWrong &&
          "text-error underline decoration-error decoration-dotted decoration-2 underline-offset-4",
      )}
    >
      {text}
    </span>{" "}
    {/* A blank line where the paragraph ends, as in the model answer. */}
    {isParagraphEnd && <span className="block h-[1.6em]" />}
  </>
));
TypedWord.displayName = "TypedWord";

// Phones send keys the keyboard can't name ("Unidentified"); their text arrives in
// beforeinput instead. On a computer the key was already prevented, so this never runs.
const toInputAction = (event: InputEvent): KeyAction | null => {
  switch (event.inputType) {
    case "insertText":
      if (event.data === null || event.data === "") {
        return null;
      }
      return event.data === " " ? { type: "space" } : { type: "text", text: event.data.trim() };
    case "insertLineBreak":
    case "insertParagraph":
      return { type: "enter" };
    case "deleteContentBackward":
      return { type: "backspace" };
    default:
      return null;
  }
};

type TypingInputProps = {
  inputId: string;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  words: Word[];
  committedWords: string[];
  committedKinds: (ErrorKind | null)[];
  currentWord: string;
  status: SessionStatus;
  fontSize: number;
  onKeyAction: (action: KeyAction) => void;
  // The box lost the focus, so the attempt pauses.
  onBlur: () => void;
};

export const TypingInput = ({
  inputId,
  inputRef,
  words,
  committedWords,
  committedKinds,
  currentWord,
  status,
  fontSize,
  onKeyAction,
  onBlur,
}: TypingInputProps) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const { isCapsLockOn, handleKeyEvent } = useCapsLock();
  // Space at a paragraph end does nothing, so the box says to press Enter. The hint
  // belongs to that word, so it goes away by itself once the word is committed.
  const [enterHintWordIndex, setEnterHintWordIndex] = useState<number | null>(null);
  // A new attempt (Restart, Try again, another answer) starts without it.
  if (status === "ready" && enterHintWordIndex !== null) {
    setEnterHintWordIndex(null);
  }
  const isEnterHintShown = enterHintWordIndex === committedWords.length;

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    handleKeyEvent(event);
    const action = toKeyAction({
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
      isComposing: event.nativeEvent.isComposing,
    });
    if (action.type === "ignore") {
      return;
    }
    const modelWord = words[committedWords.length];
    if (
      action.type === "space" &&
      currentWord !== "" &&
      modelWord !== undefined &&
      modelWord.isParagraphEnd
    ) {
      setEnterHintWordIndex(committedWords.length);
    }
    event.preventDefault();
    onKeyAction(action);
  };

  // An input method (Avro and others) sends its letters when composition ends; they are
  // compared like any others. The composed text is then cleared,
  // so it can't build up in the textarea or be sent again with the next word.
  const handleCompositionEnd = (event: CompositionEvent<HTMLTextAreaElement>) => {
    if (event.data !== "") {
      onKeyAction({ type: "text", text: event.data });
    }
    event.currentTarget.value = "";
  };

  // The textarea never keeps text, so nothing typed can build up in it.
  const handleInput = (event: FormEvent<HTMLTextAreaElement>) => {
    if (!(event.nativeEvent instanceof InputEvent && event.nativeEvent.isComposing)) {
      event.currentTarget.value = "";
    }
  };

  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea === null) {
      return;
    }
    const handleBeforeInput = (event: InputEvent) => {
      if (event.isComposing || event.inputType === "insertCompositionText") {
        return;
      }
      // Paste, drop and autocorrect insertions are refused along with everything else.
      event.preventDefault();
      const action = toInputAction(event);
      if (action !== null) {
        onKeyAction(action);
      }
    };

    textarea.addEventListener("beforeinput", handleBeforeInput);
    return () => textarea.removeEventListener("beforeinput", handleBeforeInput);
  }, [inputRef, onKeyAction]);

  // Keep the end of what was typed in view.
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (box !== null) {
      box.scrollTop = box.scrollHeight;
    }
  }, [committedWords.length, currentWord]);

  const showPlaceholder = status === "ready" && currentWord === "";

  return (
    <div className="relative">
      <div
        ref={boxRef}
        data-tour="typing-box"
        // The font size is a setting from 16 to 28 px, so it can't be a fixed class.
        style={{ fontSize }}
        // overflow-x-hidden: a button a browser extension puts in the box never adds a
        // sideways scrollbar; the typed text always wraps, so it never needs one.
        // Four lines (at a line height of 1.6) plus the padding: the line being typed and
        // the three before it, so recent mistakes stay in view. It keeps the last line in
        // view by itself, gliding to a new line unless the system asks for less motion.
        className="relative h-[calc(6.4em+1.5rem)] overflow-x-hidden overflow-y-auto rounded-lg border bg-card px-5 py-3 leading-[1.6] focus-within:ring-2 focus-within:ring-ring motion-safe:scroll-smooth"
      >
        <textarea
          id={inputId}
          ref={inputRef}
          aria-label="Type the answer here"
          className="absolute inset-0 h-full w-full resize-none opacity-0"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          // Grammarly stays out of this box: its button made the box's scrollbars flicker,
          // and the learner should find their own mistakes.
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyEvent}
          onCompositionEnd={handleCompositionEnd}
          onInput={handleInput}
          onPaste={preventDefault}
          onDrop={preventDefault}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            onBlur();
          }}
        />

        <div aria-hidden="true" data-testid="typed-text" className="pointer-events-none">
          {showPlaceholder && <span className="text-muted-foreground">{PLACEHOLDER}</span>}
          {committedWords.map((typed, index) => (
            // A word's position is its identity: typed words never reorder.
            <TypedWord
              key={index}
              text={typed}
              isWrong={committedKinds[index] !== null}
              isParagraphEnd={words[index].isParagraphEnd}
            />
          ))}
          <span>{currentWord}</span>
          {isFocused && status !== "finished" && (
            <span className="ml-px inline-block h-[1.1em] w-0.5 translate-y-[0.2em] animate-pulse bg-primary" />
          )}
        </div>
      </div>

      {isCapsLockOn && (
        <p
          role="status"
          className="absolute top-2 right-2 rounded bg-warning px-2 py-0.5 text-xs text-warning-foreground motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in-0"
        >
          Caps Lock is on
        </p>
      )}
      {isEnterHintShown && status !== "finished" && (
        <p
          role="status"
          className="absolute right-2 bottom-2 rounded bg-warning px-2 py-0.5 text-xs text-warning-foreground motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in-0"
        >
          Press Enter for a new paragraph.
        </p>
      )}
    </div>
  );
};
