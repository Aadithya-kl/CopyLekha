import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import { compareWord } from "@/lib/compare";
import { MS_PER_MINUTE } from "@/lib/stats";
import type { ErrorKind, TimeLimit, TypingState, Word } from "@/lib/types";
import {
  createTypingState,
  finishTyping,
  type KeyAction,
  type KeyResult,
  pressBackspace,
  pressEnter,
  pressSpace,
  REFUSED,
  typeText,
} from "@/lib/typing-rules";

// One attempt on one answer: the typed words, the timer, pause, restart and finish.
// The key rules themselves live in lib/typing-rules.ts.

export type SessionStatus = "ready" | "typing" | "paused" | "finished";

// How often the time on screen is updated while typing.
const TICK_MS = 250;

type SessionState = {
  typing: TypingState;
  status: SessionStatus;
  // Active time before the current run; pauses are left out.
  activeMs: number;
  // When the current run started (Date.now()), or null while not running.
  runningSince: number | null;
  // The time of the last event, so the elapsed time can be shown.
  now: number;
};

type SessionEvent =
  | { type: "key"; action: KeyAction; now: number }
  | { type: "pause"; now: number }
  | { type: "toggle-pause"; now: number }
  | { type: "resume"; now: number }
  | { type: "finish"; now: number }
  | { type: "tick"; now: number; limitMs: number | null }
  | { type: "restart" };

const createSessionState = (): SessionState => ({
  typing: createTypingState(),
  status: "ready",
  activeMs: 0,
  runningSince: null,
  now: 0,
});

const getElapsedMs = (state: SessionState, now: number): number =>
  state.activeMs + (state.runningSince === null ? 0 : now - state.runningSince);

const stopRunning = (state: SessionState, now: number): SessionState => ({
  ...state,
  activeMs: getElapsedMs(state, now),
  runningSince: null,
  now,
});

const resumeRunning = (state: SessionState, now: number): SessionState => ({
  ...state,
  status: "typing",
  runningSince: now,
  now,
});

// The Finish button or the end of the time limit. With no word typed there is nothing
// to show or save, so the attempt simply starts over.
const finishSession = (state: SessionState, words: Word[], now: number): SessionState => {
  const typing = finishTyping(state.typing, words);
  if (typing.committedWords.length === 0) {
    return createSessionState();
  }
  return { ...stopRunning(state, now), typing, status: "finished" };
};

const applyKey = (typing: TypingState, words: Word[], action: KeyAction): KeyResult => {
  switch (action.type) {
    case "text":
      return typeText(typing, words, action.text);
    case "space":
      return pressSpace(typing, words);
    case "enter":
      return pressEnter(typing, words);
    case "backspace":
      return pressBackspace(typing);
    default:
      return REFUSED;
  }
};

const createReducer =
  (words: Word[]) =>
  (state: SessionState, event: SessionEvent): SessionState => {
    switch (event.type) {
      case "restart":
        return createSessionState();

      case "key": {
        if (state.status === "finished") {
          return state;
        }
        const typing = applyKey(state.typing, words, event.action);
        if (typing === REFUSED) {
          return state;
        }
        // The first accepted key starts the timer; after a pause it resumes it.
        const running: SessionState =
          state.status === "typing"
            ? { ...state, typing, now: event.now }
            : { ...state, typing, status: "typing", runningSince: event.now, now: event.now };
        return typing.isFinished
          ? { ...stopRunning(running, event.now), status: "finished" }
          : running;
      }

      case "pause":
        return state.status === "typing"
          ? { ...stopRunning(state, event.now), status: "paused" }
          : state;

      // Esc: pause or resume, only after the first key.
      case "toggle-pause":
        if (state.status === "typing") {
          return { ...stopRunning(state, event.now), status: "paused" };
        }
        return state.status === "paused" ? resumeRunning(state, event.now) : state;

      // The Resume button on the paused notice.
      case "resume":
        return state.status === "paused" ? resumeRunning(state, event.now) : state;

      case "finish":
        return state.status === "finished" ? state : finishSession(state, words, event.now);

      case "tick": {
        if (state.status !== "typing") {
          return state;
        }
        const ticked = { ...state, now: event.now };
        if (event.limitMs !== null && getElapsedMs(ticked, event.now) >= event.limitMs) {
          return finishSession(ticked, words, event.now);
        }
        return ticked;
      }
    }
  };

// What a finished attempt hands to the page, which saves it.
export type FinishedAttempt = {
  committedWords: string[];
  durationMs: number; // paused time not counted
  timeLimit: TimeLimit; // the limit this attempt ran with
};

export const useTypingSession = (
  words: Word[],
  timeLimit: TimeLimit,
  onFinish: (finished: FinishedAttempt) => void,
) => {
  const reducer = useMemo(() => createReducer(words), [words]);
  const [state, dispatch] = useReducer(reducer, undefined, createSessionState);

  // A new answer starts a new attempt (React's pattern for resetting state on a prop change).
  const [sessionWords, setSessionWords] = useState(words);
  if (sessionWords !== words) {
    setSessionWords(words);
    dispatch({ type: "restart" });
  }

  // An attempt keeps the limit it started with. A new limit from another tab waits for the
  // next attempt; in this tab a new limit restarts the attempt first.
  const [attemptTimeLimit, setAttemptTimeLimit] = useState(timeLimit);
  if (state.status === "ready" && attemptTimeLimit !== timeLimit) {
    setAttemptTimeLimit(timeLimit);
  }

  const limitMs = attemptTimeLimit === 0 ? null : attemptTimeLimit * MS_PER_MINUTE;
  const isRunning = state.status === "typing";
  const isInProgress = state.status === "typing" || state.status === "paused";
  const isFinished = state.status === "finished";

  // The latest callback, so a new one from the page never reports the same attempt twice.
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  });

  // Once per attempt: the typed words and the time never change after it finished.
  const { committedWords } = state.typing;
  const { activeMs } = state;
  useEffect(() => {
    if (isFinished) {
      onFinishRef.current({ committedWords, durationMs: activeMs, timeLimit: attemptTimeLimit });
    }
  }, [isFinished, committedWords, activeMs, attemptTimeLimit]);

  // The timer: only while typing.
  useEffect(() => {
    if (!isRunning) {
      return;
    }
    const interval = window.setInterval(
      () => dispatch({ type: "tick", now: Date.now(), limitMs }),
      TICK_MS,
    );
    return () => window.clearInterval(interval);
  }, [isRunning, limitMs]);

  // The app pauses by itself when the window or the tab loses focus.
  useEffect(() => {
    if (!isRunning) {
      return;
    }
    const handleBlur = () => dispatch({ type: "pause", now: Date.now() });
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleBlur();
      }
    };

    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isRunning]);

  // Leaving or reloading during an attempt asks the browser's confirmation.
  useEffect(() => {
    if (!isInProgress) {
      return;
    }
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isInProgress]);

  // Committed words are compared once, when they change, not on every key.
  const committedKinds = useMemo<(ErrorKind | null)[]>(
    () => state.typing.committedWords.map((typed, index) => compareWord(words[index].text, typed)),
    [state.typing.committedWords, words],
  );

  // Every key the typing box doesn't leave to the browser. Speaking the word again
  // (Ctrl/Cmd + Space) is handled by the page, which owns the sound.
  const handleKeyAction = useCallback((action: KeyAction) => {
    switch (action.type) {
      case "pause":
        dispatch({ type: "toggle-pause", now: Date.now() });
        return;
      case "restart":
        dispatch({ type: "restart" });
        return;
      case "speak":
      case "ignore":
        return;
      default:
        dispatch({ type: "key", action, now: Date.now() });
    }
  }, []);

  const restart = useCallback(() => dispatch({ type: "restart" }), []);
  const finish = useCallback(() => dispatch({ type: "finish", now: Date.now() }), []);
  const resume = useCallback(() => dispatch({ type: "resume", now: Date.now() }), []);
  // The typing box lost the focus (a dialog opened, or a click elsewhere): the learner
  // can't type, so the time stops. Nothing happens unless typing.
  const pause = useCallback(() => dispatch({ type: "pause", now: Date.now() }), []);

  const elapsedMs = getElapsedMs(state, state.now);

  return {
    status: state.status,
    typing: state.typing,
    committedKinds,
    currentWordIndex: state.typing.committedWords.length,
    elapsedMs,
    // The limit of this attempt, which can differ from the setting (see above).
    timeLimit: attemptTimeLimit,
    // Null without a time limit.
    remainingMs: limitMs === null ? null : Math.max(0, limitMs - elapsedMs),
    handleKeyAction,
    restart,
    finish,
    resume,
    pause,
  };
};
