"use client";

import { type ReactNode, useId, useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// What copywork is, the daily steps, what the marks in the boxes mean and the
// keyboard shortcuts, on one page. It ends with the guided tour or practice. On the
// very first visit it can't be closed: the only way on is the tour.

const DAILY_STEPS = [
  "Get a Task 1 and a Task 2 answer from your own AI chat with Get answers from AI.",
  "Paste the whole reply. The app finds the question, the answer and the vocabulary.",
  "Type the answer word by word. Every mistake is caught as you type.",
  "Read the Result, then start the next task. Tomorrow, ask your AI for the next day.",
];

const SHORTCUTS = [
  { keys: "Space", action: "next word" },
  { keys: "Enter", action: "new paragraph" },
  { keys: "Esc", action: "pause" },
  { keys: "Ctrl/Cmd + Enter", action: "restart" },
  { keys: "Ctrl/Cmd + Space", action: "hear the word" },
];

const Section = ({ title, children }: { title: string; children: ReactNode }) => {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="font-semibold">
        {title}
      </h3>
      {children}
    </section>
  );
};

type HowItWorksDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // True on the very first visit: no close button, Esc and a click outside do nothing,
  // and Show me around is the only button.
  isRequired: boolean;
  onStartTour: () => void;
  // Called instead of the dialog's own focus return, so focus can go to the typing box.
  onCloseAutoFocus: (event: Event) => void;
};

export const HowItWorksDialog = ({
  open,
  onOpenChange,
  isRequired,
  onStartTour,
  onCloseAutoFocus,
}: HowItWorksDialogProps) => {
  const startTourRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-160"
        showCloseButton={!isRequired}
        onEscapeKeyDown={(event) => isRequired && event.preventDefault()}
        onInteractOutside={(event) => isRequired && event.preventDefault()}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle className="text-lg">How it works</DialogTitle>
          <DialogDescription>
            Copywork: you retype a Band 8.5+ model answer exactly, word by word. Typing it slowly
            and carefully fixes its structure, grammar and collocations in your memory, so they come
            back when you write your own answers.
          </DialogDescription>
        </DialogHeader>

        <Section title="Every day">
          <ol className="flex list-inside list-decimal flex-col gap-1">
            {DAILY_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </Section>

        <Section title="In the model answer">
          {/* The same classes as the model answer box, so each mark looks as it does there. */}
          <ul className="flex flex-col gap-1">
            <li>
              <span className="underline decoration-primary decoration-2 underline-offset-4">
                word
              </span>{" "}
              the word to type next
            </li>
            <li>
              <span className="text-error underline decoration-error decoration-dotted decoration-2 underline-offset-4">
                word
              </span>{" "}
              a word typed wrong
            </li>
            <li>
              <span aria-hidden="true" className="text-muted-foreground">
                ↵
              </span>
              <span className="sr-only">The return arrow:</span> press Enter, a new paragraph starts
            </li>
            <li>
              <span className="bg-sentence px-1">grey background</span> the sentence you are typing
            </li>
          </ul>
        </Section>

        <Section title="Keyboard">
          <ul className="flex flex-col gap-1">
            {SHORTCUTS.map((shortcut) => (
              <li key={shortcut.keys}>
                <kbd className="rounded border bg-muted px-1.5 py-0.5 text-sm">{shortcut.keys}</kbd>{" "}
                {shortcut.action}
              </li>
            ))}
          </ul>
        </Section>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {/* Focus starts on the main button, so Enter goes on. */}
          <Button
            ref={startTourRef}
            // A click outside moves the focus to the page; on the first visit it comes back
            // here, so Enter still works.
            onBlur={(event) => {
              if (isRequired && event.relatedTarget === null) {
                window.setTimeout(() => startTourRef.current?.focus());
              }
            }}
            variant={isRequired ? "default" : "outline"}
            size="lg"
            autoFocus={isRequired}
            onClick={onStartTour}
          >
            Show me around
          </Button>
          {!isRequired && (
            <Button size="lg" autoFocus onClick={() => onOpenChange(false)}>
              Start practising
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
