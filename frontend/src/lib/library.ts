import type { Answer, Attempt } from "@/lib/types";

// The Library's order: answers grouped by day, newest day first; inside a
// day Task 1 before Task 2; answers without a day last, under "Other answers".

export const OTHER_ANSWERS_LABEL = "Other answers";

export type AnswerGroup = {
  label: string;
  answers: Answer[];
};

const TASK_ORDER: Record<Answer["task"], number> = { task1: 0, task2: 1 };

// The answers come newest first, so a stable sort keeps the newer one first when the same
// day has two answers for one task (two chats that both started at Day 1).
const byTask = (first: Answer, second: Answer): number =>
  TASK_ORDER[first.task] - TASK_ORDER[second.task];

export const groupAnswersByDay = (answers: Answer[]): AnswerGroup[] => {
  const byDay = new Map<number, Answer[]>();
  const withoutDay: Answer[] = [];

  for (const answer of answers) {
    if (answer.day === null) {
      withoutDay.push(answer);
    } else {
      byDay.set(answer.day, [...(byDay.get(answer.day) ?? []), answer]);
    }
  }

  const dayGroups = [...byDay.entries()]
    .sort(([firstDay], [secondDay]) => secondDay - firstDay)
    .map(([day, dayAnswers]) => ({ label: `Day ${day}`, answers: dayAnswers.toSorted(byTask) }));

  return withoutDay.length === 0
    ? dayGroups
    : [...dayGroups, { label: OTHER_ANSWERS_LABEL, answers: withoutDay }];
};

// The answer open on the page: the one last opened, else the newest one.
export const findOpenAnswer = (answers: Answer[], lastAnswerId: string | null): Answer | null =>
  answers.find((answer) => answer.id === lastAnswerId) ?? answers[0] ?? null;

// The daily order: Day 1 Task 1, Day 1 Task 2, Day 2 Task 1 and so on. Answers without a
// day are not part of it.
const inDailyOrder = (answers: Answer[]): Answer[] =>
  answers
    .filter((answer) => answer.day !== null)
    // Both days are set here (filtered above); ?? 0 only satisfies the type.
    .toSorted((first, second) => (first.day ?? 0) - (second.day ?? 0) || byTask(first, second));

// The answer after this one in the daily order. Null for an answer without a day, and
// after the last one.
export const findNextAnswer = (answers: Answer[], current: Answer): Answer | null => {
  if (current.day === null) {
    return null;
  }
  const inOrder = inDailyOrder(answers);
  const position = inOrder.findIndex((answer) => answer.id === current.id);
  return inOrder[position + 1] ?? null;
};

// The Library's "Up next": the first answer in the daily order with no attempt yet, so a
// skipped day is not forgotten. Null when every day's answer has been practised.
export const findUpNext = (answers: Answer[], attempts: Attempt[]): Answer | null => {
  const practised = new Set(attempts.map((attempt) => attempt.answerId));
  return inDailyOrder(answers).find((answer) => !practised.has(answer.id)) ?? null;
};

const DAYS_IN_WEEK = 7;

// A calendar day in the learner's own time zone, so practice at 11 pm counts for that day.
const toDayKey = (date: Date): string =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

const daysBefore = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() - days);

export type PracticeDays = {
  // Days in a row with practice, up to today. A day not practised yet today doesn't break it.
  streak: number;
  // Days with practice among the last seven, today included.
  inLastWeek: number;
};

// From the finish times of the saved attempts.
export const getPracticeDays = (attempts: Attempt[], today: Date): PracticeDays => {
  const practisedDays = new Set(attempts.map((attempt) => toDayKey(new Date(attempt.finishedAt))));
  const isPractised = (daysAgo: number) => practisedDays.has(toDayKey(daysBefore(today, daysAgo)));

  let streak = 0;
  for (let daysAgo = isPractised(0) ? 0 : 1; isPractised(daysAgo); daysAgo += 1) {
    streak += 1;
  }
  const inLastWeek = Array.from({ length: DAYS_IN_WEEK }, (_, daysAgo) => daysAgo).filter(
    isPractised,
  ).length;

  return { streak, inLastWeek };
};

// The day to ask the AI for next: one after the newest day in the Library, else Day 1.
export const getNextDay = (answers: Answer[]): number =>
  answers.reduce((newest, answer) => Math.max(newest, answer.day ?? 0), 0) + 1;

// Each answer's last accuracy, from its newest attempt. Attempts come newest first,
// so the first one seen for an answer is its last.
export const getLastAccuracies = (attempts: Attempt[]): Map<string, number> => {
  const lastAccuracies = new Map<string, number>();
  for (const attempt of attempts) {
    if (!lastAccuracies.has(attempt.answerId)) {
      lastAccuracies.set(attempt.answerId, attempt.accuracy);
    }
  }
  return lastAccuracies;
};
