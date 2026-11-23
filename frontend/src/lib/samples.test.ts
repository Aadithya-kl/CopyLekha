import { describe, expect, it } from "vitest";

import { cleanText } from "@/lib/clean-text";
import { createSampleAnswers, SAMPLE_ANSWERS } from "@/lib/samples";
import { tokenize } from "@/lib/tokenize";

const [TASK_1, TASK_2] = SAMPLE_ANSWERS;

describe("sample answers", () => {
  it("has one Task 1 and one Task 2 answer, both marked as samples", () => {
    expect(SAMPLE_ANSWERS.map((sample) => [sample.task, sample.source])).toEqual([
      ["task1", "sample"],
      ["task2", "sample"],
    ]);
  });

  it("stores texts that are already clean", () => {
    for (const sample of SAMPLE_ANSWERS) {
      expect(cleanText(sample.text)).toBe(sample.text);
    }
  });

  it("keeps the lengths the AI prompt asks for, in 4 paragraphs", () => {
    const task1Words = tokenize(TASK_1.text);
    const task2Words = tokenize(TASK_2.text);

    expect(task1Words.length).toBeGreaterThanOrEqual(160);
    expect(task1Words.length).toBeLessThanOrEqual(180);
    expect(task2Words.length).toBeGreaterThanOrEqual(260);
    expect(task2Words.length).toBeLessThanOrEqual(280);
    expect(task1Words.at(-1)?.paragraphIndex).toBe(3);
    expect(task2Words.at(-1)?.paragraphIndex).toBe(3);
  });

  it("uses every vocabulary phrase exactly as it appears in the answer", () => {
    for (const sample of SAMPLE_ANSWERS) {
      for (const { phrase } of sample.vocabulary) {
        expect(sample.text).toContain(phrase);
      }
    }
  });

  it("gives every created sample its own id and the given date", () => {
    const createdAt = "2026-11-21T10:00:00.000Z";
    const answers = createSampleAnswers(createdAt);

    expect(new Set(answers.map((answer) => answer.id)).size).toBe(2);
    expect(answers.every((answer) => answer.createdAt === createdAt)).toBe(true);
  });
});
