"use client";

import { type KeyboardEvent, useId, useLayoutEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";

// A short tour that points at the real controls, one at a time. Each control is
// found by its data-tour attribute.

export type TourStep = {
  target: string;
  title: string;
  text: string;
};

export const TOUR_STEPS: readonly TourStep[] = [
  {
    target: "model-answer",
    title: "The model answer",
    text: "This is the model answer. The underlined word is the one to type next.",
  },
  {
    target: "typing-box",
    title: "Your typing box",
    text: "Type here, word by word. The timer starts with your first key.",
  },
  {
    target: "get-answers",
    title: "Answers from AI",
    text: "Get a new Task 1 and Task 2 every day from your own AI chat.",
  },
  {
    target: "paste",
    title: "Paste",
    text: "Paste an AI reply or any model answer here.",
  },
  {
    target: "library",
    title: "Library",
    text: "All your answers, by day, with your last accuracy.",
  },
  {
    target: "timer-settings",
    title: "Timer and settings",
    text: "Choose 20 or 40 minutes like the exam, and change the theme, text size and voice.",
  },
];

// What the popover is placed next to: the control of the current step.
type Anchor = { getBoundingClientRect: () => DOMRect };
const NO_ANCHOR: Anchor = { getBoundingClientRect: () => new DOMRect() };

// The attribute that draws the green outline around the control (globals.css).
const ACTIVE_ATTRIBUTE = "data-tour-active";

const findTarget = (target: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(`[data-tour="${target}"]`);

// The steps whose control is on the page now; called when the tour starts.
export const findTourSteps = (): TourStep[] =>
  TOUR_STEPS.filter((step) => findTarget(step.target) !== null);

type GuidedTourProps = {
  // At least one step, from findTourSteps().
  steps: TourStep[];
  onEnd: () => void;
  // Called instead of the popover's own focus return, so focus can go to the typing box.
  onCloseAutoFocus: (event: Event) => void;
};

// Rendered only while the tour runs, so every run starts at the first step.
export const GuidedTour = ({ steps, onEnd, onCloseAutoFocus }: GuidedTourProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const anchorRef = useRef<Anchor>(NO_ANCHOR);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const step = steps.at(stepIndex);
  const isLastStep = stepIndex === steps.length - 1;

  // The popover is placed next to the control, which is outlined and scrolled into view.
  // A layout effect, so the anchor is set before the popover reads it.
  const target = step === undefined ? null : step.target;
  useLayoutEffect(() => {
    const element = target === null ? null : findTarget(target);
    if (element === null) {
      return;
    }
    anchorRef.current = element;
    element.setAttribute(ACTIVE_ATTRIBUTE, "true");
    element.scrollIntoView({ block: "nearest" });
    nextButtonRef.current?.focus();
    return () => element.removeAttribute(ACTIVE_ATTRIBUTE);
  }, [target]);

  if (step === undefined) {
    return null;
  }

  const goBack = () => setStepIndex((index) => Math.max(0, index - 1));
  const goNext = () => {
    if (isLastStep) {
      onEnd();
      return;
    }
    setStepIndex((index) => index + 1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goBack();
    }
  };

  return (
    <Popover open onOpenChange={(isOpen) => !isOpen && onEnd()}>
      <PopoverAnchor virtualRef={anchorRef} />
      <PopoverContent
        aria-labelledby={titleId}
        collisionPadding={16}
        className="w-80 max-w-[calc(100vw-2rem)]"
        onOpenAutoFocus={(event) => {
          // Focus goes to Next, so Enter moves on.
          event.preventDefault();
          nextButtonRef.current?.focus();
        }}
        onCloseAutoFocus={onCloseAutoFocus}
        onKeyDown={handleKeyDown}
      >
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">
            {stepIndex + 1} of {steps.length}
          </p>
          <h2 id={titleId} className="font-semibold">
            {step.title}
          </h2>
          <p>{step.text}</p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={onEnd}>
            Skip tour
          </Button>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button variant="outline" onClick={goBack}>
                Back
              </Button>
            )}
            <Button ref={nextButtonRef} onClick={goNext}>
              {isLastStep ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
