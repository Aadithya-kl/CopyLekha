import { useCallback, useEffect, useRef, useState } from "react";

import { findOpenAnswer } from "@/lib/library";
import * as storage from "@/lib/storage";
import type { Answer, Attempt, Settings } from "@/lib/types";

// The learner's answers, attempts and settings, read from localStorage after the page
// loads and kept in sync with other tabs.

export type StoreStatus = "loading" | "ready";

const EMPTY_DATA: storage.StoreData = {
  answers: [],
  attempts: [],
  settings: storage.DEFAULT_SETTINGS,
  lastAnswerId: null,
};

const STORED_KEYS: readonly string[] = Object.values(storage.STORAGE_KEYS);

type StoreOptions = {
  // Another tab deleted the answer open here, so the page shows another one.
  onOpenAnswerDeleted?: () => void;
};

export const useStore = ({ onOpenAnswerDeleted }: StoreOptions = {}) => {
  const [status, setStatus] = useState<StoreStatus>("loading");
  const [data, setData] = useState<storage.StoreData>(EMPTY_DATA);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [hasSaveFailed, setHasSaveFailed] = useState(false);
  // The latest data, so a change made right after another one builds on it.
  const dataRef = useRef(data);
  // The latest callback, so the storage listener never needs to be added again.
  const onOpenAnswerDeletedRef = useRef(onOpenAnswerDeleted);
  useEffect(() => {
    onOpenAnswerDeletedRef.current = onOpenAnswerDeleted;
  });

  const showData = useCallback((next: storage.StoreData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  useEffect(() => {
    const { isAvailable: canUseStorage, isFirstVisit: isFirst, ...loaded } = storage.loadStore();
    // localStorage exists only in the browser, so it is read once after the first render;
    // reading it during render would make the server and client HTML differ.
    /* eslint-disable react-hooks/set-state-in-effect */
    showData(loaded);
    setIsAvailable(canUseStorage);
    // React's StrictMode runs this twice in development; the second load is no longer the
    // first visit, so it must not undo what the first one found.
    setIsFirstVisit((wasFirstVisit) => wasFirstVisit || isFirst);
    setStatus("ready");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [showData]);

  // Another tab changed the Library or the settings. The answer open here stays open,
  // even when another tab opens a different one, so an attempt in progress or a Result
  // on screen is not touched, unless another tab deletes the answer open here.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && !STORED_KEYS.includes(event.key)) {
        return;
      }
      const previous = dataRef.current;
      const openAnswer = findOpenAnswer(previous.answers, previous.lastAnswerId);
      const stored = storage.readStore();
      // The answer actually open here is kept by its id, also when it was only the newest
      // one, so a new answer from another tab never takes its place. If it was deleted,
      // the one shown instead is kept the same way.
      const nextOpen = findOpenAnswer(stored.answers, openAnswer === null ? null : openAnswer.id);
      showData({ ...stored, lastAnswerId: nextOpen === null ? null : nextOpen.id });
      if (openAnswer !== null && !stored.answers.some((answer) => answer.id === openAnswer.id)) {
        onOpenAnswerDeletedRef.current?.();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [showData]);

  // Shows the change and returns whether it was saved.
  const applyChange = useCallback(
    (result: storage.ChangeResult): boolean => {
      showData(result.data);
      if (!result.saved) {
        setHasSaveFailed(true);
      }
      return result.saved;
    },
    [showData],
  );

  const addAnswers = useCallback(
    (newAnswers: Answer[]): storage.AddAnswersResult => {
      const result = storage.addAnswers(dataRef.current, newAnswers);
      if (result.ok) {
        applyChange(result);
      }
      return result;
    },
    [applyChange],
  );

  const renameAnswer = useCallback(
    (id: string, title: string) => applyChange(storage.renameAnswer(dataRef.current, id, title)),
    [applyChange],
  );

  const deleteAnswer = useCallback(
    (id: string) => applyChange(storage.deleteAnswer(dataRef.current, id)),
    [applyChange],
  );

  // Returns whether the attempt was saved, and if not, whether the storage is full.
  const addAttempt = useCallback(
    (attempt: Attempt) => {
      const result = storage.addAttempt(dataRef.current, attempt);
      applyChange(result);
      return { saved: result.saved, isStorageFull: result.isStorageFull };
    },
    [applyChange],
  );

  const saveSettings = useCallback(
    (settings: Settings) => applyChange(storage.saveSettings(dataRef.current, settings)),
    [applyChange],
  );

  const saveLastAnswerId = useCallback(
    (id: string) => applyChange(storage.saveLastAnswerId(dataRef.current, id)),
    [applyChange],
  );

  return {
    status,
    // False when localStorage can't be used at all.
    isAvailable,
    // True on the very first visit in this browser.
    isFirstVisit,
    // True after a change could not be saved, for example with a full quota.
    hasSaveFailed,
    ...data,
    addAnswers,
    renameAnswer,
    deleteAnswer,
    addAttempt,
    saveSettings,
    saveLastAnswerId,
  };
};
