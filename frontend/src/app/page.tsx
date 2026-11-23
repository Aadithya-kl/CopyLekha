"use client";

import { Play } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AiPromptModal } from "@/components/AiPromptModal";
import { EmptyState } from "@/components/EmptyState";
import { findTourSteps, GuidedTour, type TourStep } from "@/components/GuidedTour";
import { HowItWorksDialog } from "@/components/HowItWorksDialog";
import { LibraryPanel } from "@/components/LibraryPanel";
import { PasteModal } from "@/components/PasteModal";
import { PracticeSkeleton } from "@/components/PracticeSkeleton";
import { ReferenceText } from "@/components/ReferenceText";
import { ResultView } from "@/components/ResultView";
import { SettingsPopover } from "@/components/SettingsPopover";
import { SiteFooter } from "@/components/SiteFooter";
import { StatusBar } from "@/components/StatusBar";
import { TaskQuestion } from "@/components/TaskQuestion";
import { SoundButton, TimerOptions, TopBar } from "@/components/TopBar";
import { TypingInput } from "@/components/TypingInput";
import { Button } from "@/components/ui/button";
import { useSpeech } from "@/hooks/use-speech";
import { useStore } from "@/hooks/use-store";
import { type FinishedAttempt, useTypingSession } from "@/hooks/use-typing-session";
import { track } from "@/lib/analytics";
import { findVocabularyWithMistakes } from "@/lib/compare";
import { findNextAnswer, findOpenAnswer, getNextDay } from "@/lib/library";
import { createAttempt, findBestEarlierAccuracy, findPreviousAttempt } from "@/lib/stats";
import { tokenize } from "@/lib/tokenize";
import type { KeyAction } from "@/lib/typing-rules";
import type { Answer, Attempt, TimeLimit, VocabularyItem } from "@/lib/types";

// The practice page: puts the top bar, the status line, the two boxes, the Result and
// the shortcut hint together.

const TYPING_INPUT_ID = "typing-input";

// Focus mode: while typing, what is around the two boxes fades, so the eyes stay on the
// text. The mouse or keyboard focus brings a part back, and a pause brings it all back.
const FADE_WHILE_TYPING =
  "transition-opacity duration-300 group-data-[focus=true]/practice:opacity-40 group-data-[focus=true]/practice:hover:opacity-100 group-data-[focus=true]/practice:focus-within:opacity-100";
const NO_VOCABULARY: VocabularyItem[] = [];

const ShortcutHint = () => (
  <p className="text-sm text-muted-foreground">
    <kbd>Space</kbd> next word · <kbd>Enter</kbd> new paragraph · <kbd>Esc</kbd> pause ·{" "}
    <kbd>Ctrl/Cmd + Enter</kbd> restart · <kbd>Ctrl/Cmd + Space</kbd> hear the word
  </p>
);

const Notice = ({ children }: { children: string }) => (
  <p role="status" className="rounded-md bg-warning px-3 py-2 text-sm text-warning-foreground">
    {children}
  </p>
);

type FinishedResult = {
  attempt: Attempt;
  saved: boolean;
  isStorageFull: boolean;
};

const Page = () => {
  const store = useStore({
    onOpenAnswerDeleted: () => toast("This answer was deleted in another tab."),
  });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [finished, setFinished] = useState<FinishedResult | null>(null);
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [isAiPromptOpen, setIsAiPromptOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  // On the very first visit How it works opens by itself, once.
  const [isFirstVisitGuideClosed, setIsFirstVisitGuideClosed] = useState(false);
  // The steps of the guided tour while it runs, else null.
  const [tourSteps, setTourSteps] = useState<TourStep[] | null>(null);
  // Set by Show me around: the tour starts once How it works has closed, so the dialog's
  // focus trap doesn't hold on to the focus while it fades out.
  const startTourAfterCloseRef = useRef(false);
  const { setTheme } = useTheme();

  // The answer last opened, else the newest one.
  const answer = findOpenAnswer(store.answers, store.lastAnswerId);
  const answerText = answer === null ? "" : answer.text;
  // Split once per answer, not on every render.
  const words = useMemo(() => tokenize(answerText), [answerText]);
  const { fontSize } = store.settings;

  // Every finished attempt with at least one typed word is saved.
  const handleFinish = ({ committedWords, durationMs, timeLimit }: FinishedAttempt) => {
    if (answer === null) {
      return;
    }
    const attempt = createAttempt({
      id: crypto.randomUUID(),
      answerId: answer.id,
      finishedAt: new Date().toISOString(),
      durationMs,
      timeLimit,
      words,
      committedWords,
    });
    setFinished({ attempt, ...store.addAttempt(attempt) });
    track("practice_finish", { task: answer.task, complete: attempt.complete });
  };

  const session = useTypingSession(words, store.settings.timeLimit, handleFinish);

  // Practice_start on the first key of an attempt, when the session leaves "ready".
  // A resume after a pause also goes to "typing", so the status before it is checked. The
  // first key can also finish the attempt (a one-word answer), straight from "ready".
  const trackPracticeStart = useEffectEvent(() => {
    if (answer !== null) {
      track("practice_start", { task: answer.task });
    }
  });
  const previousStatusRef = useRef(session.status);
  useEffect(() => {
    if (previousStatusRef.current === "ready" && session.status !== "ready") {
      trackPracticeStart();
    }
    previousStatusRef.current = session.status;
  }, [session.status]);
  const speech = useSpeech({ voiceName: store.settings.voiceName, speed: store.settings.speed });
  const currentWordText = words[session.currentWordIndex]?.text ?? "";
  const isTyping = session.status === "typing";

  // The word to type is spoken when typing starts and on every new word.
  const speakWhenSoundIsOn = useEffectEvent((word: string) => {
    if (store.settings.sound) {
      speech.speak(word);
    }
  });
  useEffect(() => {
    if (isTyping && currentWordText !== "") {
      speakWhenSoundIsOn(currentWordText);
    }
  }, [isTyping, session.currentWordIndex, currentWordText]);

  // Ctrl/Cmd + Space speaks the current word again, even with sound off.
  const { handleKeyAction: handleSessionKeyAction } = session;
  const { speak } = speech;
  const handleKeyAction = useCallback(
    (action: KeyAction) => {
      if (action.type === "speak") {
        speak(currentWordText);
        return;
      }
      handleSessionKeyAction(action);
    },
    [speak, currentWordText, handleSessionKeyAction],
  );

  // The Result replaces the two boxes.
  const result = session.status === "finished" ? finished : null;
  // The Result offers the next answer of the daily order (Day 1 Task 1, Day 1 Task 2 ...).
  const nextAnswer = answer === null ? null : findNextAnswer(store.answers, answer);
  const vocabulary = answer === null ? NO_VOCABULARY : answer.vocabulary;
  const vocabularyWithMistakes = useMemo(
    () =>
      result === null ? [] : findVocabularyWithMistakes(words, vocabulary, result.attempt.errors),
    [result, words, vocabulary],
  );

  // The cursor is in the typing box whenever it is shown, also after Try again.
  const isTypingShown = store.status === "ready" && answer !== null && result === null;
  useEffect(() => {
    if (isTypingShown) {
      inputRef.current?.focus();
    }
  }, [isTypingShown]);

  const handleRestart = () => {
    session.restart();
    setFinished(null);
    inputRef.current?.focus();
  };

  // Loads an answer. A new answer resets the typing session, so an unfinished attempt is
  // dropped without being saved, as with Restart.
  const openAnswer = (id: string) => {
    // The same answer keeps its session, but a finished one starts again.
    if (answer !== null && answer.id === id && session.status === "finished") {
      session.restart();
    }
    store.saveLastAnswerId(id);
    setFinished(null);
    setIsPasteOpen(false);
    setIsLibraryOpen(false);
  };

  // Deleting the open answer ends its attempt and loads the next answer, or the
  // empty state; the session resets when the answer changes.
  const handleDeleteAnswer = (id: string) => {
    if (answer !== null && answer.id === id) {
      setFinished(null);
    }
    if (store.deleteAnswer(id)) {
      toast("Answer deleted");
    }
  };

  // Saves the answers and loads the first one saved. An answer already in the
  // Library is left out.
  const handleSaveAnswers = (answers: Answer[]) => {
    const result = store.addAnswers(answers);
    if (!result.ok) {
      return result;
    }
    const [first] = result.added;
    if (first !== undefined) {
      openAnswer(first.id);
      if (result.saved) {
        toast(result.added.length === 1 ? "Answer saved" : "Answers saved");
        track("answer_import", {
          source: first.source === "ai-import" ? "ai-import" : "manual",
          count: result.added.length === 1 ? 1 : 2,
        });
      }
    }
    return result;
  };

  // The Paste modal says which tasks of a reply are already in the Library.
  const isInLibrary = (text: string) => store.answers.some((stored) => stored.text === text);

  // The stored theme drives next-themes, on load, after a change here and after a
  // change in another tab.
  const storedTheme = store.settings.theme;
  useEffect(() => {
    if (store.status === "ready") {
      setTheme(storedTheme);
    }
  }, [store.status, storedTheme, setTheme]);

  // The choice is a setting, so it is remembered. Focus goes back to the typing box.
  const handleToggleSound = () => {
    store.saveSettings({ ...store.settings, sound: !store.settings.sound });
    inputRef.current?.focus();
  };

  // The limit is a setting. An attempt already started restarts with it;
  // TimerOptions asks first.
  const hasStarted = session.status === "typing" || session.status === "paused";
  const handleTimeLimitChange = (limit: TimeLimit) => {
    store.saveSettings({ ...store.settings, timeLimit: limit });
    if (hasStarted) {
      session.restart();
    }
    inputRef.current?.focus();
  };

  const handleToggleQuestion = () => {
    store.saveSettings({ ...store.settings, showQuestion: !store.settings.showQuestion });
    inputRef.current?.focus();
  };

  // The cursor goes back to the typing box, which also brings the model answer back to
  // the current word.
  const handleResume = () => {
    session.resume();
    inputRef.current?.focus();
  };

  // Paste the reply closes the AI modal and opens the Paste modal.
  const handlePasteReply = () => {
    setIsAiPromptOpen(false);
    setIsPasteOpen(true);
  };

  // On the very first visit How it works can't be closed; the tour is the way on.
  const isGuideRequired = store.isFirstVisit && !isFirstVisitGuideClosed;
  const isGuideOpen = isHowItWorksOpen || isGuideRequired;

  const handleGuideOpenChange = (isOpen: boolean) => {
    setIsHowItWorksOpen(isOpen);
    if (!isOpen) {
      setIsFirstVisitGuideClosed(true);
    }
  };

  const handleStartTour = () => {
    startTourAfterCloseRef.current = true;
    handleGuideOpenChange(false);
  };

  const handleEndTour = useCallback(() => setTourSteps(null), []);

  // A closed modal returns focus to the typing box when it is shown.
  // When it closed to open the Paste modal, focus stays there; when it closed for the
  // guided tour, the tour starts and takes the focus.
  const handleModalCloseAutoFocus = (event: Event) => {
    if (startTourAfterCloseRef.current) {
      startTourAfterCloseRef.current = false;
      const steps = findTourSteps();
      if (steps.length > 0) {
        event.preventDefault();
        setTourSteps(steps);
        return;
      }
    }
    if (isPasteOpen) {
      event.preventDefault();
      return;
    }
    if (inputRef.current !== null) {
      event.preventDefault();
      inputRef.current.focus();
    }
  };

  return (
    <>
      <main
        // The tour points at the top bar, so nothing fades while it runs.
        data-focus={isTyping && tourSteps === null}
        className="group/practice mx-auto flex w-full max-w-245 flex-1 flex-col gap-4 px-4 py-6"
      >
        {!store.isAvailable && <Notice>Your progress won&apos;t be saved in this browser.</Notice>}
        {/* A save failed (a full storage, for example): the change holds only for this visit. */}
        {store.isAvailable && store.hasSaveFailed && (
          <Notice>Some changes couldn&apos;t be saved in this browser.</Notice>
        )}
        {/* Phones can open the app, but typing on them is not a goal. */}
        <p className="text-sm text-muted-foreground md:hidden">
          CopyLekha works best on a computer with a keyboard.
        </p>

        <div className={FADE_WHILE_TYPING}>
          <TopBar
            answer={store.status === "ready" ? answer : null}
            isReady={store.status === "ready"}
            onPaste={() => setIsPasteOpen(true)}
            onGetAnswers={() => setIsAiPromptOpen(true)}
            onOpenLibrary={() => setIsLibraryOpen(true)}
          >
            <SoundButton
              isOn={store.settings.sound}
              isSupported={speech.isSupported}
              isReady={store.status === "ready"}
              onToggle={handleToggleSound}
            />
            <div data-tour="timer-settings" className="flex gap-2 rounded-lg">
              <TimerOptions
                value={session.timeLimit}
                needsRestart={hasStarted}
                isReady={store.status === "ready"}
                onChange={handleTimeLimitChange}
                onCloseAutoFocus={handleModalCloseAutoFocus}
              />
              <SettingsPopover
                voices={speech.voices}
                voice={speech.voice}
                settings={store.settings}
                isReady={store.status === "ready"}
                onChange={store.saveSettings}
                onCloseAutoFocus={handleModalCloseAutoFocus}
              />
            </div>
          </TopBar>
        </div>

        <LibraryPanel
          open={isLibraryOpen}
          onOpenChange={setIsLibraryOpen}
          answers={store.answers}
          attempts={store.attempts}
          currentAnswerId={answer === null ? null : answer.id}
          onLoad={openAnswer}
          onRename={store.renameAnswer}
          onDelete={handleDeleteAnswer}
          onCloseAutoFocus={handleModalCloseAutoFocus}
        />

        <AiPromptModal
          open={isAiPromptOpen}
          onOpenChange={setIsAiPromptOpen}
          nextDay={getNextDay(store.answers)}
          onPasteReply={handlePasteReply}
          onCloseAutoFocus={handleModalCloseAutoFocus}
        />

        <PasteModal
          open={isPasteOpen}
          onOpenChange={setIsPasteOpen}
          onSave={handleSaveAnswers}
          isInLibrary={isInLibrary}
          onOpenExisting={openAnswer}
          onCloseAutoFocus={handleModalCloseAutoFocus}
        />

        <HowItWorksDialog
          open={isGuideOpen}
          onOpenChange={handleGuideOpenChange}
          isRequired={isGuideRequired}
          onStartTour={handleStartTour}
          onCloseAutoFocus={handleModalCloseAutoFocus}
        />

        {tourSteps !== null && (
          <GuidedTour
            steps={tourSteps}
            onEnd={handleEndTour}
            onCloseAutoFocus={handleModalCloseAutoFocus}
          />
        )}

        {store.status === "loading" && <PracticeSkeleton />}

        {store.status === "ready" && answer === null && (
          <EmptyState
            onGetAnswers={() => setIsAiPromptOpen(true)}
            onPaste={() => setIsPasteOpen(true)}
          />
        )}

        {result !== null && (
          <>
            {/* With no storage at all, the notice above already says so. */}
            {!result.saved && store.isAvailable && (
              <Notice>
                {result.isStorageFull
                  ? "This result couldn't be saved. Your browser storage is full."
                  : "This result couldn't be saved."}
              </Notice>
            )}
            <ResultView
              attempt={result.attempt}
              previousAccuracy={
                findPreviousAttempt(store.attempts, result.attempt)?.accuracy ?? null
              }
              bestAccuracy={findBestEarlierAccuracy(store.attempts, result.attempt)}
              vocabulary={vocabulary}
              vocabularyWithMistakes={vocabularyWithMistakes}
              onTryAgain={handleRestart}
              onChooseAnother={() => setIsLibraryOpen(true)}
              next={
                nextAnswer === null
                  ? null
                  : { title: nextAnswer.title, onStart: () => openAnswer(nextAnswer.id) }
              }
              onGetAnswers={
                answer !== null && answer.source === "sample" ? () => setIsAiPromptOpen(true) : null
              }
            />
          </>
        )}

        {isTypingShown && (
          <>
            <StatusBar
              elapsedMs={session.elapsedMs}
              remainingMs={session.remainingMs}
              wordsTyped={session.typing.committedWords.length}
              wordsTotal={words.length}
              onRestart={handleRestart}
              onFinish={session.finish}
            />

            <div className={FADE_WHILE_TYPING}>
              <TaskQuestion
                question={answer.question}
                isShown={store.settings.showQuestion}
                onToggle={handleToggleQuestion}
              />
            </div>

            {/* The two boxes stay close together; the page's free height goes below them. */}
            <div className="relative flex flex-col gap-4">
              <ReferenceText
                words={words}
                committedKinds={session.committedKinds}
                currentWordIndex={session.currentWordIndex}
                currentWord={session.typing.currentWord}
                fontSize={fontSize}
                inputId={TYPING_INPUT_ID}
              />
              <TypingInput
                inputId={TYPING_INPUT_ID}
                inputRef={inputRef}
                words={words}
                committedWords={session.typing.committedWords}
                committedKinds={session.committedKinds}
                currentWord={session.typing.currentWord}
                status={session.status}
                fontSize={fontSize}
                onKeyAction={handleKeyAction}
                onBlur={session.pause}
              />

              {/* The text stays readable, so the learner sees where to go on. */}
              {session.status === "paused" && (
                <div className="absolute top-1/2 left-1/2 flex w-max max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-wrap items-center gap-x-4 gap-y-2 rounded-md bg-warning px-4 py-3 text-warning-foreground shadow-md motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in-0">
                  <p role="status">
                    <span className="font-semibold">Paused. The timer is stopped.</span>
                    <br />
                    Type the next word to go on.
                  </p>
                  <Button variant="outline" size="lg" onClick={handleResume}>
                    <Play aria-hidden="true" />
                    Resume
                  </Button>
                </div>
              )}
            </div>

            <div className={FADE_WHILE_TYPING}>
              <ShortcutHint />
            </div>
          </>
        )}
      </main>
      <SiteFooter
        onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
        onCloseAutoFocus={handleModalCloseAutoFocus}
      />
    </>
  );
};

export default Page;
