// Shared types. Task, Answer, Attempt and Settings are the stored shapes;
// changing one needs a new storage version and a migration.

// Every task, in order.
export const TASKS = ["task1", "task2"] as const;
export type Task = (typeof TASKS)[number];

// How the UI names a task.
export const TASK_LABELS: Record<Task, string> = {
  task1: "Task 1",
  task2: "Task 2",
};

export type AnswerSource = "sample" | "manual" | "ai-import";

export type VocabularyItem = {
  phrase: string;
  meaning: string;
};

export type Answer = {
  id: string; // crypto.randomUUID()
  title: string; // for example "Day 3 · Task 1"
  task: Task;
  text: string; // cleaned text
  question: string | null;
  vocabulary: VocabularyItem[];
  day: number | null;
  source: AnswerSource;
  createdAt: string; // ISO date
};

// 0 means no limit; otherwise minutes.
export type TimeLimit = 0 | 20 | 40;

export type AttemptError = {
  index: number; // the word's position in the model answer
  expected: string;
  typed: string;
  kind: ErrorKind;
};

export type Attempt = {
  id: string;
  answerId: string;
  finishedAt: string; // ISO date
  durationMs: number; // paused time not counted
  timeLimit: TimeLimit;
  wordsTyped: number;
  wordsTotal: number;
  complete: boolean;
  wpm: number;
  accuracy: number; // 0 to 100
  errors: AttemptError[];
};

export type Theme = "system" | "light" | "dark";

export type VoiceSpeed = "slow" | "normal" | "fast";

export type Settings = {
  theme: Theme;
  sound: boolean;
  speed: VoiceSpeed;
  voiceName: string | null;
  fontSize: number; // 16 to 28
  timeLimit: TimeLimit;
  showQuestion: boolean;
};

// One word of a model answer, from tokenize().
export type Word = {
  // The word's position in the model answer; also its identity (errors[].index).
  index: number;
  // The word as written, punctuation included ("years,").
  text: string;
  paragraphIndex: number;
  // The word needs Enter, not Space. False for the very last word of the text.
  isParagraphEnd: boolean;
};

// Why a committed word is wrong.
export type ErrorKind = "spelling" | "case" | "punctuation";

// The words typed so far in one attempt. committedWords[i]
// is what was typed for the model word with index i; words are never skipped, so the
// two lists stay aligned. Never stored (an attempt in progress is not saved).
export type TypingState = {
  committedWords: string[];
  currentWord: string;
  isFinished: boolean;
};

// How one letter of the word being typed is shown.
export type LetterState = "correct" | "wrong" | "pending" | "extra";
