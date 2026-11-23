"use client";

import { type FormEvent, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { hasHardToTypeCharacters } from "@/lib/clean-text";
import {
  createImportTitle,
  describeReply,
  type ParsedResponse,
  parseAiResponse,
} from "@/lib/parse-ai-response";
import { type AddAnswersResult, MAX_ANSWER_WORDS } from "@/lib/storage";
import { createTitleFromText, tokenize } from "@/lib/tokenize";
import { type Answer, TASK_LABELS, type Task, TASKS } from "@/lib/types";

// Paste a model answer, give it a title and a task, then save and start.
// A whole AI reply is split into its tasks, shown before it is saved.

const DEFAULT_TASK: Task = "task2";

type SaveError = "empty" | "too-long" | "duplicate";

const SAVE_ERROR_MESSAGES: Record<SaveError, string> = {
  empty: "Paste an answer first.",
  "too-long": `Answers can be up to ${MAX_ANSWER_WORDS.toLocaleString("en-GB")} words.`,
  duplicate: "This answer is already in your library.",
};

const isTask = (value: string): value is Task => TASKS.some((task) => task === value);

// Which tasks of a reply are already in the Library, and so are not saved again.
const describeTasksInLibrary = (inLibrary: Task[], toSave: Task[]): string | null => {
  const [firstInLibrary] = inLibrary;
  const [firstToSave] = toSave;
  if (firstInLibrary === undefined) {
    return null;
  }
  if (inLibrary.length > 1) {
    return "Both tasks are already in your library.";
  }
  const already = `${TASK_LABELS[firstInLibrary]} is already in your library.`;
  return firstToSave === undefined
    ? already
    : `${already} Only ${TASK_LABELS[firstToSave]} will be saved.`;
};

const formatWordCount = (count: number): string => (count === 1 ? "1 word" : `${count} words`);

// The answers to save: one plain answer with the learner's title and task, or every
// task found in an AI reply.
const createAnswers = (parsed: ParsedResponse, title: string, task: Task): Answer[] => {
  const createdAt = new Date().toISOString();

  if (parsed.kind === "plain") {
    const trimmedTitle = title.trim();
    return [
      {
        id: crypto.randomUUID(),
        title: trimmedTitle === "" ? createTitleFromText(parsed.text) : trimmedTitle,
        task,
        text: parsed.text,
        question: null,
        vocabulary: [],
        day: null,
        source: "manual",
        createdAt,
      },
    ];
  }

  return parsed.tasks.map((found) => ({
    id: crypto.randomUUID(),
    title: createImportTitle(parsed.day, found.task),
    task: found.task,
    text: found.text,
    question: found.question,
    vocabulary: found.vocabulary,
    day: parsed.day,
    source: "ai-import",
    createdAt,
  }));
};

type PasteModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Saves the answers; the first one saved is loaded.
  onSave: (answers: Answer[]) => AddAnswersResult;
  // Whether an answer with this text is already in the Library.
  isInLibrary: (text: string) => boolean;
  // Loads an answer already in the Library (when the same answer is pasted again).
  onOpenExisting: (id: string) => void;
  // Called instead of the dialog's own focus return, so focus can go to the typing box.
  onCloseAutoFocus: (event: Event) => void;
};

export const PasteModal = ({
  open,
  onOpenChange,
  onSave,
  isInLibrary,
  onOpenExisting,
  onCloseAutoFocus,
}: PasteModalProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-160" onCloseAutoFocus={onCloseAutoFocus}>
      <DialogHeader>
        <DialogTitle className="text-lg">Paste an answer</DialogTitle>
        <DialogDescription>
          Paste one model answer, or the whole reply from your AI chat.
        </DialogDescription>
      </DialogHeader>
      {/* Inside the content, so the fields start empty every time the modal opens. */}
      <PasteForm onSave={onSave} isInLibrary={isInLibrary} onOpenExisting={onOpenExisting} />
    </DialogContent>
  </Dialog>
);

type PasteFormProps = Pick<PasteModalProps, "onSave" | "isInLibrary" | "onOpenExisting">;

const PasteForm = ({ onSave, isInLibrary, onOpenExisting }: PasteFormProps) => {
  const [input, setInput] = useState("");
  const [title, setTitle] = useState("");
  const [task, setTask] = useState<Task>(DEFAULT_TASK);
  const [error, setError] = useState<SaveError | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);
  const textId = useId();
  const titleId = useId();
  const taskLabelId = useId();
  const messageId = useId();

  const parsed = parseAiResponse(input);
  const texts = parsed.kind === "plain" ? [parsed.text] : parsed.tasks.map((found) => found.text);
  const isEmpty = parsed.kind === "plain" && parsed.text === "";
  const showsKeyboardWarning = texts.some(hasHardToTypeCharacters);
  // A task already in the Library is not saved again; the task loaded after saving
  // is the first one saved.
  const foundTasks = parsed.kind === "ai-reply" ? parsed.tasks : [];
  const tasksInLibrary = foundTasks.filter((found) => isInLibrary(found.text));
  const tasksToSave = foundTasks.filter((found) => !tasksInLibrary.includes(found));
  const inLibraryNote = describeTasksInLibrary(
    tasksInLibrary.map((found) => found.task),
    tasksToSave.map((found) => found.task),
  );
  const firstTask = (tasksToSave[0] ?? foundTasks[0])?.task;
  const saveLabel =
    firstTask === undefined ? "Save and start" : `Save and start ${TASK_LABELS[firstTask]}`;

  const handleInputChange = (value: string) => {
    setInput(value);
    setError(null);
    setExistingId(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isEmpty) {
      setError("empty");
      return;
    }

    const result = onSave(createAnswers(parsed, title, task));
    if (!result.ok) {
      setError(result.reason);
      setExistingId(result.reason === "duplicate" ? result.existingId : null);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor={textId}>Answer</Label>
          {parsed.kind === "plain" && (
            <p className="text-sm text-muted-foreground tabular-nums">
              {formatWordCount(tokenize(parsed.text).length)}
            </p>
          )}
        </div>
        <Textarea
          id={textId}
          value={input}
          onChange={(event) => handleInputChange(event.target.value)}
          aria-invalid={error !== null}
          aria-describedby={error !== null ? messageId : undefined}
          className="max-h-80 min-h-40"
          autoFocus
        />
        {parsed.kind === "ai-reply" && (
          <p role="status" className="rounded-md bg-muted px-3 py-2 text-sm font-medium">
            {describeReply(parsed.day, parsed.tasks)}
          </p>
        )}
        {inLibraryNote !== null && <p className="text-sm text-muted-foreground">{inLibraryNote}</p>}
        {error !== null && (
          <div id={messageId} role="alert" className="flex items-center gap-2 text-sm text-error">
            <p>{SAVE_ERROR_MESSAGES[error]}</p>
            {existingId !== null && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => onOpenExisting(existingId)}
              >
                Open it
              </Button>
            )}
          </div>
        )}
        {showsKeyboardWarning && (
          <p className="rounded-md bg-warning px-3 py-2 text-sm text-warning-foreground">
            Some characters may be hard to type on an English keyboard.
          </p>
        )}
      </div>

      {/* An AI reply brings its own titles and tasks. */}
      {parsed.kind === "plain" && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor={titleId}>Title (optional)</Label>
            <Input
              id={titleId}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="The first six words of the answer"
            />
          </div>

          <div className="flex flex-col gap-2">
            <p id={taskLabelId} className="text-sm font-medium">
              Task
            </p>
            <RadioGroup
              aria-labelledby={taskLabelId}
              value={task}
              onValueChange={(value) => isTask(value) && setTask(value)}
              className="flex gap-6"
            >
              {TASKS.map((option) => (
                <div key={option} className="flex items-center gap-2">
                  <RadioGroupItem value={option} id={`${taskLabelId}-${option}`} />
                  <Label htmlFor={`${taskLabelId}-${option}`} className="font-normal">
                    {TASK_LABELS[option]}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="lg">
          {saveLabel}
        </Button>
      </div>
    </form>
  );
};
