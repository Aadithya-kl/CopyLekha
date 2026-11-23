import { describe, expect, it } from "vitest";

import {
  findNextAnswer,
  findOpenAnswer,
  findUpNext,
  getLastAccuracies,
  getNextDay,
  getPracticeDays,
  groupAnswersByDay,
  OTHER_ANSWERS_LABEL,
} from "@/lib/library";
import type { Answer, Attempt } from "@/lib/types";

const answer = (id: string, day: number | null, task: Answer["task"]): Answer => ({
  id,
  title: id,
  task,
  text: `Text of ${id}.`,
  question: null,
  vocabulary: [],
  day,
  source: day === null ? "manual" : "ai-import",
  createdAt: "2026-11-22T10:00:00.000Z",
});

const attempt = (answerId: string, accuracy: number): Attempt => ({
  id: `${answerId}-${accuracy}`,
  answerId,
  finishedAt: "2026-11-22T10:00:00.000Z",
  durationMs: 60_000,
  timeLimit: 0,
  wordsTyped: 10,
  wordsTotal: 10,
  complete: true,
  wpm: 30,
  accuracy,
  errors: [],
});

const summary = (answers: Answer[]) =>
  groupAnswersByDay(answers).map((group) => ({
    label: group.label,
    ids: group.answers.map((item) => item.id),
  }));

describe("groupAnswersByDay", () => {
  it("puts the newest day first and Task 1 before Task 2 inside a day", () => {
    // Newest first, as stored.
    const answers = [
      answer("d3-t1", 3, "task1"),
      answer("d3-t2", 3, "task2"),
      answer("d1-t2", 1, "task2"),
      answer("d1-t1", 1, "task1"),
      answer("d2-t1", 2, "task1"),
    ];

    expect(summary(answers)).toEqual([
      { label: "Day 3", ids: ["d3-t1", "d3-t2"] },
      { label: "Day 2", ids: ["d2-t1"] },
      { label: "Day 1", ids: ["d1-t1", "d1-t2"] },
    ]);
  });

  it("keeps answers without a day last, newest first, under Other answers", () => {
    const answers = [
      answer("manual-new", null, "task2"),
      answer("d1-t1", 1, "task1"),
      answer("sample", null, "task1"),
    ];

    expect(summary(answers)).toEqual([
      { label: "Day 1", ids: ["d1-t1"] },
      { label: OTHER_ANSWERS_LABEL, ids: ["manual-new", "sample"] },
    ]);
  });

  it("puts two answers for the same day and task in one group, the newer first", () => {
    const answers = [
      answer("new-d1-t2", 1, "task2"),
      answer("new-d1-t1", 1, "task1"),
      answer("old-d1-t2", 1, "task2"),
      answer("old-d1-t1", 1, "task1"),
    ];

    expect(summary(answers)).toEqual([
      { label: "Day 1", ids: ["new-d1-t1", "old-d1-t1", "new-d1-t2", "old-d1-t2"] },
    ]);
  });

  it("returns no groups for an empty Library", () => {
    expect(groupAnswersByDay([])).toEqual([]);
  });
});

describe("getLastAccuracies", () => {
  it("takes each answer's newest attempt", () => {
    // Newest first, as stored.
    const accuracies = getLastAccuracies([attempt("a", 90), attempt("b", 70), attempt("a", 60)]);

    expect(accuracies.get("a")).toBe(90);
    expect(accuracies.get("b")).toBe(70);
    expect(accuracies.has("c")).toBe(false);
  });
});

describe("findNextAnswer (Result, Next)", () => {
  // Newest first, as stored.
  const day2Task1 = answer("d2-t1", 2, "task1");
  const day1Task2 = answer("d1-t2", 1, "task2");
  const day1Task1 = answer("d1-t1", 1, "task1");
  const manual = answer("manual", null, "task2");
  const answers = [day2Task1, manual, day1Task2, day1Task1];

  it("goes from Task 1 to Task 2 of the same day, then to the next day", () => {
    expect(findNextAnswer(answers, day1Task1)).toBe(day1Task2);
    expect(findNextAnswer(answers, day1Task2)).toBe(day2Task1);
  });

  it("has nothing after the last day, or for an answer without a day", () => {
    expect(findNextAnswer(answers, day2Task1)).toBeNull();
    expect(findNextAnswer(answers, manual)).toBeNull();
  });
});

describe("getNextDay (Get answers from AI)", () => {
  it("is one after the newest day in the Library", () => {
    expect(getNextDay([answer("a", 3, "task1"), answer("b", null, "task2")])).toBe(4);
  });

  it("is Day 1 when no answer has a day", () => {
    expect(getNextDay([answer("b", null, "task2")])).toBe(1);
    expect(getNextDay([])).toBe(1);
  });
});

describe("findUpNext (Library, Up next)", () => {
  const day2Task1 = answer("d2-t1", 2, "task1");
  const day1Task2 = answer("d1-t2", 1, "task2");
  const day1Task1 = answer("d1-t1", 1, "task1");
  const manual = answer("manual", null, "task2");
  const answers = [day2Task1, manual, day1Task2, day1Task1];

  it("is the first answer in the daily order with no attempt, so a skipped day comes back", () => {
    expect(findUpNext(answers, [attempt("d1-t1", 90), attempt("d2-t1", 80)])).toBe(day1Task2);
  });

  it("is null when every answer with a day has been practised", () => {
    const attempts = ["d1-t1", "d1-t2", "d2-t1"].map((id) => attempt(id, 90));

    expect(findUpNext(answers, attempts)).toBeNull();
  });
});

describe("getPracticeDays (Library, coming back)", () => {
  const TODAY = new Date(2026, 10, 22, 9, 0);
  const practisedOn = (month: number, day: number, hour = 12) => ({
    ...attempt("a", 90),
    finishedAt: new Date(2026, month, day, hour).toISOString(),
  });

  it("counts the days in a row up to today, and the days in the last week", () => {
    const attempts = [
      practisedOn(10, 22, 8),
      practisedOn(10, 21),
      practisedOn(10, 21, 23),
      practisedOn(10, 20),
      practisedOn(10, 17),
      practisedOn(10, 10),
    ];

    expect(getPracticeDays(attempts, TODAY)).toEqual({ streak: 3, inLastWeek: 4 });
  });

  it("keeps the streak when today has no practice yet", () => {
    const attempts = [practisedOn(10, 21), practisedOn(10, 20)];

    expect(getPracticeDays(attempts, TODAY)).toEqual({ streak: 2, inLastWeek: 2 });
  });

  it("has no streak after a missed day, and nothing without attempts", () => {
    expect(getPracticeDays([practisedOn(10, 19)], TODAY)).toEqual({ streak: 0, inLastWeek: 1 });
    expect(getPracticeDays([], TODAY)).toEqual({ streak: 0, inLastWeek: 0 });
  });

  it("counts across the end of a month", () => {
    const attempts = [practisedOn(11, 1), practisedOn(10, 30), practisedOn(10, 29)];

    expect(getPracticeDays(attempts, new Date(2026, 11, 1, 20))).toEqual({
      streak: 3,
      inLastWeek: 3,
    });
  });
});

describe("findOpenAnswer", () => {
  const answers = [answer("newest", 2, "task1"), answer("older", 1, "task1")];

  it("finds the answer last opened", () => {
    expect(findOpenAnswer(answers, "older")?.id).toBe("older");
  });

  it("falls back to the newest answer when the last one opened is gone", () => {
    expect(findOpenAnswer(answers, "deleted")?.id).toBe("newest");
    expect(findOpenAnswer(answers, null)?.id).toBe("newest");
  });

  it("is null with no answers", () => {
    expect(findOpenAnswer([], "older")).toBeNull();
  });
});
