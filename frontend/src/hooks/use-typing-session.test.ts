import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type FinishedAttempt, useTypingSession } from "@/hooks/use-typing-session";
import { tokenize } from "@/lib/tokenize";
import type { TimeLimit, Word } from "@/lib/types";
import type { KeyAction } from "@/lib/typing-rules";

const WORDS = tokenize("It rose.\n\nThen it fell.");
const SECOND = 1_000;
const MINUTE = 60 * SECOND;

const renderSession = (
  timeLimit: TimeLimit = 0,
  words: Word[] = WORDS,
  onFinish: (finished: FinishedAttempt) => void = () => {},
) =>
  renderHook(({ sessionWords, limit }) => useTypingSession(sessionWords, limit, onFinish), {
    initialProps: { sessionWords: words, limit: timeLimit },
  });

type Session = ReturnType<typeof renderSession>["result"];

const send = (result: Session, ...actions: KeyAction[]) => {
  for (const action of actions) {
    act(() => result.current.handleKeyAction(action));
  }
};

const typeLetters = (result: Session, letters: string) =>
  send(result, ...[...letters].map((text): KeyAction => ({ type: "text", text })));

const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-21T10:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useTypingSession: timer", () => {
  it("waits for the first key before it starts", () => {
    const { result } = renderSession();
    wait(5 * SECOND);

    expect(result.current.status).toBe("ready");
    expect(result.current.elapsedMs).toBe(0);
  });

  it("does not start on a refused key", () => {
    const { result } = renderSession();
    send(result, { type: "space" });

    expect(result.current.status).toBe("ready");
  });

  it("starts with the first key and counts the active time", () => {
    const { result } = renderSession();
    typeLetters(result, "I");
    wait(3 * SECOND);

    expect(result.current.status).toBe("typing");
    expect(result.current.elapsedMs).toBe(3 * SECOND);
  });
});

describe("useTypingSession: time limit", () => {
  it("keeps the limit an attempt started with when the setting changes in another tab", () => {
    const onFinish = vi.fn();
    const { result, rerender } = renderSession(0, WORDS, onFinish);
    typeLetters(result, "It");
    wait(25 * MINUTE);
    rerender({ sessionWords: WORDS, limit: 20 });
    wait(SECOND);

    expect(result.current.status).toBe("typing");
    expect(result.current.timeLimit).toBe(0);
    expect(result.current.remainingMs).toBeNull();
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("takes the new limit with the next attempt", () => {
    const onFinish = vi.fn();
    const { result, rerender } = renderSession(0, WORDS, onFinish);
    typeLetters(result, "It");
    rerender({ sessionWords: WORDS, limit: 20 });
    act(() => result.current.restart());

    expect(result.current.timeLimit).toBe(20);
    expect(result.current.remainingMs).toBe(20 * MINUTE);
  });

  it("reports the limit the attempt ran with", () => {
    const onFinish = vi.fn();
    const { result, rerender } = renderSession(20, WORDS, onFinish);
    typeLetters(result, "It");
    rerender({ sessionWords: WORDS, limit: 40 });
    act(() => result.current.finish());

    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ timeLimit: 20 }));
  });
});

describe("useTypingSession: pause", () => {
  it("pauses on Esc and leaves the paused time out", () => {
    const { result } = renderSession();
    typeLetters(result, "I");
    wait(2 * SECOND);
    send(result, { type: "pause" });
    wait(10 * SECOND);

    expect(result.current.status).toBe("paused");
    expect(result.current.elapsedMs).toBe(2 * SECOND);
  });

  it("resumes on the next typed key", () => {
    const { result } = renderSession();
    typeLetters(result, "I");
    wait(2 * SECOND);
    send(result, { type: "pause" });
    wait(10 * SECOND);
    typeLetters(result, "t");
    wait(SECOND);

    expect(result.current.status).toBe("typing");
    expect(result.current.typing.currentWord).toBe("It");
    expect(result.current.elapsedMs).toBe(3 * SECOND);
  });

  it("resumes on a second Esc", () => {
    const { result } = renderSession();
    typeLetters(result, "I");
    send(result, { type: "pause" }, { type: "pause" });

    expect(result.current.status).toBe("typing");
  });

  it("resumes from the Resume button, leaving the typed letters as they were", () => {
    const { result } = renderSession();
    typeLetters(result, "I");
    wait(2 * SECOND);
    send(result, { type: "pause" });
    wait(10 * SECOND);
    act(() => result.current.resume());
    wait(SECOND);

    expect(result.current.status).toBe("typing");
    expect(result.current.typing.currentWord).toBe("I");
    expect(result.current.elapsedMs).toBe(3 * SECOND);
  });

  it("does nothing on Resume unless paused", () => {
    const { result } = renderSession();
    act(() => result.current.resume());

    expect(result.current.status).toBe("ready");
  });

  it("ignores Esc before the first key", () => {
    const { result } = renderSession();
    send(result, { type: "pause" });

    expect(result.current.status).toBe("ready");
  });

  it("pauses when the typing box loses focus, and leaves the paused time out", () => {
    const { result } = renderSession();
    typeLetters(result, "I");
    wait(2 * SECOND);
    act(() => result.current.pause());
    wait(10 * SECOND);

    expect(result.current.status).toBe("paused");
    expect(result.current.elapsedMs).toBe(2 * SECOND);
  });

  it("does nothing on a lost focus before the first key", () => {
    const { result } = renderSession();
    act(() => result.current.pause());

    expect(result.current.status).toBe("ready");
  });

  it("pauses when the window loses focus", () => {
    const { result } = renderSession();
    typeLetters(result, "I");
    act(() => {
      window.dispatchEvent(new Event("blur"));
    });

    expect(result.current.status).toBe("paused");
  });
});

describe("useTypingSession: restart", () => {
  it("starts a new attempt on Ctrl/Cmd + Enter", () => {
    const { result } = renderSession();
    typeLetters(result, "It");
    send(result, { type: "space" });
    wait(4 * SECOND);
    send(result, { type: "restart" });

    expect(result.current.status).toBe("ready");
    expect(result.current.typing.committedWords).toEqual([]);
    expect(result.current.elapsedMs).toBe(0);
  });

  it("starts a new attempt when the answer changes", () => {
    const { result, rerender } = renderSession();
    typeLetters(result, "It");
    rerender({ sessionWords: tokenize("Another answer."), limit: 0 });

    expect(result.current.status).toBe("ready");
    expect(result.current.typing.currentWord).toBe("");
  });
});

describe("useTypingSession: finish", () => {
  it("finishes when the last word is typed and stops the timer", () => {
    const oneWord = tokenize("Overall");
    const { result } = renderSession(0, oneWord);
    typeLetters(result, "Overal");
    wait(2 * SECOND);
    typeLetters(result, "l");
    wait(5 * SECOND);

    expect(result.current.status).toBe("finished");
    expect(result.current.typing.committedWords).toEqual(["Overall"]);
    expect(result.current.elapsedMs).toBe(2 * SECOND);
  });

  it("finishes on the Finish button, with a word typed in full but not yet moved on from", () => {
    const { result } = renderSession();
    typeLetters(result, "It");
    act(() => result.current.finish());

    expect(result.current.status).toBe("finished");
    expect(result.current.typing.committedWords).toEqual(["It"]);
  });

  it("leaves out a half-typed word on Finish", () => {
    const { result } = renderSession();
    typeLetters(result, "It");
    send(result, { type: "space" });
    typeLetters(result, "ro");
    act(() => result.current.finish());

    expect(result.current.status).toBe("finished");
    expect(result.current.typing.committedWords).toEqual(["It"]);
  });

  it("starts over when Finish comes with only a half-typed first word", () => {
    const { result } = renderSession();
    typeLetters(result, "I");
    act(() => result.current.finish());

    expect(result.current.status).toBe("ready");
    expect(result.current.typing.committedWords).toEqual([]);
  });

  it("ignores keys after finishing", () => {
    const { result } = renderSession();
    typeLetters(result, "It");
    act(() => result.current.finish());
    typeLetters(result, "t");

    expect(result.current.typing.committedWords).toEqual(["It"]);
  });

  it("counts down and finishes when the time limit runs out", () => {
    const { result } = renderSession(20);
    typeLetters(result, "It");
    wait(5 * MINUTE);

    expect(result.current.remainingMs).toBe(15 * MINUTE);

    wait(15 * MINUTE);

    expect(result.current.status).toBe("finished");
    expect(result.current.remainingMs).toBe(0);
    expect(result.current.typing.committedWords).toEqual(["It"]);
  });

  it("has no remaining time without a limit", () => {
    const { result } = renderSession(0);

    expect(result.current.remainingMs).toBeNull();
  });
});

describe("useTypingSession: compared words", () => {
  it("gives each committed word its kind, null when correct", () => {
    const { result } = renderSession();
    typeLetters(result, "it");
    send(result, { type: "space" });
    typeLetters(result, "rose.");
    send(result, { type: "enter" });

    expect(result.current.committedKinds).toEqual(["case", null]);
    expect(result.current.currentWordIndex).toBe(2);
  });
});

describe("useTypingSession: reporting the finished attempt", () => {
  it("reports the typed words and the active time once", () => {
    const onFinish = vi.fn();
    const { result, rerender } = renderSession(0, WORDS, onFinish);
    typeLetters(result, "It");
    wait(3 * SECOND);
    act(() => result.current.finish());
    rerender({ sessionWords: WORDS, limit: 0 });

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith({
      committedWords: ["It"],
      durationMs: 3 * SECOND,
      timeLimit: 0,
    });
  });

  it("starts over without reporting when Finish comes before any word", () => {
    const onFinish = vi.fn();
    const { result } = renderSession(0, WORDS, onFinish);
    typeLetters(result, "I");
    send(result, { type: "backspace" });
    act(() => result.current.finish());

    expect(result.current.status).toBe("ready");
    expect(result.current.elapsedMs).toBe(0);
    expect(onFinish).not.toHaveBeenCalled();
  });
});
