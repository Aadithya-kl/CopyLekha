import { ChevronDown, ChevronUp } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button";

// The task question, small, above the model answer, with Show question /
// Hide question. Nothing is shown when the answer has no question.

type TaskQuestionProps = {
  question: string | null;
  isShown: boolean;
  onToggle: () => void;
};

export const TaskQuestion = ({ question, isShown, onToggle }: TaskQuestionProps) => {
  const questionId = useId();

  if (question === null) {
    return null;
  }

  return (
    <section aria-label="Task question" className="flex flex-col gap-1 text-sm">
      <Button
        variant="ghost"
        size="lg"
        onClick={onToggle}
        aria-expanded={isShown}
        aria-controls={questionId}
        className="self-start text-muted-foreground"
      >
        {isShown ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
        {isShown ? "Hide question" : "Show question"}
      </Button>
      {/* Kept in the page while hidden, so aria-controls always points to something.
          At most about six lines, so a long question (a Task 1 data table) never pushes
          the model answer down; the rest scrolls, also with the keyboard (tabIndex). */}
      <p
        id={questionId}
        hidden={!isShown}
        tabIndex={0}
        className="max-h-34 overflow-y-auto rounded-md bg-muted px-3 py-2 whitespace-pre-line text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {question}
      </p>
    </section>
  );
};
