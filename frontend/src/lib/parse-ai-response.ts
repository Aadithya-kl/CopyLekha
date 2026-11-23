import { cleanText, normalizeLineBreaks } from "@/lib/clean-text";
import { tokenize } from "@/lib/tokenize";
import { TASK_LABELS, type Task, TASKS, type VocabularyItem } from "@/lib/types";

// Splits a whole AI reply (in the format of ai-prompt.ts) into the day
// and, for each task, its question, answer and vocabulary. Without a usable marker the
// text is one plain answer with its Markdown removed.

export type ParsedTask = {
  task: Task;
  question: string | null;
  text: string; // cleaned
  vocabulary: VocabularyItem[];
};

export type ParsedResponse =
  { kind: "ai-reply"; day: number | null; tasks: ParsedTask[] } | { kind: "plain"; text: string };

type SectionName = "question" | "answer" | "vocabulary";

type TaskSections = Record<SectionName, string[]>;

// "=== DAY 3 ===", "=== TASK 1 ANSWER ===": case and extra spaces don't matter.
const DAY_MARKER = /^\s*===\s*day\s+(\d+)\s*===\s*$/i;
const TASK_MARKER = /^\s*===\s*task\s*([12])\s+(question|answer|vocabulary)\s*===\s*$/i;
const CODE_FENCE_LINE = /^\s*```/;
// "- phrase: meaning", split at the first colon.
const VOCABULARY_LINE = /^\s*-\s+([^:]+):(.+)$/;

// Markdown removed from a plain answer.
const BOLD_MARKS = /\*\*|__/g;
const HEADING_START = /^\s*#{1,6}\s+/;
const LIST_OR_QUOTE_START = /^\s*[->]\s+/;

const createEmptySections = (): TaskSections => ({ question: [], answer: [], vocabulary: [] });

const toTask = (taskNumber: string): Task => (taskNumber === "1" ? "task1" : "task2");

const toSectionName = (name: string): SectionName => {
  const lowerCase = name.toLowerCase();
  if (lowerCase === "question" || lowerCase === "answer") {
    return lowerCase;
  }
  return "vocabulary";
};

// Removes a code fence around the answer: its first and last lines when they are fence lines.
const removeSurroundingCodeFence = (lines: string[]): string[] => {
  const content = lines.join("\n").trim().split("\n");
  const first = content[0];
  const last = content[content.length - 1];
  if (content.length >= 2 && first !== undefined && last !== undefined) {
    const start = CODE_FENCE_LINE.test(first) ? 1 : 0;
    const end = CODE_FENCE_LINE.test(last) ? content.length - 1 : content.length;
    return content.slice(start, end);
  }
  return content;
};

const parseVocabulary = (lines: string[]): VocabularyItem[] =>
  lines.flatMap((line) => {
    const match = VOCABULARY_LINE.exec(line);
    if (match === null) {
      return [];
    }
    const phrase = cleanText(match[1] ?? "");
    const meaning = cleanText(match[2] ?? "");
    return phrase === "" || meaning === "" ? [] : [{ phrase, meaning }];
  });

const toParsedTask = (task: Task, sections: TaskSections): ParsedTask | null => {
  const text = cleanText(removeSurroundingCodeFence(sections.answer).join("\n"));
  if (text === "") {
    return null;
  }
  const question = cleanText(sections.question.join("\n"));

  return {
    task,
    question: question === "" ? null : question,
    text,
    vocabulary: parseVocabulary(sections.vocabulary),
  };
};

// The fallback for a reply without markers, or a plain answer pasted by hand.
export const removeMarkdown = (text: string): string =>
  normalizeLineBreaks(text)
    .split("\n")
    .filter((line) => !CODE_FENCE_LINE.test(line))
    .map((line) =>
      line.replace(HEADING_START, "").replace(LIST_OR_QUOTE_START, "").replace(BOLD_MARKS, ""),
    )
    .join("\n");

export const parseAiResponse = (input: string): ParsedResponse => {
  const sections: Record<Task, TaskSections> = {
    task1: createEmptySections(),
    task2: createEmptySections(),
  };
  let day: number | null = null;
  // Lines before the first marker, and after a DAY marker, belong to no section.
  let current: string[] | null = null;

  for (const line of normalizeLineBreaks(input).split("\n")) {
    const dayMatch = DAY_MARKER.exec(line);
    const taskMatch = TASK_MARKER.exec(line);

    if (dayMatch !== null) {
      day ??= Number(dayMatch[1]);
      current = null;
    } else if (taskMatch !== null) {
      const task = toTask(taskMatch[1] ?? "");
      current = sections[task][toSectionName(taskMatch[2] ?? "")];
    } else if (current !== null) {
      current.push(line);
    }
  }

  const tasks = TASKS.flatMap((task) => toParsedTask(task, sections[task]) ?? []);
  if (tasks.length === 0) {
    return { kind: "plain", text: cleanText(removeMarkdown(input)) };
  }
  return { kind: "ai-reply", day, tasks };
};

// An imported answer is titled "Day 3 · Task 1", or "Task 1" without a day.
export const createImportTitle = (day: number | null, task: Task): string =>
  day === null ? TASK_LABELS[task] : `Day ${day} · ${TASK_LABELS[task]}`;

const describeTask = ({ task, text }: ParsedTask): string => {
  const wordCount = tokenize(text).length;
  return `${TASK_LABELS[task]}, ${wordCount} ${wordCount === 1 ? "word" : "words"}`;
};

// What was found, for example "Day 3: Task 1, 172 words · Task 2, 268 words".
export const describeReply = (day: number | null, tasks: ParsedTask[]): string => {
  const found = tasks.map(describeTask).join(" · ");
  return day === null ? found : `Day ${day}: ${found}`;
};
