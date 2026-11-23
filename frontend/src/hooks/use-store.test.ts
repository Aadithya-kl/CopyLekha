import { act, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useStore } from "@/hooks/use-store";
import { DEFAULT_SETTINGS, STORAGE_KEYS } from "@/lib/storage";
import type { Answer } from "@/lib/types";

const createAnswer = (id: string, text: string): Answer => ({
  id,
  title: `Answer ${id}`,
  task: "task1",
  text,
  question: null,
  vocabulary: [],
  day: null,
  source: "manual",
  createdAt: "2026-11-21T10:00:00.000Z",
});

beforeEach(() => {
  localStorage.clear();
});

describe("useStore", () => {
  it("is ready with the stored data after the first render", () => {
    const { result } = renderHook(() => useStore());

    expect(result.current.status).toBe("ready");
    expect(result.current.isAvailable).toBe(true);
    expect(result.current.answers).toHaveLength(2);
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("knows the very first visit, also when StrictMode loads twice", () => {
    const { result } = renderHook(() => useStore(), { wrapper: StrictMode });

    expect(result.current.isFirstVisit).toBe(true);
  });

  it("is not the first visit when data is already stored", () => {
    renderHook(() => useStore()).unmount();
    const { result } = renderHook(() => useStore());

    expect(result.current.isFirstVisit).toBe(false);
  });

  it("shows a saved change and builds the next change on it", () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.addAnswers([createAnswer("a1", "First.")]);
      result.current.addAnswers([createAnswer("a2", "Second.")]);
    });

    expect(result.current.answers.slice(0, 2).map((answer) => answer.id)).toEqual(["a2", "a1"]);
    expect(result.current.hasSaveFailed).toBe(false);
  });

  it("keeps a change that couldn't be saved, and says a save failed", () => {
    const { result } = renderHook(() => useStore());
    const [first] = result.current.answers;
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage is not writable");
    });

    act(() => {
      result.current.renameAnswer(first?.id ?? "", "A new title");
    });
    setItem.mockRestore();

    expect(result.current.answers[0]?.title).toBe("A new title");
    expect(result.current.hasSaveFailed).toBe(true);
  });

  it("follows a change made in another tab", () => {
    const { result } = renderHook(() => useStore());
    const settings = { ...DEFAULT_SETTINGS, theme: "dark" };

    act(() => {
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEYS.settings }));
    });

    expect(result.current.settings).toEqual(settings);
  });

  it("keeps the answer open here when another tab opens a different one", () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.addAnswers([createAnswer("a1", "First.")]);
      result.current.saveLastAnswerId("a1");
    });

    act(() => {
      localStorage.setItem(STORAGE_KEYS.lastAnswerId, JSON.stringify("another-answer"));
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEYS.lastAnswerId }));
    });

    expect(result.current.lastAnswerId).toBe("a1");
  });

  it("says so when another tab deletes the answer open here", () => {
    const onOpenAnswerDeleted = vi.fn();
    const { result } = renderHook(() => useStore({ onOpenAnswerDeleted }));
    act(() => {
      result.current.addAnswers([createAnswer("a1", "First."), createAnswer("a2", "Second.")]);
      result.current.saveLastAnswerId("a1");
    });
    const withoutOpen = result.current.answers.filter((answer) => answer.id !== "a1");

    act(() => {
      localStorage.setItem(STORAGE_KEYS.answers, JSON.stringify(withoutOpen));
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEYS.answers }));
    });

    expect(onOpenAnswerDeleted).toHaveBeenCalledOnce();
    expect(result.current.answers.some((answer) => answer.id === "a1")).toBe(false);
  });

  it("stays quiet when another tab deletes a different answer", () => {
    const onOpenAnswerDeleted = vi.fn();
    const { result } = renderHook(() => useStore({ onOpenAnswerDeleted }));
    act(() => {
      result.current.addAnswers([createAnswer("a1", "First."), createAnswer("a2", "Second.")]);
      result.current.saveLastAnswerId("a1");
    });
    const withoutOther = result.current.answers.filter((answer) => answer.id !== "a2");

    act(() => {
      localStorage.setItem(STORAGE_KEYS.answers, JSON.stringify(withoutOther));
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEYS.answers }));
    });

    expect(onOpenAnswerDeleted).not.toHaveBeenCalled();
  });

  it("keeps the answer open here when another tab adds a newer one", () => {
    const { result } = renderHook(() => useStore());
    act(() => {
      result.current.addAnswers([createAnswer("a1", "First."), createAnswer("a2", "Second.")]);
      result.current.saveLastAnswerId("a1");
    });
    // Deleting the open answer here leaves no answer marked as open: the newest is shown.
    act(() => {
      result.current.deleteAnswer("a1");
    });
    const shownId = result.current.answers[0]?.id;

    act(() => {
      const withNewer = [createAnswer("a3", "Third."), ...result.current.answers];
      localStorage.setItem(STORAGE_KEYS.answers, JSON.stringify(withNewer));
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEYS.answers }));
    });

    expect(result.current.lastAnswerId).toBe(shownId);
  });

  it("ignores changes to keys that are not CopyLekha's", () => {
    const { result } = renderHook(() => useStore());
    const answersBefore = result.current.answers;

    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "another-app" }));
    });

    expect(result.current.answers).toBe(answersBefore);
  });
});
